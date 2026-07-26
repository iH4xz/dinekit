<?php
/**
 * Progressive Web App shell — serves the DineKit staff app as an installable,
 * offline-capable web app on its own route (separate from wp-admin so it can be
 * installed to a home screen and, later, wrapped natively with Capacitor).
 *
 * Works on both pretty and plain permalinks:
 *   pretty:  /dinekit-app/  ·  /dinekit-app/manifest.webmanifest  ·  /dinekit-app/sw.js
 *   plain:   /?dinekit_app=app  ·  ?dinekit_app=manifest  ·  ?dinekit_app=sw
 *
 * The service worker caches the app shell + bundle so the app loads instantly
 * and survives a dropped connection; it never caches the REST API, so ticket and
 * order data is always live, and it only handles navigations to the app itself
 * so it never interferes with the site's public pages. (Offline write-queue is a
 * later phase.)
 *
 * @package DineKit
 */

namespace DineKit\PWA;

// Direct access guard.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROUTE = 'dinekit-app';

/**
 * Hook registration.
 *
 * @return void
 */
function init() {
	add_action( 'init', __NAMESPACE__ . '\\rewrites' );
	add_filter( 'query_vars', __NAMESPACE__ . '\\query_var' );
	add_action( 'template_redirect', __NAMESPACE__ . '\\route' );
	// Our extension-bearing routes (manifest.webmanifest, sw.js) otherwise get a
	// canonical 301 to a trailing slash — a redirect on a manifest/SW URL is
	// fragile (the SW's scope derives from its path), so serve them 200 directly.
	add_filter( 'redirect_canonical', __NAMESPACE__ . '\\no_canonical', 10, 1 );
}

/**
 * Skip WordPress's canonical redirect on our app routes.
 *
 * @param string $redirect_url Proposed canonical URL.
 * @return string|false
 */
function no_canonical( $redirect_url ) {
	return get_query_var( 'dinekit_app' ) ? false : $redirect_url;
}

/**
 * Are pretty permalinks enabled? Determines the URL form for the app routes.
 *
 * @return bool
 */
function pretty() {
	return (bool) get_option( 'permalink_structure' );
}

/**
 * URL for an app route. $what = app | manifest | sw.
 *
 * @param string $what Route key.
 * @return string
 */
function app_url( $what = 'app' ) {
	if ( pretty() ) {
		$sub = array(
			'app'      => '',
			'manifest' => 'manifest.webmanifest',
			'sw'       => 'sw.js',
		);
		return home_url( '/' . ROUTE . '/' . ( isset( $sub[ $what ] ) ? $sub[ $what ] : '' ) );
	}
	return home_url( '/?dinekit_app=' . rawurlencode( $what ) );
}

/**
 * The scope path the app + service worker live under.
 *
 * @return string
 */
function scope_path() {
	// pretty → /dinekit-app/ ; plain → / (query-string URLs have root path).
	$path = wp_parse_url( app_url( 'app' ), PHP_URL_PATH );
	return $path ? $path : '/';
}

/**
 * Register the app routes (pretty permalinks). Flushes once per plugin version
 * so the rules exist on existing installs without a manual re-activation.
 *
 * @return void
 */
function rewrites() {
	add_rewrite_tag( '%dinekit_app%', '([a-z]+)' );

	$rules = array(
		'^' . ROUTE . '/manifest\.webmanifest$' => 'index.php?dinekit_app=manifest',
		'^' . ROUTE . '/sw\.js$'                => 'index.php?dinekit_app=sw',
		'^' . ROUTE . '/?$'                     => 'index.php?dinekit_app=app',
	);
	foreach ( $rules as $regex => $target ) {
		add_rewrite_rule( $regex, $target, 'top' );
	}

	// Key the one-time flush on a hash of the rules themselves, so any change to
	// the route set (not just a version bump) re-flushes and self-heals installs
	// carrying a stale rule set.
	$sig = md5( DINEKIT_VERSION . '|' . wp_json_encode( $rules ) );
	if ( get_option( 'dinekit_pwa_rewrites' ) !== $sig ) {
		flush_rewrite_rules( false );
		update_option( 'dinekit_pwa_rewrites', $sig );
	}
}

/**
 * Allow our query var through.
 *
 * @param string[] $vars Query vars.
 * @return string[]
 */
function query_var( $vars ) {
	$vars[] = 'dinekit_app';
	return $vars;
}

/**
 * Dispatch the app routes.
 *
 * @return void
 */
function route() {
	$what = get_query_var( 'dinekit_app' );
	if ( ! $what ) {
		return;
	}
	if ( 'manifest' === $what ) {
		serve_manifest();
	} elseif ( 'sw' === $what ) {
		serve_service_worker();
	} else {
		serve_app();
	}
	exit;
}

/**
 * Versioned asset URL for cache-busting.
 *
 * @param string $rel Path relative to the plugin dir.
 * @return string
 */
function asset( $rel ) {
	$file = DINEKIT_DIR . $rel;
	$ver  = is_readable( $file ) ? (string) filemtime( $file ) : DINEKIT_VERSION;
	return DINEKIT_URL . $rel . '?ver=' . $ver;
}

/**
 * Serve the installable app shell (the SPA, full-screen). Requires a logged-in
 * user with DineKit access — same gate as the admin app.
 *
 * @return void
 */
function serve_app() {
	if ( ! is_user_logged_in() ) {
		wp_safe_redirect( wp_login_url( app_url( 'app' ) ) );
		exit;
	}
	require_once DINEKIT_DIR . 'includes/access.php';
	if ( ! \DineKit\Access\can( 'access' ) ) {
		wp_die( esc_html__( 'You do not have access to the DineKit app.', 'dinekit' ), '', array( 'response' => 403 ) );
	}

	$stripe_mode = 'test';
	if ( is_readable( DINEKIT_DIR . 'includes/integrations.php' ) ) {
		require_once DINEKIT_DIR . 'includes/integrations.php';
		$stripe_mode = 'live' === \DineKit\Integrations\raw()['stripe']['mode'] ? 'live' : 'test';
	}

	$config = array(
		'restUrl'    => esc_url_raw( rest_url( 'dinekit/v1/' ) ),
		'restRoot'   => esc_url_raw( rest_url() ),
		'nonce'      => wp_create_nonce( 'wp_rest' ),
		'adminUrl'   => esc_url_raw( admin_url() ),
		'pluginUrl'  => esc_url_raw( DINEKIT_URL ),
		'version'    => DINEKIT_VERSION,
		'canManage'  => current_user_can( 'manage_categories' ),
		'stripeMode' => $stripe_mode,
		'standalone' => true,
		'caps'       => \DineKit\Access\caps_for_spa(),
	);

	$font    = esc_url( DINEKIT_URL . 'assets/fonts/inter-var.woff2' );
	$css_url = is_readable( DINEKIT_DIR . 'dist/main.css' ) ? asset( 'dist/main.css' ) : '';

	nocache_headers();
	header( 'Content-Type: text/html; charset=UTF-8' );
	// This is a standalone app document served on its own route, not a WordPress
	// theme page, so its <link>/<script> tags are output directly rather than
	// enqueued — the enqueue sniffs do not apply here.
	// phpcs:disable WordPress.WP.EnqueuedResources
	?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#4f46e5">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="DineKit">
<title><?php esc_html_e( 'DineKit', 'dinekit' ); ?></title>
<link rel="manifest" href="<?php echo esc_url( app_url( 'manifest' ) ); ?>">
<link rel="apple-touch-icon" href="<?php echo esc_url( DINEKIT_URL . 'assets/app-icon/icon-180.png' ); ?>">
<link rel="icon" type="image/png" href="<?php echo esc_url( DINEKIT_URL . 'assets/app-icon/icon-192.png' ); ?>">
	<?php echo $css_url ? '<link rel="stylesheet" href="' . esc_url( $css_url ) . '">' : ''; ?>
<style>
@font-face{font-family:"InterVariable";src:url(<?php echo $font; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-escaped. ?>) format("woff2");font-weight:100 900;font-style:normal;font-display:swap}
html,body{margin:0;padding:0;background:#f6f7f9;overscroll-behavior:none}
#dinekit-root{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
</style>
</head>
<body>
<div id="dinekit-root"></div>
<script>window.DINEKIT = <?php echo wp_json_encode( $config ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON. ?>;</script>
<script src="<?php echo esc_url( asset( 'dist/main.js' ) ); ?>"></script>
<script>
if ('serviceWorker' in navigator) {
	window.addEventListener('load', function () {
		navigator.serviceWorker.register('<?php echo esc_js( app_url( 'sw' ) ); ?>', { scope: '<?php echo esc_js( scope_path() ); ?>' }).catch(function(){});
	});
}
</script>
</body>
</html>
	<?php
	// phpcs:enable WordPress.WP.EnqueuedResources
}

/**
 * Serve the web app manifest.
 *
 * @return void
 */
function serve_manifest() {
	$manifest = array(
		'name'             => 'DineKit',
		'short_name'       => 'DineKit',
		'description'      => __( 'Run your restaurant — orders, bookings, POS and kitchen display.', 'dinekit' ),
		'start_url'        => app_url( 'app' ),
		'scope'            => pretty() ? app_url( 'app' ) : home_url( '/' ),
		'display'          => 'standalone',
		'orientation'      => 'any',
		'background_color' => '#f6f7f9',
		'theme_color'      => '#4f46e5',
		'icons'            => array(
			array(
				'src'     => DINEKIT_URL . 'assets/app-icon/icon-192.png',
				'sizes'   => '192x192',
				'type'    => 'image/png',
				'purpose' => 'any',
			),
			array(
				'src'     => DINEKIT_URL . 'assets/app-icon/icon-512.png',
				'sizes'   => '512x512',
				'type'    => 'image/png',
				'purpose' => 'any maskable',
			),
		),
	);
	header( 'Content-Type: application/manifest+json; charset=UTF-8' );
	echo wp_json_encode( $manifest ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON.
}

/**
 * Serve the service worker. Caches the app shell + bundle (cache-first for our
 * own static assets, network-first for app navigations) and NEVER caches the
 * REST API. Only intercepts navigations to the app itself, so it never touches
 * the site's public pages even when its scope is the site root.
 *
 * @return void
 */
function serve_service_worker() {
	$cache = 'dinekit-shell-' . DINEKIT_VERSION;

	// Precache only static assets that exist — a single 404 makes cache.addAll()
	// reject and the worker never installs. The app shell is a login-gated
	// navigation, so it is cached at runtime on first successful load instead.
	$precache = array();
	foreach ( array( 'dist/main.js', 'dist/main.css', 'assets/fonts/inter-var.woff2', 'assets/app-icon/icon-192.png' ) as $rel ) {
		if ( is_readable( DINEKIT_DIR . $rel ) ) {
			$precache[] = 0 === strpos( $rel, 'dist/' ) ? asset( $rel ) : DINEKIT_URL . $rel;
		}
	}

	header( 'Content-Type: application/javascript; charset=UTF-8' );
	header( 'Service-Worker-Allowed: ' . scope_path() );
	nocache_headers();
	?>
const CACHE = <?php echo wp_json_encode( $cache ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>;
const PRECACHE = <?php echo wp_json_encode( array_values( $precache ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>;
const APP_URL = <?php echo wp_json_encode( app_url( 'app' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>;

function isAppNav(url) {
	return url.pathname.indexOf('<?php echo esc_js( ROUTE ); ?>') !== -1 || url.searchParams.has('dinekit_app');
}

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys().then((keys) => Promise.all(keys.filter((k) => k.indexOf('dinekit-shell-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (e) => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	// Never cache live data.
	if (url.pathname.indexOf('/wp-json/') !== -1 || url.pathname.indexOf('admin-ajax.php') !== -1) return;
	// App navigations only: network-first, cache the shell when online, fall back
	// to the cached shell offline. Non-app navigations pass straight through so
	// the site's public pages are never touched.
	if (req.mode === 'navigate') {
		if (isAppNav(url)) {
			e.respondWith(
				fetch(req).then((res) => {
					if (res && res.status === 200) {
						const copy = res.clone();
						caches.open(CACHE).then((c) => c.put(APP_URL, copy));
					}
					return res;
				}).catch(() => caches.match(APP_URL))
			);
		}
		return;
	}
	// Our own static assets (bundle, css, fonts, icons): cache-first, then network.
	if (url.origin === self.location.origin && /\.(js|css|woff2?|png|svg)$/.test(url.pathname)) {
		e.respondWith(
			caches.match(req).then((hit) => hit || fetch(req).then((res) => {
				if (res && res.status === 200 && res.type === 'basic') {
					const copy = res.clone();
					caches.open(CACHE).then((c) => c.put(req, copy));
				}
				return res;
			}))
		);
	}
});
	<?php
}
