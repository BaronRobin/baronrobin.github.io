import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { dyno, SplatMesh } from '@sparkjsdev/spark';
import { buildPoints, disposePoints, SKY_CUT, type Rig } from '../blueprint';
import { BPM, Pulse } from '../pulse';
import { Streaks } from '../streaks';
import type { Scan } from '../scans';
import { applyFrame, resetLook, type Look } from './apply';
import { estimateBytes, freeSpace, maxSuperXY, renderShot, renderStill, reveal, type RenderProgress, type RenderResult } from './render';
import {
    copyKeys, evaluate, FOCAL_MAX, FOCAL_MIN, focalFromFov, INTERPS, keyIndexAt, moveKey, newShot, pasteKeys, removeKey, removeKeys, setInterps, setKey, toFrame,
    PULSE_BPM, TRACK_IDS, TRACK_LABELS, valueAt, withAllTracks,
    type CameraValue, type Clip, type Interp, type RenderFormat, type Shot, type TrackId, type Values, type Vec3,
} from './shot';
import Timeline, { type Selection } from './Timeline';
import { inks } from '../ink';
import { LABEL, PANEL_BG, PANEL_KEEP, PANEL_TEXT, SLIDE, useEntered } from '../ui';

/**
 * The creation tool: keyframe a shot of a scan, render it or take a still.
 * Switched on under blueprint once ?tools is in the URL, like the tuning
 * panel; its panels slide in over the scan, which keeps the whole window.
 * On the live site there's no dev server, so no renders and no saved shots:
 * the preview and screenshots only.
 *
 * You fly the navigation camera as usual (OrbitControls); I or the camera
 * row's diamond keys where it is. Scrubbing or playing puts it back on the
 * keyed path, and moving it afterwards marks the camera unkeyed until you key
 * it again. Every other track is set in the inspector: with no keys a slider
 * just sets the value, with keys it sets a key at the playhead.
 *
 * The canvas shows a little more than the shot: the frame guide marks the
 * output, and focal lengths are measured against it, so what's inside the
 * guide is what renders.
 *
 * Keys copy and paste: Shift-click diamonds to pick several, ⌘C, then ⌘V
 * puts them at the playhead with their spacing kept. The copy outlives the
 * shot, and the scan.
 *
 * The panels are up while the scan loads, so the view sits where it will;
 * the editor itself opens once the full scan is in.
 */

const API = '/__splats';
/** Renders, shots on disk and Finder go through the dev server (scripts/vite-splat-studio.ts). */
const SERVER = import.meta.env.DEV;
/** The frame guide fills this much of the canvas; the dimmed rest is what's just out of shot. */
const MARGIN = 0.86;
/** The navigation camera's field of view, which the starting focal length is matched to. */
const NAV_FOV = 60;

const PRESETS = [
    { label: '1920 × 1080 · 16:9', width: 1920, height: 1080 },
    { label: '3840 × 2160 · 4K', width: 3840, height: 2160 },
    { label: '1080 × 1920 · 9:16 Reels', width: 1080, height: 1920 },
    { label: '1080 × 1350 · 4:5 feed', width: 1080, height: 1350 },
    { label: '1080 × 1080 · 1:1', width: 1080, height: 1080 },
];
const FPS = [24, 25, 30, 60];
const FORMATS: { id: RenderFormat; label: string }[] = [
    { id: 'mp4', label: 'MP4 (H.264)' },
    { id: 'prores', label: 'ProRes 422 HQ' },
    { id: 'png', label: 'PNG sequence' },
];

type Scalars = Omit<Values, 'camera'>;
type ScalarId = keyof Scalars;

/** What the editor works on: the viewer's stage, once the full scan is in. */
export interface CreateStage {
    mesh: SplatMesh;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    /** The navigation camera, flown with OrbitControls. */
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    rig: Rig;
    ink: dyno.DynoFloat<string>;
    meshes: Set<SplatMesh>;
    reach: number;
    centre: THREE.Vector3;
    radius: number;
    /** An added sky (sky.ts), if the scan has one. */
    sky: { mesh: SplatMesh; radius: number } | null;
}

type Insets = { top: number; right: number; bottom: number };

interface Props {
    scan: Scan;
    scans: Scan[];
    onShow: (scan: Scan) => void;
    /** Room the nav, inspector and timeline take, which the canvas already keeps clear of. */
    insets: Insets;
    /** Slid in; false while they slide out, before they go. */
    shown: boolean;
    onClose: () => void;
    /** Null while the scan loads. */
    stage: CreateStage | null;
    /** How far the load is: the preview (0–1, then 1 while it decodes, null once up), then the full scan, then its swap. */
    loading: { progress: number | null; detail: number | null; building: boolean; failed: boolean };
    setBeforeRender: (fn: (() => void) | null) => void;
    setPaused: (paused: boolean) => void;
    /** Sharpen the live view by this much. */
    setSharpen: (amount: number) => void;
}

/** Copied keys, kept out here so they outlive the shot and the scan. */
let clipboard: Clip | null = null;
const keepClip = (clip: Clip) => { clipboard = clip; };
const copiedClip = () => clipboard;
const SHARPEN_MAX = 2;

/** The output frame inside the canvas: where, how big, and how much wider the view is than the shot. */
const frameBox = (vw: number, vh: number, outAspect: number) => {
    const viewAspect = vw / Math.max(vh, 1);
    const h = outAspect > viewAspect ? (vw * MARGIN) / outAspect : vh * MARGIN;
    const w = h * outAspect;
    return { x: (vw - w) / 2, y: (vh - h) / 2, w, h, aspect: viewAspect, scale: vh / Math.max(h, 1) };
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'shot';
const mb = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);
const clock = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

const Create = (props: Props) => (props.stage ? <Editor {...props} stage={props.stage} /> : <Waiting {...props} />);

const Editor = ({ scan, scans, onShow, insets, shown, onClose, stage, setBeforeRender, setPaused, setSharpen }: Props & { stage: CreateStage }) => {
    const { mesh, renderer, scene, camera, controls, rig, ink, meshes, reach, centre, radius, sky } = stage;
    // --- The shot --------------------------------------------------------------
    const [shot, setShotState] = useState<Shot>(() => newShot(scan.id, 'shot-1'));
    const shotRef = useRef(shot);
    const [dirty, setDirty] = useState(false);
    const [names, setNames] = useState<string[]>([]);
    const updateShot = useCallback((next: Shot | ((s: Shot) => Shot), markDirty = true) => {
        const value = typeof next === 'function' ? next(shotRef.current) : next;
        shotRef.current = value;
        setShotState(value);
        if (markDirty) setDirty(true);
    }, []);

    // --- Time --------------------------------------------------------------------
    const [time, setTimeState] = useState(0);
    const timeRef = useRef(0);
    const [playing, setPlaying] = useState(false);
    const playingRef = useRef(false);
    const [loop, setLoop] = useState(true);
    const loopRef = useRef(true);
    const [selected, setSelected] = useState<Selection[]>([]);
    const [unkeyed, setUnkeyed] = useState(false);

    // --- The view ---------------------------------------------------------------
    // The canvas fills the window; the shot is framed in what the panels leave of it.
    const view = useArea(insets);
    const viewRef = useRef(view);
    useEffect(() => { viewRef.current = view; });
    const outAspect = shot.output.width / shot.output.height;
    const box = frameBox(view.w, view.h, outAspect);
    const boxRef = useRef(box);
    useEffect(() => { boxRef.current = box; });

    // --- Values for tracks without keys ---------------------------------------
    const [live, setLive] = useState<Scalars>(() => {
        // Start on the focal length that frames what the navigation camera shows now.
        const start = frameBox(window.innerWidth - insets.right, window.innerHeight - insets.top - insets.bottom, 16 / 9);
        const fovOut = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(NAV_FOV / 2)) / start.scale));
        return {
            focal: Math.round(focalFromFov(fovOut, 16 / 9)),
            focus: controls.target.toArray() as Vec3,
            aperture: 0,
            blueprint: 0,
            cut: 0,
            depth: 1,
            streaks: 0,
            pulse: 0,
        };
    });
    const liveRef = useRef(live);
    useEffect(() => { liveRef.current = live; });
    /** Where focal length goes back to: what matched the navigation view on opening. */
    const [startFocal] = useState(() => live.focal);

    const navPose = useCallback((): CameraValue => ({
        position: camera.position.toArray() as Vec3,
        target: controls.target.toArray() as Vec3,
        up: camera.up.toArray() as Vec3,
    }), [camera, controls]);
    const setNav = useCallback((c: CameraValue) => {
        camera.position.set(...c.position);
        controls.target.set(...c.target);
        camera.up.set(...c.up);
        camera.lookAt(controls.target);
    }, [camera, controls]);

    // --- The look, and the frame loop ----------------------------------------
    const px0 = useMemo(() => rig.spark.maxPixelRadius, [rig]);
    const pointsRef = useRef<THREE.Points | null>(null);
    /** The points' streaks and pulse, made with them: they cost nothing until a shot turns them up. */
    const effects = useRef<{ streaks: Streaks; pulse: Pulse } | null>(null);
    /** The point cloud, built the first time anything is blueprint: a second or two. */
    const ensurePoints = useCallback(() => {
        if (!pointsRef.current) {
            pointsRef.current = buildPoints(mesh, centre, radius * SKY_CUT);
            scene.add(pointsRef.current);
            effects.current = { streaks: new Streaks(pointsRef.current), pulse: new Pulse(pointsRef.current, centre, radius * SKY_CUT) };
        }
        return pointsRef.current;
    }, [mesh, centre, radius, scene]);
    const look = useCallback((): Look => ({
        renderer, spark: rig.spark, points: pointsRef.current, ink, meshes, px0, reach, sky: sky?.mesh ?? null,
        streaks: effects.current?.streaks, pulse: effects.current?.pulse,
    }), [renderer, rig, ink, meshes, px0, reach, sky]);
    const cams = useMemo(() => ({ perspective: new THREE.PerspectiveCamera(), ortho: new THREE.OrthographicCamera() }), []);

    const stop = useCallback(() => {
        playingRef.current = false;
        setPlaying(false);
        rig.manual = false;
        controls.enabled = true;
    }, [rig, controls]);

    useEffect(() => {
        let last = performance.now();
        const frame = () => {
            const now = performance.now();
            const s = shotRef.current;
            if (playingRef.current) {
                let t = timeRef.current + (now - last) / 1000;
                if (t >= s.duration) {
                    if (loopRef.current) t %= s.duration;
                    else { t = s.duration; stop(); }
                }
                timeRef.current = t;
                setTimeState(t);
            }
            last = now;
            const v = evaluate(s, timeRef.current, { ...liveRef.current, camera: navPose() });
            // Playing flies the navigation camera along the path; otherwise it's yours to fly.
            if (playingRef.current && s.tracks.camera.length) setNav(v.camera);
            else v.camera = navPose();
            if (v.blueprint > 0) ensurePoints();
            const b = boxRef.current;
            const cam = applyFrame(
                v, cams, look(),
                { aspect: b.aspect, outAspect: s.output.width / s.output.height, scale: b.scale, dotScale: 1 },
                { time: timeRef.current, bpm: s.bpm ?? PULSE_BPM },
            ) as THREE.PerspectiveCamera | THREE.OrthographicCamera;
            // Framed for the free area, drawn on the whole canvas: the scan runs on under the panels.
            const area = viewRef.current, el = renderer.domElement;
            cam.setViewOffset(area.w, area.h, 0, -insets.top, el.clientWidth, el.clientHeight);
            rig.active.current = cam;
        };
        setBeforeRender(frame);
        return () => {
            setBeforeRender(null);
            rig.active.current = camera;
            resetLook(look());
            camera.updateProjectionMatrix();
        };
    }, [setBeforeRender, rig, camera, cams, look, navPose, setNav, ensurePoints, stop, renderer, insets]);

    // Leave nothing behind.
    useEffect(() => () => {
        effects.current?.streaks.dispose();
        effects.current = null;
        if (pointsRef.current) disposePoints(pointsRef.current);
        pointsRef.current = null;
        rig.manual = false;
        controls.enabled = true;
    }, [rig, controls]);

    // Moving the camera by hand after a key or a scrub leaves it unkeyed.
    useEffect(() => {
        const moved = () => setUnkeyed(true);
        controls.addEventListener('start', moved);
        return () => controls.removeEventListener('start', moved);
    }, [controls]);

    // --- Editing ------------------------------------------------------------------
    const fps = shot.output.fps;

    const setTime = useCallback((t: number) => {
        const s = shotRef.current;
        const next = Math.min(s.duration, Math.max(0, toFrame(t, s.output.fps)));
        timeRef.current = next;
        setTimeState(next);
        const cameraAt = valueAt('camera', s.tracks.camera, next);
        if (cameraAt) {
            setNav(cameraAt);
            setUnkeyed(false);
        }
    }, [setNav]);

    const togglePlay = useCallback(() => {
        if (playingRef.current) return stop();
        if (timeRef.current >= shotRef.current.duration) setTime(0);
        playingRef.current = true;
        setPlaying(true);
        rig.manual = true;
        controls.enabled = false;
    }, [stop, setTime, rig, controls]);

    /** A value at the playhead: keyed, or live. */
    const current = (s: Shot, t: number) => evaluate(s, t, { ...liveRef.current, camera: navPose() });

    const keyCamera = useCallback(() => {
        updateShot((s) => setKey(s, 'camera', timeRef.current, navPose()));
        setUnkeyed(false);
    }, [updateShot, navPose]);

    const toggleKey = (track: TrackId) => {
        const s = shotRef.current;
        const at = keyIndexAt(s.tracks[track], timeRef.current, s.output.fps);
        if (at >= 0) {
            updateShot(removeKey(s, track, at));
            setSelected([]);
        } else if (track === 'camera') {
            keyCamera();
        } else {
            updateShot(setKey(s, track, timeRef.current, current(s, timeRef.current)[track]));
        }
    };

    /** Set a track's value: a key at the playhead if it's animated, the live value if not. */
    const edit = useCallback(<K extends ScalarId>(track: K, value: Scalars[K]) => {
        if (shotRef.current.tracks[track].length) updateShot((s) => setKey(s, track, timeRef.current, value as Values[K]));
        else setLive((l) => ({ ...l, [track]: value }));
    }, [updateShot]);

    const onMove = (track: TrackId, index: number, t: number) => {
        const next = moveKey(shotRef.current, track, index, t);
        updateShot(next);
        const at = keyIndexAt(next.tracks[track], t, next.output.fps);
        setSelected([{ track, index: at }]);
        return at;
    };

    const deleteSelected = useCallback(() => {
        if (!selected.length) return;
        updateShot((s) => removeKeys(s, selected));
        setSelected([]);
    }, [selected, updateShot]);

    // Copy and paste.
    const [hasClip, setHasClip] = useState(() => copiedClip() !== null);
    const [note, setNote] = useState<string | null>(null);
    const plural = (n: number) => `${n} key${n === 1 ? '' : 's'}`;
    const copy = useCallback(() => {
        const clip = copyKeys(shotRef.current, selected);
        if (!clip) return false;
        keepClip(clip);
        setHasClip(true);
        setNote(`Copied ${plural(clip.keys.length)}.`);
        return true;
    }, [selected]);
    const paste = useCallback(() => {
        const clip = copiedClip();
        if (!clip) return;
        const t = timeRef.current;
        const { shot: next, selection, dropped } = pasteKeys(shotRef.current, clip, t);
        updateShot(next);
        setSelected(selection);
        setNote(`Pasted ${plural(selection.length)} at ${t.toFixed(2)} s${dropped ? `; ${plural(dropped)} past the end left out` : ''}.`);
        // Pasted camera keys put the camera on the path, as a scrub would.
        const cameraAt = valueAt('camera', next.tracks.camera, t);
        if (cameraAt) {
            setNav(cameraAt);
            setUnkeyed(false);
        }
    }, [updateShot, setNav]);
    const selectAll = useCallback(() => {
        const s = shotRef.current;
        setSelected(TRACK_IDS.flatMap((track) => s.tracks[track].map((_, index) => ({ track, index }))));
    }, []);

    // Alt-click picks the focus point off the splats.
    useEffect(() => {
        const el = renderer.domElement;
        const raycaster = new THREE.Raycaster();
        mesh.raycastable = true;
        const pick = (e: PointerEvent) => {
            if (!e.altKey || e.button !== 0) return;
            e.stopImmediatePropagation();
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, rig.active.current);
            const hit = raycaster.intersectObject(mesh, false)[0];
            if (hit) edit('focus', hit.point.toArray() as Vec3);
        };
        el.addEventListener('pointerdown', pick, { capture: true });
        return () => {
            el.removeEventListener('pointerdown', pick, { capture: true });
            mesh.raycastable = false;
        };
    }, [renderer, mesh, rig, edit]);

    // --- Shots on disk -----------------------------------------------------------
    useEffect(() => {
        if (!SERVER) return;
        let alive = true;
        (async () => {
            const list: string[] = await (await fetch(`${API}/shots/${scan.id}`)).json();
            if (!alive) return;
            setNames(list);
            if (list.length) {
                const saved: Shot = await (await fetch(`${API}/shots/${scan.id}/${list[0]}`)).json();
                if (alive) updateShot(withAllTracks(saved), false);
            }
        })().catch(() => {});
        return () => { alive = false; };
    }, [scan.id, updateShot]);

    const save = useCallback(async () => {
        if (!SERVER) return;
        const s = { ...shotRef.current, name: slug(shotRef.current.name) };
        const res = await fetch(`${API}/shots/${scan.id}/${s.name}`, { method: 'POST', body: JSON.stringify(s) });
        if (!res.ok) return;
        updateShot(s, false);
        setDirty(false);
        setNames(await (await fetch(`${API}/shots/${scan.id}`)).json());
    }, [scan.id, updateShot]);

    const open = async (name: string) => {
        const saved: Shot = await (await fetch(`${API}/shots/${scan.id}/${name}`)).json();
        stop();
        updateShot(withAllTracks(saved), false);
        setDirty(false);
        setSelected([]);
        setTime(0);
    };

    const fresh = () => {
        let n = names.length + 1;
        while (names.includes(`shot-${n}`)) n++;
        stop();
        updateShot({ ...newShot(scan.id, `shot-${n}`), output: shotRef.current.output });
        setSelected([]);
        setTime(0);
    };

    // --- Render -------------------------------------------------------------------
    const [job, setJob] = useState<{ progress: RenderProgress | null; result?: RenderResult; error?: string; controller: AbortController } | null>(null);
    const [disk, setDisk] = useState<number | null>(null);
    useEffect(() => { if (SERVER) freeSpace().then((d) => setDisk(d.free)).catch(() => {}); }, []);
    const estimate = estimateBytes(shot);
    const fits = disk === null || estimate < disk - 500e6;

    // Sharpening: the shot's own, or the scan's until it has one. The preview shows it.
    const scanSharpen = scan.settings?.sharpen ?? 0;
    const sharpen = shot.output.sharpen ?? scanSharpen;
    useEffect(() => {
        setSharpen(sharpen);
        return () => setSharpen(scanSharpen);
    }, [setSharpen, sharpen, scanSharpen]);

    const startRender = async () => {
        stop();
        const s = shotRef.current;
        const controller = new AbortController();
        setJob({ progress: null, controller });
        const usesBlueprint = liveRef.current.blueprint > 0 || s.tracks.blueprint.some((k) => k.value > 0);
        if (usesBlueprint) ensurePoints();
        setPaused(true);
        try {
            const result = await renderShot({
                shot: s,
                live: { ...liveRef.current, camera: navPose() },
                scene,
                look: look(),
                // The render's pixel height over the preview frame's, so points look the same.
                dotScale: s.output.height / (boxRef.current.h * renderer.getPixelRatio()),
                sharpen,
                signal: controller.signal,
                onProgress: (progress) => setJob((j) => j && { ...j, progress }),
            });
            setJob((j) => j && { ...j, result });
        } catch (error) {
            const cancelled = error instanceof DOMException && error.name === 'AbortError';
            setJob((j) => j && { ...j, error: cancelled ? 'Cancelled.' : String((error as Error).message ?? error) });
        } finally {
            setPaused(false);
            freeSpace().then((d) => setDisk(d.free)).catch(() => {});
        }
    };

    /** The frame under the playhead, drawn like a render's frames, as a PNG download. */
    const [still, setStill] = useState<string | null>(null);
    const takeStill = async () => {
        stop();
        const s = shotRef.current;
        const at = timeRef.current;
        if (liveRef.current.blueprint > 0 || s.tracks.blueprint.some((k) => k.value > 0)) ensurePoints();
        setStill('Rendering…');
        setPaused(true);
        try {
            const blob = await renderStill({
                // What the preview shows while stopped: your own view, not the camera keys.
                shot: { ...s, tracks: { ...s.tracks, camera: [] } },
                live: { ...liveRef.current, camera: navPose() },
                scene,
                look: look(),
                dotScale: s.output.height / (boxRef.current.h * renderer.getPixelRatio()),
                sharpen,
            }, at);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${s.scan} – ${s.name} – ${Math.round(at * s.output.fps)}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            setStill(null);
        } catch (error) {
            setStill(String((error as Error).message ?? error));
        } finally {
            setPaused(false);
        }
    };

    // --- Keyboard ------------------------------------------------------------------
    const keys = useRef({ togglePlay, keyCamera, deleteSelected, save, copy, paste, selectAll, step: (n: number) => setTime(timeRef.current + n / fps) });
    useEffect(() => { keys.current = { togglePlay, keyCamera, deleteSelected, save, copy, paste, selectAll, step: (n: number) => setTime(timeRef.current + n / fps) }; });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
            const k = keys.current;
            const command = e.metaKey || e.ctrlKey;
            if (command && e.key === 's') { e.preventDefault(); k.save(); }
            else if (command && e.key === 'c') { if (k.copy()) e.preventDefault(); }
            else if (command && e.key === 'v') { e.preventDefault(); k.paste(); }
            else if (command && e.key === 'a') { e.preventDefault(); k.selectAll(); }
            else if (e.key === ' ') { e.preventDefault(); k.togglePlay(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); k.step(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); k.step(1); }
            else if (e.key === 'i' || e.key === 'I') k.keyCamera();
            else if (e.key === 'Delete' || e.key === 'Backspace') k.deleteSelected();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // --- What the inspector shows ------------------------------------------------
    // From state, not liveRef: the ref only catches up after this render, so a lone change would show a step late.
    const now = evaluate(shot, time, { ...live, camera: navPose() });
    const keyedHere = (track: TrackId) => keyIndexAt(shot.tracks[track], time, fps) >= 0;
    const focusDistance = new THREE.Vector3(...now.focus).distanceTo(camera.position);
    const selectedKeys = selected.flatMap((s) => {
        const key = (shot.tracks[s.track] as { t: number; interp: Interp }[])[s.index];
        return key ? [key] : [];
    });
    const maxSS = maxSuperXY(shot.output.width, shot.output.height);
    const setOutput = (patch: Partial<Shot['output']>) => updateShot((s) => {
        const output = { ...s.output, ...patch };
        return { ...s, output: { ...output, superXY: Math.min(output.superXY, maxSuperXY(output.width, output.height)) } };
    });
    const rendering = job !== null && !job.result && !job.error;

    return (
        <>
            <Guide insets={insets} box={box} label={`${shot.output.width} × ${shot.output.height} · ${fps} fps · Alt-click to focus`} />

            <Inspector insets={insets} shown={shown} onClose={onClose} scan={scan} scans={scans} onShow={onShow}>
                <Section title="Shot">
                    <div className="flex gap-2">
                        <input className={`${field} flex-1`} value={shot.name} onChange={(e) => updateShot((s) => ({ ...s, name: e.target.value }))} />
                        {SERVER && <button type="button" className={btn} onClick={save}>Save{dirty ? ' ●' : ''}</button>}
                        {!SERVER && <button type="button" className={btn} onClick={fresh}>New</button>}
                    </div>
                    {SERVER && (
                        <div className="flex gap-2 mt-2">
                            <select className={`${field} flex-1`} value="" onChange={(e) => e.target.value && open(e.target.value)}>
                                <option value="">Open a saved shot…</option>
                                {names.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <button type="button" className={btn} onClick={fresh}>New</button>
                        </div>
                    )}
                    <label className="flex items-center justify-between mt-2 text-[11px] text-white/60">
                        Duration
                        <input
                            type="number" min={1} max={120} step={0.5} className={`${field} w-20 text-right`} value={shot.duration}
                            onChange={(e) => updateShot((s) => ({ ...s, duration: Math.min(120, Math.max(1, Number(e.target.value) || 1)) }))}
                        />
                    </label>
                </Section>

                <Section title="Camera">
                    <div className="flex items-center gap-2">
                        <button type="button" className={btn} onClick={keyCamera}>◆ Key camera (I)</button>
                        {unkeyed && shot.tracks.camera.length > 0 && <span className="text-[11px] text-amber-300">● moved, not keyed</span>}
                    </div>
                    <Control
                        label="Focal length" value={`${Math.round(now.focal)} mm`} keyed={keyedHere('focal')} onKey={() => toggleKey('focal')}
                        t={Math.log(now.focal / FOCAL_MIN) / Math.log(FOCAL_MAX / FOCAL_MIN)}
                        onT={(t) => edit('focal', FOCAL_MIN * Math.pow(FOCAL_MAX / FOCAL_MIN, t))}
                        onReset={() => edit('focal', startFocal)}
                    />
                </Section>

                <Section title="Depth of field">
                    <div className="flex items-center gap-2">
                        <button type="button" className={btn} onClick={() => edit('focus', controls.target.toArray() as Vec3)}>Focus on orbit point</button>
                        <Diamond keyed={keyedHere('focus')} onClick={() => toggleKey('focus')} />
                    </div>
                    <div className="text-[11px] text-white/60 mt-1">Or Alt-click the scan. Focus is {focusDistance.toFixed(2)} away.</div>
                    <Control label="Aperture" value={now.aperture === 0 ? 'off' : `${Math.round(now.aperture * 100)}%`} keyed={keyedHere('aperture')} onKey={() => toggleKey('aperture')} t={now.aperture} onT={(t) => edit('aperture', t)} onReset={() => edit('aperture', 0)} />
                </Section>

                <Section title="Blueprint">
                    <Control label="Blueprint" value={`${Math.round(now.blueprint * 100)}%`} keyed={keyedHere('blueprint')} onKey={() => toggleKey('blueprint')} t={now.blueprint} onT={(t) => edit('blueprint', t)} onReset={() => edit('blueprint', 0)} />
                    <Control label="Cut" value={now.cut.toFixed(2)} keyed={keyedHere('cut')} onKey={() => toggleKey('cut')} t={(now.cut + 1) / 2} onT={(t) => edit('cut', t * 2 - 1)} onReset={() => edit('cut', 0)} />
                    <Control label="Depth" value={now.depth >= 1 ? 'no cut' : now.depth.toFixed(2)} keyed={keyedHere('depth')} onKey={() => toggleKey('depth')} t={now.depth} onT={(t) => edit('depth', t)} onReset={() => edit('depth', 1)} />
                </Section>

                <Section title="Blueprint effects">
                    <div className="text-[11px] text-white/60">On the points, so only where Blueprint is up.</div>
                    <Control label="Streaks" value={now.streaks === 0 ? 'off' : `${Math.round(now.streaks * 100)}%`} keyed={keyedHere('streaks')} onKey={() => toggleKey('streaks')} t={now.streaks} onT={(t) => edit('streaks', t)} onReset={() => edit('streaks', 0)} />
                    <Control label="Pulse" value={now.pulse === 0 ? 'off' : `${Math.round(now.pulse * 100)}%`} keyed={keyedHere('pulse')} onKey={() => toggleKey('pulse')} t={now.pulse} onT={(t) => edit('pulse', t)} onReset={() => edit('pulse', 0)} />
                    <label className="flex items-center justify-between mt-2 text-[11px] text-white/60">
                        Pulse, beats a minute
                        <input
                            type="number" min={BPM.min} max={BPM.max} step={1} className={`${field} w-20 text-right`} value={shot.bpm ?? PULSE_BPM}
                            onChange={(e) => updateShot((s) => ({ ...s, bpm: Math.min(BPM.max, Math.max(BPM.min, Math.round(Number(e.target.value)) || PULSE_BPM)) }))}
                        />
                    </label>
                </Section>

                {selectedKeys.length > 0 && (
                    <Section title={selectedKeys.length === 1 ? `Key · ${TRACK_LABELS[selected[0].track]} at ${selectedKeys[0].t.toFixed(2)} s` : `${selectedKeys.length} keys`}>
                        <div className="flex flex-wrap gap-1">
                            {INTERPS.map((interp: Interp) => (
                                <button
                                    key={interp} type="button"
                                    className={`${btn} capitalize ${selectedKeys.every((k) => k.interp === interp) ? 'bg-white text-black' : ''}`}
                                    onClick={() => updateShot((s) => setInterps(s, selected, interp))}
                                >
                                    {interp}
                                </button>
                            ))}
                            <button type="button" className={`${btn} text-red-300`} onClick={deleteSelected}>Delete</button>
                        </div>
                        <div className="text-[11px] text-white/60 mt-1">How it moves from {selectedKeys.length === 1 ? 'this key' : 'each key'} to the next.</div>
                    </Section>
                )}

                <Section title="Copy keys">
                    <div className="flex gap-2">
                        <button type="button" className={`${btn} disabled:opacity-40`} disabled={!selectedKeys.length} onClick={copy}>Copy (⌘C)</button>
                        <button type="button" className={`${btn} flex-1 disabled:opacity-40`} disabled={!hasClip} onClick={paste}>Paste at playhead (⌘V)</button>
                    </div>
                    <div className="text-[11px] text-white/60 mt-1">{note ?? 'Shift-click diamonds to pick several, ⌘A for all. They paste with their spacing kept.'}</div>
                </Section>

                <Section title="Output">
                    <select
                        className={`${field} w-full`}
                        value={`${shot.output.width}x${shot.output.height}`}
                        onChange={(e) => { const [width, height] = e.target.value.split('x').map(Number); setOutput({ width, height }); }}
                    >
                        {PRESETS.map((p) => <option key={p.label} value={`${p.width}x${p.height}`}>{p.label}</option>)}
                    </select>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <select className={field} value={fps} onChange={(e) => setOutput({ fps: Number(e.target.value) })}>
                            {FPS.map((f) => <option key={f} value={f}>{f} fps</option>)}
                        </select>
                        <select className={field} value={shot.output.superXY} onChange={(e) => setOutput({ superXY: Number(e.target.value) })} title="Supersampling: rendered larger and averaged down">
                            {[1, 2, 3, 4].filter((n) => n <= maxSS).map((n) => <option key={n} value={n}>{n}× SS</option>)}
                        </select>
                        <select className={field} value={shot.output.format} onChange={(e) => setOutput({ format: e.target.value as RenderFormat })}>
                            {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-white/80">Sharpen</span>
                            <span className="ml-auto font-mono text-white/60">
                                {sharpen ? sharpen.toFixed(2) : 'off'}{shot.output.sharpen === undefined ? ' · the scan’s' : ''}
                            </span>
                        </div>
                        <input
                            type="range" min={0} max={1} step={0.001} value={sharpen / SHARPEN_MAX} className="w-full accent-white"
                            onChange={(e) => setOutput({ sharpen: Number((Number(e.target.value) * SHARPEN_MAX).toFixed(2)) })}
                            onDoubleClick={() => setOutput({ sharpen: undefined })}
                            title="Double-click for the scan's own"
                        />
                    </div>
                    {SERVER && (
                        <div className={`text-[11px] mt-2 ${fits ? 'text-white/60' : 'text-red-300'}`}>
                            About {mb(estimate)}{disk !== null && ` · ${mb(disk)} free`}{!fits && ': not enough room'}
                        </div>
                    )}

                    {rendering ? (
                        <div className="mt-3">
                            <div className="h-1 bg-white/10 rounded"><div className="h-full bg-amber-300 rounded" style={{ width: `${((job.progress?.frame ?? 0) / (job.progress?.frames ?? 1)) * 100}%` }} /></div>
                            <div className="flex justify-between mt-1 text-[11px] text-white/60 font-mono">
                                <span>{job.progress ? `frame ${job.progress.frame} / ${job.progress.frames}` : 'starting…'}</span>
                                <span>{job.progress?.eta != null ? `${clock(job.progress.eta)} left` : ''}</span>
                            </div>
                            <button type="button" className={`${btn} mt-2`} onClick={() => job.controller.abort()}>Cancel</button>
                        </div>
                    ) : (
                        <div className="flex gap-2 mt-3">
                            {SERVER && (
                                <button type="button" disabled={!fits || still === 'Rendering…'} className={`${btn} flex-1 bg-amber-300 text-black border-amber-300 disabled:opacity-40`} onClick={startRender}>
                                    Render {Math.round(shot.duration * fps)} frames
                                </button>
                            )}
                            <button type="button" disabled={still === 'Rendering…'} className={`${btn} disabled:opacity-40`} onClick={takeStill} title="This frame, at the output size, without any UI">
                                Screenshot
                            </button>
                        </div>
                    )}
                    {still && <div className="mt-2 text-[11px] text-white/60">{still}</div>}
                    {job?.result && (
                        <div className="mt-2 text-[11px] text-white/80">
                            Done: {mb(job.result.bytes)}.{' '}
                            <button type="button" className="underline" onClick={() => reveal(job.result!.path)}>Show in Finder</button>
                        </div>
                    )}
                    {job?.error && <div className="mt-2 text-[11px] text-red-300">{job.error}</div>}
                </Section>
            </Inspector>

            <Dock insets={insets} shown={shown}>
                <Timeline
                    shot={shot}
                    time={time}
                    playing={playing}
                    loop={loop}
                    selected={selected}
                    unkeyedCamera={unkeyed}
                    onTime={setTime}
                    onPlay={togglePlay}
                    onLoop={() => { loopRef.current = !loop; setLoop(!loop); }}
                    onStep={(n) => setTime(timeRef.current + n / fps)}
                    onSelect={setSelected}
                    onMove={onMove}
                    onToggleKey={toggleKey}
                />
            </Dock>
        </>
    );
};

/** Canvas size minus the panels: the area the canvas has while the editor isn't up to measure it. */
const useArea = (insets: Insets) => {
    const measure = useCallback(() => ({ w: window.innerWidth - insets.right, h: window.innerHeight - insets.top - insets.bottom }), [insets]);
    const [area, setArea] = useState(measure);
    useEffect(() => {
        const resize = () => setArea(measure());
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [measure]);
    return area;
};

const noop = () => {};

/**
 * While the scan loads: the tool's panels and frame guide already where they
 * will be, so the view doesn't sit alone in a corner, and how far along it is.
 */
const Waiting = ({ scan, scans, onShow, insets, shown, onClose, loading }: Props) => {
    const blank = useMemo(() => newShot(scan.id, ''), [scan.id]);
    const area = useArea(insets);
    const { progress, detail, building, failed } = loading;
    const status = failed ? "Couldn't load this scan."
        : progress !== null ? (progress < 1 ? `Loading the preview · ${Math.round(progress * 100)}%` : 'Preparing the preview…')
            : building ? 'Bringing in the full scan…'
                : `Loading the full scan · ${Math.round((detail ?? 0) * 100)}%`;
    // The preview is small; most of the wait is the full scan.
    const share = failed ? 0 : progress !== null ? progress * 0.2 : building ? 1 : 0.2 + (detail ?? 0) * 0.8;
    return (
        <>
            <Guide insets={insets} box={frameBox(area.w, area.h, 16 / 9)} label="Loading…" />
            <Inspector insets={insets} shown={shown} onClose={onClose} scan={scan} scans={scans} onShow={onShow}>
                <Section title="Loading">
                    <div className={`font-mono text-[11px] ${failed ? 'text-red-300' : 'text-white/80'}`}>{status}</div>
                    {!failed && (
                        <div className="mt-2 h-px bg-white/10">
                            <div className="h-full bg-amber-300 transition-[width] duration-200" style={{ width: `${share * 100}%` }} />
                        </div>
                    )}
                    <div className="text-[11px] text-white/60 mt-2">The editor opens once the full scan is in: focus picking and renders need all of it.</div>
                </Section>
            </Inspector>
            <Dock insets={insets} shown={shown}>
                <div className="h-full opacity-40 pointer-events-none" aria-hidden>
                    <Timeline
                        shot={blank} time={0} playing={false} loop selected={[]} unkeyedCamera={false}
                        onTime={noop} onPlay={noop} onLoop={noop} onStep={noop} onSelect={noop} onMove={() => 0} onToggleKey={noop}
                    />
                </div>
            </Dock>
        </>
    );
};

/** How dark the dim outside the frame is. */
const DIM = 0.55;

/** The output frame over the canvas, with what's just outside it dimmed, under the bar (which has the panels' dark). */
const Guide = ({ insets, box, label }: { insets: Insets; box: ReturnType<typeof frameBox>; label: string }) => (
    <div ref={inks.shade(1 - DIM)} className="absolute left-0 overflow-hidden pointer-events-none" style={{ top: insets.top, right: insets.right, bottom: insets.bottom }}>
        <div
            className="absolute outline outline-1 outline-white/40"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: `0 0 0 9999px rgba(0,0,0,${DIM})` }}
        >
            <span className="absolute -top-5 left-0 font-mono text-[10px] text-white/60">{label}</span>
        </div>
    </div>
);

/**
 * The panel on the right: the tool, the scan, and whatever the moment needs.
 * Its see-through dark starts under the bar, which has the same dark while
 * a tool is open, so nothing scrolls up behind the bar.
 */
const Inspector = ({ insets, shown, onClose, scan, scans, onShow, children }: {
    insets: Insets; shown: boolean; onClose: () => void; scan: Scan; scans: Scan[]; onShow: (scan: Scan) => void; children: React.ReactNode;
}) => {
    const entered = useEntered();
    const on = shown && entered;
    return (
        <div
            ref={inks.shade(PANEL_KEEP)}
            className={`absolute bottom-0 right-0 pointer-events-none ${PANEL_BG} ${PANEL_TEXT} ${SLIDE} ${on ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ top: insets.top, width: insets.right }}
        >
            <aside className="absolute inset-0 overflow-y-auto px-4 pt-4 pb-6 text-sm pointer-events-auto">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={LABEL}>Create</div>
                    <div className="flex items-center gap-2">
                        <select className={field} value={scan.id} onChange={(e) => onShow(scans.find((x) => x.id === e.target.value)!)}>
                            {scans.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                        </select>
                        <button type="button" title="Close (Esc)" aria-label="Close" className="px-1 text-lg/none text-white/60 hover:text-white" onClick={onClose}>×</button>
                    </div>
                </div>
                {children}
            </aside>
        </div>
    );
};

/** The timeline's place along the bottom, on the same see-through dark; it comes up from below. */
const Dock = ({ insets, shown, children }: { insets: Insets; shown: boolean; children: React.ReactNode }) => {
    const entered = useEntered();
    const on = shown && entered;
    return (
        <div
            className={`absolute left-0 bottom-0 ${PANEL_BG} ${PANEL_TEXT} ${SLIDE} ${on ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ right: insets.right, height: insets.bottom }}
        >
            {children}
        </div>
    );
};

const field = 'bg-white/10 border border-white/15 rounded px-2 py-1 text-xs text-white';
const btn = 'px-2.5 py-1 rounded border border-white/20 text-xs hover:bg-white/10';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
        <div className={`${LABEL} text-white/60 mb-2`}>{title}</div>
        {children}
    </div>
);

const Diamond = ({ keyed, onClick }: { keyed: boolean; onClick: () => void }) => (
    <button
        type="button"
        title={keyed ? 'Remove the key at the playhead' : 'Set a key at the playhead'}
        onClick={onClick}
        className={`shrink-0 w-3 h-3 rotate-45 border ${keyed ? 'bg-amber-300 border-amber-300' : 'border-white/45 hover:border-white'}`}
    />
);

/** A slider on 0–1 with a label, its value, and a key diamond. Double-click puts it back to neutral, as in Premiere. */
const Control = ({ label, value, t, onT, onReset, keyed, onKey }: {
    label: string; value: string; t: number; onT: (t: number) => void; onReset: () => void; keyed: boolean; onKey: () => void;
}) => (
    <div className="mt-2">
        <div className="flex items-center gap-2 text-[11px]">
            <Diamond keyed={keyed} onClick={onKey} />
            <span className="text-white/80">{label}</span>
            <span className="ml-auto font-mono text-white/60">{value}</span>
        </div>
        <input
            type="range" min={0} max={1} step={0.001} value={t} className="w-full accent-white" title="Double-click to reset"
            onChange={(e) => onT(Number(e.target.value))}
            onDoubleClick={onReset}
        />
    </div>
);

export default Create;
