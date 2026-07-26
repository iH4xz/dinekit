import React from 'react';
import { Box, Stack, Typography } from '../../ui';
import { tokens } from '../../theme';

// The identical page header on every screen: title + one-line subtitle on the
// left, actions right-aligned. 32px gap below.
export default function PageHeader( { title, subtitle, actions } ) {
	return (
		// Wrap the actions onto their own line when the title + actions can't fit
		// side-by-side (tablet / phone / collapsed sidebar) instead of crushing the
		// title to one word per line.
		<Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={ 2 } flexWrap="wrap" sx={ { mb: 4 } }>
			<Box sx={ { flex: '1 1 220px', minWidth: 0 } }>
				<Typography variant="h5">{ title }</Typography>
				{ subtitle && (
					<Typography sx={ { color: tokens.muted, fontSize: 14, mt: 0.5 } }>{ subtitle }</Typography>
				) }
			</Box>
			{ actions && (
				<Stack direction="row" spacing={ 1 } alignItems="center" flexWrap="wrap" useFlexGap sx={ { flexShrink: 0, maxWidth: '100%', rowGap: 1 } }>
					{ actions }
				</Stack>
			) }
		</Stack>
	);
}
