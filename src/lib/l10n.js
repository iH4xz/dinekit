// Region-aware address terminology & Gulf Arab date/time formatting utilities.
// Mirrors the PHP in includes/localisation.php & includes/hours.php.

export const COUNTRIES = [
	[ 'SA', 'Saudi Arabia' ], [ 'AE', 'United Arab Emirates' ], [ 'KW', 'Kuwait' ],
	[ 'QA', 'Qatar' ], [ 'BH', 'Bahrain' ], [ 'OM', 'Oman' ],
	[ 'GB', 'United Kingdom' ], [ 'US', 'United States' ], [ 'IE', 'Ireland' ],
	[ 'CA', 'Canada' ], [ 'AU', 'Australia' ], [ 'NZ', 'New Zealand' ],
	[ 'AT', 'Austria' ], [ 'BE', 'Belgium' ], [ 'BG', 'Bulgaria' ], [ 'HR', 'Croatia' ],
	[ 'CY', 'Cyprus' ], [ 'CZ', 'Czechia' ], [ 'DK', 'Denmark' ], [ 'EE', 'Estonia' ],
	[ 'FI', 'Finland' ], [ 'FR', 'France' ], [ 'DE', 'Germany' ], [ 'GR', 'Greece' ],
	[ 'HU', 'Hungary' ], [ 'IS', 'Iceland' ], [ 'IT', 'Italy' ], [ 'LV', 'Latvia' ],
	[ 'LT', 'Lithuania' ], [ 'LU', 'Luxembourg' ], [ 'MT', 'Malta' ], [ 'NL', 'Netherlands' ],
	[ 'NO', 'Norway' ], [ 'PL', 'Poland' ], [ 'PT', 'Portugal' ], [ 'RO', 'Romania' ],
	[ 'SK', 'Slovakia' ], [ 'SI', 'Slovenia' ], [ 'ES', 'Spain' ], [ 'SE', 'Sweden' ],
	[ 'CH', 'Switzerland' ], [ 'IN', 'India' ], [ 'SG', 'Singapore' ],
	[ 'ZA', 'South Africa' ], [ 'MX', 'Mexico' ], [ 'BR', 'Brazil' ], [ 'JP', 'Japan' ],
];

export function postcodeLabel( country ) {
	const c = String( country || '' ).toUpperCase();
	if ( c === 'US' ) {
		return 'ZIP code';
	}
	if ( [ 'GB', 'IE', 'AU', 'NZ', 'IN', 'ZA', 'SG' ].includes( c ) ) {
		return 'Postcode';
	}
	return 'Postal code';
}

export function regionLabel( country ) {
	const c = String( country || '' ).toUpperCase();
	if ( [ 'US', 'AU', 'IN', 'MX', 'BR' ].includes( c ) ) {
		return 'State';
	}
	if ( c === 'CA' ) {
		return 'Province';
	}
	if ( [ 'GB', 'IE' ].includes( c ) ) {
		return 'County';
	}
	return 'Region';
}

/**
 * Format a 24-hour time string (e.g. "14:30") or timestamp into Gulf AM/PM format.
 * In Arabic: AM -> "ص", PM -> "م".
 * In English: AM -> "AM", PM -> "PM".
 */
export function formatTime( timeVal, lang = 'ar' ) {
	if ( ! timeVal ) {
		return '';
	}
	let hours, minutes;
	if ( typeof timeVal === 'string' && timeVal.includes( ':' ) ) {
		const parts = timeVal.trim().split( ':' );
		hours = parseInt( parts[ 0 ], 10 );
		minutes = parseInt( parts[ 1 ], 10 );
	} else {
		const d = new Date( timeVal );
		if ( Number.isNaN( d.getTime() ) ) {
			return String( timeVal );
		}
		hours = d.getHours();
		minutes = d.getMinutes();
	}

	if ( Number.isNaN( hours ) || Number.isNaN( minutes ) ) {
		return String( timeVal );
	}

	const isPm = hours >= 12;
	let h12 = hours % 12;
	if ( h12 === 0 ) {
		h12 = 12;
	}
	const mStr = String( minutes ).padStart( 2, '0' );
	const period = isPm ? ( lang === 'ar' ? 'م' : 'PM' ) : ( lang === 'ar' ? 'ص' : 'AM' );

	return `${ h12 }:${ mStr } ${ period }`;
}

/**
 * Format opening period (e.g. { open: "12:00", close: "22:00" }) into "12:00 م – 10:00 م".
 */
export function formatPeriod( period, lang = 'ar' ) {
	if ( ! period || ! period.open || ! period.close ) {
		return '';
	}
	return `${ formatTime( period.open, lang ) } – ${ formatTime( period.close, lang ) }`;
}

/**
 * Format ISO datetime string (e.g. "2026-07-30 18:04:00") into friendly localized date/time.
 */
export function formatDateTime( iso, lang = 'ar' ) {
	if ( ! iso ) {
		return '';
	}
	const d = new Date( String( iso ).replace( ' ', 'T' ) );
	if ( Number.isNaN( d.getTime() ) ) {
		return String( iso );
	}
	const dateStr = d.toLocaleDateString( lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' } );
	const timeStr = formatTime( d, lang );
	return `${ dateStr }، ${ timeStr }`;
}
