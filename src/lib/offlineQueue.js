// Offline write-queue — a tiny IndexedDB-backed FIFO of pending mutations, kept
// so nothing a user does is lost when the connection drops, plus the temp-id map
// that lets a tab opened offline be stitched to its real order id on replay.
//
// Storage only. The allowlist of what may be queued lives at the API choke point
// (src/api/client.js); the drain lives in src/lib/offlineReplay.js.
//
// Card / Stripe paths must NEVER be queued — real money movement stays online.

const DB_NAME = 'dinekit-offline';
const STORE = 'queue';
const IDMAP = 'idmap';
const VERSION = 2;

let dbPromise = null;

function openDb() {
	if ( dbPromise ) {
		return dbPromise;
	}
	dbPromise = new Promise( ( resolve, reject ) => {
		if ( typeof indexedDB === 'undefined' ) {
			reject( new Error( 'IndexedDB unavailable' ) );
			return;
		}
		const req = indexedDB.open( DB_NAME, VERSION );
		req.onupgradeneeded = () => {
			const db = req.result;
			if ( ! db.objectStoreNames.contains( STORE ) ) {
				db.createObjectStore( STORE, { keyPath: 'id', autoIncrement: true } );
			}
			// v2 — temp order id → real order id, so queued follow-up writes
			// (add lines, fire, settle) can be re-pointed once the create lands.
			if ( ! db.objectStoreNames.contains( IDMAP ) ) {
				db.createObjectStore( IDMAP, { keyPath: 'tempId' } );
			}
		};
		req.onsuccess = () => resolve( req.result );
		req.onerror = () => reject( req.error );
	} );
	return dbPromise;
}

function promisify( request ) {
	return new Promise( ( resolve, reject ) => {
		request.onsuccess = () => resolve( request.result );
		request.onerror = () => reject( request.error );
	} );
}

async function withStore( name, mode, fn ) {
	const db = await openDb();
	const store = db.transaction( name, mode ).objectStore( name );
	return promisify( fn( store ) );
}

// Anything that cares about "how many writes are still unsafe" (the banner, the
// POS pill) subscribes here rather than polling IndexedDB.
const watchers = new Set();
let pending = 0;

function announce() {
	watchers.forEach( ( fn ) => {
		try {
			fn( pending );
		} catch ( e ) {
			// A bad watcher must never break the queue.
		}
	} );
}

async function refresh() {
	try {
		pending = await withStore( STORE, 'readonly', ( s ) => s.count() );
	} catch ( e ) {
		pending = 0;
	}
	announce();
	return pending;
}

let counter = 0;

export const offlineQueue = {
	// Is a durable queue even possible here? (No IndexedDB in some private modes.)
	available: () => typeof indexedDB !== 'undefined',

	// A stable, unique idempotency ref. Sent on EVERY attempt — online too — so a
	// write whose response was lost in the drop is recognised (not repeated) when
	// the queue replays it. The server dedups on these (see Phase A).
	newRef: () => {
		counter += 1;
		const rand = typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID()
			: Math.random().toString( 36 ).slice( 2 );
		return `dk-${ Date.now() }-${ counter }-${ rand }`;
	},

	// Placeholder id for an order that only exists on this tablet so far.
	// Negative so it can never collide with a real WP post id.
	newTempId: () => {
		counter += 1;
		return -( Date.now() * 100 + ( counter % 100 ) );
	},
	isTempId: ( id ) => Number( id ) < 0,

	// Append a mutation. `item` is a plain descriptor:
	// { method, path, body, tempId?, createsTemp? }.
	enqueue: async ( item ) => {
		const id = await withStore( STORE, 'readwrite', ( s ) => s.add( { ...item, ts: Date.now() } ) );
		await refresh();
		return id;
	},

	// Everything pending, oldest first (FIFO — replay in order).
	all: () => withStore( STORE, 'readonly', ( s ) => s.getAll() ),

	// Drop one entry once it has replayed successfully (or been abandoned).
	remove: async ( id ) => {
		const r = await withStore( STORE, 'readwrite', ( s ) => s.delete( id ) );
		await refresh();
		return r;
	},

	// How many are waiting to sync (drives the "N unsynced" pill).
	count: () => withStore( STORE, 'readonly', ( s ) => s.count() ),

	// Wipe the queue (e.g. a manual "discard offline changes").
	clear: async () => {
		const r = await withStore( STORE, 'readwrite', ( s ) => s.clear() );
		await refresh();
		return r;
	},

	// --- temp id ↔ real id -------------------------------------------------
	mapId: ( tempId, realId ) =>
		withStore( IDMAP, 'readwrite', ( s ) => s.put( { tempId: Number( tempId ), realId: Number( realId ), ts: Date.now() } ) ),
	resolveId: async ( tempId ) => {
		const row = await withStore( IDMAP, 'readonly', ( s ) => s.get( Number( tempId ) ) );
		return row ? Number( row.realId ) : 0;
	},
	forgetId: ( tempId ) => withStore( IDMAP, 'readwrite', ( s ) => s.delete( Number( tempId ) ) ),

	// --- observers ---------------------------------------------------------
	pending: () => pending,
	subscribe: ( fn ) => {
		watchers.add( fn );
		fn( pending );
		return () => watchers.delete( fn );
	},
	refresh,
};
