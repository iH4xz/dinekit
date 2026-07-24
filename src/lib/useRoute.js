import { useCallback, useEffect, useState } from 'react';

// Lightweight hash router so the admin app is deep-linkable and survives a
// refresh. URLs look like admin.php?page=dinekit#/design or
// #/builder/item/8 (a specific dish open in the editor).
const VALID_VIEWS = [ 'home', 'reports', 'builder', 'design', 'qr', 'orders', 'pos', 'hours', 'bookings', 'floor', 'events', 'guests', 'reviews', 'staff', 'support', 'integrations', 'emails', 'access', 'activity', 'settings' ];

function parse() {
	const raw = window.location.hash.replace( /^#\/?/, '' );
	const [ view, sub, subId ] = raw.split( '/' );
	// Two id forms: '#/builder/item/8' and the short '#/support/12' used by
	// reply-notification emails deep-linking straight into a ticket.
	let itemId = null;
	if ( 'item' === sub && subId ) {
		itemId = parseInt( subId, 10 ) || null;
	} else if ( sub && /^\d+$/.test( sub ) ) {
		itemId = parseInt( sub, 10 ) || null;
	}
	return {
		view: VALID_VIEWS.includes( view ) ? view : 'home',
		itemId,
	};
}

export function useRoute() {
	const [ route, setRoute ] = useState( parse );

	useEffect( () => {
		const onChange = () => setRoute( parse() );
		window.addEventListener( 'hashchange', onChange );

		// Reflect the initial view in the URL so it's shareable from the start.
		if ( ! window.location.hash ) {
			window.history.replaceState(
				null,
				'',
				window.location.pathname + window.location.search + '#/home'
			);
		}
		return () => window.removeEventListener( 'hashchange', onChange );
	}, [] );

	const navigate = useCallback( ( view, itemId ) => {
		window.location.hash = itemId ? `#/${ view }/item/${ itemId }` : `#/${ view }`;
	}, [] );

	return { view: route.view, itemId: route.itemId, navigate };
}
