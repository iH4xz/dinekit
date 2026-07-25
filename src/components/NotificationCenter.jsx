import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Stack, IconButton, Menu, MenuItem, ListItemIcon, Tooltip } from '../ui';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { tokens } from '../theme';
import { api } from '../api/client';

// How often to refresh the count in the background. Local data only — no
// external calls — so a gentle poll keeps the badge honest during service.
const POLL_MS = 60000;

const ICONS = {
	orders: <ReceiptLongIcon fontSize="small" />,
	bookings: <EventSeatIcon fontSize="small" />,
	waitlist: <HourglassEmptyIcon fontSize="small" />,
	leave: <BeachAccessIcon fontSize="small" />,
};

const TONES = {
	accent: tokens.accent,
	amber: tokens.amber || '#b45309',
	violet: tokens.violet || tokens.accent,
	neutral: tokens.muted,
};

export default function NotificationCenter( { navigate } ) {
	const [ data, setData ] = useState( { items: [], total: 0 } );
	const [ anchor, setAnchor ] = useState( null );
	const timer = useRef( null );

	const refresh = async () => {
		try {
			const res = await api.getNotifications();
			setData( { items: res.items || [], total: res.total || 0 } );
		} catch ( e ) {
			// Silent: notifications are a convenience, never block the app on them.
		}
	};

	useEffect( () => {
		refresh();
		timer.current = window.setInterval( refresh, POLL_MS );
		return () => window.clearInterval( timer.current );
	}, [] );

	const open = ( e ) => {
		setAnchor( e.currentTarget );
		refresh(); // Freshen the moment they look.
	};

	const go = ( item ) => {
		setAnchor( null );
		if ( navigate ) {
			navigate( item.view );
		}
	};

	const { items, total } = data;
	const badge = total > 9 ? '9+' : String( total );

	return (
		<>
			<Box sx={ { position: 'relative', display: 'inline-flex' } }>
				<Tooltip title={ total > 0 ? `${ total } item${ total === 1 ? '' : 's' } need your attention` : 'Notifications' }>
					<IconButton
						size="small"
						onClick={ open }
						aria-label="Notifications"
						sx={ { color: tokens.muted, '&:hover': { color: tokens.ink, bgcolor: tokens.soft } } }
					>
						<NotificationsNoneIcon sx={ { fontSize: 20 } } />
					</IconButton>
				</Tooltip>
				{ total > 0 && (
					<Box
						sx={ {
							position: 'absolute',
							top: 1,
							right: 1,
							minWidth: 16,
							height: 16,
							px: 0.5,
							borderRadius: 999,
							bgcolor: '#ef4444',
							color: '#fff',
							fontSize: 10,
							fontWeight: 700,
							lineHeight: '16px',
							textAlign: 'center',
							pointerEvents: 'none',
							boxShadow: `0 0 0 2px ${ tokens.surface }`,
						} }
					>
						{ badge }
					</Box>
				) }
			</Box>

			<Menu
				anchorEl={ anchor }
				open={ !! anchor }
				onClose={ () => setAnchor( null ) }
				anchorOrigin={ { vertical: 'bottom', horizontal: 'right' } }
				transformOrigin={ { vertical: 'top', horizontal: 'right' } }
			>
				<Box sx={ { px: 2, pt: 1.25, pb: 1, minWidth: 268 } }>
					<Typography sx={ { fontSize: 13, fontWeight: 700, color: tokens.ink } }>
						Needs your attention
					</Typography>
				</Box>

				{ items.length === 0 ? (
					<Box sx={ { px: 2, py: 3, textAlign: 'center' } }>
						<CheckCircleOutlineIcon sx={ { fontSize: 30, color: tokens.green || tokens.accent, mb: 0.5 } } />
						<Typography sx={ { fontSize: 13, color: tokens.muted } }>You&apos;re all caught up.</Typography>
					</Box>
				) : (
					items.map( ( item ) => (
						<MenuItem
							key={ item.key }
							onClick={ () => go( item ) }
							sx={ { fontSize: 13.5, fontWeight: 500, minWidth: 268, py: 1 } }
						>
							<ListItemIcon sx={ { color: TONES[ item.tone ] || tokens.muted, minWidth: '32px !important' } }>
								{ ICONS[ item.key ] || <NotificationsNoneIcon fontSize="small" /> }
							</ListItemIcon>
							<Stack direction="row" alignItems="center" spacing={ 1 } sx={ { flex: 1, justifyContent: 'space-between' } }>
								<span>{ item.label }</span>
							</Stack>
						</MenuItem>
					) )
				) }
			</Menu>
		</>
	);
}
