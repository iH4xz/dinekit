import React from 'react';
import { Box, Stack, IconButton, InputBase, Button, Typography } from '../ui';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { tokens } from '../theme';

// Controlled price rows. One row = simple price; multiple = options (Half/Pint).
export default function PriceRepeater( { prices, onChange, symbol = '£', position = 'before' } ) {
	const rows = prices.length ? prices : [ { label: '', amount: '' } ];
	const symEl = <Typography sx={ { fontSize: 14, fontWeight: 600, color: tokens.muted2 } }>{ symbol }</Typography>;

	const update = ( index, patch ) => {
		const next = rows.map( ( r, i ) => ( i === index ? { ...r, ...patch } : r ) );
		onChange( next );
	};
	const add = () => onChange( [ ...rows, { label: '', amount: '' } ] );
	const remove = ( index ) => {
		const next = rows.filter( ( _, i ) => i !== index );
		onChange( next.length ? next : [ { label: '', amount: '' } ] );
	};

	return (
		<Box>
			<Typography sx={ labelSx }>Prices</Typography>
			<Stack spacing={ 1 }>
				{ rows.map( ( row, index ) => (
					<Stack
						key={ index }
						direction="row"
						spacing={ 1 }
						alignItems="center"
						sx={ {
							border: `1px solid ${ tokens.border }`,
							borderRadius: 2,
							px: 1,
							py: 0.5,
						} }
					>
						<InputBase
							placeholder="Size (e.g. Large) — optional"
							value={ row.label }
							onChange={ ( e ) => update( index, { label: e.target.value } ) }
							sx={ { flex: 1, fontSize: 14 } }
						/>
						{ 'after' !== position && symEl }
						<InputBase
							placeholder="e.g. 8.50"
							inputMode="decimal"
							value={ row.amount }
							onChange={ ( e ) => update( index, { amount: e.target.value } ) }
							sx={ { width: 80, fontSize: 14, fontWeight: 600 } }
						/>
						{ 'after' === position && symEl }
						<IconButton size="small" onClick={ () => remove( index ) } sx={ { color: tokens.muted2 } }>
							<DeleteOutlineIcon fontSize="small" />
						</IconButton>
					</Stack>
				) ) }
			</Stack>
			<Button size="small" startIcon={ <AddIcon /> } onClick={ add } sx={ { mt: 1, color: tokens.accent } }>
				Add price
			</Button>
		</Box>
	);
}

const labelSx = {
	textTransform: 'uppercase',
	fontSize: 11,
	fontWeight: 700,
	letterSpacing: '0.04em',
	color: tokens.muted,
	mb: 0.75,
	display: 'block',
};
