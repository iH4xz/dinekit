// Offline replay — drains the write queue in order once the connection is back.
//
// Correctness rests on three rules:
//   1. FIFO, strictly. A tab's create must land before its rounds and its
//      settlement, so the drain stops at the first entry it cannot send.
//   2. Every entry carries an idempotency ref that was ALSO sent on the original
//      (failed) attempt, so a write the server actually applied before the drop
//      is recognised and skipped rather than repeated.
//   3. A temp order id is rewritten to the real id from the map the moment the
//      create replays — nothing is sent against an id the server never issued.
//
// A 4xx means the server looked at the write and refused it; replaying it again
// would never work, so it is abandoned and reported rather than retried forever.

import { offlineQueue } from './offlineQueue';

const cfg = window.DINEKIT || {};

let running = false;
const listeners = new Set();
let lastReport = { replayed: 0, abandoned: [] };

function emit( state ) {
	listeners.forEach( ( fn ) => {
		try {
			fn( state );
		} catch ( e ) {
			// A bad listener must never break the drain.
		}
	} );
}

// Raw send — deliberately NOT api.request(), so a failure here can never be
// re-queued into the queue we are currently draining.
async function send( method, path, body ) {
	const res = await fetch( cfg.restUrl + path.replace( /^\//, '' ), {
		method,
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': cfg.nonce,
		},
		body: body ? JSON.stringify( body ) : undefined,
	} );
	if ( ! res.ok ) {
		const err = new Error( `Replay failed (${ res.status })` );
		err.status = res.status;
		throw err;
	}
	return res.status === 204 ? null : res.json();
}

/**
 * Drain the queue. Safe to call repeatedly and concurrently — only one drain
 * runs at a time. Resolves with { replayed, abandoned, remaining }.
 */
export async function replayQueue() {
	if ( running || ! offlineQueue.available() ) {
		return lastReport;
	}
	running = true;
	emit( 'syncing' );

	let replayed = 0;
	const abandoned = [];

	try {
		const entries = await offlineQueue.all();
		entries.sort( ( a, b ) => a.id - b.id );

		for ( const entry of entries ) {
			let path = entry.path;

			// Re-point a write that targets a tab created offline.
			if ( entry.tempId ) {
				// eslint-disable-next-line no-await-in-loop
				const realId = await offlineQueue.resolveId( entry.tempId );
				if ( ! realId ) {
					// Its create hasn't landed (still queued behind us, or it was
					// abandoned). Stop — sending this now would target nothing.
					break;
				}
				path = path.replace( String( entry.tempId ), String( realId ) );
			}

			try {
				// eslint-disable-next-line no-await-in-loop
				const result = await send( entry.method, path, entry.body );
				if ( entry.createsTemp && result && result.id ) {
					// eslint-disable-next-line no-await-in-loop
					await offlineQueue.mapId( entry.createsTemp, result.id );
				}
				// eslint-disable-next-line no-await-in-loop
				await offlineQueue.remove( entry.id );
				replayed += 1;
			} catch ( e ) {
				if ( e.status && e.status >= 400 && e.status < 500 ) {
					// The server saw it and said no. Retrying can't change that.
					abandoned.push( { entry, reason: e.message } );
					// eslint-disable-next-line no-await-in-loop
					await offlineQueue.remove( entry.id );
					continue;
				}
				// Still offline, or the server is down — keep everything from here
				// on and try again at the next reconnect.
				break;
			}
		}
	} finally {
		running = false;
		const remaining = await offlineQueue.refresh();
		lastReport = { replayed, abandoned, remaining };
		emit( remaining > 0 ? 'pending' : 'idle' );
	}

	return lastReport;
}

// Subscribe to drain state: 'syncing' | 'pending' | 'idle'.
export function onReplay( fn ) {
	listeners.add( fn );
	return () => listeners.delete( fn );
}

export const replayState = () => lastReport;
