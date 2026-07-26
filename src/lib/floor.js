// Shared floor-plan geometry — the single source of truth for table footprints
// and the canvas size, imported by BOTH the Floor Plan editor (FloorPlan.jsx)
// and the read-only live floor (FloorCanvas.jsx / Take Order) so the two can
// never drift apart.

export const CANVAS_H = 720;
// Auto-placement grid — must match the wizard's seeding in includes/rest.php.
export const GRID_COLS = 8;
export const GRID_GAP = 90;

// Table shapes and their pixel footprint. Radius MUST be a string with units —
// a bare number is scaled by theme.shape.borderRadius (×8) and clamps every
// shape into a circle. '50%' = round; px strings keep square/rect/bar squared.
export const SHAPES = {
	round: { w: 62, h: 62, radius: '50%', label: 'Round' },
	square: { w: 62, h: 62, radius: '10px', label: 'Square' },
	rect: { w: 104, h: 62, radius: '10px', label: 'Rectangle' },
	bar: { w: 150, h: 42, radius: '10px', label: 'Bar / bench' },
};

export const dims = ( shape ) => SHAPES[ shape ] || SHAPES.round;
