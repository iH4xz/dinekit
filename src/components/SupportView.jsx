import React, { useEffect, useState } from 'react';
import {
	Box,
	Stack,
	Typography,
	TextField,
	Button,
	Chip,
	Checkbox,
	FormControlLabel,
	CircularProgress,
	Alert,
	Collapse,
	Divider,
	Link,
} from '../ui';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { tokens } from '../theme';
import { api } from '../api/client';
import Page from './ui/Page';
import PageHeader from './ui/PageHeader';
import Card from './ui/Card';

// Bundled self-help: the issues we actually get asked about, answerable in
// under a minute. Shipped inside the plugin — shown without any network call.
const COMMON_FIXES = [
	{
		q: 'My QR code / menu page shows a 404',
		a: 'Go to WordPress Settings → Permalinks and press "Save Changes" (you don\'t need to change anything). This rebuilds the links. Then scan the QR again.',
	},
	{
		q: 'Order or booking emails aren\'t arriving',
		a: 'Most hosts limit plain WordPress email. Install an SMTP plugin (e.g. WP Mail SMTP or FluentSMTP) and connect it to your email provider — DineKit sends through whatever WordPress uses.',
	},
	{
		q: 'Card payments fail or stay in "test" money',
		a: 'Check DineKit → Integrations: the Test/Live switch decides which Stripe keys are used. Test mode only accepts test cards like 4242 4242 4242 4242. Flip to Live (with live keys) for real payments.',
	},
	{
		q: 'I changed the menu but the public page hasn\'t updated',
		a: 'Your host or a caching plugin is probably serving an old copy. Clear the site cache (or your caching plugin\'s cache) and reload with Ctrl+Shift+R.',
	},
	{
		q: 'A dish is sold out — how do I stop orders for it?',
		a: 'In the Menu Builder open the dish and use the "86 / unavailable" toggle. It stays visible on the menu (marked unavailable) but can\'t be ordered.',
	},
	{
		q: 'Bookings show no availability',
		a: 'Availability comes from your Opening Hours — if a day has no hours set, it\'s treated as closed. Check DineKit → Opening Hours, then Booking Settings for party size and table setup.',
	},
	{
		q: 'The booking/order/menu page is missing entirely',
		a: 'The dashboard "Getting started" guide can create these pages for you with one click. Check they\'re published (not draft) under WordPress Pages.',
	},
	{
		q: 'I moved to a new domain or reinstalled — what breaks?',
		a: 'Re-check Stripe webhooks in Integrations (reconnect once), re-print QR codes (they contain your old address), and note your Support ID below so we can link your old support history.',
	},
];

// The hub's status vocabulary, translated to what it means for the customer.
function plainStatus( status ) {
	const s = String( status || 'open' ).toLowerCase();
	if ( [ 'pending', 'answered' ].includes( s ) ) {
		return { label: 'We replied', color: tokens.accent, bg: tokens.accentSoft, unread: true };
	}
	if ( [ 'resolved', 'closed' ].includes( s ) ) {
		return { label: 'Solved', color: tokens.muted, bg: tokens.soft, unread: false };
	}
	return { label: 'Waiting on us', color: '#b45309', bg: '#fef3c7', unread: false };
}

const TYPES = [
	{ key: 'support', label: 'How do I…?' },
	{ key: 'bug', label: 'Something\'s broken' },
	{ key: 'feature', label: 'Suggest an idea' },
];

export default function SupportView( { openTicketId } ) {
	const [ meta, setMeta ] = useState( null );
	const [ tickets, setTickets ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	// 'list' | 'create' | 'single'
	const [ view, setView ] = useState( 'list' );
	const [ activeTicket, setActiveTicket ] = useState( null );
	const [ ticketLoading, setTicketLoading ] = useState( false );

	const [ form, setForm ] = useState( { name: '', email: '', subject: '', message: '', type: 'support', includeEnv: true } );
	const [ sending, setSending ] = useState( false );
	const [ sent, setSent ] = useState( null ); // { email } after a successful send.
	const [ reply, setReply ] = useState( '' );
	const [ fixesOpen, setFixesOpen ] = useState( false );
	const [ openFix, setOpenFix ] = useState( -1 );

	const load = async () => {
		setLoading( true );
		setError( null );
		try {
			const [ m, t ] = await Promise.all( [ api.getSupportMeta(), api.getSupportTickets() ] );
			setMeta( m );
			setTickets( t.items || [] );
			setForm( ( f ) => ( { ...f, name: f.name || m.name || '', email: f.email || m.email || '' } ) );
			if ( t.firstTime ) {
				setView( 'create' );
				setFixesOpen( true );
			}
			// Reply badge: remember what we've now seen so the nav dot can clear.
			try {
				window.localStorage.setItem( 'dinekit_support_unread', ( t.items || [] ).some( ( x ) => plainStatus( x.status ).unread ) ? '1' : '0' );
				window.dispatchEvent( new Event( 'dinekit-support-seen' ) );
			} catch ( e ) { /* storage unavailable — fine */ }
		} catch ( e ) {
			setError( e.message );
		} finally {
			setLoading( false );
		}
	};

	useEffect( () => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	const openTicket = async ( id ) => {
		setView( 'single' );
		setTicketLoading( true );
		setError( null );
		try {
			const data = await api.getSupportTicket( id );
			setActiveTicket( data.ticket );
		} catch ( e ) {
			setError( e.message );
			setView( 'list' );
		} finally {
			setTicketLoading( false );
		}
	};

	// Deep link from the reply email: #/support/<id>.
	useEffect( () => {
		if ( openTicketId ) {
			openTicket( openTicketId );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ openTicketId ] );

	const send = async ( e ) => {
		e.preventDefault();
		setSending( true );
		setError( null );
		try {
			const res = await api.createSupportTicket( form );
			setSent( { email: res.email } );
			setForm( ( f ) => ( { ...f, subject: '', message: '' } ) );
			await load();
			setView( 'list' );
		} catch ( err ) {
			setError( err.message );
		} finally {
			setSending( false );
		}
	};

	const sendReply = async ( e ) => {
		e.preventDefault();
		if ( ! reply.trim() ) {
			return;
		}
		setSending( true );
		setError( null );
		try {
			await api.replySupportTicket( activeTicket.id, reply );
			setReply( '' );
			await openTicket( activeTicket.id );
			load();
		} catch ( err ) {
			setError( err.message );
		} finally {
			setSending( false );
		}
	};

	const markSolved = async () => {
		setSending( true );
		try {
			await api.closeSupportTicket( activeTicket.id );
			await openTicket( activeTicket.id );
			load();
		} catch ( err ) {
			setError( err.message );
		} finally {
			setSending( false );
		}
	};

	const isClosed = activeTicket && [ 'closed', 'resolved' ].includes( String( activeTicket.status ).toLowerCase() );

	return (
		<Page width={ 860 }>
			<PageHeader
				title="Support"
				subtitle="A direct line to the DineKit team — no account needed. Replies land here and in your inbox."
				actions={ view === 'list' && (
					<Button variant="contained" startIcon={ <AddCircleOutlineIcon /> } onClick={ () => { setSent( null ); setView( 'create' ); } }>
						New request
					</Button>
				) }
			/>

			{ error && <Alert severity="error" sx={ { mb: 3 } }>{ error }</Alert> }

			{ sent && view === 'list' && (
				<Alert severity="success" icon={ <CheckCircleIcon /> } sx={ { mb: 3 } }>
					Request sent — we usually reply within 1 business day. We&apos;ll email you at <strong>{ sent.email }</strong>, and the reply appears here too.
				</Alert>
			) }

			{ /* Self-help first: solves the common stuff in under a minute. */ }
			{ view !== 'single' && (
				<Card sx={ { mb: 3, p: 0, overflow: 'hidden' } }>
					<Box
						onClick={ () => setFixesOpen( ( v ) => ! v ) }
						sx={ { display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, cursor: 'pointer', '&:hover': { bgcolor: tokens.soft } } }
					>
						<TipsAndUpdatesIcon sx={ { color: tokens.accent, fontSize: 20 } } />
						<Typography sx={ { fontWeight: 650, fontSize: 14.5, flex: 1 } }>
							Common fixes — the 60-second answers
						</Typography>
						<ExpandMoreIcon sx={ { color: tokens.muted, transform: fixesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' } } />
					</Box>
					<Collapse in={ fixesOpen }>
						<Divider />
						{ COMMON_FIXES.map( ( fix, i ) => (
							<Box key={ fix.q } sx={ { borderTop: i > 0 ? `1px solid ${ tokens.border }` : 'none' } }>
								<Box
									onClick={ () => setOpenFix( openFix === i ? -1 : i ) }
									sx={ { px: 2.5, py: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, '&:hover': { bgcolor: tokens.soft } } }
								>
									<Typography sx={ { fontSize: 13.5, fontWeight: 550, flex: 1 } }>{ fix.q }</Typography>
									<ExpandMoreIcon sx={ { fontSize: 18, color: tokens.muted2, transform: openFix === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' } } />
								</Box>
								<Collapse in={ openFix === i }>
									<Typography sx={ { px: 2.5, pb: 2, fontSize: 13, color: tokens.muted, lineHeight: 1.6 } }>{ fix.a }</Typography>
								</Collapse>
							</Box>
						) ) }
					</Collapse>
				</Card>
			) }

			{ loading && (
				<Box sx={ { display: 'flex', justifyContent: 'center', py: 8 } }><CircularProgress /></Box>
			) }

			{ /* ----- The list of this site's requests ----- */ }
			{ ! loading && view === 'list' && (
				tickets.length === 0 ? (
					<Card sx={ { textAlign: 'center', py: 6 } }>
						<SupportAgentIcon sx={ { fontSize: 44, color: tokens.muted2, mb: 1 } } />
						<Typography sx={ { fontWeight: 700, fontSize: 16 } }>How can we help?</Typography>
						<Typography sx={ { fontSize: 13.5, color: tokens.muted, maxWidth: 400, mx: 'auto', mt: 0.5, mb: 2.5 } }>
							Ask a question, report a problem or suggest an idea — it goes straight to the team that builds DineKit.
						</Typography>
						<Button variant="contained" onClick={ () => { setSent( null ); setView( 'create' ); } }>Start a request</Button>
					</Card>
				) : (
					<Card sx={ { p: 0, overflow: 'hidden' } }>
						{ tickets.map( ( t, i ) => {
							const st = plainStatus( t.status );
							return (
								<Box
									key={ t.id }
									onClick={ () => openTicket( t.id ) }
									sx={ {
										px: 2.5,
										py: 2,
										display: 'flex',
										alignItems: 'center',
										gap: 2,
										cursor: 'pointer',
										borderTop: i > 0 ? `1px solid ${ tokens.border }` : 'none',
										'&:hover': { bgcolor: tokens.soft },
									} }
								>
									<Box sx={ { flex: 1, minWidth: 0 } }>
										<Typography sx={ { fontWeight: 620, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }>
											{ t.subject }
										</Typography>
										<Typography sx={ { fontSize: 12.5, color: tokens.muted2, mt: 0.25 } }>
											#{ t.id } · updated { new Date( ( t.updated_at || '' ).replace( ' ', 'T' ) ).toLocaleDateString() }
										</Typography>
									</Box>
									<Chip label={ st.label } size="small" sx={ { bgcolor: st.bg, color: st.color, fontWeight: 650 } } />
								</Box>
							);
						} ) }
					</Card>
				)
			) }

			{ /* ----- New request ----- */ }
			{ ! loading && view === 'create' && (
				<Card>
					<form onSubmit={ send }>
						<Stack spacing={ 2.5 }>
							<Stack direction="row" spacing={ 1 }>
								{ TYPES.map( ( t ) => (
									<Chip
										key={ t.key }
										label={ t.label }
										onClick={ () => setForm( { ...form, type: t.key } ) }
										sx={ {
											cursor: 'pointer',
											fontWeight: 600,
											bgcolor: form.type === t.key ? tokens.accent : tokens.soft,
											color: form.type === t.key ? '#fff' : tokens.ink,
											'&:hover': { bgcolor: form.type === t.key ? tokens.accentDark : tokens.border },
										} }
									/>
								) ) }
							</Stack>

							<Stack direction={ { xs: 'column', sm: 'row' } } spacing={ 2 }>
								<TextField
									label="Your name"
									value={ form.name }
									onChange={ ( e ) => setForm( { ...form, name: e.target.value } ) }
									size="small"
									fullWidth
								/>
								<TextField
									label="Email for replies"
									type="email"
									required
									value={ form.email }
									onChange={ ( e ) => setForm( { ...form, email: e.target.value } ) }
									size="small"
									fullWidth
								/>
							</Stack>

							<TextField
								label="What's it about?"
								required
								value={ form.subject }
								onChange={ ( e ) => setForm( { ...form, subject: e.target.value } ) }
								size="small"
								fullWidth
							/>
							<TextField
								label="Tell us what's happening"
								required
								multiline
								minRows={ 5 }
								value={ form.message }
								onChange={ ( e ) => setForm( { ...form, message: e.target.value } ) }
								placeholder="The more detail the better — what did you expect, and what happened instead?"
								fullWidth
							/>

							<FormControlLabel
								control={
									<Checkbox
										checked={ form.includeEnv }
										onChange={ ( e ) => setForm( { ...form, includeEnv: e.target.checked } ) }
									/>
								}
								label={
									<Typography sx={ { fontSize: 13, color: tokens.muted } }>
										Include my site details (WordPress, PHP and DineKit versions) — recommended, it helps us fix things faster
									</Typography>
								}
							/>

							<Stack direction="row" spacing={ 1.5 } alignItems="center" justifyContent="flex-end" sx={ { pt: 1, borderTop: `1px solid ${ tokens.border }` } }>
								{ tickets.length > 0 && (
									<Button variant="text" onClick={ () => setView( 'list' ) }>Back</Button>
								) }
								<Button type="submit" variant="contained" disabled={ sending } startIcon={ sending ? <CircularProgress size={ 16 } /> : <SendIcon /> }>
									{ sending ? 'Sending…' : 'Send to DineKit team' }
								</Button>
							</Stack>

							<Typography sx={ { fontSize: 12, color: tokens.muted2 } }>
								Sent securely to Web Level Up (the DineKit makers) together with your site address, so replies can link back
								to this screen. Nothing is ever sent in the background.{ ' ' }
								{ meta && (
									<Link href={ meta.wpOrgUrl } target="_blank" rel="noreferrer" sx={ { fontSize: 12 } }>
										Prefer not to? Ask on wordpress.org instead <OpenInNewIcon sx={ { fontSize: 11 } } />
									</Link>
								) }
							</Typography>
						</Stack>
					</form>
				</Card>
			) }

			{ /* ----- One request, as a conversation ----- */ }
			{ view === 'single' && (
				<Card sx={ { p: 0, overflow: 'hidden' } }>
					<Box sx={ { px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${ tokens.border }`, bgcolor: tokens.soft } }>
						<Button variant="text" size="small" startIcon={ <ArrowBackIcon /> } onClick={ () => { setActiveTicket( null ); setView( 'list' ); } }>
							All requests
						</Button>
						<Box sx={ { flex: 1, minWidth: 0 } }>
							<Typography sx={ { fontWeight: 650, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }>
								{ activeTicket ? activeTicket.subject : '' }
							</Typography>
						</Box>
						{ activeTicket && (
							<>
								<Chip label={ plainStatus( activeTicket.status ).label } size="small" sx={ { bgcolor: plainStatus( activeTicket.status ).bg, color: plainStatus( activeTicket.status ).color, fontWeight: 650 } } />
								{ ! isClosed && (
									<Button size="small" variant="outlined" onClick={ markSolved } disabled={ sending }>
										Mark as solved
									</Button>
								) }
							</>
						) }
					</Box>

					{ ticketLoading && <Box sx={ { display: 'flex', justifyContent: 'center', py: 6 } }><CircularProgress /></Box> }

					{ ! ticketLoading && activeTicket && (
						<>
							<Stack spacing={ 2 } sx={ { p: 2.5, maxHeight: 460, overflowY: 'auto' } }>
								{ ( activeTicket.messages || [] ).map( ( msg, idx ) => {
									const mine = msg.sender_type === 'customer';
									return (
										<Box key={ idx } sx={ { display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' } }>
											<Typography sx={ { fontSize: 11.5, fontWeight: 650, color: tokens.muted2, mb: 0.5 } }>
												{ mine ? 'You' : 'DineKit team' } · { new Date( ( msg.created_at || '' ).replace( ' ', 'T' ) ).toLocaleString() }
											</Typography>
											<Box
												sx={ {
													maxWidth: '80%',
													px: 2,
													py: 1.25,
													borderRadius: '10px',
													fontSize: 13.5,
													lineHeight: 1.6,
													whiteSpace: 'pre-wrap',
													bgcolor: mine ? tokens.accent : tokens.soft,
													color: mine ? '#fff' : tokens.ink,
												} }
											>
												{ String( msg.message || '' ).replace( /<[^>]*>/g, '' ) }
											</Box>
										</Box>
									);
								} ) }
							</Stack>

							{ ! isClosed ? (
								<Box component="form" onSubmit={ sendReply } sx={ { p: 2, borderTop: `1px solid ${ tokens.border }` } }>
									<Stack direction="row" spacing={ 1.5 } alignItems="flex-end">
										<TextField
											multiline
											minRows={ 2 }
											placeholder="Type your reply…"
											value={ reply }
											onChange={ ( e ) => setReply( e.target.value ) }
											fullWidth
											size="small"
										/>
										<Button type="submit" variant="contained" disabled={ sending || ! reply.trim() } sx={ { flexShrink: 0 } }>
											{ sending ? <CircularProgress size={ 18 } /> : 'Reply' }
										</Button>
									</Stack>
								</Box>
							) : (
								<Box sx={ { p: 2, textAlign: 'center', borderTop: `1px solid ${ tokens.border }`, bgcolor: tokens.soft } }>
									<Typography sx={ { fontSize: 13, color: tokens.muted } }>
										This request is solved. Need more help? <Link onClick={ () => { setSent( null ); setView( 'create' ); } } sx={ { cursor: 'pointer', fontSize: 13 } }>Start a new one</Link>.
									</Typography>
								</Box>
							) }
						</>
					) }
				</Card>
			) }

			{ /* The standing home for reviews: read what others say, or add yours. */ }
			{ view === 'list' && (
				<Card sx={ { mt: 3 } }>
					<Stack direction={ { xs: 'column', sm: 'row' } } spacing={ 2 } alignItems={ { sm: 'center' } }>
						<Typography sx={ { fontSize: 22, lineHeight: 1 } }>⭐</Typography>
						<Box sx={ { flex: 1 } }>
							<Typography sx={ { fontWeight: 650, fontSize: 14.5 } }>Enjoying DineKit?</Typography>
							<Typography sx={ { fontSize: 13, color: tokens.muted } }>
								Reviews are how other independent restaurants find us — every one genuinely helps.
							</Typography>
						</Box>
						<Stack direction="row" spacing={ 1 } sx={ { flexShrink: 0 } }>
							<Button
								size="small"
								variant="outlined"
								href="https://wordpress.org/support/plugin/dinekit/reviews/"
								target="_blank"
								rel="noreferrer"
							>
								Read reviews
							</Button>
							<Button
								size="small"
								variant="contained"
								endIcon={ <OpenInNewIcon sx={ { fontSize: 14 } } /> }
								href="https://wordpress.org/support/plugin/dinekit/reviews/#new-post"
								target="_blank"
								rel="noreferrer"
							>
								Leave a review
							</Button>
						</Stack>
					</Stack>
				</Card>
			) }

			{ meta && meta.supportId && (
				<Typography sx={ { fontSize: 11.5, color: tokens.muted2, textAlign: 'center', mt: 3 } }>
					Support ID: { meta.supportId } — quote this if you ever move your site and want your history relinked.
				</Typography>
			) }
		</Page>
	);
}
