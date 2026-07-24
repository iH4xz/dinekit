<?php
/**
 * Plugin review ask — a polite, one-time wordpress.org review prompt.
 *
 * Shown on the dashboard only after the restaurant's first real win (their
 * first accepted/completed order, or first confirmed booking) — the moment the
 * plugin has actually earned the ask. Fully dismissible: "No thanks" never
 * shows it again, "Maybe later" snoozes it for 30 days, and following the
 * review link marks it done. State lives in one option; nothing external is
 * ever called — the review page opens in the user's own browser tab.
 *
 * @package DineKit
 */

namespace DineKit\PluginReview;

// Direct access guard.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const OPTION     = 'dinekit_review_ask';
const REVIEW_URL = 'https://wordpress.org/support/plugin/dinekit/reviews/#new-post';

/**
 * Hook registration.
 *
 * @return void
 */
function init() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_routes' );
}

/**
 * Same gate as the rest of the dashboard.
 *
 * @return bool
 */
function can_use() {
	require_once DINEKIT_DIR . 'includes/access.php';
	return \DineKit\Access\can( 'access' );
}

/**
 * Has this site had its first real use yet? True on the first order that was
 * actually taken on (accepted or further), or the first booking that was
 * confirmed or better. Cheap: two capped meta queries, checked only when the
 * prompt could still show.
 *
 * @return string '' if not yet, else 'order' or 'booking'.
 */
function milestone() {
	$orders = get_posts(
		array(
			'post_type'      => 'dinekit_order',
			'post_status'    => 'any',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- one capped check, admin dashboard only.
				array(
					'key'     => 'dinekit_order_status',
					'value'   => array( 'accepted', 'preparing', 'ready', 'completed', 'out_for_delivery', 'delivered' ),
					'compare' => 'IN',
				),
			),
		)
	);
	if ( ! empty( $orders ) ) {
		return 'order';
	}

	$bookings = get_posts(
		array(
			'post_type'      => 'dinekit_booking',
			'post_status'    => 'any',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- one capped check, admin dashboard only.
				array(
					'key'     => 'dinekit_status',
					'value'   => array( 'confirmed', 'seated', 'completed' ),
					'compare' => 'IN',
				),
			),
		)
	);
	return ! empty( $bookings ) ? 'booking' : '';
}

/**
 * Register REST routes.
 *
 * @return void
 */
function register_routes() {
	register_rest_route(
		'dinekit/v1',
		'/review-ask',
		array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => __NAMESPACE__ . '\\rest_get',
				'permission_callback' => __NAMESPACE__ . '\\can_use',
			),
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => __NAMESPACE__ . '\\rest_act',
				'permission_callback' => __NAMESPACE__ . '\\can_use',
			),
		)
	);
}

/**
 * GET /review-ask — should the dashboard show the prompt?
 *
 * @return \WP_REST_Response
 */
function rest_get() {
	$state = get_option( OPTION, array() );

	$show = true;
	if ( ! empty( $state['status'] ) && in_array( $state['status'], array( 'dismissed', 'done' ), true ) ) {
		$show = false;
	} elseif ( ! empty( $state['later_until'] ) && time() < (int) $state['later_until'] ) {
		$show = false;
	}

	$milestone = $show ? milestone() : '';

	return rest_ensure_response(
		array(
			'show'      => $show && '' !== $milestone,
			'milestone' => $milestone,
			'reviewUrl' => REVIEW_URL,
		)
	);
}

/**
 * POST /review-ask — record the user's choice.
 *
 * @param \WP_REST_Request $request Request.
 * @return \WP_REST_Response|\WP_Error
 */
function rest_act( \WP_REST_Request $request ) {
	$action = sanitize_key( (string) $request->get_param( 'action' ) );
	if ( ! in_array( $action, array( 'done', 'dismiss', 'later' ), true ) ) {
		return new \WP_Error( 'dinekit_bad_action', __( 'Unknown action.', 'dinekit' ), array( 'status' => 400 ) );
	}

	$state = array( 'status' => 'later' === $action ? '' : ( 'done' === $action ? 'done' : 'dismissed' ) );
	if ( 'later' === $action ) {
		$state['later_until'] = time() + 30 * DAY_IN_SECONDS;
	}
	update_option( OPTION, $state, false );

	return rest_ensure_response( array( 'success' => true ) );
}
