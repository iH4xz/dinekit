// Region-aware address terminology for the admin UI. Mirrors the PHP in
// includes/localisation.php — the labels a country uses for its postal code and
// its sub-national region — so the Settings form reads naturally worldwide.

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
