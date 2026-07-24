<?php
/**
 * Direct support — keyless ticketing against the Web Level Up hub.
 *
 * The Support screen lets the owner message the DineKit team without any
 * account, licence or registration: they type a name, email and message and
 * press send. The hub (WLU Commerce on weblevelup.co.uk) opens a ticket and
 * returns a per-site token, stored here in an option; every later call sends
 * that token, which is what scopes ticket history to this site. The token is
 * plumbing — the user never sees it beyond a short "Support ID".
 *
 * Privacy: nothing is ever sent in the background. The hub is contacted only
 * when a logged-in user opens the Support screen or presses send/reply, and
 * what is sent is exactly what the form shows (plus the site address, which
 * the reply email uses to deep-link back to this dashboard). Site details
 * (WP/PHP/DineKit versions) are attached only when the consent box is ticked.
 * Disclosed in readme.txt "External services".
 *
 * @package DineKit
 */

namespace DineKit\Support;

// Direct access guard.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TOKEN_OPTION    = 'dinekit_support_token';
const IDENTITY_OPTION = 'dinekit_support_identity';

/**
 * Hook registration.
 *
 * @return void
 */
function init() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_routes' );
}

/**
 * Anyone who can use the DineKit dashboard can ask for help.
 *
 * @return bool
 */
function can_use() {
	require_once DINEKIT_DIR . 'includes/access.php';
	return \DineKit\Access\can( 'access' );
}

/**
 * Base URL of the support hub. Local/dev sites talk to the local hub so the
 * whole flow is testable offline; production talks to weblevelup.co.uk.
 * Override with a DINEKIT_SUPPORT_HUB constant in wp-config.php.
 *
 * @return string
 */
function hub_url() {
	if ( defined( 'DINEKIT_SUPPORT_HUB' ) ) {
		return untrailingslashit( DINEKIT_SUPPORT_HUB );
	}
	$env   = function_exists( 'wp_get_environment_type' ) ? wp_get_environment_type() : 'production';
	$host  = wp_parse_url( home_url(), PHP_URL_HOST );
	$local = in_array( $env, array( 'local', 'development' ), true )
		|| false !== strpos( (string) $host, '.local' )
		|| false !== strpos( (string) $host, 'localhost' );

	return $local ? 'http://wlu-commerce.local' : 'https://weblevelup.co.uk';
}

/**
 * Short human-readable id derived from the site token, shown in the UI so a
 * customer can quote it (and history can be relinked after a migration).
 *
 * @return string
 */
function support_id() {
	$token = (string) get_option( TOKEN_OPTION, '' );
	return '' === $token ? '' : 'DK-' . strtoupper( substr( $token, 0, 8 ) );
}

/**
 * Forward a request to the hub's keyless support API and validate the answer.
 *
 * @param string     $method HTTP method.
 * @param string     $path   Path under /public/support/, e.g. 'tickets'.
 * @param array|null $body   Form fields for POST requests.
 * @return array|\WP_Error Decoded JSON on success.
 */
function proxy( $method, $path, $body = null ) {
	$url  = hub_url() . '/wp-json/wlu-com/v1/public/support/' . ltrim( $path, '/' );
	$args = array(
		'method'  => $method,
		'timeout' => 15,
	);
	if ( 'GET' === $method ) {
		$token = (string) get_option( TOKEN_OPTION, '' );
		$url   = add_query_arg( 'site_token', rawurlencode( $token ), $url );
	} elseif ( is_array( $body ) ) {
		$args['body'] = $body;
	}

	$response = wp_remote_request( $url, $args );

	if ( is_wp_error( $response ) ) {
		return new \WP_Error(
			'dinekit_support_unreachable',
			__( 'Could not reach the support service. Please try again in a moment, or ask on the wordpress.org forum.', 'dinekit' ),
			array( 'status' => 502 )
		);
	}

	$code = (int) wp_remote_retrieve_response_code( $response );
	$data = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( ! is_array( $data ) ) {
		return new \WP_Error(
			'dinekit_support_bad_response',
			__( 'The support service returned an unexpected response.', 'dinekit' ),
			array( 'status' => 502 )
		);
	}
	if ( $code >= 400 ) {
		$message = isset( $data['message'] ) ? (string) $data['message'] : __( 'The support service rejected the request.', 'dinekit' );
		return new \WP_Error( 'dinekit_support_rejected', $message, array( 'status' => $code ) );
	}

	return $data;
}

/**
 * Register REST routes (all under the logged-in admin app; the hub is only
 * contacted from these handlers, i.e. on explicit user actions).
 *
 * @return void
 */
function register_routes() {
	$ns = 'dinekit/v1';

	register_rest_route(
		$ns,
		'/support/meta',
		array(
			'methods'             => \WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\\rest_meta',
			'permission_callback' => __NAMESPACE__ . '\\can_use',
		)
	);
	register_rest_route(
		$ns,
		'/support/tickets',
		array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => __NAMESPACE__ . '\\rest_list',
				'permission_callback' => __NAMESPACE__ . '\\can_use',
			),
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => __NAMESPACE__ . '\\rest_create',
				'permission_callback' => __NAMESPACE__ . '\\can_use',
			),
		)
	);
	register_rest_route(
		$ns,
		'/support/tickets/(?P<id>\d+)',
		array(
			'methods'             => \WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\\rest_single',
			'permission_callback' => __NAMESPACE__ . '\\can_use',
		)
	);
	register_rest_route(
		$ns,
		'/support/tickets/(?P<id>\d+)/reply',
		array(
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => __NAMESPACE__ . '\\rest_reply',
			'permission_callback' => __NAMESPACE__ . '\\can_use',
		)
	);
	register_rest_route(
		$ns,
		'/support/tickets/(?P<id>\d+)/close',
		array(
			'methods'             => \WP_REST_Server::CREATABLE,
			'callback'            => __NAMESPACE__ . '\\rest_close',
			'permission_callback' => __NAMESPACE__ . '\\can_use',
		)
	);
}

/**
 * GET /support/meta — prefill data. Never contacts the hub.
 *
 * @return \WP_REST_Response
 */
function rest_meta() {
	$identity = get_option( IDENTITY_OPTION, array() );
	$user     = wp_get_current_user();

	return rest_ensure_response(
		array(
			'name'      => ! empty( $identity['name'] ) ? $identity['name'] : (string) $user->display_name,
			'email'     => ! empty( $identity['email'] ) ? $identity['email'] : (string) $user->user_email,
			'hasToken'  => '' !== (string) get_option( TOKEN_OPTION, '' ),
			'supportId' => support_id(),
			'wpOrgUrl'  => 'https://wordpress.org/support/plugin/dinekit/',
		)
	);
}

/**
 * GET /support/tickets — this site's requests. First-timers get an empty list
 * without any hub call (no token = nothing to fetch).
 *
 * @return \WP_REST_Response|\WP_Error
 */
function rest_list() {
	if ( '' === (string) get_option( TOKEN_OPTION, '' ) ) {
		return rest_ensure_response(
			array(
				'items'     => array(),
				'firstTime' => true,
			)
		);
	}
	$data = proxy( 'GET', 'tickets' );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	return rest_ensure_response(
		array(
			'items'     => isset( $data['items'] ) ? $data['items'] : array(),
			'firstTime' => false,
		)
	);
}

/**
 * POST /support/tickets — send a new request to the DineKit team.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response|\WP_Error
 */
function rest_create( \WP_REST_Request $request ) {
	$name    = sanitize_text_field( (string) $request->get_param( 'name' ) );
	$email   = sanitize_email( (string) $request->get_param( 'email' ) );
	$subject = sanitize_text_field( (string) $request->get_param( 'subject' ) );
	$message = sanitize_textarea_field( (string) $request->get_param( 'message' ) );
	$type    = sanitize_key( (string) $request->get_param( 'type' ) );

	if ( ! is_email( $email ) || '' === $subject || '' === $message ) {
		return new \WP_Error(
			'dinekit_support_missing',
			__( 'Please fill in your email, a subject and a message.', 'dinekit' ),
			array( 'status' => 400 )
		);
	}
	if ( ! in_array( $type, array( 'support', 'bug', 'feature' ), true ) ) {
		$type = 'support';
	}

	$body = array(
		'plugin_slug' => 'dinekit',
		'name'        => $name,
		'email'       => $email,
		'subject'     => $subject,
		'message'     => $message,
		'type'        => $type,
		'domain'      => home_url(),
	);

	$token = (string) get_option( TOKEN_OPTION, '' );
	if ( '' !== $token ) {
		$body['site_token'] = $token;
	}

	// Site details ride along only with explicit consent (the checkbox).
	if ( rest_sanitize_boolean( $request->get_param( 'includeEnv' ) ) ) {
		global $wp_version;
		$body['environment_data'] = wp_json_encode(
			array(
				'wp_version'      => (string) $wp_version,
				'php_version'     => PHP_VERSION,
				'dinekit_version' => DINEKIT_VERSION,
			)
		);
	}

	$data = proxy( 'POST', 'tickets', $body );
	if ( is_wp_error( $data ) ) {
		return $data;
	}

	// First successful send: keep the hub-issued token and remember who they are.
	if ( ! empty( $data['site_token'] ) ) {
		update_option( TOKEN_OPTION, sanitize_text_field( (string) $data['site_token'] ), false );
	}
	update_option(
		IDENTITY_OPTION,
		array(
			'name'  => $name,
			'email' => $email,
		),
		false
	);

	return rest_ensure_response(
		array(
			'success'   => true,
			'ticketId'  => isset( $data['ticket_id'] ) ? (int) $data['ticket_id'] : 0,
			'supportId' => support_id(),
			'email'     => $email,
		)
	);
}

/**
 * GET /support/tickets/:id — one request with its full conversation.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response|\WP_Error
 */
function rest_single( \WP_REST_Request $request ) {
	$data = proxy( 'GET', 'tickets/' . (int) $request['id'] );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	return rest_ensure_response( $data );
}

/**
 * POST /support/tickets/:id/reply.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response|\WP_Error
 */
function rest_reply( \WP_REST_Request $request ) {
	$message = sanitize_textarea_field( (string) $request->get_param( 'message' ) );
	if ( '' === $message ) {
		return new \WP_Error( 'dinekit_support_missing', __( 'Message cannot be empty.', 'dinekit' ), array( 'status' => 400 ) );
	}
	$data = proxy(
		'POST',
		'tickets/' . (int) $request['id'] . '/reply',
		array(
			'site_token' => (string) get_option( TOKEN_OPTION, '' ),
			'message'    => $message,
		)
	);
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	return rest_ensure_response( array( 'success' => true ) );
}

/**
 * POST /support/tickets/:id/close — customer marks their request solved.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response|\WP_Error
 */
function rest_close( \WP_REST_Request $request ) {
	$data = proxy(
		'POST',
		'tickets/' . (int) $request['id'] . '/close',
		array(
			'site_token' => (string) get_option( TOKEN_OPTION, '' ),
		)
	);
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	return rest_ensure_response( array( 'success' => true ) );
}
