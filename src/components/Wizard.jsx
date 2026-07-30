import React, { useMemo, useState } from 'react';
import {
	Box,
	Typography,
	TextField,
	Button,
	Stack,
	Alert,
	CircularProgress,
} from '../ui';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TakeoutDiningIcon from '@mui/icons-material/TakeoutDining';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TranslateIcon from '@mui/icons-material/Translate';
import { tokens } from '../theme';
import { api } from '../api/client';
import { useI18n } from '../lib/i18n';

const DAYS = [
	[ 'mon', 'Monday' ], [ 'tue', 'Tuesday' ], [ 'wed', 'Wednesday' ], [ 'thu', 'Thursday' ],
	[ 'fri', 'Friday' ], [ 'sat', 'Saturday' ], [ 'sun', 'Sunday' ],
];

// Mirrors Hours\default_week() on the server.
const defaultWeek = () =>
	Object.fromEntries( DAYS.map( ( [ k ] ) => [ k, [ { open: '12:00', close: '22:00' } ] ] ) );

// Brand mark — matches the sidebar logo.
function Mark( { size = 44 } ) {
	return (
		<Box
			sx={ {
				width: size,
				height: size,
				borderRadius: '12px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				mx: 'auto',
				mb: 2,
				background: `linear-gradient(135deg, #6366f1 0%, ${ tokens.accentDark } 100%)`,
				boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 4px 14px rgba(79,70,229,.35)',
			} }
		>
			<RestaurantIcon sx={ { fontSize: size * 0.5, color: '#fff' } } />
		</Box>
	);
}

// Step progress dots.
function Dots( { count, active } ) {
	return (
		<Stack direction="row" spacing={ 0.75 } justifyContent="center" sx={ { mb: 3 } }>
			{ Array.from( { length: count } ).map( ( _, i ) => (
				<Box
					key={ i }
					sx={ {
						height: 6,
						borderRadius: 999,
						width: i === active ? 22 : 6,
						bgcolor: i === active ? tokens.accent : i < active ? `${ tokens.accent }66` : tokens.border2,
						transition: 'all .25s ease',
					} }
				/>
			) ) }
		</Stack>
	);
}

// Opening hours, pre-filled and adjustable right here.
function HoursStep( { week, setWeek } ) {
	const { t } = useI18n();
	const setDay = ( key, patch ) =>
		setWeek( ( w ) => {
			const periods = w[ key ] || [];
			if ( patch.closed ) {
				return { ...w, [ key ]: [] };
			}
			const base = periods[ 0 ] || { open: '12:00', close: '22:00' };
			return { ...w, [ key ]: [ { ...base, ...patch } ] };
		} );

	const copyToAll = ( key ) =>
		setWeek( ( w ) => {
			const src = ( w[ key ] || [] ).map( ( p ) => ( { ...p } ) );
			const next = { ...w };
			DAYS.forEach( ( [ d ] ) => { next[ d ] = src.map( ( p ) => ( { ...p } ) ); } );
			return next;
		} );

	return (
		<Stack spacing={ 0.75 } sx={ { width: '100%', maxWidth: 460 } }>
			{ DAYS.map( ( [ key, label ] ) => {
				const periods = week[ key ] || [];
				const closed = periods.length === 0;
				const p = periods[ 0 ] || { open: '12:00', close: '22:00' };
				return (
					<Stack
						key={ key }
						direction="row"
						alignItems="center"
						spacing={ 1 }
						sx={ {
							px: 1.5, py: 0.75, borderRadius: '10px',
							border: `1px solid ${ tokens.border }`,
							bgcolor: closed ? tokens.soft : tokens.surface,
						} }
					>
						<Typography sx={ { width: 96, textAlign: 'left', fontWeight: 550, fontSize: 14, color: closed ? tokens.muted2 : tokens.ink } }>
							{ label }
						</Typography>
						{ closed ? (
							<Typography sx={ { flex: 1, textAlign: 'left', fontSize: 13, color: tokens.muted2 } }>{ t( 'wizard.closed', 'Closed' ) }</Typography>
						) : (
							<Stack direction="row" alignItems="center" spacing={ 0.75 } sx={ { flex: 1 } }>
								<TextField
									type="time" size="small" value={ p.open }
									onChange={ ( e ) => setDay( key, { open: e.target.value } ) }
									sx={ { width: 116 } }
								/>
								<Typography sx={ { color: tokens.muted2, fontSize: 13 } }>-</Typography>
								<TextField
									type="time" size="small" value={ p.close }
									onChange={ ( e ) => setDay( key, { close: e.target.value } ) }
									sx={ { width: 116 } }
								/>
							</Stack>
						) }
						<Button
							variant="text" size="small"
							onClick={ () => copyToAll( key ) }
							sx={ { color: tokens.muted2, minWidth: 0, px: 0.75, fontSize: 12 } }
							title="Copy this day's hours to every day"
						>
							{ t( 'wizard.copy_all', 'Copy to all' ) }
						</Button>
						<Button
							variant="text" size="small"
							onClick={ () => setDay( key, closed ? { open: '12:00', close: '22:00' } : { closed: true } ) }
							sx={ { color: tokens.muted, minWidth: 64 } }
						>
							{ closed ? t( 'wizard.open', 'Open' ) : t( 'wizard.close', 'Close' ) }
						</Button>
					</Stack>
				);
			} ) }
		</Stack>
	);
}

export default function Wizard( { onDone } ) {
	const [ step, setStep ] = useState( 0 );
	const [ name, setName ] = useState( '' );
	const [ type, setType ] = useState( '' );
	const [ tables, setTables ] = useState( 6 );
	const [ seedSample, setSeedSample ] = useState( true );
	const [ week, setWeek ] = useState( defaultWeek );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ done, setDone ] = useState( null );
	const { lang, setLang, t } = useI18n();

	const typesList = [
		{ key: 'dinein', label: t( 'wizard.dinein', 'Dine-in' ), desc: t( 'wizard.dinein_desc', 'Tables & bookings' ), icon: RestaurantIcon, fg: tokens.accent, bg: tokens.accentSoft },
		{ key: 'takeaway', label: t( 'wizard.takeaway', 'Takeaway' ), desc: t( 'wizard.takeaway_desc', 'Order & collect' ), icon: TakeoutDiningIcon, fg: tokens.violet, bg: tokens.violetSoft },
		{ key: 'both', label: t( 'wizard.both', 'Both' ), desc: t( 'wizard.both_desc', 'Dine-in + takeaway' ), icon: StorefrontIcon, fg: tokens.sky, bg: tokens.skySoft },
	];

	const steps = useMemo( () => {
		const list = [ 'welcome', 'type' ];
		if ( type !== 'takeaway' ) {
			list.push( 'tables' );
		}
		list.push( 'menu', 'hours' );
		return list;
	}, [ type ] );

	const current = steps[ Math.min( step, steps.length - 1 ) ];
	const isLast = step >= steps.length - 1;

	const canNext =
		( 'welcome' === current && name.trim() ) ||
		( 'type' === current && type ) ||
		'tables' === current ||
		'menu' === current ||
		'hours' === current;

	const finish = ( skip = false ) => {
		setBusy( true );
		setError( '' );
		api.runWizard( {
			name: name.trim(),
			businessType: type || 'both',
			seedSample: skip ? false : seedSample,
			tables: skip || type === 'takeaway' ? 0 : tables,
			hours: skip ? undefined : week,
		} )
			.then( ( res ) => {
				setDone( { ...res, skipped: skip, seeded: skip ? false : seedSample } );
				setBusy( false );
			} )
			.catch( ( e ) => {
				setError( e.message || 'Something went wrong.' );
				setBusy( false );
			} );
	};

	const next = () => {
		if ( isLast ) {
			finish();
		} else {
			setStep( ( s ) => s + 1 );
		}
	};
	const back = () => setStep( ( s ) => Math.max( 0, s - 1 ) );

	if ( done ) {
		return (
			<Box sx={ panelSx }>
				<Box
					sx={ {
						width: 64,
						height: 64,
						borderRadius: '50%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						mx: 'auto',
						mb: 2,
						background: `radial-gradient(circle at 50% 35%, ${ tokens.greenSoft } 0%, #ffffff 90%)`,
						border: `1px solid ${ tokens.border }`,
					} }
				>
					<CheckCircleIcon sx={ { fontSize: 34, color: tokens.green } } />
				</Box>
				<Typography variant="h5" sx={ { mb: 1 } }>
					{ done.skipped ? t( 'wizard.done_skipped', 'Setup skipped' ) : t( 'wizard.done_title', 'You’re all set!' ) }
				</Typography>

				<Stack direction="row" spacing={ 1.5 } justifyContent="center">
					<Button
						variant="contained"
						onClick={ () => {
							window.location.hash = done.skipped ? '#/home' : '#/builder';
							window.location.reload();
						} }
					>
						{ done.skipped ? t( 'wizard.go_dashboard', 'Go to dashboard' ) : t( 'wizard.start_building', 'Start building' ) }
					</Button>
				</Stack>
			</Box>
		);
	}

	return (
		<Box sx={ panelSx }>
			{ /* Language Switcher at Top of Wizard */ }
			<Box sx={ { width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 1 } }>
				<Button
					size="small"
					variant="outlined"
					startIcon={ <TranslateIcon sx={ { fontSize: 16 } } /> }
					onClick={ () => setLang( lang === 'ar' ? 'en' : 'ar' ) }
					sx={ { borderRadius: 999, fontSize: 12, px: 1.5 } }
				>
					{ lang === 'ar' ? 'العربية' : 'English' }
				</Button>
			</Box>

			<Dots count={ steps.length } active={ step } />

			{ error && <Alert severity="error" sx={ { mb: 2, width: '100%', maxWidth: 460 } }>{ error }</Alert> }

			{ 'welcome' === current && (
				<>
					<Mark />
					<Typography variant="h5" sx={ { mb: 1 } }>{ t( 'wizard.welcome_title', 'Welcome to DineKit' ) }</Typography>
					<Typography sx={ { color: tokens.muted, mb: 3, maxWidth: 460 } }>
						{ t( 'wizard.welcome_desc', 'Let’s set you up in a minute. What’s your place called?' ) }
					</Typography>
					<TextField
						label={ t( 'wizard.restaurant_name', 'Restaurant name' ) }
						placeholder={ t( 'wizard.name_placeholder', 'e.g. The Copper Kettle' ) }
						value={ name }
						onChange={ ( e ) => setName( e.target.value ) }
						onKeyDown={ ( e ) => e.key === 'Enter' && name.trim() && next() }
						sx={ { width: '100%', maxWidth: 420 } }
					/>
				</>
			) }

			{ 'type' === current && (
				<>
					<Typography variant="h5" sx={ { mb: 1 } }>{ t( 'wizard.serve_title', 'How do you serve?' ) }</Typography>
					<Typography sx={ { color: tokens.muted, mb: 3, maxWidth: 460 } }>
						{ t( 'wizard.serve_desc', 'We’ll switch on the right tools — and hide the ones you don’t need.' ) }
					</Typography>
					<Stack direction={ { xs: 'column', sm: 'row' } } spacing={ 1.5 } sx={ { width: '100%', maxWidth: 480 } }>
						{ typesList.map( ( tItem ) => {
							const Icon = tItem.icon;
							const on = type === tItem.key;
							return (
								<Box
									key={ tItem.key }
									onClick={ () => setType( tItem.key ) }
									sx={ {
										flex: 1,
										p: 2.25,
										borderRadius: '12px',
										cursor: 'pointer',
										textAlign: 'center',
										border: `2px solid ${ on ? tokens.accent : tokens.border }`,
										bgcolor: tokens.surface,
										boxShadow: on ? `0 0 0 3px ${ tokens.accentSoft }` : 'none',
										transition: 'all 0.15s ease',
										'&:hover': { borderColor: on ? tokens.accent : tokens.border2, boxShadow: on ? `0 0 0 3px ${ tokens.accentSoft }` : tokens.shadowMd, transform: 'translateY(-1px)' },
									} }
								>
									<Box
										sx={ {
											width: 44,
											height: 44,
											borderRadius: '10px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											mx: 'auto',
											mb: 1,
											bgcolor: tItem.bg,
										} }
									>
										<Icon sx={ { fontSize: 24, color: tItem.fg } } />
									</Box>
									<Typography sx={ { fontWeight: 650, color: on ? tokens.accentDark : tokens.ink } }>{ tItem.label }</Typography>
									<Typography sx={ { fontSize: 12, color: tokens.muted } }>{ tItem.desc }</Typography>
								</Box>
							);
						} ) }
					</Stack>
				</>
			) }

			{ 'tables' === current && (
				<>
					<RestaurantIcon sx={ { fontSize: 40, color: tokens.accent, mb: 1 } } />
					<Typography variant="h5" sx={ { mb: 1 } }>{ t( 'wizard.tables_title', 'Add some tables' ) }</Typography>
					<Typography sx={ { color: tokens.muted, mb: 3, maxWidth: 460 } }>
						{ t( 'wizard.tables_desc', 'We’ll drop this many tables into your restaurant floor plan.' ) }
					</Typography>
					<TextField
						type="number"
						label={ t( 'wizard.num_tables', 'Number of tables' ) }
						value={ tables }
						onChange={ ( e ) => setTables( Math.max( 0, Math.min( 50, parseInt( e.target.value, 10 ) || 0 ) ) ) }
						inputProps={ { min: 0, max: 50 } }
						sx={ { width: 160 } }
						helperText={ t( 'wizard.tables_helper', '0 to skip for now' ) }
					/>
				</>
			) }

			{ 'menu' === current && (
				<>
					<AutoAwesomeIcon sx={ { fontSize: 40, color: tokens.accent, mb: 1 } } />
					<Typography variant="h5" sx={ { mb: 1 } }>{ t( 'wizard.menu_title', 'Your menu' ) }</Typography>
					<Typography sx={ { color: tokens.muted, mb: 3, maxWidth: 460 } }>
						{ t( 'wizard.menu_desc', 'Start from a sample you can edit, or a clean slate.' ) }
					</Typography>
					<Stack direction={ { xs: 'column', sm: 'row' } } spacing={ 1.5 } sx={ { width: '100%', maxWidth: 460 } }>
						{ [
							{ k: true, t: t( 'wizard.sample_menu', 'Sample menu' ), d: t( 'wizard.sample_desc', 'Starters, mains & desserts to edit' ) },
							{ k: false, t: t( 'wizard.blank_menu', 'Start blank' ), d: t( 'wizard.blank_desc', 'Build from scratch' ) },
						].map( ( o ) => {
							const on = seedSample === o.k;
							return (
								<Box
									key={ String( o.k ) }
									onClick={ () => setSeedSample( o.k ) }
									sx={ {
										flex: 1, p: 2.25, borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
										border: `2px solid ${ on ? tokens.accent : tokens.border }`,
										bgcolor: tokens.surface,
										boxShadow: on ? `0 0 0 3px ${ tokens.accentSoft }` : 'none',
										transition: 'all 0.15s ease',
										'&:hover': { borderColor: on ? tokens.accent : tokens.border2 },
									} }
								>
									<Typography sx={ { fontWeight: 650, color: on ? tokens.accentDark : tokens.ink } }>{ o.t }</Typography>
									<Typography sx={ { fontSize: 12, color: tokens.muted } }>{ o.d }</Typography>
								</Box>
							);
						} ) }
					</Stack>
				</>
			) }

			{ 'hours' === current && (
				<>
					<ScheduleIcon sx={ { fontSize: 40, color: tokens.accent, mb: 1 } } />
					<Typography variant="h5" sx={ { mb: 1 } }>{ t( 'wizard.hours_title', 'When are you open?' ) }</Typography>
					<Typography sx={ { color: tokens.muted, mb: 3, maxWidth: 460 } }>
						{ t( 'wizard.hours_desc', 'These drive your booking times and when you stop taking orders.' ) }
					</Typography>
					<HoursStep week={ week } setWeek={ setWeek } />
				</>
			) }

			<Stack direction="row" spacing={ 1.5 } sx={ { mt: 4 } }>
				{ step > 0 && (
					<Button variant="text" onClick={ back } disabled={ busy } sx={ { color: tokens.muted } }>{ t( 'wizard.back', 'Back' ) }</Button>
				) }
				<Button
					variant="contained"
					size="large"
					onClick={ next }
					disabled={ busy || ! canNext }
					startIcon={ busy ? <CircularProgress size={ 18 } color="inherit" /> : null }
				>
					{ isLast ? ( busy ? t( 'wizard.setting_up', 'Setting up…' ) : t( 'wizard.finish', 'Finish' ) ) : t( 'wizard.continue', 'Continue' ) }
				</Button>
			</Stack>

			<Button
				variant="text"
				size="small"
				onClick={ () => finish( true ) }
				disabled={ busy }
				sx={ { mt: 1.5, color: tokens.muted2, fontWeight: 500 } }
			>
				{ t( 'wizard.skip', 'Skip setup — I’ll do it myself' ) }
			</Button>
		</Box>
	);
}

const panelSx = {
	bgcolor: tokens.surface,
	border: `1px solid ${ tokens.border }`,
	borderRadius: '16px',
	p: { xs: 4, sm: 6 },
	textAlign: 'center',
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	maxWidth: 660,
	mx: 'auto',
	mt: 5,
	boxShadow: tokens.shadow,
	background: `linear-gradient(180deg, #fdfdff 0%, #ffffff 30%)`,
};
