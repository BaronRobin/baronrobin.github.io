/**
 * Which splats a scan keeps, and in which layer. Shared by the tuning panel,
 * which previews it, and the bake, which writes it into the files, so what
 * you tune is what you get. Pure arithmetic on typed arrays; no three.js, so
 * Node can run it too.
 *
 * Two layers. Scans processed by Luma come with a sky: a perfect sphere of
 * splats around the origin, far out past everything else. That's the sky
 * layer, kept whole and never filtered. Everything inside it is the scene
 * layer, which the crops (a sphere, and a floor and ceiling) and the filters
 * work on.
 *
 * Positions are world space (after the scan's rotation), one splat per index,
 * in file order. The scan's rotation keeps the origin where it is.
 */

export const DROP = 0;
export const SCENE = 1;
export const SKY = 2;

export interface Filters {
    /** Splats at least this far from the origin are the sky layer. */
    sky: { radius: number } | null;
    /** Full detail inside the sphere; outside, only `keepOutside` of the splats, as backdrop. */
    crop: { center: [number, number, number]; radius: number; keepOutside: number } | null;
    /** A hard cut by height (y, so after levelling): below `min` and above `max` go. Either can be off. */
    height: { min: number | null; max: number | null } | null;
    /** Splats whose largest axis is over this go. */
    maxSize: number | null;
    /** Splats longer than this many times their width go. */
    maxNeedle: number | null;
    /** Floaters: splats with fewer than `minNeighbours` others within about `cell` (see neighbourCounts). */
    lonely: { cell: number; minNeighbours: number } | null;
}

/** A fixed pseudo-random 0–1 per splat, so thinning keeps the same ones as you drag. */
export const thinHash = (i: number) => ((Math.imul(i, 2654435761) >>> 0) % 10007) / 10007;

/** Largest axis, and largest over second-largest (how needle-like), per splat. */
export const shapes = (scales: Float32Array, n: number) => {
    const size = new Float32Array(n);
    const needle = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const a = scales[i * 3], b = scales[i * 3 + 1], c = scales[i * 3 + 2];
        const hi = Math.max(a, b, c);
        const mid = a + b + c - hi - Math.min(a, b, c);
        size[i] = hi;
        needle[i] = hi / Math.max(mid, 1e-9);
    }
    return { size, needle };
};

/** Grid coordinates are offset into 17 bits each, so a cell packs into one exact double. */
const OFFSET = 65536;
const SPAN = 131072;

/**
 * How many other splats are within about `cell` of each splat. Counted in
 * its own grid cube, on two grids half a cube apart, taking the larger: a
 * splat on the edge of a cube in one grid sits mid-cube in the other. The
 * full 27-cube neighbourhood is more exact but ten times slower, and this
 * has to keep up with a slider.
 *
 * A hash table on typed arrays, since a Map of millions of cells is too slow
 * and too big.
 */
export const neighbourCounts = (centers: Float32Array, n: number, cell: number) => {
    const capacity = 1 << Math.ceil(Math.log2(Math.max(n, 1) * 2));
    const mask = capacity - 1;
    const keys = new Float64Array(capacity); // 0 is empty
    const counts = new Uint32Array(capacity);
    const slots = new Uint32Array(n);
    const out = new Uint32Array(n);
    const clamp = (v: number) => Math.max(-OFFSET + 1, Math.min(OFFSET - 2, v));

    for (const shift of [0, 0.5]) {
        keys.fill(0);
        counts.fill(0);
        for (let i = 0; i < n; i++) {
            const x = clamp(Math.floor(centers[i * 3] / cell + shift));
            const y = clamp(Math.floor(centers[i * 3 + 1] / cell + shift));
            const z = clamp(Math.floor(centers[i * 3 + 2] / cell + shift));
            const key = ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET) + 1;
            let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & mask;
            while (keys[h] !== 0 && keys[h] !== key) h = (h + 1) & mask;
            keys[h] = key;
            counts[h]++;
            slots[i] = h;
        }
        for (let i = 0; i < n; i++) out[i] = Math.max(out[i], counts[slots[i]] - 1);
    }
    return out;
};

/**
 * Where a Luma-style sky starts, if the scan has one: a thin, dense shell of
 * splats around the origin, set apart from the rest by a gap. Found by
 * walking in from the outermost splat while they stay packed tight; the
 * boundary goes in the middle of the gap. (Hambacher Schloss: exactly 50,000
 * splats between 140 and 146, nothing between 132 and 140.)
 */
export const detectSky = (centers: Float32Array, n: number) => {
    if (n < 1000) return null;
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = Math.hypot(centers[i * 3], centers[i * 3 + 1], centers[i * 3 + 2]);
    d.sort();
    const outer = d[n - 1];
    let k = n - 1;
    while (k > 0 && d[k] - d[k - 1] < outer * 0.005) k--;
    const count = n - k;
    const thin = (outer - d[k]) / outer < 0.1;
    if (count < n * 0.01 || !thin || k === 0) return null;
    return { radius: (d[k] + d[k - 1]) / 2, count };
};

/**
 * Each splat's layer: SCENE or SKY, or DROP if the filters take it out, or
 * the brush did (`erased`, 1 for each splat painted out by hand).
 */
export const keepMask = (
    centers: Float32Array,
    shape: { size: Float32Array; needle: Float32Array },
    neighbours: Uint32Array | null,
    f: Filters,
    erased: Uint8Array | null = null,
) => {
    const n = shape.size.length;
    const out = new Uint8Array(n);
    const [cx, cy, cz] = f.crop?.center ?? [0, 0, 0];
    const r2 = f.crop ? f.crop.radius * f.crop.radius : Infinity;
    const keepOutside = f.crop?.keepOutside ?? 1;
    const sky2 = f.sky ? f.sky.radius * f.sky.radius : Infinity;
    // Saved before the height cut existed, settings have none.
    const floor = f.height?.min ?? -Infinity, ceiling = f.height?.max ?? Infinity;
    for (let i = 0; i < n; i++) {
        const x = centers[i * 3], y = centers[i * 3 + 1], z = centers[i * 3 + 2];
        if (x * x + y * y + z * z >= sky2) { out[i] = SKY; continue; }
        if (erased?.[i]) continue;
        if (y < floor || y > ceiling) continue;
        if (f.maxSize !== null && shape.size[i] > f.maxSize) continue;
        if (f.maxNeedle !== null && shape.needle[i] > f.maxNeedle) continue;
        if (f.lonely && neighbours && neighbours[i] < f.lonely.minNeighbours) continue;
        const dx = x - cx, dy = y - cy, dz = z - cz;
        if (dx * dx + dy * dy + dz * dz <= r2 || thinHash(i) < keepOutside) out[i] = SCENE;
    }
    return out;
};

/**
 * The brush's selection on disk (settings/<scan>.erase.bin): little-endian
 * Uint32s, the scan's splat count, then the index of every splat painted out,
 * in order. Indices are file order, so the count says which file they're for.
 */
export const encodeErased = (erased: Uint8Array) => {
    let count = 0;
    for (let i = 0; i < erased.length; i++) count += erased[i];
    const out = new Uint32Array(count + 1);
    out[0] = erased.length;
    for (let i = 0, k = 1; i < erased.length; i++) if (erased[i]) out[k++] = i;
    return out;
};

/** The selection back as a mask, or null when it was saved for a different number of splats. */
export const decodeErased = (bytes: ArrayBuffer, n: number) => {
    const list = new Uint32Array(bytes);
    if (list.length < 1 || list[0] !== n) return null;
    const erased = new Uint8Array(n);
    for (let k = 1; k < list.length; k++) if (list[k] < n) erased[list[k]] = 1;
    return erased;
};
