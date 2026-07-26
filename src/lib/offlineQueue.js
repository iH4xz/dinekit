// Offline write-queue — a tiny IndexedDB-backed FIFO of pending mutations, kept
// so nothing a user does is lost when the connection drops. This is the storage
// primitive ONLY: enqueue / read / remove / count. Wiring it into the API layer
// and replaying on reconnect (with idempotency keys — the server side already
// dedups create-order / add-lines / cash-tender) is the supervised Phase B.
//
// Card / Stripe paths must NEVER be queued — real money movement stays online.

const DB_NAME = 'dinekit-offline';
const STORE = 'queue';
const VERSION = 1;

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

async function withStore( mode, fn ) {
	const db = await openDb();
	const store = db.transaction( STORE, mode ).objectStore( STORE );
	return promisify( fn( store ) );
}

export const offlineQueue = {
	// Is a durable queue even possible here? (No IndexedDB in some private modes.)
	available: () => typeof indexedDB !== 'undefined',

	// Append a mutation. `item` is a plain descriptor, e.g.
	// { method, path, body, clientRef }. A monotonic id + timestamp are added.
	enqueue: ( item ) => withStore( 'readwrite', ( s ) => s.add( { ...item, ts: Date.now() } ) ),

	// Everything pending, oldest first (FIFO — replay in order).
	all: () => withStore( 'readonly', ( s ) => s.getAll() ),

	// Drop one entry once it has replayed successfully.
	remove: ( id ) => withStore( 'readwrite', ( s ) => s.delete( id ) ),

	// How many are waiting to sync (drives the "N queued" pill later).
	count: () => withStore( 'readonly', ( s ) => s.count() ),

	// Wipe the queue (e.g. a manual "discard offline changes").
	clear: () => withStore( 'readwrite', ( s ) => s.clear() ),
};
