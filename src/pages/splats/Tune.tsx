import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SplatMesh } from '@sparkjsdev/spark';
import { dab, nearestUnder, project, type Projection } from './brush';
import { decodeErased, detectSky, encodeErased, keepMask, neighbourCounts, SCENE, shapes, SKY, type Filters } from './filters';
import { levelQuaternion, orientation, rememberSettings, type Scan, type ScanSettings, type ViewPresets } from './scans';
import { placeSky, SKY_LAYER, type SkyLayer } from './sky';
import { VIEW_NAMES, type ViewName } from './views';
import { inks } from './ink';
import { INK, LABEL } from './ui';

/**
 * Tuning panel, behind ?tune and the pencil it brings up: set a scan's start
 * view, crop and streak filters by eye, then save them for baking. On the dev
 * server Save writes into ./settings; on the live site there's no one to
 * write them, so it downloads the same files instead.
 *
 * Level first: trainers know where the cameras were, not where gravity points,
 * so every scan is a few degrees off. Tilt and turn it square (or let the
 * flattest direction of the scene suggest up), with a grid to judge by.
 *
 * Layers next: a Luma scan's sky sphere is found on its own and kept whole,
 * out of reach of everything below.
 *
 * The crop doesn't delete the world around a scan, it thins it: inside the
 * sphere every splat stays, outside only a share of them, so the sky and the
 * backdrop survive at a fraction of the weight. The height crop is a hard
 * cut instead: a floor for what trainers leave under the ground, a ceiling
 * for what drifts above the scene. Streaks go by size (too big),
 * loneliness (too few neighbours: floaters) and, if wanted, shape (needles).
 * The maths is in filters.ts, which the bake runs too.
 *
 * What the filters can't tell apart, the brush takes by hand: floaters come
 * in clouds, so they have neighbours, and they're no bigger than the rest.
 * Paint them on screen (brush.ts finds the splats under the ring); "front
 * layer" keeps a stroke to the depth it started at, so a floater in front of
 * a wall goes without the wall.
 *
 * Everything is in world space, i.e. after the scan's rotation.
 */

/** The dev server writes what these post into ./settings (scripts/vite-splat-studio.ts). */
const SAVE_URL = '/__splats/settings';
const ERASE_URL = '/__splats/erase';
/** The live site has no server to save to: hand the file over instead. */
const download = (name: string, blob: Blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
/** Wait this long after a slider stops before re-hiding splats; a pass can take a second. */
const APPLY_DELAY = 200;
const MAX_NEIGHBOURS = 40;
const HIGHLIGHT = new THREE.Color(1, 0.1, 0.15);
const SKY_TINT = new THREE.Color(0.2, 0.45, 1);
const BRUSH_TINT = new THREE.Color(1, 0.62, 0.08);
/** Backdrop kept outside the crop sphere, to start with. */
const KEEP_OUTSIDE = 0.15;
/** Brush size to start with, its range (CSS px), and how much [ and ] change it. */
const BRUSH_SIZE = 28;
const BRUSH_MIN = 3;
const BRUSH_MAX = 300;
const BRUSH_STEP = 1.25;
/** How deep a front-layer stroke reaches behind the splat it locked onto, to start with: a share of its distance. */
const BAND = 0.08;
/** A front-layer stroke locks onto the nearest splat at least this opaque. */
const LOCK_OPACITY = 0.25;
/** Project the splats this long after the camera stops, so a stroke can start at once. */
const REST_MS = 150;
const COLLAPSED_KEY = 'splats.tune.collapsed';
/** Which groups are open, remembered per browser like the panel itself. */
const GROUPS_KEY = 'splats.tune.groups';
const GROUP_IDS = ['orientation', 'sky', 'clean', 'presentation'] as const;
type GroupId = (typeof GROUP_IDS)[number];
const SHARPEN_MAX = 2;

interface Props {
    scan: Scan;
    mesh: SplatMesh;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    /** The canvas, for the brush. */
    dom: HTMLCanvasElement;
    /** Bytes of the loaded file, to estimate what's left. */
    fileBytes: number | null;
    /** Blueprint is on, or on its way: no brush then. */
    blueprint: boolean;
    /** The blueprint view the camera is square on to, and its section. */
    section: { view: ViewName; cut: number; depth: number } | null;
    presets: ViewPresets;
    onPresets: (presets: ViewPresets) => void;
    /** Sharpen the live view by this much. */
    onSharpen: (amount: number) => void;
    /** An added sky (sky.ts), with what it's placed around. */
    sky: { mesh: SplatMesh; radius: number } | null;
    centre: THREE.Vector3;
    reach: number;
}

const fmt = (v: number) => Number(v.toFixed(3));
const vec = (v: THREE.Vector3) => [fmt(v.x), fmt(v.y), fmt(v.z)] as [number, number, number];

/** Slider position 0–1 to a value on a log scale between lo and hi, and back. */
const logScale = (t: number, lo: number, hi: number) => lo * Math.pow(hi / lo, t);
const unLogScale = (v: number, lo: number, hi: number) => THREE.MathUtils.clamp(Math.log(v / lo) / Math.log(hi / lo), 0, 1);

/** Value at a quantile of a sorted array. */
const at = (sorted: Float32Array, q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

const Y = new THREE.Vector3(0, 1, 0);
type Level = [number, number, number];

/**
 * The direction a cloud of points is flattest in: the eigenvector of their
 * covariance with the smallest eigenvalue, by Jacobi rotations. For a
 * landscape that's the ground's normal, for a hall the floor's.
 */
const flattest = (points: number[][]) => {
    const n = points.length;
    const mean = [0, 1, 2].map((k) => points.reduce((a, p) => a + p[k], 0) / n);
    const a = [0, 1, 2].map((r) => [0, 1, 2].map((c) => points.reduce((sum, p) => sum + (p[r] - mean[r]) * (p[c] - mean[c]), 0) / n));
    const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let sweep = 0; sweep < 32; sweep++) {
        for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
            if (Math.abs(a[p][q]) < 1e-15) continue;
            const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
            const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
            const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
            for (let k = 0; k < 3; k++) { const kp = a[k][p], kq = a[k][q]; a[k][p] = cs * kp - sn * kq; a[k][q] = sn * kp + cs * kq; }
            for (let k = 0; k < 3; k++) { const pk = a[p][k], qk = a[q][k]; a[p][k] = cs * pk - sn * qk; a[q][k] = sn * pk + cs * qk; }
            for (let k = 0; k < 3; k++) { const kp = v[k][p], kq = v[k][q]; v[k][p] = cs * kp - sn * kq; v[k][q] = sn * kp + cs * kq; }
        }
    }
    const i = [0, 1, 2].reduce((best, k) => (a[k][k] < a[best][best] ? k : best), 0);
    return new THREE.Vector3(v[0][i], v[1][i], v[2][i]).normalize();
};

/** What each splat currently shows as: hidden, itself, marked for removal, tinted as sky, or painted out with the brush. */
const HIDDEN = 0, SHOWN = 1, MARKED = 2, SKY_SHOWN = 3, BRUSHED = 4;

/** One brush stroke, for undo: the splats it changed, and what it set them to. */
interface Stroke {
    indices: Uint32Array;
    value: 0 | 1;
}

type BrushMode = 'through' | 'front';

const ones = (mask: Uint8Array | null) => {
    let count = 0;
    if (mask) for (let i = 0; i < mask.length; i++) count += mask[i];
    return count;
};

const readGroups = (): Record<GroupId, boolean> => {
    const open = Object.fromEntries(GROUP_IDS.map((id) => [id, true])) as Record<GroupId, boolean>;
    try {
        const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}');
        for (const id of GROUP_IDS) if (typeof saved[id] === 'boolean') open[id] = saved[id];
    } catch {
        // Nothing remembered: all open.
    }
    return open;
};

const readCollapsed = () => {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
};

const Tune = ({ scan, mesh, scene, camera, controls, dom, fileBytes, blueprint, section, presets, onPresets, onSharpen, sky, centre, reach }: Props) => {
    const splats = mesh.packedSplats;

    // The levelling turns the mesh at once; the world positions the filters
    // work on follow when the sliders settle, since re-reading them takes a moment.
    const [level, setLevel] = useState<Level>(scan.settings?.level ?? [0, 0, 0]);
    const [settledLevel, setSettledLevel] = useState<Level>(level);
    useEffect(() => {
        mesh.quaternion.copy(orientation(scan, level));
        mesh.updateMatrixWorld(true);
        const timer = setTimeout(() => setSettledLevel(level), 400);
        return () => clearTimeout(timer);
    }, [mesh, scan, level]);

    // One pass over the splats: world centres, scales and opacity.
    const data = useMemo(() => {
        if (!splats) return null;
        mesh.updateMatrixWorld(true);
        const n = splats.numSplats;
        const centers = new Float32Array(n * 3);
        const scales = new Float32Array(n * 3);
        const opacity = new Float32Array(n);
        const v = new THREE.Vector3();
        mesh.forEachSplat((i, center, s, _q, o) => {
            v.copy(center).applyMatrix4(mesh.matrixWorld);
            centers[i * 3] = v.x; centers[i * 3 + 1] = v.y; centers[i * 3 + 2] = v.z;
            scales[i * 3] = s.x; scales[i * 3 + 1] = s.y; scales[i * 3 + 2] = s.z;
            opacity[i] = o;
        });
        const shape = shapes(scales, n);
        return {
            n,
            centers,
            opacity,
            shape,
            sortedSize: Float32Array.from(shape.size).sort(),
            sortedNeedle: Float32Array.from(shape.needle).sort(),
        };
        // Re-read when the levelling settles: it moves every centre.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mesh, splats, settledLevel]);
    const n = data?.n ?? 0;

    const sceneRadius = useMemo(() => {
        if (!data) return 1;
        const c = controls.target;
        const d: number[] = [];
        for (let i = 0; i < data.n; i += Math.max(1, Math.floor(data.n / 20000))) {
            d.push(Math.hypot(data.centers[i * 3] - c.x, data.centers[i * 3 + 1] - c.y, data.centers[i * 3 + 2] - c.z));
        }
        d.sort((a, b) => a - b);
        return d[Math.floor(d.length * 0.98)] || 1;
        // Measured once per scan, around where it opened.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const detectedSky = useMemo(() => (data ? detectSky(data.centers, data.n) : null), [data]);

    /** How high the scene runs, for the floor and ceiling sliders: the sky left out, and the odd stray. */
    const heights = useMemo(() => {
        if (!data) return [-1, 1] as const;
        const sky2 = detectedSky ? detectedSky.radius * detectedSky.radius : Infinity;
        const ys: number[] = [];
        for (let i = 0; i < data.n; i += Math.max(1, Math.floor(data.n / 50000))) {
            const x = data.centers[i * 3], y = data.centers[i * 3 + 1], z = data.centers[i * 3 + 2];
            if (x * x + y * y + z * z < sky2) ys.push(y);
        }
        ys.sort((a, b) => a - b);
        return [ys[Math.floor(ys.length * 0.002)] ?? -1, ys[Math.floor(ys.length * 0.998)] ?? 1] as const;
    }, [data, detectedSky]);

    // Picks up where the last save left off.
    const before = scan.settings;
    /** The sky layer's boundary, or null to treat everything as scene. */
    const [skyRadius, setSkyRadius] = useState<number | null>(
        before && 'sky' in before ? before.sky?.radius ?? null : detectedSky?.radius ?? null);
    const [view, setView] = useState<Scan['view']>(scan.view);
    const [cropCenter, setCropCenter] = useState(() =>
        before?.crop ? new THREE.Vector3(...before.crop.center) : controls.target.clone());
    const [cropRadius, setCropRadius] = useState<number | null>(before?.crop?.radius ?? null);
    const [keepOutside, setKeepOutside] = useState(before?.crop?.keepOutside ?? KEEP_OUTSIDE);
    /** The height cut: nothing below the floor, nothing above the ceiling. */
    const [floor, setFloor] = useState<number | null>(before?.height?.min ?? null);
    const [ceiling, setCeiling] = useState<number | null>(before?.height?.max ?? null);
    const [maxSize, setMaxSize] = useState<number | null>(before?.maxSize ?? null);
    const [maxNeedle, setMaxNeedle] = useState<number | null>(before?.maxNeedle ?? null);
    const [cell, setCell] = useState<number>(before?.lonely?.cell ?? sceneRadius / 300);
    const [minNeighbours, setMinNeighbours] = useState(before?.lonely?.minNeighbours ?? 0);
    const [sharpen, setSharpen] = useState(before?.sharpen ?? 0);
    const [skyLayer, setSkyLayer] = useState<SkyLayer>(before?.skyLayer ?? SKY_LAYER);
    // The added sky follows its sliders at once.
    useEffect(() => {
        if (sky) placeSky(sky.mesh, sky.radius, centre, reach, skyLayer);
    }, [sky, centre, reach, skyLayer]);
    const [highlight, setHighlight] = useState(true);
    const [saved, setSaved] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [groups, setGroups] = useState(readGroups);
    const toggleGroup = (id: GroupId) => setGroups((g) => ({ ...g, [id]: !g[id] }));

    // The sliders run on log scales; 1 is off.
    const ranges = {
        crop: [sceneRadius * 0.02, sceneRadius] as const,
        size: data ? [at(data.sortedSize, 0.5), at(data.sortedSize, 1)] as const : [1, 2] as const,
        needle: data ? [Math.max(2, at(data.sortedNeedle, 0.5)), at(data.sortedNeedle, 1)] as const : [2, 3] as const,
        cell: [sceneRadius / 3000, sceneRadius / 30] as const,
    };
    const toT = (v: number | null, r: readonly [number, number]) => (v === null ? 1 : Math.min(0.999, unLogScale(v, ...r)));
    const fromT = (t: number, r: readonly [number, number]) => (t >= 1 ? null : logScale(t, ...r));
    // Heights run straight, from the scene's lowest to its highest.
    const toHeightT = (y: number) => THREE.MathUtils.clamp((y - heights[0]) / (heights[1] - heights[0] || 1), 0, 1);
    const fromHeightT = (t: number) => heights[0] + t * (heights[1] - heights[0]);

    // Neighbour counts depend only on the neighbourhood size: a second or two,
    // so they run after the slider settles, and only when the filter is on.
    const [neighbours, setNeighbours] = useState<{ data: typeof data; cell: number; counts: Uint32Array } | null>(null);
    const [counting, setCounting] = useState(false);
    useEffect(() => {
        if (!data || minNeighbours === 0 || (neighbours?.cell === cell && neighbours.data === data)) return;
        const timer = setTimeout(() => {
            setCounting(true);
            // Let the "counting" label paint before the long synchronous pass.
            requestAnimationFrame(() => setTimeout(() => {
                setNeighbours({ data, cell, counts: neighbourCounts(data.centers, data.n, cell) });
                setCounting(false);
            }, 0));
        }, APPLY_DELAY);
        return () => clearTimeout(timer);
    }, [data, cell, minNeighbours, neighbours]);

    // --- The brush's selection ---------------------------------------------------
    // `erased` is what renders and filters see: a new array after every stroke.
    // The handlers work on erasedRef, a copy taken when a stroke starts.
    const [erased, setErased] = useState<Uint8Array | null>(null);
    const erasedRef = useRef<Uint8Array | null>(null);
    /** Goes up with every change to the selection, for the unsaved-changes mark. */
    const [erasedStamp, setErasedStamp] = useState(0);
    const [eraseNote, setEraseNote] = useState<string | null>(null);
    const undoRef = useRef<Stroke[]>([]);
    const redoRef = useRef<Stroke[]>([]);
    const [history, setHistory] = useState({ undo: 0, redo: 0 });
    const erasedCount = useMemo(() => ones(erased), [erased]);

    const filters: Filters = {
        sky: skyRadius === null ? null : { radius: skyRadius },
        crop: cropRadius === null ? null : { center: vec(cropCenter), radius: cropRadius, keepOutside },
        height: floor === null && ceiling === null ? null : { min: floor, max: ceiling },
        maxSize,
        maxNeedle,
        lonely: minNeighbours > 0 ? { cell, minNeighbours } : null,
    };
    const lonelyReady = minNeighbours === 0 || (neighbours?.cell === cell && neighbours.data === data);

    const keep = useMemo(() => {
        if (!data || !lonelyReady) return null;
        return keepMask(data.centers, data.shape, neighbours?.counts ?? null, filters, erased);
        // `filters` is rebuilt every render; its parts are the real dependencies.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, lonelyReady, neighbours, skyRadius, cropRadius, cropCenter, keepOutside, floor, ceiling, maxSize, maxNeedle, cell, minNeighbours, erased]);

    const kept = useMemo(() => keep?.reduce((a, k) => a + (k ? 1 : 0), 0) ?? null, [keep]);

    // Show it: removed splats hidden, or marked red (amber where the brush
    // took them). Only the splats whose state changed are touched, after the
    // sliders settle.
    const original = useRef<{ opacity: Float32Array; color: Float32Array } | null>(null);
    const state = useRef<Uint8Array | null>(null);
    useEffect(() => {
        if (!data || !splats || !keep) return;
        const timer = setTimeout(() => {
            if (!original.current) {
                const opacity = new Float32Array(data.n);
                const color = new Float32Array(data.n * 3);
                for (let i = 0; i < data.n; i++) {
                    const s = splats.getSplat(i);
                    opacity[i] = s.opacity;
                    color[i * 3] = s.color.r; color[i * 3 + 1] = s.color.g; color[i * 3 + 2] = s.color.b;
                }
                original.current = { opacity, color };
                state.current = new Uint8Array(data.n).fill(SHOWN);
            }
            const { opacity, color } = original.current;
            const own = new THREE.Color();
            let changed = false;
            for (let i = 0; i < data.n; i++) {
                const want = keep[i] === SCENE ? SHOWN
                    : keep[i] === SKY ? (highlight ? SKY_SHOWN : SHOWN)
                        : !highlight ? HIDDEN
                            : erased?.[i] ? BRUSHED : MARKED;
                if (want === state.current![i]) continue;
                const s = splats.getSplat(i);
                own.setRGB(color[i * 3], color[i * 3 + 1], color[i * 3 + 2]);
                const tint = want === MARKED ? HIGHLIGHT : want === BRUSHED ? BRUSH_TINT : want === SKY_SHOWN ? SKY_TINT : own;
                splats.setSplat(i, s.center, s.scales, s.quaternion, want === HIDDEN ? 0 : opacity[i], tint);
                state.current![i] = want;
                changed = true;
            }
            if (changed) splats.needsUpdate = true;
        }, APPLY_DELAY);
        return () => clearTimeout(timer);
    }, [data, splats, keep, highlight, erased]);

    // Put every splat back when leaving this scan, unless it's already gone.
    useEffect(() => () => {
        if (!data || !splats || !original.current || !state.current) return;
        if (splats.numSplats !== data.n) return;
        const { opacity, color } = original.current;
        const own = new THREE.Color();
        try {
            for (let i = 0; i < data.n; i++) {
                if (state.current[i] === SHOWN) continue;
                const s = splats.getSplat(i);
                own.setRGB(color[i * 3], color[i * 3 + 1], color[i * 3 + 2]);
                splats.setSplat(i, s.center, s.scales, s.quaternion, opacity[i], own);
            }
            splats.needsUpdate = true;
        } catch {
            // Disposed between the check and here; nothing left to restore.
        }
    }, [data, splats]);

    // --- Brush -------------------------------------------------------------------
    const [brushOn, setBrushOn] = useState(false);
    const [radius, setRadius] = useState(BRUSH_SIZE);
    const [mode, setMode] = useState<BrushMode>('through');
    /** Front layer: how deep a stroke reaches behind the splat it locked onto, as a share of its distance. */
    const [band, setBand] = useState(BAND);
    const [stroking, setStroking] = useState(false);
    const brushRef = useRef({ radius, mode, band });
    useEffect(() => { brushRef.current = { radius, mode, band }; });
    const ringRef = useRef<HTMLDivElement>(null);
    const spaceRef = useRef(false);

    // The selection as saved, once per scan.
    useEffect(() => {
        if (!n) return;
        let alive = true;
        (async () => {
            const res = await fetch(`${ERASE_URL}/${scan.id}`);
            let mask = new Uint8Array(n);
            // 204: nothing painted out yet.
            if (res.status === 200) {
                const loaded = decodeErased(await res.arrayBuffer(), n);
                if (loaded) mask = loaded;
                else if (alive) setEraseNote('The saved brush selection is for another version of this file, so it was left out.');
            }
            if (!alive) return;
            erasedRef.current = mask;
            setErased(mask);
        })().catch(() => {
            if (!alive) return;
            erasedRef.current = new Uint8Array(n);
            setErased(erasedRef.current);
        });
        return () => { alive = false; };
    }, [n, scan.id]);

    // Painted splats, as amber dots over everything: there the moment the
    // brush passes, before the splats themselves change.
    const dotsRef = useRef<THREE.Points | null>(null);
    const dotsFrame = useRef(0);
    useEffect(() => {
        const points = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({ color: 0xffb020, size: 3, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, opacity: 0.9 }),
        );
        points.frustumCulled = false;
        points.renderOrder = 10;
        scene.add(points);
        dotsRef.current = points;
        return () => {
            cancelAnimationFrame(dotsFrame.current);
            points.removeFromParent();
            points.geometry.dispose();
            (points.material as THREE.Material).dispose();
            dotsRef.current = null;
        };
    }, [scene]);
    const refreshDots = useCallback(() => {
        cancelAnimationFrame(dotsFrame.current);
        dotsFrame.current = requestAnimationFrame(() => {
            const points = dotsRef.current, mask = erasedRef.current;
            if (!points || !mask || !data) return;
            const count = ones(mask);
            let attribute = points.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
            if (!attribute || attribute.count < count) {
                points.geometry.dispose();
                points.geometry = new THREE.BufferGeometry();
                attribute = new THREE.BufferAttribute(new Float32Array(Math.max(4096, count * 2) * 3), 3);
                attribute.setUsage(THREE.DynamicDrawUsage);
                points.geometry.setAttribute('position', attribute);
            }
            const out = attribute.array as Float32Array;
            let k = 0;
            for (let i = 0; i < mask.length; i++) {
                if (!mask[i]) continue;
                out[k++] = data.centers[i * 3]; out[k++] = data.centers[i * 3 + 1]; out[k++] = data.centers[i * 3 + 2];
            }
            attribute.clearUpdateRanges();
            attribute.addUpdateRange(0, Math.max(k, 3));
            attribute.needsUpdate = true;
            points.geometry.setDrawRange(0, count);
        });
    }, [data]);
    // New centres after levelling, or a new selection: redraw.
    useEffect(() => { refreshDots(); }, [refreshDots, erased]);
    useEffect(() => {
        if (dotsRef.current) dotsRef.current.visible = !blueprint && (highlight || stroking);
    }, [blueprint, highlight, stroking]);

    /** Take a new selection: what renders, what strokes start from, and undo's record of it. */
    const commit = useCallback((mask: Uint8Array, stroke: Stroke | null, from: 'stroke' | 'undo' | 'redo') => {
        erasedRef.current = mask;
        if (stroke && from === 'stroke') {
            undoRef.current = [...undoRef.current.slice(-99), stroke];
            redoRef.current = [];
        }
        setErased(mask);
        setErasedStamp((s) => s + 1);
        setHistory({ undo: undoRef.current.length, redo: redoRef.current.length });
    }, []);

    const undo = useCallback(() => {
        const stroke = undoRef.current.pop();
        if (!stroke || !erasedRef.current) return;
        const mask = erasedRef.current.slice();
        for (const i of stroke.indices) mask[i] = stroke.value ? 0 : 1;
        redoRef.current.push(stroke);
        commit(mask, stroke, 'undo');
    }, [commit]);

    const redo = useCallback(() => {
        const stroke = redoRef.current.pop();
        if (!stroke || !erasedRef.current) return;
        const mask = erasedRef.current.slice();
        for (const i of stroke.indices) mask[i] = stroke.value;
        undoRef.current.push(stroke);
        commit(mask, stroke, 'redo');
    }, [commit]);

    const clearBrush = () => {
        const mask = erasedRef.current;
        if (!mask) return;
        const indices: number[] = [];
        for (let i = 0; i < mask.length; i++) if (mask[i]) indices.push(i);
        if (!indices.length) return;
        commit(new Uint8Array(mask.length), { indices: Uint32Array.from(indices), value: 0 }, 'stroke');
    };

    // Where every splat is on screen: redone when the camera has moved since,
    // and ahead of time, as soon as the camera comes to rest.
    const projRef = useRef<{ proj: Projection; data: typeof data; w: number; h: number; matrix: number[] } | null>(null);
    const ensureProjection = useCallback(() => {
        if (!data) return null;
        camera.updateMatrixWorld();
        const w = dom.clientWidth, h = dom.clientHeight;
        const matrix = [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements];
        const last = projRef.current;
        if (last && last.data === data && last.w === w && last.h === h && last.matrix.every((v, i) => v === matrix[i])) return last.proj;
        const viewMatrix = camera.matrixWorld.clone().invert();
        const viewProjection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
        const proj = project(data.centers, data.n, viewProjection.elements, viewMatrix.elements, w, h, last?.proj);
        projRef.current = { proj, data, w, h, matrix };
        return proj;
    }, [data, camera, dom]);

    useEffect(() => {
        if (!brushOn || blueprint || !data) return;
        let timer = 0;
        const later = () => {
            clearTimeout(timer);
            timer = window.setTimeout(ensureProjection, REST_MS);
        };
        later();
        controls.addEventListener('change', later);
        return () => {
            clearTimeout(timer);
            controls.removeEventListener('change', later);
        };
    }, [brushOn, blueprint, data, controls, ensureProjection]);

    // The cursor: the brush's ring instead of the arrow, a hand while Space is held.
    const setCursor = useCallback(() => {
        const brushing = brushOn && !blueprint;
        dom.style.cursor = brushing ? (spaceRef.current ? 'grab' : 'none') : '';
        if (ringRef.current && (!brushing || spaceRef.current)) ringRef.current.style.display = 'none';
    }, [brushOn, blueprint, dom]);
    useEffect(() => {
        setCursor();
        return () => { dom.style.cursor = ''; };
    }, [setCursor, dom]);

    // Strokes, caught before OrbitControls sees them. Right-drag still pans,
    // the wheel still zooms, and with Space held a left-drag orbits as usual.
    useEffect(() => {
        if (!brushOn || blueprint || !data) return;
        const { centers, opacity } = data;
        const sky2 = skyRadius === null ? Infinity : skyRadius * skyRadius;
        const notSky = (i: number) => {
            const x = centers[i * 3], y = centers[i * 3 + 1], z = centers[i * 3 + 2];
            return x * x + y * y + z * z < sky2;
        };
        /** Splats a front-layer stroke can lock onto: on show as themselves, and solid enough to see. */
        const lockable = (i: number) => notSky(i) && opacity[i] >= LOCK_OPACITY && (state.current?.[i] ?? SHOWN) === SHOWN;

        let stroke: {
            id: number; erase: boolean; mask: Uint8Array; flipped: number[];
            lock: [number, number] | null; x: number; y: number; proj: Projection;
        } | null = null;

        const local = (e: PointerEvent) => {
            const box = dom.getBoundingClientRect();
            return { x: e.clientX - box.left, y: e.clientY - box.top };
        };
        const showRing = (e: PointerEvent) => {
            const ring = ringRef.current;
            if (!ring) return;
            if (spaceRef.current) { ring.style.display = 'none'; return; }
            const r = brushRef.current.radius;
            ring.style.display = 'block';
            ring.style.transform = `translate(${e.clientX - r}px, ${e.clientY - r}px)`;
            ring.style.borderStyle = e.altKey ? 'dashed' : 'solid';
        };
        const hideRing = () => { if (ringRef.current) ringRef.current.style.display = 'none'; };

        const paint = (x: number, y: number) => {
            const s = stroke!;
            const { radius: r, mode: m, band: b } = brushRef.current;
            if (!s.erase && m === 'front' && !s.lock) {
                const z = nearestUnder(s.proj, x, y, r, lockable);
                if (z === Infinity) return;
                s.lock = [z * (1 - b / 4), z * (1 + b)];
            }
            dab(s.proj, x, y, r, (i) => {
                if (s.erase) {
                    if (s.mask[i]) { s.mask[i] = 0; s.flipped.push(i); }
                    return;
                }
                if (s.mask[i] || !notSky(i)) return;
                if (s.lock && (s.proj.depth[i] < s.lock[0] || s.proj.depth[i] > s.lock[1])) return;
                s.mask[i] = 1;
                s.flipped.push(i);
            });
        };

        const down = (e: PointerEvent) => {
            if (e.button !== 0 || spaceRef.current || stroke || !erasedRef.current) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            const proj = ensureProjection();
            if (!proj) return;
            dom.setPointerCapture(e.pointerId);
            const mask = erasedRef.current.slice();
            erasedRef.current = mask;
            stroke = { id: e.pointerId, erase: e.altKey, mask, flipped: [], lock: null, proj, ...local(e) };
            setStroking(true);
            paint(stroke.x, stroke.y);
            refreshDots();
        };
        const move = (e: PointerEvent) => {
            showRing(e);
            if (!stroke || e.pointerId !== stroke.id) return;
            e.stopImmediatePropagation();
            // OrbitControls may still be easing out of the last orbit.
            stroke.proj = ensureProjection() ?? stroke.proj;
            const p = local(e);
            const dx = p.x - stroke.x, dy = p.y - stroke.y;
            const steps = Math.ceil(Math.hypot(dx, dy) / Math.max(1, brushRef.current.radius / 3));
            for (let k = 1; k <= steps; k++) paint(stroke.x + (dx * k) / steps, stroke.y + (dy * k) / steps);
            stroke.x = p.x;
            stroke.y = p.y;
            refreshDots();
        };
        const finish = () => {
            if (!stroke) return;
            const s = stroke;
            stroke = null;
            if (dom.hasPointerCapture(s.id)) dom.releasePointerCapture(s.id);
            commit(s.mask, s.flipped.length ? { indices: Uint32Array.from(s.flipped), value: s.erase ? 0 : 1 } : null, 'stroke');
            // The dots stay until the splats themselves have caught up.
            window.setTimeout(() => setStroking(false), APPLY_DELAY + 100);
        };
        const up = (e: PointerEvent) => {
            if (!stroke || e.pointerId !== stroke.id) return;
            e.stopImmediatePropagation();
            finish();
        };

        dom.addEventListener('pointerdown', down, { capture: true });
        dom.addEventListener('pointermove', move, { capture: true });
        dom.addEventListener('pointerup', up, { capture: true });
        dom.addEventListener('pointercancel', up, { capture: true });
        dom.addEventListener('pointerleave', hideRing);
        return () => {
            finish();
            hideRing();
            dom.removeEventListener('pointerdown', down, { capture: true });
            dom.removeEventListener('pointermove', move, { capture: true });
            dom.removeEventListener('pointerup', up, { capture: true });
            dom.removeEventListener('pointercancel', up, { capture: true });
            dom.removeEventListener('pointerleave', hideRing);
        };
    }, [brushOn, blueprint, data, skyRadius, dom, ensureProjection, commit, refreshDots]);

    const resizeBrush = useCallback((by: number) => {
        setRadius((r) => Math.round(THREE.MathUtils.clamp(r * by, BRUSH_MIN, BRUSH_MAX)));
    }, []);

    // Keys: B brush, [ ] its size (by position, so Ü and + on a German Mac),
    // ⌘Z / ⇧⌘Z undo and redo, N the panel, Space held to orbit.
    const keys = useRef({ undo, redo, resizeBrush, setCursor, brushing: false });
    useEffect(() => { keys.current = { undo, redo, resizeBrush, setCursor, brushing: brushOn && !blueprint }; });
    useEffect(() => {
        const typing = (e: KeyboardEvent) => ['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
        const down = (e: KeyboardEvent) => {
            if (typing(e)) return;
            const k = keys.current;
            if (e.code === 'Space' && k.brushing) {
                e.preventDefault();
                if (!spaceRef.current) { spaceRef.current = true; k.setCursor(); }
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) k.redo(); else k.undo();
                return;
            }
            if (e.code === 'BracketLeft' || e.key === '[') { k.resizeBrush(1 / BRUSH_STEP); return; }
            if (e.code === 'BracketRight' || e.key === ']') { k.resizeBrush(BRUSH_STEP); return; }
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === 'n' || e.key === 'N') setCollapsed((c) => !c);
            else if (e.key === 'b' || e.key === 'B') setBrushOn((on) => !on);
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === 'Space' && spaceRef.current) {
                spaceRef.current = false;
                keys.current.setCursor();
            }
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
            localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
        } catch {
            // Private window or blocked storage: it just won't be remembered.
        }
    }, [collapsed, groups]);

    // --- Levelling ------------------------------------------------------------------
    /**
     * Change the levelling. The crop centre and start view are turned with
     * the scan, so they stay on the same spot of it.
     */
    const changeLevel = (next: Level) => {
        const delta = levelQuaternion(next).multiply(levelQuaternion(level).invert());
        setCropCenter((c) => c.clone().applyQuaternion(delta));
        setView((v) => v && {
            position: vec(new THREE.Vector3(...v.position).applyQuaternion(delta)),
            target: vec(new THREE.Vector3(...v.target).applyQuaternion(delta)),
        });
        setLevel(next);
    };

    /** Suggest up from the scene's flattest direction, keeping the turn. */
    const autoLevel = () => {
        if (!data || !keep) return;
        const centre = filters.crop ? new THREE.Vector3(...filters.crop.center) : controls.target;
        const r = filters.crop?.radius ?? sceneRadius * 0.5;
        const sample: number[][] = [];
        const step = Math.max(1, Math.floor(data.n / 200000));
        for (let i = 0; i < data.n; i += step) {
            if (keep[i] !== SCENE) continue;
            const p = [data.centers[i * 3], data.centers[i * 3 + 1], data.centers[i * 3 + 2]];
            if (Math.hypot(p[0] - centre.x, p[1] - centre.y, p[2] - centre.z) <= r) sample.push(p);
        }
        if (sample.length < 100) return;
        const normal = flattest(sample);
        if (normal.y < 0) normal.negate();
        const q = new THREE.Quaternion().setFromUnitVectors(normal, Y).multiply(levelQuaternion(level));
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        changeLevel([e.x, e.y, e.z].map((v) => Number(THREE.MathUtils.radToDeg(v).toFixed(1))) as Level);
    };

    const [showGrid, setShowGrid] = useState(true);
    useEffect(() => {
        if (!showGrid) return;
        const grid = new THREE.GridHelper(sceneRadius * 2, 40, 0xffffff, 0x8899aa);
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.35;
        const follow = () => grid.position.copy(controls.target);
        follow();
        scene.add(grid);
        controls.addEventListener('change', follow);
        return () => {
            controls.removeEventListener('change', follow);
            grid.removeFromParent();
            grid.geometry.dispose();
            (grid.material as THREE.Material).dispose();
        };
    }, [showGrid, scene, controls, sceneRadius]);

    // The floor and ceiling as planes while they're being set, gone a moment after.
    const [planes, setPlanes] = useState(false);
    useEffect(() => {
        if (!planes) return;
        const timer = setTimeout(() => setPlanes(false), 1600);
        return () => clearTimeout(timer);
    }, [planes, floor, ceiling]);
    // Grids rather than filled planes: splats don't hide what's behind them,
    // so a filled floor would veil the whole scan in front of it.
    useEffect(() => {
        if (!planes) return;
        const grids: THREE.GridHelper[] = [];
        for (const y of [floor, ceiling]) {
            if (y === null) continue;
            const grid = new THREE.GridHelper(sceneRadius * 2, 24, 0xff4455, 0xff4455);
            const material = grid.material as THREE.Material;
            material.transparent = true;
            material.opacity = 0.5;
            material.depthWrite = false;
            grid.position.set(controls.target.x, y, controls.target.z);
            grid.renderOrder = 5;
            scene.add(grid);
            grids.push(grid);
        }
        return () => {
            for (const grid of grids) {
                grid.removeFromParent();
                grid.geometry.dispose();
                (grid.material as THREE.Material).dispose();
            }
        };
    }, [planes, floor, ceiling, scene, controls, sceneRadius]);

    // The slow turn would move the view out from under you.
    useEffect(() => { controls.autoRotate = false; }, [controls]);

    // --- Look ---------------------------------------------------------------------
    const [comparing, setComparing] = useState(false);
    useEffect(() => { onSharpen(comparing ? 0 : sharpen); }, [onSharpen, sharpen, comparing]);

    // --- Saving -------------------------------------------------------------------
    const settings: ScanSettings = {
        view,
        level,
        sky: filters.sky && { radius: fmt(filters.sky.radius) },
        crop: filters.crop && { ...filters.crop, radius: fmt(filters.crop.radius), keepOutside: fmt(keepOutside) },
        height: filters.height && { min: floor === null ? null : fmt(floor), max: ceiling === null ? null : fmt(ceiling) },
        maxSize: maxSize === null ? null : Number(maxSize.toPrecision(4)),
        maxNeedle: maxNeedle === null ? null : Number(maxNeedle.toPrecision(4)),
        lonely: filters.lonely && { cell: Number(cell.toPrecision(4)), minNeighbours },
        views: presets,
        sharpen,
        skyLayer: sky ? skyLayer : undefined,
    };
    // Unsaved changes: anything in the settings, or a stroke since the last save.
    const snapshot = JSON.stringify(settings) + erasedStamp;
    const [baseline, setBaseline] = useState<string | null>(null);
    const snapshotRef = useRef(snapshot);
    useEffect(() => { snapshotRef.current = snapshot; });
    // The first snapshot with the saved selection in is where "unsaved" starts from.
    useEffect(() => {
        if (erased && baseline === null) {
            const timer = setTimeout(() => setBaseline(snapshotRef.current), 0);
            return () => clearTimeout(timer);
        }
    }, [erased, baseline]);
    const dirty = baseline !== null && snapshot !== baseline;

    const save = async () => {
        const saving = snapshot;
        const body = { id: scan.id, ...settings, erased: erasedCount, kept, total: data?.n };
        if (!import.meta.env.DEV) {
            download(`${scan.id}.json`, new Blob([JSON.stringify(body, null, 2) + '\n'], { type: 'application/json' }));
            if (erasedCount && erasedRef.current) download(`${scan.id}.erase.bin`, new Blob([encodeErased(erasedRef.current)]));
            rememberSettings(scan.id, settings);
            setBaseline(saving);
            setSaved(`Downloaded ${new Date().toLocaleTimeString()}: put ${scan.id}.json in src/pages/splats/settings${erasedCount ? ` with ${scan.id}.erase.bin` : ''}.`);
            return;
        }
        try {
            if (erasedRef.current) {
                const res = await fetch(`${ERASE_URL}/${scan.id}`, { method: 'POST', body: encodeErased(erasedRef.current) });
                if (!res.ok) throw new Error(`brush selection: ${res.status}`);
            }
            const res = await fetch(`${SAVE_URL}/${scan.id}`, { method: 'POST', body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`settings: ${res.status}`);
            rememberSettings(scan.id, settings);
            setBaseline(saving);
            setSaved(`Saved ${new Date().toLocaleTimeString()}. The start view applies next time this scan opens, the view presets and sharpening at once; crop, filters and the brush once baked.`);
        } catch (error) {
            setSaved(`Save failed (${(error as Error).message}). Is the dev server running?`);
        }
    };

    if (!data || !splats) return <Panel title={`Tune · ${scan.title}`} collapsed={false} onCollapse={() => {}}>Can't tune this scan: no packed splats.</Panel>;

    const mb = (count: number) => (fileBytes ? `~${Math.round((fileBytes * count) / data.n / 1048576)} MB` : '');
    const brushing = brushOn && !blueprint;
    // What a closed group shows in its header.
    const presetCount = Object.keys(presets).length;
    const summaries = {
        orientation: level.some((v) => v !== 0) ? `tilt ${level[0].toFixed(1)}° ${level[2].toFixed(1)}° · turn ${level[1].toFixed(1)}°` : 'not levelled',
        sky: detectedSky ? (skyRadius !== null ? 'Luma sphere, kept whole' : 'Luma sphere, as scene') : sky ? `added · turn ${skyLayer.turn}°` : 'none',
        clean: `keeps ${((kept ?? 0) / 1e6).toFixed(2)} of ${(data.n / 1e6).toFixed(2)} M`,
        presentation: `${presetCount} view${presetCount === 1 ? '' : 's'} · sharpen ${sharpen ? sharpen.toFixed(2) : 'off'}`,
    };

    return (
        <>
            <div
                ref={ringRef}
                aria-hidden
                className="fixed left-0 top-0 z-20 hidden rounded-full border border-white/80 pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                style={{ width: radius * 2, height: radius * 2 }}
            />
            <Panel
                title={`Tune · ${scan.title}`}
                collapsed={collapsed}
                onCollapse={setCollapsed}
                status={(
                    <>
                        {brushing && <span className="text-amber-300">brush {radius} px</span>}
                        {erasedCount > 0 && <span className="opacity-60">{erasedCount.toLocaleString()} painted out</span>}
                        {dirty && <span title="Unsaved changes">●</span>}
                    </>
                )}
                footer={(
                    <>
                        <div className="text-xs opacity-80 mb-2">
                            Keeps {((kept ?? 0) / 1e6).toFixed(2)} M of {(data.n / 1e6).toFixed(2)} M splats {mb(kept ?? 0)}
                        </div>
                        <button type="button" className={`${btnOn} font-medium`} onClick={save}>
                            Save settings{dirty ? ' ●' : ''}
                        </button>
                        {saved && <div data-ink-part className="text-[11px] opacity-60 mt-1">{saved}</div>}
                    </>
                )}
            >
                <Group title="Orientation" summary={summaries.orientation} open={groups.orientation} onToggle={() => toggleGroup('orientation')}>
                    <Section title="Start view">
                        <button type="button" className={btn} onClick={() => setView({ position: vec(camera.position), target: vec(controls.target) })}>
                            Use current view
                        </button>
                        <div data-ink-part className="text-[11px] opacity-60 mt-1 font-mono">
                            {view ? `cam ${view.position.join(', ')}\ntgt ${view.target.join(', ')}` : 'not set (auto framing)'}
                        </div>
                    </Section>

                    <Section title="Level">
                        <Slider value={(level[0] + 20) / 40} onChange={(t) => changeLevel([Number((t * 40 - 20).toFixed(1)), level[1], level[2]])} onReset={() => changeLevel([0, level[1], level[2]])} label={`tilt X ${level[0].toFixed(1)}°`} />
                        <Slider value={(level[2] + 20) / 40} onChange={(t) => changeLevel([level[0], level[1], Number((t * 40 - 20).toFixed(1))])} onReset={() => changeLevel([level[0], level[1], 0])} label={`tilt Z ${level[2].toFixed(1)}°`} />
                        <Slider value={(level[1] + 180) / 360} onChange={(t) => changeLevel([level[0], Number((t * 360 - 180).toFixed(1)), level[2]])} onReset={() => changeLevel([level[0], 0, level[2]])} label={`turn ${level[1].toFixed(1)}° (squares it to the blueprint views)`} />
                        <div className="flex gap-2 mt-2">
                            <button type="button" className={btn} onClick={autoLevel}>Auto-level</button>
                            <button type="button" className={btn} onClick={() => changeLevel([0, 0, 0])}>Reset</button>
                        </div>
                        <div data-ink-part className="text-[11px] opacity-60 mt-1">Auto-level takes the scene's flattest direction, inside the crop if there is one, as the ground.</div>
                        <label data-ink-part className="flex items-center gap-2 mt-2 text-[11px] opacity-80">
                            <input type="checkbox" className="accent-current" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                            Show level grid at the orbit point
                        </label>
                    </Section>
                </Group>

                <Group title="Sky" summary={summaries.sky} open={groups.sky} onToggle={() => toggleGroup('sky')}>
                    <Section>
                        {detectedSky ? (
                            <>
                                <div data-ink-part className="text-[11px] opacity-80">
                                    Sky sphere (Luma): {detectedSky.count.toLocaleString()} splats from r {detectedSky.radius.toFixed(1)}
                                </div>
                                <label data-ink-part className="flex items-center gap-2 mt-1.5 text-[11px] opacity-80">
                                    <input
                                        type="checkbox"
                                        className="accent-current"
                                        checked={skyRadius !== null}
                                        onChange={(e) => setSkyRadius(e.target.checked ? detectedSky.radius : null)}
                                    />
                                    Keep it as its own layer, untouched by crop, filters and brush
                                </label>
                            </>
                        ) : (
                            <div data-ink-part className="text-[11px] opacity-60">No sky sphere found: not a Luma scan, all of it is scene.</div>
                        )}
                        {sky && (
                            <>
                                <div data-ink-part className="text-[11px] opacity-80 mt-3">Added sky, from Luma: its own layer, around the scan.</div>
                                <Slider
                                    value={(skyLayer.turn + 180) / 360}
                                    onChange={(t) => setSkyLayer({ ...skyLayer, turn: Math.round(t * 360 - 180) })}
                                    onReset={() => setSkyLayer({ ...skyLayer, turn: SKY_LAYER.turn })}
                                    label={`sky turn ${skyLayer.turn}° (put the sun where the light comes from)`}
                                />
                                <Slider
                                    value={unLogScale(skyLayer.size, 2, 40)}
                                    onChange={(t) => setSkyLayer({ ...skyLayer, size: Number(logScale(t, 2, 40).toFixed(2)) })}
                                    onReset={() => setSkyLayer({ ...skyLayer, size: SKY_LAYER.size })}
                                    label={`sky size ${skyLayer.size.toFixed(1)}× the scan`}
                                />
                                <Slider
                                    value={(skyLayer.lift + 0.3) / 0.6}
                                    onChange={(t) => setSkyLayer({ ...skyLayer, lift: Number((t * 0.6 - 0.3).toFixed(3)) })}
                                    onReset={() => setSkyLayer({ ...skyLayer, lift: SKY_LAYER.lift })}
                                    label={`horizon ${skyLayer.lift >= 0 ? '+' : ''}${(skyLayer.lift * 100).toFixed(1)}% of the sky`}
                                />
                            </>
                        )}
                    </Section>
                </Group>

                <Group title="Clean up" summary={summaries.clean} open={groups.clean} onToggle={() => toggleGroup('clean')}>
                    <Section title="Crop (sphere)">
                        <button type="button" className={btn} onClick={() => setCropCenter(controls.target.clone())}>
                            Centre on orbit point
                        </button>
                        <div data-ink-part className="text-[11px] opacity-60 mt-1">Right-drag to move the orbit point, then centre.</div>
                        <Slider value={toT(cropRadius, ranges.crop)} onChange={(t) => setCropRadius(fromT(t, ranges.crop))} onReset={() => setCropRadius(null)} label={cropRadius === null ? 'off' : `radius ${cropRadius.toFixed(2)}`} />
                        <Slider value={keepOutside} onChange={setKeepOutside} onReset={() => setKeepOutside(KEEP_OUTSIDE)} label={`backdrop outside: ${Math.round(keepOutside * 100)}% of splats`} />
                    </Section>

                    <Section title="Crop (height)">
                        <Slider
                            value={floor === null ? 0 : Math.max(0.001, toHeightT(floor))}
                            onChange={(t) => { setPlanes(true); setFloor(t <= 0 ? null : Math.min(fromHeightT(t), ceiling ?? Infinity)); }}
                            onReset={() => setFloor(null)}
                            label={floor === null ? 'floor: off' : `floor: drop below y ${floor.toFixed(2)}`}
                        />
                        <Slider
                            value={ceiling === null ? 1 : Math.min(0.999, toHeightT(ceiling))}
                            onChange={(t) => { setPlanes(true); setCeiling(t >= 1 ? null : Math.max(fromHeightT(t), floor ?? -Infinity)); }}
                            onReset={() => setCeiling(null)}
                            label={ceiling === null ? 'ceiling: off' : `ceiling: drop above y ${ceiling.toFixed(2)}`}
                        />
                        <div data-ink-part className="text-[11px] opacity-60 mt-1">A hard cut: under the floor and over the ceiling goes, the sky layer stays. Heights are after levelling, so level first.</div>
                    </Section>

                    <Section title="Streaks and floaters">
                        <Slider value={toT(maxSize, ranges.size)} onChange={(t) => setMaxSize(fromT(t, ranges.size))} onReset={() => setMaxSize(null)} label={maxSize === null ? 'size: off' : `size: drop over ${maxSize.toPrecision(3)}`} />
                        <Slider
                            value={minNeighbours / MAX_NEIGHBOURS}
                            onChange={(t) => setMinNeighbours(Math.round(t * MAX_NEIGHBOURS))}
                            onReset={() => setMinNeighbours(0)}
                            label={minNeighbours === 0 ? 'lonely: off' : `lonely: drop with < ${minNeighbours} neighbours${counting ? ' (counting…)' : ''}`}
                        />
                        <Slider value={toT(cell, ranges.cell)} onChange={(t) => setCell(logScale(Math.min(t, 1), ...ranges.cell))} onReset={() => setCell(sceneRadius / 300)} label={`neighbourhood: ${cell.toPrecision(2)}`} />
                        <Slider value={toT(maxNeedle, ranges.needle)} onChange={(t) => setMaxNeedle(fromT(t, ranges.needle))} onReset={() => setMaxNeedle(null)} label={maxNeedle === null ? 'needles: off' : `needles: drop over ${maxNeedle.toFixed(1)}× their width`} />
                        <label data-ink-part className="flex items-center gap-2 mt-2 text-[11px] opacity-80">
                            <input type="checkbox" className="accent-current" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
                            Show what goes in red (the brush's in amber, the sky in blue) instead of hiding it
                        </label>
                    </Section>

                    <Section title="Brush">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={blueprint}
                                className={brushing ? btnOn : btn}
                                onClick={() => setBrushOn(!brushOn)}
                            >
                                {brushing ? 'Brush on (B)' : 'Brush (B)'}
                            </button>
                            <button type="button" className={btn} disabled={!history.undo} onClick={undo} title="⌘Z">Undo</button>
                            <button type="button" className={btn} disabled={!history.redo} onClick={redo} title="⇧⌘Z">Redo</button>
                            <button type="button" className={btn} disabled={!erasedCount} onClick={clearBrush}>Clear</button>
                        </div>
                        {blueprint && <div data-ink-part className="text-[11px] opacity-60 mt-1">Leave blueprint to brush.</div>}
                        <Slider value={unLogScale(radius, BRUSH_MIN, BRUSH_MAX)} onChange={(t) => setRadius(Math.round(logScale(t, BRUSH_MIN, BRUSH_MAX)))} onReset={() => setRadius(BRUSH_SIZE)} label={`size ${radius} px ( [ and ] )`} />
                        <div className="flex gap-1 mt-2">
                            {(['through', 'front'] as const).map((m) => (
                                <button key={m} type="button" className={mode === m ? btnOn : btn} onClick={() => setMode(m)}>
                                    {m === 'through' ? 'Through' : 'Front layer'}
                                </button>
                            ))}
                        </div>
                        <div data-ink-part className="text-[11px] opacity-60 mt-1">
                            {mode === 'through'
                                ? 'Takes everything under the ring, at any depth. For floaters against the sky, or seen from a clear angle.'
                                : 'Each stroke keeps to the depth of the first splat it touches, so a floater goes without the wall behind it.'}
                        </div>
                        {mode === 'front' && (
                            <Slider value={unLogScale(band, 0.02, 0.5)} onChange={(t) => setBand(Number(logScale(t, 0.02, 0.5).toFixed(3)))} onReset={() => setBand(BAND)} label={`reaches ${Math.round(band * 100)}% of the distance behind it`} />
                        )}
                        <div data-ink-part className="text-[11px] opacity-60 mt-2">Drag to paint · ⌥-drag to unpaint · hold Space to orbit · right-drag pans</div>
                        <div data-ink-part className="text-[11px] opacity-80 mt-1">{erasedCount.toLocaleString()} splats painted out</div>
                        {eraseNote && <div data-ink-part className="text-[11px] text-amber-300 mt-1">{eraseNote}</div>}
                    </Section>
                </Group>

                <Group title="Presentation" summary={summaries.presentation} open={groups.presentation} onToggle={() => toggleGroup('presentation')}>
                    <Section title="Blueprint views">
                        <div data-ink-part className="text-[11px] opacity-60 mb-1.5">
                            {section
                                ? 'Dial in cut and depth for this view, then set it. Snapping to a view glides to its section; views without one show the whole scan.'
                                : 'Turn on Blueprint (bottom right) to set the cut and depth each view opens with.'}
                        </div>
                        {VIEW_NAMES.map((name) => {
                            const preset = presets[name];
                            return (
                                <div key={name} className={`flex items-center gap-2 font-mono text-[11px] ${section?.view === name ? '' : 'opacity-60'}`}>
                                    <span className="w-14 uppercase">{name}</span>
                                    <span className="flex-1">{preset ? `cut ${preset.cut.toFixed(2)} · depth ${preset.depth.toFixed(2)}` : '–'}</span>
                                    {preset && (
                                        <button
                                            type="button"
                                            title={`Clear ${name}`}
                                            className="px-1 opacity-60 hover:opacity-100"
                                            onClick={() => onPresets(Object.fromEntries(Object.entries(presets).filter(([k]) => k !== name)))}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {section && (
                            <button
                                type="button"
                                className={`${btn} mt-2 text-left`}
                                onClick={() => onPresets({ ...presets, [section.view]: { cut: fmt(section.cut), depth: fmt(section.depth) } })}
                            >
                                Set for {section.view.toUpperCase()}: cut {section.cut.toFixed(2)} · depth {section.depth.toFixed(2)}
                            </button>
                        )}
                    </Section>

                    <Section title="Sharpen">
                        <Slider value={sharpen / SHARPEN_MAX} onChange={(t) => setSharpen(Number((t * SHARPEN_MAX).toFixed(2)))} onReset={() => setSharpen(0)} label={sharpen ? `sharpen ${sharpen.toFixed(2)}` : 'sharpen: off'} />
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                type="button"
                                className={`${comparing ? btnOn : btn} select-none`}
                                onPointerDown={() => setComparing(true)}
                                onPointerUp={() => setComparing(false)}
                                onPointerLeave={() => setComparing(false)}
                            >
                                Hold to compare
                            </button>
                            <span className="text-[11px] opacity-60">Like Unreal's tonemapper sharpen; 0.5–1 is typical.</span>
                        </div>
                    </Section>
                </Group>
            </Panel>
        </>
    );
};

/**
 * Buttons are plain words: an underline grows in from the left under the
 * pointer, and stays while the button is on.
 */
const LINK = 'pb-0.5 text-xs bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-left-bottom transition-[background-size,opacity] duration-300 ease-in-out motion-reduce:transition-none disabled:opacity-40';
const btn = `${LINK} bg-[length:0%_1px] hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px] disabled:hover:bg-[length:0%_1px]`;
const btnOn = `${LINK} bg-[length:100%_1px]`;
/** A hairline in the ink. */
const RULE = 'border-[color:color-mix(in_srgb,currentColor_25%,transparent)]';

/**
 * The panel, in groups that open and close, with saving pinned to its foot.
 * With N or its arrow it folds down to a small tab with what matters while
 * you work.
 */
const Panel = ({ title, collapsed, onCollapse, status, footer, children }: {
    title: string;
    collapsed: boolean;
    onCollapse: (collapsed: boolean) => void;
    status?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
}) => collapsed ? (
    <button
        type="button"
        title="Show the tuning panel (N)"
        onClick={() => onCollapse(false)}
        ref={inks.watch}
        className={`absolute top-24 right-4 z-30 flex items-center gap-2 ${LABEL} ${INK} pointer-events-auto ${btn}`}
    >
        <span aria-hidden>‹</span>
        <span>Tune</span>
        {status}
    </button>
) : (
    <div ref={inks.watch} className={`absolute top-24 right-4 w-72 max-h-[calc(100vh-8rem)] overflow-y-auto pt-1 text-sm pointer-events-auto z-30 whitespace-pre-line ${INK}`}>
        <div data-ink-part className="flex items-start justify-between gap-2 mb-2">
            <div className={LABEL}>{title}</div>
            <button type="button" title="Hide the panel (N)" className="px-1.5 -mr-1 opacity-60 hover:opacity-100" onClick={() => onCollapse(true)}>›</button>
        </div>
        {children}
        {footer ? <div data-ink-part className={`mt-1 pt-3 pb-4 border-t ${RULE}`}>{footer}</div> : <div className="pb-4" />}
    </div>
);

/** A group of sections. Its header opens and closes it, and says what's in it while closed. */
const Group = ({ title, summary, open, onToggle, children }: {
    title: string;
    summary: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) => (
    <div data-ink-part className={`border-t ${RULE}`}>
        <button type="button" data-ink-part onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 py-2.5 text-left">
            <span aria-hidden className={`text-[9px] opacity-60 transition-transform duration-300 ease-in-out ${open ? 'rotate-90' : ''}`}>▶</span>
            <span className={`${LABEL} ${btn} !text-[11px]`}>{title}</span>
            <span className={`ml-auto truncate pl-2 font-mono text-[10px] opacity-60 transition-opacity duration-300 ${open ? 'opacity-0' : 'opacity-100'}`}>{summary}</span>
        </button>
        {/* Rows from 0fr to 1fr: the height eases, whatever's inside. */}
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} inert={!open}>
            <div className="min-h-0 overflow-hidden">
                <div className="pb-2">{children}</div>
            </div>
        </div>
    </div>
);

const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <div ref={inks.watch} className={`mb-4 ${INK}`}>
        {title && <div data-ink-part className={`${LABEL} opacity-60 mb-1.5`}>{title}</div>}
        {children}
    </div>
);

/** A slider on 0–1. Double-click puts it back to neutral (0 or off), as in Premiere. */
const Slider = ({ value, onChange, onReset, label }: { value: number; onChange: (v: number) => void; onReset?: () => void; label: string }) => (
    <label data-ink-part className="block mt-2">
        <input
            type="range" min={0} max={1} step={0.001} value={value} className="w-full accent-current"
            onChange={(e) => onChange(Number(e.target.value))}
            onDoubleClick={onReset}
            title={onReset ? 'Double-click to reset' : undefined}
        />
        <span className="text-[11px] opacity-60 font-mono">{label}</span>
    </label>
);

export default Tune;
