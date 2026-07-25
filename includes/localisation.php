<?php
/**
 * Localisation helpers — region-aware address terminology and currency codes.
 *
 * DineKit ships worldwide, so address labels and the currency reported to search
 * engines must follow the restaurant's own country rather than a UK default:
 * "ZIP code" in the US, "Postcode" in the UK, "Postal code" elsewhere; "State"
 * vs "County" vs "Province"; and the right ISO 4217 code in Menu schema.
 *
 * Pure data + functions; every list is filterable so a site can extend it.
 *
 * @package DineKit
 */

namespace DineKit\L10n;

// Direct access guard.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Selectable countries (ISO 3166-1 alpha-2 => English name). Curated to the
 * markets DineKit is used in, plus the whole eurozone. Filterable.
 *
 * @return array<string,string>
 */
function countries() {
	$list = array(
		'GB' => 'United Kingdom',
		'US' => 'United States',
		'IE' => 'Ireland',
		'CA' => 'Canada',
		'AU' => 'Australia',
		'NZ' => 'New Zealand',
		'AT' => 'Austria',
		'BE' => 'Belgium',
		'BG' => 'Bulgaria',
		'HR' => 'Croatia',
		'CY' => 'Cyprus',
		'CZ' => 'Czechia',
		'DK' => 'Denmark',
		'EE' => 'Estonia',
		'FI' => 'Finland',
		'FR' => 'France',
		'DE' => 'Germany',
		'GR' => 'Greece',
		'HU' => 'Hungary',
		'IS' => 'Iceland',
		'IT' => 'Italy',
		'LV' => 'Latvia',
		'LT' => 'Lithuania',
		'LU' => 'Luxembourg',
		'MT' => 'Malta',
		'NL' => 'Netherlands',
		'NO' => 'Norway',
		'PL' => 'Poland',
		'PT' => 'Portugal',
		'RO' => 'Romania',
		'SK' => 'Slovakia',
		'SI' => 'Slovenia',
		'ES' => 'Spain',
		'SE' => 'Sweden',
		'CH' => 'Switzerland',
		'IN' => 'India',
		'SG' => 'Singapore',
		'AE' => 'United Arab Emirates',
		'ZA' => 'South Africa',
		'MX' => 'Mexico',
		'BR' => 'Brazil',
		'JP' => 'Japan',
	);
	return apply_filters( 'dinekit_countries', $list );
}

/**
 * The word a country uses for its postal code.
 *
 * @param string $country ISO alpha-2.
 * @return string
 */
function postcode_label( $country ) {
	$country = strtoupper( (string) $country );
	if ( 'US' === $country ) {
		return __( 'ZIP code', 'dinekit' );
	}
	if ( in_array( $country, array( 'GB', 'IE', 'AU', 'NZ', 'IN', 'ZA', 'SG' ), true ) ) {
		return __( 'Postcode', 'dinekit' );
	}
	return __( 'Postal code', 'dinekit' );
}

/**
 * The word a country uses for its sub-national region (if any).
 *
 * @param string $country ISO alpha-2.
 * @return string
 */
function region_label( $country ) {
	$country = strtoupper( (string) $country );
	if ( in_array( $country, array( 'US', 'AU', 'IN', 'MX', 'BR' ), true ) ) {
		return __( 'State', 'dinekit' );
	}
	if ( 'CA' === $country ) {
		return __( 'Province', 'dinekit' );
	}
	if ( in_array( $country, array( 'GB', 'IE' ), true ) ) {
		return __( 'County', 'dinekit' );
	}
	return __( 'Region', 'dinekit' );
}

/**
 * ISO 4217 currency code for a country (for schema.org offers). Falls back to
 * the currency symbol, then to '' (omit) so we never mislabel prices.
 *
 * @param string $country ISO alpha-2.
 * @param string $symbol  The venue's currency symbol (e.g. '£').
 * @return string
 */
function currency_code( $country, $symbol = '' ) {
	$eurozone   = array( 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'AT', 'FI', 'GR', 'LU', 'SK', 'SI', 'LT', 'LV', 'EE', 'CY', 'MT', 'HR' );
	$by_country = array(
		'GB' => 'GBP',
		'US' => 'USD',
		'CA' => 'CAD',
		'AU' => 'AUD',
		'NZ' => 'NZD',
		'CH' => 'CHF',
		'SE' => 'SEK',
		'DK' => 'DKK',
		'NO' => 'NOK',
		'PL' => 'PLN',
		'CZ' => 'CZK',
		'HU' => 'HUF',
		'RO' => 'RON',
		'BG' => 'BGN',
		'IS' => 'ISK',
		'IN' => 'INR',
		'SG' => 'SGD',
		'AE' => 'AED',
		'ZA' => 'ZAR',
		'MX' => 'MXN',
		'BR' => 'BRL',
		'JP' => 'JPY',
	);
	$country    = strtoupper( (string) $country );
	if ( isset( $by_country[ $country ] ) ) {
		return $by_country[ $country ];
	}
	if ( in_array( $country, $eurozone, true ) ) {
		return 'EUR';
	}

	// No country set — infer from the symbol so existing installs stay correct.
	$by_symbol = array(
		'£' => 'GBP',
		'$' => 'USD',
		'€' => 'EUR',
		'¥' => 'JPY',
		'₹' => 'INR',
	);
	return isset( $by_symbol[ trim( (string) $symbol ) ] ) ? $by_symbol[ trim( (string) $symbol ) ] : '';
}
