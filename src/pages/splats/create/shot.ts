/**
 * A shot: a timeline of keyframed tracks for the creation tool (?tools), and
 * how to read a value at any moment of it. Pure arithmetic, no three.js, so
 * Node can test it as is.
 *
 * Each key says how the stretch *after* it moves:
 *   smooth  a spline through the keys: passes through without stopping
 *   ease    eases out of this key and into the next: stops at both
 *   linear  constant speed
 *   hold    stays put until the next key
 * A spline only keeps its speed through a key when the stretches on both
 * sides of it are smooth; next to anything else it comes to rest there.
 */

export type Vec3 = [number, number, number];
export type Interp = 'smooth' | 'ease' | 'linear' | 'hold';
export const INTERPS: Interp[] = ['smooth', 'ease', 'linear', 'hold'];

export interface CameraValue {
    position: Vec3;
    target: Vec3;
    up: Vec3;
}

/** Everything a shot can animate, and what each means. */
export interface Values {
    camera: CameraValue;
    /** mm, on a 36 mm sensor fitted to the frame's longer side (see fovFromFocal). */
    focal: number;
    /** The point in focus, world space. Following a point keeps focus on it while the camera moves. */
    focus: Vec3;
    /** Depth-of-field blur, 0 (none) to 1. */
    aperture: number;
    /** 0 is the scan as photographed, 1 the blueprint: orthographic, white points. */
    blueprint: number;
    /** Where the section slab sits along the view, -1 to 1 of the scan's reach. */
    cut: number;
    /** How thick the slab is; 1 is no section at all. */
    depth: number;
    /** Streaks behind the points when the camera moves fast in blueprint (streaks.ts): 0 is none, 1 as the viewer has them. */
    streaks: number;
    /** The pulse through the blueprint's points (pulse.ts), beating at the shot's bpm: 0 is none, 1 full. */
    pulse: number;
}

export type TrackId = keyof Values;
export const TRACK_IDS: TrackId[] = ['camera', 'focal', 'focus', 'aperture', 'blueprint', 'cut', 'depth', 'streaks', 'pulse'];
export const TRACK_LABELS: Record<TrackId, string> = {
    camera: 'Camera',
    focal: 'Focal length',
    focus: 'Focus',
    aperture: 'Aperture',
    blueprint: 'Blueprint',
    cut: 'Cut',
    depth: 'Depth',
    streaks: 'Streaks',
    pulse: 'Pulse',
};

export interface Key<T> {
    /** Seconds. */
    t: number;
    value: T;
    interp: Interp;
}

export type Tracks = { [K in TrackId]: Key<Values[K]>[] };

export type RenderFormat = 'mp4' | 'prores' | 'png';

export interface Output {
    width: number;
    height: number;
    fps: number;
    /** Supersampling: rendered this many times larger each way, then averaged down. */
    superXY: number;
    format: RenderFormat;
    /** Sharpening of the frames (sharpen.ts); left out, the scan's own. */
    sharpen?: number;
}

export interface Shot {
    version: 1;
    scan: string;
    name: string;
    /** Seconds. */
    duration: number;
    output: Output;
    tracks: Tracks;
    /** Beats a minute for the pulse, from the shot's start; left out, PULSE_BPM. */
    bpm?: number;
}

/** A resting heart. */
export const PULSE_BPM = 72;

export const FOCAL_MIN = 12;
export const FOCAL_MAX = 400;

/** Valid range per scalar track; splines can overshoot, and these can't. */
const RANGE: Partial<Record<TrackId, [number, number]>> = {
    focal: [FOCAL_MIN, FOCAL_MAX],
    aperture: [0, 1],
    blueprint: [0, 1],
    cut: [-1, 1],
    depth: [0, 1],
    streaks: [0, 1],
    pulse: [0, 1],
};

export const emptyTracks = (): Tracks => ({ camera: [], focal: [], focus: [], aperture: [], blueprint: [], cut: [], depth: [], streaks: [], pulse: [] });

/** A shot as saved, with every track there is now: older ones were saved before some existed. */
export const withAllTracks = (shot: Shot): Shot => ({ ...shot, tracks: { ...emptyTracks(), ...shot.tracks } });

export const newShot = (scan: string, name: string): Shot => ({
    version: 1,
    scan,
    name,
    duration: 8,
    output: { width: 1920, height: 1080, fps: 30, superXY: 2, format: 'mp4' },
    tracks: emptyTracks(),
});

// --- Interpolation -----------------------------------------------------------

/** Values are numbers or arrays of numbers; the camera is three Vec3s. */
type Flat = number[];

const flatten = (id: TrackId, v: Values[TrackId]): Flat => {
    if (id === 'camera') {
        const c = v as CameraValue;
        return [...c.position, ...c.target, ...c.up];
    }
    return Array.isArray(v) ? [...v] : [v as number];
};

const unflatten = <K extends TrackId>(id: K, f: Flat): Values[K] => {
    if (id === 'camera') {
        const up = f.slice(6, 9);
        const len = Math.hypot(up[0], up[1], up[2]) || 1;
        return {
            position: f.slice(0, 3) as Vec3,
            target: f.slice(3, 6) as Vec3,
            up: up.map((u) => u / len) as Vec3,
        } as Values[K];
    }
    if (id === 'focus') return f.slice(0, 3) as Values[K];
    const range = RANGE[id];
    const x = f[0];
    return (range ? Math.min(range[1], Math.max(range[0], x)) : x) as Values[K];
};

/** Hermite basis, for a stretch of duration `dt` between values with tangents (per second). */
const hermite = (p0: number, m0: number, p1: number, m1: number, u: number, dt: number) => {
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * dt * m1;
};

/**
 * The tangent at key k: a finite difference across its neighbours (a
 * Catmull-Rom spline with uneven key spacing), but only where both stretches
 * around it are smooth. Anywhere else the spline comes to rest at the key.
 */
const tangent = (keys: { t: number; f: Flat; interp: Interp }[], k: number, c: number) => {
    const prev = keys[k - 1], here = keys[k], next = keys[k + 1];
    if (!prev || !next || prev.interp !== 'smooth' || here.interp !== 'smooth') return 0;
    return (next.f[c] - prev.f[c]) / (next.t - prev.t);
};

/** A track's value at time t, or undefined when it has no keys. */
export const valueAt = <K extends TrackId>(id: K, keys: Key<Values[K]>[], t: number): Values[K] | undefined => {
    if (keys.length === 0) return undefined;
    const ks = keys.map((k) => ({ t: k.t, f: flatten(id, k.value), interp: k.interp }));
    if (t <= ks[0].t) return unflatten(id, ks[0].f);
    const last = ks[ks.length - 1];
    if (t >= last.t) return unflatten(id, last.f);

    let i = 0;
    while (ks[i + 1].t <= t) i++;
    const a = ks[i], b = ks[i + 1];
    const dt = b.t - a.t;
    const u = (t - a.t) / dt;

    let out: Flat;
    switch (a.interp) {
        case 'hold':
            out = a.f;
            break;
        case 'linear':
            out = a.f.map((v, c) => v + (b.f[c] - v) * u);
            break;
        case 'ease':
            out = a.f.map((v, c) => hermite(v, 0, b.f[c], 0, u, dt));
            break;
        case 'smooth':
            out = a.f.map((v, c) => hermite(v, tangent(ks, i, c), b.f[c], tangent(ks, i + 1, c), u, dt));
            break;
    }
    return unflatten(id, out);
};

/** Every track at time t; tracks without keys take their value from `live`. */
export const evaluate = (shot: Shot, t: number, live: Values): Values => {
    const out = { ...live };
    for (const id of TRACK_IDS) {
        const v = valueAt(id, shot.tracks[id] as Key<Values[typeof id]>[], t);
        if (v !== undefined) (out as Record<TrackId, unknown>)[id] = v;
    }
    return out;
};

// --- Editing -----------------------------------------------------------------

/** Times are kept on frames, so keys and renders agree. */
export const toFrame = (t: number, fps: number) => Math.round(t * fps) / fps;

/** The key at time t (within half a frame), if any. */
export const keyIndexAt = (keys: Key<unknown>[], t: number, fps: number) =>
    keys.findIndex((k) => Math.abs(k.t - t) < 0.5 / fps);

const sorted = <T>(keys: Key<T>[]) => [...keys].sort((a, b) => a.t - b.t);

/** Set a key at time t: replaces one on the same frame, keeping its interpolation. */
export const setKey = <K extends TrackId>(shot: Shot, id: K, t: number, value: Values[K], interp?: Interp): Shot => {
    const keys = shot.tracks[id] as Key<Values[K]>[];
    const at = keyIndexAt(keys, t, shot.output.fps);
    const time = toFrame(t, shot.output.fps);
    const key: Key<Values[K]> = { t: time, value, interp: interp ?? (at >= 0 ? keys[at].interp : 'smooth') };
    const next = at >= 0 ? keys.map((k, i) => (i === at ? key : k)) : sorted([...keys, key]);
    return { ...shot, tracks: { ...shot.tracks, [id]: next } };
};

export const removeKey = (shot: Shot, id: TrackId, index: number): Shot => ({
    ...shot,
    tracks: { ...shot.tracks, [id]: (shot.tracks[id] as Key<unknown>[]).filter((_, i) => i !== index) },
});

/** Move a key in time. Onto another key's frame, it replaces that one. */
export const moveKey = (shot: Shot, id: TrackId, index: number, t: number): Shot => {
    const keys = shot.tracks[id] as Key<unknown>[];
    const time = Math.min(shot.duration, Math.max(0, toFrame(t, shot.output.fps)));
    const moved = { ...keys[index], t: time };
    const rest = keys.filter((k, i) => i !== index && Math.abs(k.t - time) >= 0.5 / shot.output.fps);
    return { ...shot, tracks: { ...shot.tracks, [id]: sorted([...rest, moved]) } };
};

export const setInterp = (shot: Shot, id: TrackId, index: number, interp: Interp): Shot => ({
    ...shot,
    tracks: { ...shot.tracks, [id]: (shot.tracks[id] as Key<unknown>[]).map((k, i) => (i === index ? { ...k, interp } : k)) },
});

// --- Several keys at once ------------------------------------------------------

/** A key, by its track and its place among that track's keys. */
export interface KeyRef {
    track: TrackId;
    index: number;
}

/** Copied keys: each with its track, and its time after the earliest of them. */
export interface Clip {
    keys: { track: TrackId; dt: number; value: Values[TrackId]; interp: Interp }[];
}

export const copyKeys = (shot: Shot, refs: KeyRef[]): Clip | null => {
    const picked = refs.flatMap(({ track, index }) => {
        const key = (shot.tracks[track] as Key<Values[TrackId]>[])[index];
        return key ? [{ track, key }] : [];
    });
    if (!picked.length) return null;
    const t0 = Math.min(...picked.map((p) => p.key.t));
    return {
        keys: picked.map(({ track, key }) => ({ track, dt: key.t - t0, value: structuredClone(key.value), interp: key.interp })),
    };
};

/**
 * Paste at time t: the earliest key lands there, the rest keep their spacing,
 * each on its own track. A key already on a frame is replaced; keys that
 * would land past the end are left out. Answers the pasted keys, to select.
 */
export const pasteKeys = (shot: Shot, clip: Clip, t: number) => {
    const fps = shot.output.fps;
    let next = shot;
    const placed: { track: TrackId; t: number }[] = [];
    let dropped = 0;
    for (const key of clip.keys) {
        const time = toFrame(t + key.dt, fps);
        if (time > shot.duration + 1e-9) {
            dropped++;
            continue;
        }
        next = setKey(next, key.track, time, structuredClone(key.value), key.interp);
        placed.push({ track: key.track, t: time });
    }
    const selection = placed.map(({ track, t: time }) => ({ track, index: keyIndexAt(next.tracks[track], time, fps) }));
    return { shot: next, selection, dropped };
};

export const removeKeys = (shot: Shot, refs: KeyRef[]): Shot => {
    const tracks = { ...shot.tracks };
    for (const id of TRACK_IDS) {
        const gone = new Set(refs.filter((r) => r.track === id).map((r) => r.index));
        if (gone.size) (tracks as Record<TrackId, Key<unknown>[]>)[id] = (shot.tracks[id] as Key<unknown>[]).filter((_, i) => !gone.has(i));
    }
    return { ...shot, tracks };
};

export const setInterps = (shot: Shot, refs: KeyRef[], interp: Interp): Shot =>
    refs.reduce((s, r) => setInterp(s, r.track, r.index, interp), shot);

// --- Lens --------------------------------------------------------------------

const SENSOR = 36;
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Vertical field of view (degrees, as three.js wants it) for a focal length on
 * a 36 mm sensor fitted to the frame's longer side, as Blender does: a 35 mm
 * frames the same width in a landscape render as height in a vertical one.
 */
export const fovFromFocal = (mm: number, aspect: number) => {
    const halfLong = Math.atan(SENSOR / 2 / mm);
    return deg(2 * (aspect >= 1 ? Math.atan(Math.tan(halfLong) / aspect) : halfLong));
};

/** The inverse: the focal length that gives a vertical field of view. */
export const focalFromFov = (fov: number, aspect: number) => {
    const halfV = rad(fov / 2);
    const halfLong = aspect >= 1 ? Math.atan(Math.tan(halfV) * aspect) : halfV;
    return SENSOR / 2 / Math.tan(halfLong);
};
