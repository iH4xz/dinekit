<?php
/**
 * Live-sync heartbeat — lets multiple tablets stay in sync without hammering the
 * server. Each data "channel" (orders, bookings, floor, …) has a counter that is
 * bumped whenever its content changes. The app polls one tiny endpoint and only
 * refetches a screen's data when that screen's channel counter has moved, so a
 * busy service is one cheap option read per poll instead of every tablet
 * re-pulling every list on a timer.
 *
 * Counters are bumped from post + post-meta hooks (order/booking status lives in
 * meta, so meta changes must count too) and collapsed to a single option write
 * per request via a shutdown flush. This needs no custom tables and works on any
 * shared host — the same portability rule the rest of DineKit follows.
 *
 * @package DineKit
 */

namespace DineKit\Sync;

// Direct access guard.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const OPTION = 'dinekit_sync';

/**
 * Map a post type to its sync channel (null = not tracked).
 *
 * @param string $post_type Post type.
 * @return string|null
 */
function channel_for( $post_type ) {
	$map = array(
		'dinekit_order'       => 'orders',
		'dinekit_booking'     => 'bookings',
		'dinekit_table'       => 'floor',
		'dinekit_table_combo' => 'floor',
		'dinekit_menu_item'   => 'menu',
		'dinekit_event'       => 'events',
		'dinekit_guest'       => 'guests',
		'dinekit_staff'       => 'staff',
		'dinekit_shift'       => 'staff',
		'dinekit_leave'       => 'staff',
		'dinekit_activity'    => 'activity',
	);
	return isset( $map[ $post_type ] ) ? $map[ $post_type ] : null;
}

/**
 * Every channel the client may watch. Kept explicit so a fresh install (no
 * counters yet) still reports a full, stable set.
 *
 * @return string[]
 */
function channels() {
	return array( 'orders', 'bookings', 'floor', 'menu', 'events', 'guests', 'staff', 'activity', 'reviews' );
}

/**
 * Hook registration.
 *
 * @return void
 */
function init() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_route' );

	// Content changes → bump the relevant channel.
	add_action( 'save_post', __NAMESPACE__ . '\\on_post', 10, 1 );
	add_action( 'deleted_post', __NAMESPACE__ . '\\on_post', 10, 1 );
	add_action( 'trashed_post', __NAMESPACE__ . '\\on_post', 10, 1 );
	add_action( 'untrashed_post', __NAMESPACE__ . '\\on_post', 10, 1 );

	// Status/meta changes (order + booking status live in meta).
	add_action( 'added_post_meta', __NAMESPACE__ . '\\on_meta', 10, 2 );
	add_action( 'updated_post_meta', __NAMESPACE__ . '\\on_meta', 10, 2 );
	add_action( 'deleted_post_meta', __NAMESPACE__ . '\\on_meta', 10, 2 );

	// Option-backed channels not represented by a post type.
	add_action( 'update_option_dinekit_reviews', __NAMESPACE__ . '\\on_reviews' );
	add_action( 'add_option_dinekit_reviews', __NAMESPACE__ . '\\on_reviews' );
}

/**
 * Register the heartbeat route.
 *
 * @return void
 */
function register_route() {
	register_rest_route(
		'dinekit/v1',
		'/sync',
		array(
			'methods'             => \WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\\rest_sync',
			'permission_callback' => '\\DineKit\\Rest\\can_edit',
		)
	);
}

/**
 * Accumulate a dirty channel for this request; the flush is registered lazily so
 * a request that changes nothing pays nothing.
 *
 * @param string|null $channel Channel to mark dirty, or null to read the set.
 * @return array<string,bool>
 */
function dirty( $channel = null ) {
	static $set    = array();
	static $hooked = false;
	if ( null !== $channel ) {
		$set[ $channel ] = true;
		if ( ! $hooked ) {
			add_action( 'shutdown', __NAMESPACE__ . '\\flush' );
			$hooked = true;
		}
	}
	return $set;
}

/**
 * Post create/update/delete handler.
 *
 * @param int $post_id Post ID.
 * @return void
 */
function on_post( $post_id ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	$channel = channel_for( get_post_type( $post_id ) );
	if ( $channel ) {
		dirty( $channel );
	}
}

/**
 * Post-meta change handler. Second arg is the object (post) ID for all three
 * meta actions we hook.
 *
 * @param int|int[] $meta_id Meta row id(s) (unused).
 * @param int       $post_id Post ID.
 * @return void
 */
function on_meta( $meta_id, $post_id ) {
	$channel = channel_for( get_post_type( $post_id ) );
	if ( $channel ) {
		dirty( $channel );
	}
}

/**
 * Reviews option changed.
 *
 * @return void
 */
function on_reviews() {
	dirty( 'reviews' );
}

/**
 * Flush accumulated channel bumps in a single option write.
 *
 * @return void
 */
function flush() {
	$set = dirty();
	if ( ! $set ) {
		return;
	}
	$counters = get_option( OPTION, array() );
	if ( ! is_array( $counters ) ) {
		$counters = array();
	}
	foreach ( array_keys( $set ) as $channel ) {
		$counters[ $channel ] = isset( $counters[ $channel ] ) ? (int) $counters[ $channel ] + 1 : 1;
	}
	update_option( OPTION, $counters, false );
}

/**
 * Heartbeat endpoint: the current counter for every channel. Tiny and uncached.
 *
 * @return array<string,mixed>
 */
function rest_sync() {
	$counters = get_option( OPTION, array() );
	if ( ! is_array( $counters ) ) {
		$counters = array();
	}
	$out = array();
	foreach ( channels() as $channel ) {
		$out[ $channel ] = isset( $counters[ $channel ] ) ? (int) $counters[ $channel ] : 0;
	}
	nocache_headers();
	return array(
		'channels' => $out,
		'ts'       => time(),
	);
}
