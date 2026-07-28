// Live-sync client. One shared, adaptive poller hits the tiny /sync heartbeat and
// tracks a counter per data channel. Screens subscribe to their channel via
// useSyncRevision() and refetch only when that channel actually changed — so many
// tablets stay in sync with a single cheap request per poll instead of every
// screen re-pulling every list on its own timer.
//
// Adaptive by design (the "smart, not pounding" rule):
//   • tab hidden        → polling pauses entirely
//   • active use        → ~10s
//   • visible but idle  → ~45s
//   • back online/visible → immediate catch-up poll
//   • network errors    → exponential backoff to 60s
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { replayQueue } from './offlineReplay';
import { offlineQueue } from './offlineQueue';

const ACTIVE_MS = 10000;
const IDLE_MS = 45000;
const ERROR_MAX_MS = 60000;
const IDLE_AFTER_MS = 120000; // no pointer/key in 2 min → treat as idle.

const counters = {};   // channel -> last-seen counter
const revisions = {};  // channel -> revision (bumps when the channel changes)
const subscribers = new Set();

let timer = null;
let started = false;
let lastActivity = Date.now();
let errorStreak = 0;
let online = 'onLine' in navigator ? navigator.onLine : true;

function notify() {
	subscribers.forEach( ( fn ) => {
		try {
			fn();
		} catch ( e ) {
			// A bad subscriber must never break the poll loop.
		}
	} );
}

function nextDelay() {
	if ( errorStreak > 0 ) {
		return Math.min( ERROR_MAX_MS, ACTIVE_MS * Math.pow( 2, errorStreak ) );
	}
	return Date.now() - lastActivity > IDLE_AFTER_MS ? IDLE_MS : ACTIVE_MS;
}

function schedule() {
	if ( timer ) {
		clearTimeout( timer );
	}
	timer = setTimeout( poll, nextDelay() );
}

async function poll() {
	// Drain any writes still held on the device FIRST, and independently of
	// everything below. Two reasons this is not tied to a connectivity
	// transition: a write can be queued during a blip the heartbeat never
	// noticed (so there is no offline→online edge to hang it on), and a hidden
	// tab is exactly when a tablet is sitting in an apron pocket — getting the
	// orders to the server matters more there than pausing to save a request.
	if ( offlineQueue.pending() > 0 ) {
		replayQueue();
	}
	// Pause the heartbeat while the tab is hidden; visibilitychange re-kicks us.
	if ( typeof document !== 'undefined' && document.hidden ) {
		schedule();
		return;
	}
	const wasOnline = online;
	try {
		const res = await api.getSync();
		errorStreak = 0;
		online = true;
		let changed = false;
		const ch = ( res && res.channels ) || {};
		Object.keys( ch ).forEach( ( name ) => {
			if ( counters[ name ] === undefined ) {
				// First sight: establish a baseline without triggering a refetch.
				counters[ name ] = ch[ name ];
				if ( revisions[ name ] === undefined ) {
					revisions[ name ] = 0;
				}
			} else if ( ch[ name ] !== counters[ name ] ) {
				counters[ name ] = ch[ name ];
				revisions[ name ] = ( revisions[ name ] || 0 ) + 1;
				changed = true;
			}
		} );
		if ( changed || online !== wasOnline ) {
			notify();
		}
		// A successful heartbeat is PROOF the server is reachable (better than the
		// browser's 'online' event, which also fires on a captive-portal wifi that
		// can't reach us) — so on recovery, drain immediately rather than waiting
		// for the next poll.
		if ( ! wasOnline && offlineQueue.pending() > 0 ) {
			replayQueue().then( () => kick() );
		}
	} catch ( e ) {
		errorStreak += 1;
		online = false;
		if ( online !== wasOnline ) {
			notify();
		}
	} finally {
		schedule();
	}
}

function kick() {
	if ( timer ) {
		clearTimeout( timer );
	}
	poll();
}

function markActivity() {
	lastActivity = Date.now();
}

// Start the shared poller. Safe to call more than once.
export function startSync() {
	if ( started || typeof window === 'undefined' ) {
		return;
	}
	started = true;
	document.addEventListener( 'visibilitychange', () => {
		if ( ! document.hidden ) {
			kick();
		}
	} );
	window.addEventListener( 'online', () => {
		online = true;
		notify(); // update the offline banner immediately; the kick confirms.
		kick();
	} );
	window.addEventListener( 'offline', () => {
		online = false;
		notify();
	} );
	[ 'pointerdown', 'keydown' ].forEach( ( ev ) =>
		window.addEventListener( ev, markActivity, { passive: true } )
	);
	poll();
	// A tablet that was closed mid-outage reopens with writes still queued —
	// flush them on boot, not only on a live reconnect.
	offlineQueue.refresh().then( ( n ) => {
		if ( n > 0 ) {
			replayQueue();
		}
	} );
}

// How many writes are still only on this device. Drives the "N unsynced" pill.
export function usePendingWrites() {
	const [ n, setN ] = useState( offlineQueue.pending() );
	useEffect( () => offlineQueue.subscribe( setN ), [] );
	return n;
}

// A number that increments whenever `channel` changes on the server. Put it in a
// screen's data-loading effect deps to refetch exactly when needed.
export function useSyncRevision( channel ) {
	const [ rev, setRev ] = useState( revisions[ channel ] || 0 );
	useEffect( () => {
		const fn = () => setRev( revisions[ channel ] || 0 );
		subscribers.add( fn );
		fn();
		return () => {
			subscribers.delete( fn );
		};
	}, [ channel ] );
	return rev;
}

// Current connectivity as seen by the poller (drives the offline banner).
export function useOnline() {
	const [ on, setOn ] = useState( online );
	useEffect( () => {
		const fn = () => setOn( online );
		subscribers.add( fn );
		fn();
		return () => {
			subscribers.delete( fn );
		};
	}, [] );
	return on;
}
