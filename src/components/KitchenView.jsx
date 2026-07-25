import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, Button, IconButton, Chip, CircularProgress, Tooltip } from '../ui';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { tokens } from '../theme';
import { api } from '../api/client';

// The kitchen flow, left → right. Tapping a card's button advances it; from
// "ready" it leaves the board (completed).
const COLUMNS = [
	{ key: 'new', label: 'New', next: 'preparing', action: 'Start', fg: '#b45309', bg: '#fffbeb', bar: tokens.amber || '#f59e0b' },
	{ key: 'preparing', label: 'Preparing', next: 'ready', action: 'Ready', fg: tokens.accentDark || '#4f46e5', bg: tokens.accentSoft || '#eef2ff', bar: tokens.accent },
	{ key: 'ready', label: 'Ready', next: 'completed', action: 'Done', fg: '#166534', bg: '#f0fdf4', bar: tokens.green || '#16a34a' },
];

const POLL_MS = 12000;

function minutesSince( iso ) {
	if ( ! iso ) {
		return 0;
	}
	const t = new Date( iso.replace( ' ', 'T' ) ).getTime();
	if ( Number.isNaN( t ) ) {
		return 0;
	}
	return Math.max( 0, Math.floor( ( Date.now() - t ) / 60000 ) );
}

// Timer colour escalates the longer a ticket waits.
function timerTone( mins ) {
	if ( mins >= 15 ) {
		return { fg: '#fff', bg: '#dc2626' };
	}
	if ( mins >= 8 ) {
		return { fg: '#7c2d12', bg: '#fed7aa' };
	}
	return { fg: tokens.muted, bg: tokens.soft };
}

function typeMeta( o ) {
	if ( o.table ) {
		return { icon: <TableRestaurantIcon sx={ { fontSize: 15 } } />, label: o.table };
	}
	if ( o.fulfilment === 'delivery' ) {
		return { icon: <TwoWheelerIcon sx={ { fontSize: 15 } } />, label: 'Delivery' };
	}
	return { icon: <ShoppingBagIcon sx={ { fontSize: 15 } } />, label: 'Collection' };
}

function itemLine( li ) {
	const extra = ( li.chosen || [] ).map( ( c ) => c.label ).concat( ( li.removed || [] ).map( ( r ) => `no ${ r }` ) );
	return { qty: li.qty, title: li.title, extra };
}

export default function KitchenView() {
	const [ orders, setOrders ] = useState( null );
	const [ busy, setBusy ] = useState( {} ); // id → true while advancing
	const [ isFull, setIsFull ] = useState( false );
	const [ , setTick ] = useState( 0 ); // forces timers to re-render
	const timer = useRef( null );
	const ticker = useRef( null );
	const rootRef = useRef( null );

	const load = async () => {
		try {
			const list = await api.getOrders();
			setOrders( ( list || [] ).filter( ( o ) => [ 'new', 'preparing', 'ready' ].includes( o.status ) && ! o.archived ) );
		} catch ( e ) {
			// Keep the last board on a transient error rather than blanking the kitchen.
		}
	};

	useEffect( () => {
		load();
		timer.current = window.setInterval( load, POLL_MS );
		ticker.current = window.setInterval( () => setTick( ( n ) => n + 1 ), 20000 );
		const onFs = () => setIsFull( !! document.fullscreenElement );
		document.addEventListener( 'fullscreenchange', onFs );
		return () => {
			window.clearInterval( timer.current );
			window.clearInterval( ticker.current );
			document.removeEventListener( 'fullscreenchange', onFs );
		};
	}, [] );

	const toggleFull = () => {
		if ( document.fullscreenElement ) {
			document.exitFullscreen && document.exitFullscreen();
		} else if ( rootRef.current && rootRef.current.requestFullscreen ) {
			// Fullscreen just the board — a kitchen TV shows only the tickets, not wp-admin.
			rootRef.current.requestFullscreen();
		}
	};

	const advance = async ( order, next ) => {
		setBusy( ( b ) => ( { ...b, [ order.id ]: true } ) );
		// Optimistic: drop or move the card immediately so the kitchen feels instant.
		setOrders( ( list ) =>
			next === 'completed'
				? list.filter( ( o ) => o.id !== order.id )
				: list.map( ( o ) => ( o.id === order.id ? { ...o, status: next } : o ) )
		);
		try {
			await api.updateOrder( order.id, { status: next } );
		} catch ( e ) {
			load(); // Reconcile if the write failed.
		} finally {
			setBusy( ( b ) => { const n = { ...b }; delete n[ order.id ]; return n; } );
		}
	};

	const byColumn = useMemo( () => {
		const map = { new: [], preparing: [], ready: [] };
		( orders || [] ).forEach( ( o ) => { if ( map[ o.status ] ) { map[ o.status ].push( o ); } } );
		// Oldest first — cook in the order tickets arrived.
		Object.values( map ).forEach( ( arr ) => arr.sort( ( a, b ) => String( a.placed ).localeCompare( String( b.placed ) ) ) );
		return map;
	}, [ orders ] );

	const total = ( orders || [] ).length;

	return (
		<Box
			ref={ rootRef }
			sx={ {
				minHeight: 'calc(100vh - 120px)',
				display: 'flex',
				flexDirection: 'column',
				// When fullscreened (kitchen TV), fill the screen with its own surface.
				...( isFull ? { bgcolor: tokens.bg, p: 3, minHeight: '100vh', overflow: 'auto' } : {} ),
			} }
		>
			{ /* Header bar */ }
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={ { mb: 2, flexWrap: 'wrap', gap: 1 } }>
				<Stack direction="row" alignItems="center" spacing={ 1.5 }>
					<RestaurantIcon sx={ { color: tokens.accent, fontSize: 26 } } />
					<Typography variant="h5">Kitchen Display</Typography>
					<Chip
						label={ `${ total } active` }
						size="small"
						sx={ { bgcolor: tokens.accentSoft, color: tokens.accentDark || tokens.accent, fontWeight: 700 } }
					/>
				</Stack>
				<Stack direction="row" alignItems="center" spacing={ 1 }>
					<Typography sx={ { fontSize: 12.5, color: tokens.muted2 } }>Auto-refreshing</Typography>
					<Tooltip title="Refresh now">
						<IconButton size="small" onClick={ load } sx={ { color: tokens.muted } }><RefreshIcon fontSize="small" /></IconButton>
					</Tooltip>
					<Button
						size="small"
						variant="outlined"
						startIcon={ isFull ? <FullscreenExitIcon /> : <FullscreenIcon /> }
						onClick={ toggleFull }
					>
						{ isFull ? 'Exit full screen' : 'Full screen' }
					</Button>
				</Stack>
			</Stack>

			{ orders === null ? (
				<Box sx={ { display: 'flex', justifyContent: 'center', py: 10 } }><CircularProgress /></Box>
			) : (
				<Box
					sx={ {
						flex: 1,
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
						gap: 2,
						alignItems: 'start',
					} }
				>
					{ COLUMNS.map( ( col ) => {
						const list = byColumn[ col.key ];
						return (
							<Box key={ col.key } sx={ { bgcolor: tokens.surface, border: `1px solid ${ tokens.border }`, borderRadius: '14px', overflow: 'hidden', minHeight: 120 } }>
								<Box sx={ { px: 2, py: 1.25, bgcolor: col.bg, borderBottom: `2px solid ${ col.bar }`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }>
									<Typography sx={ { fontWeight: 800, fontSize: 14, color: col.fg, textTransform: 'uppercase', letterSpacing: '0.03em' } }>{ col.label }</Typography>
									<Typography sx={ { fontWeight: 800, fontSize: 14, color: col.fg } }>{ list.length }</Typography>
								</Box>
								<Stack spacing={ 1.5 } sx={ { p: 1.5 } }>
									{ list.length === 0 ? (
										<Typography sx={ { fontSize: 13, color: tokens.muted2, textAlign: 'center', py: 3 } }>—</Typography>
									) : (
										list.map( ( o ) => {
											const mins = minutesSince( o.placed );
											const tone = timerTone( mins );
											const t = typeMeta( o );
											return (
												<Box key={ o.id } sx={ { border: `1px solid ${ tokens.border }`, borderLeft: `4px solid ${ col.bar }`, borderRadius: '10px', bgcolor: tokens.bg, overflow: 'hidden' } }>
													<Box sx={ { px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 } }>
														<Stack direction="row" alignItems="center" spacing={ 0.75 } sx={ { minWidth: 0 } }>
															<Typography sx={ { fontWeight: 800, fontSize: 16 } }>#{ o.number }</Typography>
															<Stack direction="row" alignItems="center" spacing={ 0.4 } sx={ { color: tokens.muted } }>
																{ t.icon }
																<Typography sx={ { fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 } }>{ t.label }</Typography>
															</Stack>
														</Stack>
														<Box sx={ { px: 0.9, py: 0.2, borderRadius: 999, bgcolor: tone.bg, color: tone.fg, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' } }>
															{ mins }m
														</Box>
													</Box>
													<Stack spacing={ 0.4 } sx={ { px: 1.5, pb: 1 } }>
														{ ( o.items || [] ).map( ( li, i ) => {
															const line = itemLine( li );
															return (
																<Box key={ i }>
																	<Typography sx={ { fontSize: 14, fontWeight: 600, lineHeight: 1.35 } }>
																		<Box component="span" sx={ { color: tokens.accent, fontWeight: 800 } }>{ line.qty }× </Box>
																		{ line.title }
																	</Typography>
																	{ line.extra.length > 0 && (
																		<Typography sx={ { fontSize: 12.5, color: tokens.muted, pl: 2 } }>{ line.extra.join( ', ' ) }</Typography>
																	) }
																</Box>
															);
														} ) }
														{ o.notes && (
															<Box sx={ { mt: 0.5, px: 1, py: 0.6, bgcolor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px' } }>
																<Typography sx={ { fontSize: 12.5, color: '#92400e', fontWeight: 600 } }>📝 { o.notes }</Typography>
															</Box>
														) }
													</Stack>
													<Button
														fullWidth
														onClick={ () => advance( o, col.next ) }
														disabled={ !! busy[ o.id ] }
														sx={ {
															borderRadius: 0,
															py: 1,
															fontWeight: 800,
															fontSize: 13.5,
															color: '#fff',
															bgcolor: col.bar,
															'&:hover': { bgcolor: col.fg },
														} }
													>
														{ busy[ o.id ] ? <CircularProgress size={ 16 } color="inherit" /> : col.action }
													</Button>
												</Box>
											);
										} )
									) }
								</Stack>
							</Box>
						);
					} ) }
				</Box>
			) }
		</Box>
	);
}
