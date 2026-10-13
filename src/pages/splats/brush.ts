/**
 * The tuning panel's brush, on the CPU. Every splat centre is projected to the
 * screen once per camera position and sorted into a grid of screen cells, so
 * a dab only looks at the splats near it, however many millions there are.
 *
 * Centres only, as in SuperSplat: a big splat whose middle is outside the
 * ring isn't taken. Pure arithmetic on typed arrays, with the camera passed
 * in as matrices, so Node can test it.
 */

/** Screen cell size, CSS px. */
const CELL = 16;

/** The cell of a splat that isn't on screen. */
const OFF = 0xffffffff;

export interface Projection {
    /** Screen position (CSS px from the top left) and distance in front of the camera, where `cell` isn't OFF. */
    x: Float32Array;
    y: Float32Array;
    depth: Float32Array;
    /** Each splat's screen cell, or OFF when it's behind the camera, past near or far, or off the sides. */
    cell: Uint32Array;
    cols: number;
    rows: number;
    /** Splat indices by cell: cell c holds items[start[c]] to items[start[c + 1] - 1]. */
    start: Uint32Array;
    items: Uint32Array;
}

/** Whether a splat made it onto the screen. */
export const onScreen = (p: Projection, i: number) => p.cell[i] !== OFF;

/**
 * Project centres (world space, xyz per splat) with a camera's
 * projection × view matrix and its view matrix, both column-major as three.js
 * keeps them. Splats behind the camera, past its near or far plane, or off the
 * sides don't go into the grid. `into` is reused when it fits.
 */
export const project = (
    centers: Float32Array,
    n: number,
    viewProjection: ArrayLike<number>,
    view: ArrayLike<number>,
    width: number,
    height: number,
    into?: Projection,
): Projection => {
    const cols = Math.max(1, Math.ceil(width / CELL));
    const rows = Math.max(1, Math.ceil(height / CELL));
    const fits = into && into.x.length >= n;
    const x = fits ? into.x : new Float32Array(n);
    const y = fits ? into.y : new Float32Array(n);
    const depth = fits ? into.depth : new Float32Array(n);
    const cell = fits ? into.cell : new Uint32Array(n);
    const items = fits ? into.items : new Uint32Array(n);
    const start = new Uint32Array(cols * rows + 1);

    // This runs over millions of splats, so the matrices are taken apart first
    // and each splat leaves as early as it can.
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15] = Array.from(viewProjection);
    const v2 = view[2], v6 = view[6], v10 = view[10], v14 = view[14];
    const halfW = width / 2, halfH = height / 2;
    for (let i = 0; i < n; i++) {
        cell[i] = OFF;
        const px = centers[i * 3], py = centers[i * 3 + 1], pz = centers[i * 3 + 2];
        const w = m3 * px + m7 * py + m11 * pz + m15;
        if (!(w > 0)) continue;
        const inv = 1 / w;
        const cx = (m0 * px + m4 * py + m8 * pz + m12) * inv;
        if (cx < -1 || cx > 1) continue;
        const cy = (m1 * px + m5 * py + m9 * pz + m13) * inv;
        if (cy < -1 || cy > 1) continue;
        const cz = (m2 * px + m6 * py + m10 * pz + m14) * inv;
        if (cz < -1 || cz > 1) continue;
        const sx = (cx + 1) * halfW, sy = (1 - cy) * halfH;
        x[i] = sx;
        y[i] = sy;
        depth[i] = -(v2 * px + v6 * py + v10 * pz + v14);
        let col = (sx / CELL) | 0, row = (sy / CELL) | 0;
        if (col >= cols) col = cols - 1;
        if (row >= rows) row = rows - 1;
        const c = row * cols + col;
        cell[i] = c;
        start[c + 1]++;
    }
    // Counts to offsets, then drop each splat into its cell.
    for (let c = 0; c < cols * rows; c++) start[c + 1] += start[c];
    const cursor = start.slice(0, cols * rows);
    for (let i = 0; i < n; i++) {
        const c = cell[i];
        if (c !== OFF) items[cursor[c]++] = i;
    }
    return { x, y, depth, cell, cols, rows, start, items };
};

/** Call `visit` for every projected splat within `r` px of (cx, cy). */
export const dab = (p: Projection, cx: number, cy: number, r: number, visit: (i: number) => void) => {
    const c0 = Math.max(0, Math.floor((cx - r) / CELL)), c1 = Math.min(p.cols - 1, Math.floor((cx + r) / CELL));
    const r0 = Math.max(0, Math.floor((cy - r) / CELL)), r1 = Math.min(p.rows - 1, Math.floor((cy + r) / CELL));
    const r2 = r * r;
    for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
            const cell = row * p.cols + col;
            for (let k = p.start[cell]; k < p.start[cell + 1]; k++) {
                const i = p.items[k];
                const dx = p.x[i] - cx, dy = p.y[i] - cy;
                if (dx * dx + dy * dy <= r2) visit(i);
            }
        }
    }
};

/** The distance to the nearest splat under the brush that `counts`, or Infinity if there's none. */
export const nearestUnder = (p: Projection, cx: number, cy: number, r: number, counts: (i: number) => boolean) => {
    let nearest = Infinity;
    dab(p, cx, cy, r, (i) => {
        if (p.depth[i] < nearest && counts(i)) nearest = p.depth[i];
    });
    return nearest;
};
