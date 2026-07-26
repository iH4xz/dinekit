import React, { useEffect, useRef, useState } from 'react';
import {
	Box,
	Stack,
	Typography,
	Button,
	IconButton,
	TextField,
	Chip,
	MenuItem,
	Select,
	Tooltip,
	Divider,
	Switch,
	Snackbar,
} from '../ui';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import PrintIcon from '@mui/icons-material/Print';
import { tokens } from '../theme';
import { api } from '../api/client';
import { prettyDate } from '../lib/bookings';
import { printDoc, esc } from '../lib/print';
import { copyToClipboard } from '../lib/clipboard';
import Page from './ui/Page';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';
import Card from './ui/Card';
import { ListSkeleton } from './ui/Skeletons';
import PageTour from './PageTour';

export default function EventsView() {
	const [ events, setEvents ] = useState( [] );
	const [ menus, setMenus ] = useState( [] );
	const [ selectedId, setSelectedId ] = useState( null );
	const [ detail, setDetail ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ copied, setCopied ] = useState( false );
	const [ seats, setSeats ] = useState( 0 );
	const [ dayCovers, setDayCovers ] = useState( null );
	const debounce = useRef( null );

	// Total seats across the floor — the ceiling for a day's availability.
	useEffect( () => {
		api.getFloor().then( ( f ) => setSeats( ( ( f && f.tables ) || [] ).reduce( ( s, t ) => s + ( t.seats || 0 ), 0 ) ) ).catch( () => {} );
	}, [] );

	// Covers already booked in the diary on the selected event's day (call-in context).
	useEffect( () => {
		const d = detail && detail.date;
		if ( ! d ) {
			setDayCovers( null );
			return;
		}
		api.listBookings( { from: d } ).then( ( rows ) => {
			const c = ( rows || [] )
				.filter( ( b ) => ! [ 'cancelled', 'no_show' ].includes( b.status ) )
				.reduce( ( s, b ) => s + ( b.party || 0 ), 0 );
			setDayCovers( c );
		} ).catch( () => setDayCovers( null ) );
	}, [ detail && detail.date ] );

	const eventCovers = ( e ) =>
		( ( e && e.groups ) || [] ).reduce( ( s, g ) => s + ( g.size || 0 ), 0 ) || ( e && e.capacity ) || ( e && e.guestCount ) || 0;

	useEffect( () => {
		Promise.all( [ api.getEvents(), api.getState() ] )
			.then( ( [ evs, state ] ) => {
				setEvents( evs || [] );
				setMenus( state.menus || [] );
				if ( ( evs || [] ).length ) {
					select( evs[ 0 ].id );
				}
			} )
			.finally( () => setLoading( false ) );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	const select = ( id ) => {
		setSelectedId( id );
		setDetail( null );
		api.getEvent( id ).then( setDetail );
	};

	const createEvent = async () => {
		const ev = await api.createEvent( { name: 'New event' } );
		setEvents( ( e ) => [ ...e, ev ] );
		select( ev.id );
	};

	const patch = ( p ) => {
		setDetail( ( d ) => ( { ...d, ...p } ) );
		clearTimeout( debounce.current );
		debounce.current = setTimeout( () => {
			api.updateEvent( selectedId, p ).then( ( ev ) => {
				setEvents( ( list ) => list.map( ( x ) => ( x.id === ev.id ? { ...x, ...ev } : x ) ) );
			} );
		}, 500 );
	};

	const removeEvent = async ( id ) => {
		await api.deleteEvent( id );
		const next = events.filter( ( e ) => e.id !== id );
		setEvents( next );
		if ( selectedId === id ) {
			if ( next.length ) {
				select( next[ 0 ].id );
			} else {
				setSelectedId( null );
				setDetail( null );
			}
		}
	};

	const removeGuest = async ( gid ) => {
		await api.deleteGuest( selectedId, gid );
		select( selectedId );
	};

	// Staff edit a guest (typo in the name, wrong course, reassign company). Reload
	// the event afterwards so the prep sheet + totals reflect the change. Errors
	// (e.g. a numeric-only name) propagate to the row so it can show them inline.
	const editGuest = async ( gid, data ) => {
		await api.updateGuest( selectedId, gid, data );
		const fresh = await api.getEvent( selectedId );
		setDetail( fresh );
	};

	const onCopy = ( text ) => {
		if ( text ) {
			copyToClipboard( text ).then( () => setCopied( true ) );
		}
	};

	if ( loading ) {
		return (
			<Page>
				<ListSkeleton rows={ 5 } />
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				title="Events"
				subtitle="Set-menu events with per-guest pre-orders — guests pick their courses and flag allergens from a share link. The kitchen gets one tidy prep sheet."
				actions={
					<Button variant="contained" startIcon={ <AddIcon /> } onClick={ createEvent }>
						New event
					</Button>
				}
			/>

			<PageTour
				id="events"
				title="Set-menu events with pre-orders"
				points={ [
					'Create an event, link a menu as its set menu, then publish to activate the share link.',
					'Split one event into companies/teams — each gets its own link and guests are tagged to it.',
					'Guests pick courses + flag allergens; you get one consolidated kitchen prep sheet.',
					'Events also show in the Bookings diary for that day, with call-in availability.',
				] }
			/>

			{ events.length === 0 ? (
				<EmptyState
					icon={ <CelebrationIcon /> }
					title="No events yet"
					description="Create an event, link one of your menus as the set menu, then share the link with guests."
					tint={ { fg: tokens.amber, bg: tokens.amberSoft } }
				/>
			) : (
				<Stack direction="row" spacing={ 2 } alignItems="flex-start">
					{ /* List */ }
					<Stack spacing={ 1 } sx={ { width: 260, flexShrink: 0 } }>
						{ events.map( ( ev ) => {
							const active = ev.id === selectedId;
							return (
								<Card
									key={ ev.id }
									hover
									onClick={ () => select( ev.id ) }
									sx={ {
										p: 1.5,
										...( active && {
											borderColor: tokens.accent,
											bgcolor: tokens.accentSoft,
											'&:hover': { borderColor: tokens.accent },
										} ),
									} }
								>
									<Stack direction="row" spacing={ 1.25 } alignItems="center">
										<DateBadge date={ ev.date } active={ active } />
										<Box sx={ { flex: 1, minWidth: 0 } }>
											<Typography sx={ { fontWeight: 650, color: tokens.ink, fontSize: 14 } } noWrap>{ ev.name }</Typography>
											<Stack direction="row" alignItems="center" spacing={ 1 } sx={ { mt: 0.25 } }>
												<Chip
													label={ ev.status === 'published' ? 'Live' : 'Draft' }
													size="small"
													sx={ {
														height: 18, fontSize: 10, fontWeight: 600,
														bgcolor: ev.status === 'published' ? tokens.greenSoft : tokens.soft,
														color: ev.status === 'published' ? tokens.green : tokens.muted,
													} }
												/>
												<Typography sx={ { fontSize: 12, color: tokens.muted } } noWrap>
													{ ev.guestCount } { ev.guestCount === 1 ? 'guest' : 'guests' }
												</Typography>
											</Stack>
										</Box>
									</Stack>
								</Card>
							);
						} ) }
					</Stack>

					{ /* Detail */ }
					<Box sx={ { flex: 1, minWidth: 0 } }>
						{ ! detail ? (
							<ListSkeleton rows={ 4 } />
						) : (
							<EventDetail
								detail={ detail }
								menus={ menus }
								onPatch={ patch }
								onDelete={ () => removeEvent( detail.id ) }
								onRemoveGuest={ removeGuest }
								onEditGuest={ editGuest }
								onCopy={ onCopy }
								dayLoad={ { seats, booked: dayCovers, thisEvent: eventCovers( detail ) } }
							/>
						) }
					</Box>
				</Stack>
			) }

			<Snackbar open={ copied } autoHideDuration={ 1800 } onClose={ () => setCopied( false ) } message="Share link copied" anchorOrigin={ { vertical: 'bottom', horizontal: 'center' } } />
		</Page>
	);
}

const MONTHS = [ 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC' ];

// Calendar date badge — abbreviated month over day-of-month ('2026-07-14' →
// JUL / 14). Shows an em dash when the event has no date yet.
function DateBadge( { date, active } ) {
	const month = date ? MONTHS[ Number( String( date ).slice( 5, 7 ) ) - 1 ] : null;
	const dayNum = date ? Number( String( date ).slice( 8, 10 ) ) : null;
	return (
		<Box
			sx={ {
				width: 44,
				flexShrink: 0,
				borderRadius: '10px',
				bgcolor: active ? tokens.surface : tokens.accentSoft,
				py: 0.75,
				textAlign: 'center',
			} }
		>
			{ month && dayNum ? (
				<>
					<Typography sx={ { fontSize: 10, fontWeight: 650, color: tokens.accent, letterSpacing: '0.06em', lineHeight: 1.2, textTransform: 'uppercase' } }>
						{ month }
					</Typography>
					<Typography sx={ { fontSize: 18, fontWeight: 650, color: tokens.ink, lineHeight: 1.15 } }>
						{ dayNum }
					</Typography>
				</>
			) : (
				<Typography sx={ { fontSize: 18, fontWeight: 650, color: tokens.muted2, lineHeight: 2 } }>—</Typography>
			) }
		</Box>
	);
}

function EventDetail( { detail, menus, onPatch, onDelete, onRemoveGuest, onEditGuest, onCopy, dayLoad } ) {
	const published = detail.status === 'published';
	const groups = detail.groups || [];
	const groupName = ( gid ) => ( groups.find( ( g ) => g.id === gid ) || {} ).name || '';
	const groupUrl = ( gid ) => ( detail.shareUrl ? detail.shareUrl + '&g=' + encodeURIComponent( gid ) : '' );
	const setGroups = ( next ) => onPatch( { groups: next } );
	const addGroup = () => setGroups( [ ...groups, { id: 'g' + Date.now(), name: 'New company', size: 0, guestCount: 0 } ] );
	const updateGroup = ( id, p ) => setGroups( groups.map( ( g ) => ( g.id === id ? { ...g, ...p } : g ) ) );
	const removeGroup = ( id ) => setGroups( groups.filter( ( g ) => g.id !== id ) );
	const dayRemaining = dayLoad && dayLoad.seats > 0 ? dayLoad.seats - ( dayLoad.booked || 0 ) - ( dayLoad.thisEvent || 0 ) : null;
	const itemName = ( id ) => {
		for ( const c of detail.courses || [] ) {
			const it = c.items.find( ( x ) => x.id === id );
			if ( it ) {
				return it.title;
			}
		}
		return '#' + id;
	};

	const printKitchen = () => {
		const d = detail;
		const when = [ d.date && prettyDate( d.date ), d.time ].filter( Boolean ).join( ' · ' );
		let body = '<h1>' + esc( d.name ) + '</h1>';
		body += '<p class="dinekit-sub">' + esc( when ) + ' · ' + d.prep.totalGuests + ' guests</p>';
		if ( d.prep.items.length ) {
			body += '<div class="dinekit-section-title">Prep totals</div>';
			d.prep.items.forEach( ( it ) => {
				body += '<div class="dinekit-row"><span>' + esc( it.title ) + '</span><strong>×' + it.count + '</strong></div>';
			} );
		}
		if ( d.prep.allergens.length ) {
			body += '<div class="dinekit-section-title">Allergens</div>';
			d.prep.allergens.forEach( ( a ) => {
				body += '<div class="dinekit-row"><span class="dinekit-allergen">' + esc( a.name ) + '</span><span>' + esc( a.guests.join( ', ' ) ) + '</span></div>';
			} );
		}
		if ( d.guests.length ) {
			body += '<div class="dinekit-section-title">Guest tickets</div><div class="dinekit-grid">';
			d.guests.forEach( ( g ) => {
				const dishes = Object.values( g.selections ).map( ( id ) => itemName( id ) );
				body += '<div class="dinekit-ticket"><h3>' + esc( g.name ) + '</h3>';
				body += '<ul>' + dishes.map( ( x ) => '<li>' + esc( x ) + '</li>' ).join( '' ) + '</ul>';
				if ( ( g.allergenNames || [] ).length ) {
					body += '<p class="dinekit-flag dinekit-allergen">Allergens: ' + esc( g.allergenNames.join( ', ' ) ) + '</p>';
				}
				if ( ( g.dietaryNames || [] ).length ) {
					body += '<p class="dinekit-flag">' + esc( g.dietaryNames.join( ', ' ) ) + '</p>';
				}
				if ( g.notes ) {
					body += '<p class="dinekit-flag">“' + esc( g.notes ) + '”</p>';
				}
				body += '</div>';
			} );
			body += '</div>';
		}
		printDoc( d.name + ' — kitchen sheet', body );
	};

	return (
		<Box sx={ { bgcolor: tokens.surface, border: `1px solid ${ tokens.border }`, borderRadius: '12px', p: 2.5 } }>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={ { mb: 2 } }>
				<TextField
					value={ detail.name }
					onChange={ ( e ) => onPatch( { name: e.target.value } ) }
					variant="standard"
					InputProps={ { disableUnderline: true, sx: { fontSize: 20, fontWeight: 800 } } }
					sx={ { flex: 1 } }
				/>
				<Stack direction="row" alignItems="center" spacing={ 1 }>
					<Switch checked={ published } onChange={ ( e ) => onPatch( { status: e.target.checked ? 'published' : 'draft' } ) } />
					<Typography sx={ { fontSize: 13, fontWeight: 700, color: published ? tokens.green : tokens.muted } }>
						{ published ? 'Live' : 'Draft' }
					</Typography>
					<Tooltip title="Delete event">
						<IconButton size="small" onClick={ onDelete } sx={ { color: tokens.muted2 } }><DeleteOutlineIcon fontSize="small" /></IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			<Stack direction="row" spacing={ 1.5 } flexWrap="wrap" useFlexGap>
				<TextField label="Date" type="date" size="small" InputLabelProps={ { shrink: true } } value={ detail.date } onChange={ ( e ) => onPatch( { date: e.target.value } ) } sx={ { width: 160 } } />
				<TextField label="Time" type="time" size="small" InputLabelProps={ { shrink: true } } value={ detail.time } onChange={ ( e ) => onPatch( { time: e.target.value } ) } sx={ { width: 120 } } />
				<TextField
					select label="Set menu" size="small" value={ detail.menu || 0 }
					onChange={ ( e ) => onPatch( { menu: Number( e.target.value ) } ) }
					sx={ { minWidth: 180 } }
				>
					<MenuItem value={ 0 }>— choose a menu —</MenuItem>
					{ menus.map( ( m ) => <MenuItem key={ m.id } value={ m.id }>{ m.name }</MenuItem> ) }
				</TextField>
				<TextField label="Order-by date" type="date" size="small" InputLabelProps={ { shrink: true } } value={ detail.deadline } onChange={ ( e ) => onPatch( { deadline: e.target.value } ) } sx={ { width: 160 } } />
				<TextField label="Capacity" type="number" size="small" value={ detail.capacity } onChange={ ( e ) => onPatch( { capacity: Math.max( 0, parseInt( e.target.value, 10 ) || 0 ) } ) } helperText="0 = no limit" sx={ { width: 110 } } />
			</Stack>
			<TextField label="Intro (optional)" size="small" fullWidth value={ detail.intro } onChange={ ( e ) => onPatch( { intro: e.target.value } ) } sx={ { mt: 1.5 } } />

			{ ! detail.menu && (
				<Typography sx={ { fontSize: 13, color: tokens.amber, mt: 1.5 } }>
					Pick a set menu so guests have courses to choose from.
				</Typography>
			) }

			{ /* Call-in context — how much room the day has across the diary. */ }
			{ detail.date && dayLoad && dayLoad.booked !== null && (
				<Box sx={ { mt: 2, p: 1.5, bgcolor: tokens.soft, borderRadius: 2 } }>
					<Typography sx={ { fontSize: 12, fontWeight: 700, color: tokens.muted, mb: 0.5 } }>
						That day&rsquo;s availability
					</Typography>
					<Stack direction="row" spacing={ 2.5 } flexWrap="wrap" useFlexGap sx={ { fontSize: 13, color: tokens.ink2, alignItems: 'center' } }>
						<span>Seats: <strong>{ dayLoad.seats || '—' }</strong></span>
						<span>Booked in diary: <strong>{ dayLoad.booked }</strong></span>
						<span>This event: <strong>{ dayLoad.thisEvent }</strong></span>
						{ null !== dayRemaining && (
							<Chip
								size="small"
								label={ dayRemaining < 0 ? `Over by ${ -dayRemaining }` : `${ dayRemaining } seats left` }
								sx={ {
									fontWeight: 700,
									bgcolor: dayRemaining < 0 ? tokens.redSoft : tokens.greenSoft,
									color: dayRemaining < 0 ? tokens.red : tokens.green,
								} }
							/>
						) }
					</Stack>
				</Box>
			) }

			{ /* Share link */ }
			<Box sx={ { mt: 2, p: 1.5, bgcolor: published ? tokens.accentSoft : tokens.soft, borderRadius: 2 } }>
				<Typography sx={ { fontSize: 12, fontWeight: 700, color: published ? tokens.accentDark : tokens.muted, mb: 0.5 } }>
					{ published ? 'Guest share link — send this out' : 'Publish the event to activate its share link' }
				</Typography>
				<Stack direction="row" alignItems="center" spacing={ 1 }>
					<Typography sx={ { fontSize: 13, fontFamily: 'monospace', color: tokens.ink2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }>
						{ detail.shareUrl }
					</Typography>
					<Button size="small" startIcon={ <ContentCopyIcon sx={ { fontSize: 15 } } /> } onClick={ () => onCopy( detail.shareUrl ) } disabled={ ! published }>Copy</Button>
				</Stack>
			</Box>

			<Divider sx={ { my: 2.5 } } />

			{ /* Groups / companies — separate teams within one event */ }
			<Stack direction="row" alignItems="center" spacing={ 1 } sx={ { mb: 1 } }>
				<PeopleIcon sx={ { fontSize: 18, color: tokens.ink2 } } />
				<Typography variant="subtitle2" sx={ { color: tokens.ink } }>Groups &amp; companies</Typography>
				<Box sx={ { flex: 1 } } />
				<Button size="small" startIcon={ <AddIcon sx={ { fontSize: 16 } } /> } onClick={ addGroup }>Add group</Button>
			</Stack>
			<Typography sx={ { fontSize: 12.5, color: tokens.muted2, mb: 1.5 } }>
				Split one event into separate teams — each gets its own share link, and guests who use it are tagged to that group. Great for multiple companies at a shared event.
			</Typography>
			{ groups.length === 0 ? (
				<Typography sx={ { fontSize: 13, color: tokens.muted, mb: 1 } }>No groups — everyone orders under the main link above.</Typography>
			) : (
				<Stack spacing={ 1 } sx={ { mb: 1 } }>
					{ groups.map( ( g ) => (
						<Stack key={ g.id } direction="row" alignItems="center" spacing={ 1 } flexWrap="wrap" useFlexGap sx={ { bgcolor: tokens.soft, borderRadius: 2, p: 1.25 } }>
							<TextField
								size="small"
								value={ g.name }
								onChange={ ( e ) => updateGroup( g.id, { name: e.target.value } ) }
								placeholder="Company / team name"
								sx={ { flex: 1, minWidth: 160 } }
							/>
							<TextField
								size="small"
								type="number"
								label="Size"
								value={ g.size || 0 }
								onChange={ ( e ) => updateGroup( g.id, { size: Math.max( 0, parseInt( e.target.value, 10 ) || 0 ) } ) }
								sx={ { width: 90 } }
							/>
							<Chip
								label={ `${ g.guestCount || 0 } in` }
								size="small"
								sx={ { bgcolor: tokens.accentSoft, color: tokens.accentDark, fontWeight: 600 } }
							/>
							<Tooltip title={ published ? 'Copy this group’s share link' : 'Publish the event to activate links' }>
								<span>
									<Button size="small" startIcon={ <ContentCopyIcon sx={ { fontSize: 15 } } /> } onClick={ () => onCopy( groupUrl( g.id ) ) } disabled={ ! published }>Link</Button>
								</span>
							</Tooltip>
							<IconButton size="small" onClick={ () => removeGroup( g.id ) } sx={ { color: tokens.muted2 } }><DeleteOutlineIcon fontSize="small" /></IconButton>
						</Stack>
					) ) }
				</Stack>
			) }

			<Divider sx={ { my: 2.5 } } />

			{ /* Prep sheet */ }
			<Stack direction="row" alignItems="center" spacing={ 1 } sx={ { mb: 1.5 } }>
				<RestaurantIcon sx={ { fontSize: 18, color: tokens.ink2 } } />
				<Typography variant="subtitle2" sx={ { color: tokens.ink } }>Kitchen prep sheet</Typography>
				<Chip icon={ <PeopleIcon sx={ { fontSize: 15 } } /> } label={ `${ detail.prep.totalGuests } ordered` } size="small" sx={ { bgcolor: tokens.soft, fontWeight: 600 } } />
				<Box sx={ { flex: 1 } } />
				<Button
					size="small"
					startIcon={ <PrintIcon sx={ { fontSize: 16 } } /> }
					onClick={ printKitchen }
					disabled={ detail.prep.totalGuests === 0 }
					sx={ { color: tokens.accent } }
				>
					Print kitchen sheet
				</Button>
			</Stack>

			{ detail.prep.totalGuests === 0 ? (
				<Typography sx={ { fontSize: 14, color: tokens.muted } }>No guest orders yet. Share the link above to start collecting choices.</Typography>
			) : (
				<Stack direction="row" spacing={ 3 } flexWrap="wrap" useFlexGap>
					<Box sx={ { minWidth: 220 } }>
						<Typography sx={ { fontSize: 12, fontWeight: 700, color: tokens.muted, mb: 0.5 } }>DISHES</Typography>
						<Stack spacing={ 0.5 }>
							{ detail.prep.items.map( ( it ) => (
								<Stack key={ it.id } direction="row" justifyContent="space-between" sx={ { fontSize: 14 } }>
									<span>{ it.title }</span>
									<strong>×{ it.count }</strong>
								</Stack>
							) ) }
						</Stack>
					</Box>
					{ detail.prep.allergens.length > 0 && (
						<Box sx={ { minWidth: 220 } }>
							<Stack direction="row" alignItems="center" spacing={ 0.5 } sx={ { mb: 0.5 } }>
								<WarningAmberIcon sx={ { fontSize: 15, color: tokens.amber } } />
								<Typography sx={ { fontSize: 12, fontWeight: 700, color: tokens.amber } }>ALLERGENS</Typography>
							</Stack>
							<Stack spacing={ 0.5 }>
								{ detail.prep.allergens.map( ( a ) => (
									<Typography key={ a.name } sx={ { fontSize: 13 } }>
										<strong>{ a.name }</strong>: { a.guests.join( ', ' ) }
									</Typography>
								) ) }
							</Stack>
						</Box>
					) }
				</Stack>
			) }

			{ /* Guests */ }
			{ detail.guests.length > 0 && (
				<>
					<Divider sx={ { my: 2.5 } } />
					<Typography variant="subtitle2" sx={ { color: tokens.ink, mb: 1 } }>Guests</Typography>
					<Stack spacing={ 1 }>
						{ detail.guests.map( ( g ) => (
							<GuestRow
								key={ g.id }
								guest={ g }
								groups={ groups }
								courses={ detail.courses || [] }
								itemName={ itemName }
								groupName={ groupName }
								onSave={ onEditGuest }
								onRemove={ () => onRemoveGuest( g.id ) }
							/>
						) ) }
					</Stack>
				</>
			) }
		</Box>
	);
}

/**
 * One guest in the event's guest list. Read-only by default; click the pencil to
 * fix a typo in the name, correct a course choice, reassign a company, or edit
 * notes. Names must contain a letter — the server rejects numeric-only names.
 */
function GuestRow( { guest, groups, courses, itemName, groupName, onSave, onRemove } ) {
	const [ editing, setEditing ] = useState( false );
	const [ name, setName ] = useState( guest.name );
	const [ group, setGroup ] = useState( guest.group || '' );
	const [ selections, setSelections ] = useState( guest.selections || {} );
	const [ notes, setNotes ] = useState( guest.notes || '' );
	const [ err, setErr ] = useState( '' );
	const [ busy, setBusy ] = useState( false );

	const start = () => {
		setName( guest.name );
		setGroup( guest.group || '' );
		setSelections( guest.selections || {} );
		setNotes( guest.notes || '' );
		setErr( '' );
		setEditing( true );
	};
	const save = async () => {
		if ( ! /\p{L}/u.test( name || '' ) ) {
			setErr( 'Please enter a real name, not just a number.' );
			return;
		}
		setBusy( true );
		setErr( '' );
		try {
			await onSave( guest.id, { name: name.trim(), group, selections, notes } );
			setEditing( false );
		} catch ( e ) {
			setErr( ( e && e.message ) || 'Could not save the guest.' );
		} finally {
			setBusy( false );
		}
	};

	if ( editing ) {
		return (
			<Box sx={ { bgcolor: tokens.soft, borderRadius: 2, p: 1.5, border: `1px solid ${ tokens.accent }` } }>
				<Stack spacing={ 1.25 }>
					<Stack direction="row" spacing={ 1 } flexWrap="wrap" useFlexGap>
						<TextField label="Name" size="small" value={ name } onChange={ ( e ) => setName( e.target.value ) } sx={ { flex: 1, minWidth: 160 } } />
						{ groups.length > 0 && (
							<Select size="small" value={ group } displayEmpty onChange={ ( e ) => setGroup( e.target.value ) } sx={ { minWidth: 150 } }>
								<MenuItem value="">No company</MenuItem>
								{ groups.map( ( gr ) => (
									<MenuItem key={ gr.id } value={ gr.id }>{ gr.name }</MenuItem>
								) ) }
							</Select>
						) }
					</Stack>
					{ courses.map( ( c ) => (
						<Stack key={ c.id } direction="row" alignItems="center" spacing={ 1 }>
							<Typography sx={ { fontSize: 12.5, color: tokens.muted, width: 100, flexShrink: 0 } } noWrap>{ c.name || 'Course' }</Typography>
							<Select
								size="small"
								value={ selections[ c.id ] || '' }
								displayEmpty
								onChange={ ( e ) => setSelections( ( s ) => ( { ...s, [ c.id ]: e.target.value } ) ) }
								sx={ { flex: 1 } }
							>
								<MenuItem value="">No choice</MenuItem>
								{ c.items.map( ( it ) => (
									<MenuItem key={ it.id } value={ it.id }>{ it.title }</MenuItem>
								) ) }
							</Select>
						</Stack>
					) ) }
					<TextField label="Notes" size="small" value={ notes } onChange={ ( e ) => setNotes( e.target.value ) } multiline />
					{ err && <Typography sx={ { fontSize: 12.5, color: tokens.red } }>{ err }</Typography> }
					<Stack direction="row" spacing={ 1 } justifyContent="flex-end">
						<Button size="small" onClick={ () => setEditing( false ) } disabled={ busy }>Cancel</Button>
						<Button size="small" variant="contained" onClick={ save } disabled={ busy }>Save</Button>
					</Stack>
				</Stack>
			</Box>
		);
	}

	return (
		<Stack direction="row" alignItems="center" spacing={ 1.5 } sx={ { bgcolor: tokens.soft, borderRadius: 2, p: 1.25 } }>
			<Box sx={ { flex: 1, minWidth: 0 } }>
				<Stack direction="row" alignItems="center" spacing={ 0.75 }>
					<Typography sx={ { fontWeight: 700, fontSize: 14 } }>{ guest.name }</Typography>
					{ guest.group && groupName( guest.group ) && (
						<Chip label={ groupName( guest.group ) } size="small" sx={ { height: 18, fontSize: 10, fontWeight: 600, bgcolor: tokens.accentSoft, color: tokens.accentDark } } />
					) }
				</Stack>
				<Typography sx={ { fontSize: 12, color: tokens.muted } } noWrap>
					{ Object.values( guest.selections ).map( ( id ) => itemName( id ) ).join( ' · ' ) || 'No choices' }
					{ guest.notes ? ` — ${ guest.notes }` : '' }
				</Typography>
			</Box>
			{ guest.allergens.length > 0 && (
				<Chip label={ `${ guest.allergens.length } allergen${ guest.allergens.length === 1 ? '' : 's' }` } size="small" sx={ { bgcolor: tokens.amberSoft, color: tokens.amber, fontWeight: 600 } } />
			) }
			<IconButton size="small" onClick={ start } sx={ { color: tokens.muted2 } }><EditOutlinedIcon fontSize="small" /></IconButton>
			<IconButton size="small" onClick={ onRemove } sx={ { color: tokens.muted2 } }><DeleteOutlineIcon fontSize="small" /></IconButton>
		</Stack>
	);
}
