import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Clapperboard, DraftingCompass, Map as MapIcon, Pencil, X } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { useTheme } from '../../context/ThemeContext';
import { SPLATS_ID } from '../../data/projects';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import {
    addInk, buildPoints, createInk, createTone, crossfade, disposePoints, enterBlueprint, inkPoints, leaveBlueprint, setSection, GROUND, PAPER, SKY_CUT,
    type Before, type Rig,
} from './blueprint';
import BuildUp, { Dots } from './BuildUp';
import Help from './Help';
import Info from './Info';
import { inks } from './ink';
import { BPM, Pulse } from './pulse';
import { addReveal, playFront, removeReveal } from './reveal';
import Ring from './Ring';
import { rooted } from './scale';
import { isSplatFile, localScan, orientation, previewUrl, scans, scanUrl, skyUrl, type Scan, type ViewPresets } from './scans';
import SectionMap from './SectionMap';
import { SharpenPass } from './sharpen';
import { placeSky, SKY_LAYER, skyRadius } from './sky';
import Stepper from './Stepper';
import { Streaks } from './streaks';
import { setToolOpen } from './tools';
import { INK, LABEL, OFF, ON, toggle, TUNE_WIDTH, usePresence } from './ui';
import { SNAP_MS, VIEW_NAMES, ViewSnapper, type ViewName } from './views';
import Wheel, { type WheelItem } from './Wheel';

interface Stage {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    rig: Rig;
    /** White-points amount for blueprint, shared by every mesh, and whether that's white or, on paper, black. */
    ink: ReturnType<typeof createInk>;
    tone: ReturnType<typeof createTone>;
    /** Every mesh in the scene, so blueprint can redraw them all. */
    meshes: Set<SplatMesh>;
    /** How far the current scan reaches from its orbit point. */
    reach: number;
    /** The scan's middle and core radius, as measured on load. */
    centre: THREE.Vector3;
    radius: number;
    /** Where the scan opened, for the idle turntable to come back to. */
    home: { position: THREE.Vector3; target: THREE.Vector3 } | null;
    /** No turntable in blueprint or while tuning. */
    blueprintOn: boolean;
    idleOff: boolean;
    /** Someone did something: stop turning and restart the idle clock. */
    wake: () => void;
    /** Run every frame just before rendering: the creation tool applies its timeline here. */
    beforeRender: (() => void) | null;
    /** No live frames while the creation tool renders a shot offscreen. */
    paused: boolean;
    /** The last step of every frame: sharpening, set per scan (or per shot, while creating). */
    post: SharpenPass;
    /** A sky added to a scan trained without one (sky.ts), and its sphere's own radius. */
    sky: { mesh: SplatMesh; radius: number } | null;
}

const BLUEPRINT_MS = 1400;
/** Cut and depth with no section: the whole scan. */
const WHOLE = { cut: 0, depth: 1 };
/**
 * How the section's rings are engraved, in hundredths of the scan's reach. A
 * scan with a sky reaches far past what's worth cutting, so the small values
 * get most of the ring; depth ends at the whole scan, a lens's infinity.
 */
const CUT_RING = {
    scale: rooted(-1, 1, 2.5),
    numbers: [-1, -0.5, -0.2, -0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1, 0.2, 0.5, 1],
    read: (cut: number) => {
        const n = Math.abs(cut) * 100;
        return `${cut < 0 ? '−' : ''}${n < 10 ? Number(n.toFixed(1)) : Math.round(n)}`;
    },
};
const DEPTH_RING = {
    scale: rooted(0, 1, 3),
    numbers: [0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1],
    read: (depth: number) => (depth >= 1 ? '∞' : `${depth < 0.1 ? Number((depth * 100).toFixed(1)) : Math.round(depth * 100)}`),
};
/** How far from the scan's middle the section map shows, in core radii: the place itself, not its haze. */
const MAP_REACH = 1.5;
/** The turntable's speeds, turns a minute: a record player's, and slower. */
const RPMS = [2, 4, 8, 16, 33, 45, 78];
/** A phone: the controls gather at the foot of the screen (Tailwind's `sm`). */
const PHONE = '(max-width: 639px)';
/** A phone on its side: wide enough for a desktop's edges, too low for its columns. */
const LOW = '(max-height: 520px)';
/** The desktop map's foot above the window's, px: clear of its icon and the "i". */
const MAP_BOTTOM = 64;
/** Smaller than this, the map goes beside the blueprint controls instead of under them. */
const MAP_MIN = 120;

/** Whether a media query holds, kept up to date. */
const useMedia = (query: string) => {
    const [holds, setHolds] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const change = () => setHolds(media.matches);
        media.addEventListener('change', change);
        return () => media.removeEventListener('change', change);
    }, [query]);
    return holds;
};
/** The canvas behind everything: paper in the light theme, else slate, and black for a blueprint. */
const ground = (light: boolean, blueprint: boolean) => (light ? PAPER : blueprint ? 0x000000 : GROUND);
/** The blueprint's controls on a phone, one group at a time. */
type Tab = 'view' | 'cut' | 'motion';
/** A wrong file's notice stays this long, ms. */
const NOTICE_MS = 4000;
/** Idle turntable: how long until it starts, how long the way home takes, how fast it turns. */
const IDLE_MS = 15000;
const HOME_MS = 2400;
const TURN_SPEED = 0.35;

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** The scan on screen, with what the tuning panel needs to work on it. */
interface Loaded extends Stage {
    mesh: SplatMesh;
    bytes: number | null;
    /** The scan this mesh is, so a reload of it (a tuning save) retires the old one at once. */
    scan: Scan;
}

// The tools, behind ?tools: the tuning panel and the creation tool (keyframes,
// screenshots, and on the dev server renders). On the live site too, but
// mentioned nowhere, and each only loaded once it's switched on.
const Tune = lazy(() => import('./Tune'));
const Create = lazy(() => import('./create/Create'));
/** Room the site nav (top), the creation tool's inspector (right) and its timeline (bottom) take over the canvas. */
const CREATE_INSETS = { top: 80, right: 340, bottom: 280 };

/**
 * What "?" says in the tools. In English, like the rest of them: they're
 * mentioned nowhere on the site, so they stay out of its translations.
 */
const TUNE_HELP = [
    'Hover a section title for what it does',
    'Double-click a slider to reset it',
    'B or the brush icon: brush on and off',
    'Drag to paint · ⌥-drag to unpaint',
    '[ and ] size it · hold Space to orbit',
    '⌘Z undo · ⇧⌘Z redo',
    import.meta.env.DEV ? 'Save writes the settings for this scan' : 'Save downloads the settings for this scan',
];
const CREATE_HELP = [
    'Fly the camera, then I or ◆ keys it',
    'Alt-click the scan to focus there',
    'Space plays · ← → step a frame',
    'Shift-click keys to pick several · ⌘A all',
    '⌘C ⌘V copy, paste at the playhead · Del removes',
    'Double-click a slider to reset it',
    ...(import.meta.env.DEV ? ['⌘S saves the shot'] : []),
    'Esc or the clapperboard closes',
];

/** Splats are fill-rate bound; past this the cost grows and the picture doesn't. */
const MAX_PIXEL_RATIO = 1.5;
/** Every nth splat is enough to find where a scan's mass is. */
const FRAME_SAMPLES = 20000;

/**
 * Where a scan's mass is, for the camera and the reveal. Not the bounding box:
 * a trained scene keeps stray splats far out, so its box is mostly sky. The
 * median centre (or the hand-set target) and the 70th-percentile distance from
 * it frame the part that was actually photographed; the 99th is how far the
 * reveal has to travel.
 */
const measure = (mesh: SplatMesh, target?: THREE.Vector3) => {
    mesh.updateMatrixWorld(true);
    const step = Math.max(1, Math.floor((mesh.packedSplats?.numSplats ?? 0) / FRAME_SAMPLES));
    const points: THREE.Vector3[] = [];
    mesh.forEachSplat((i, center) => {
        if (i % step === 0) points.push(center.clone().applyMatrix4(mesh.matrixWorld));
    });
    const median = (axis: 'x' | 'y' | 'z') => {
        const sorted = points.map((p) => p[axis]).sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };
    const centre = target ?? new THREE.Vector3(median('x'), median('y'), median('z'));
    const distances = points.map((p) => p.distanceTo(centre)).sort((a, b) => a - b);
    const at = (q: number) => distances[Math.floor(distances.length * q)] || 1;
    const radius = at(0.7);
    const position = centre.clone().add(new THREE.Vector3(0, 0.35, 1).normalize().multiplyScalar(radius * 1.6));
    return { position, target: centre, radius, reach: at(0.99) };
};

/** How long the reveal takes for the preview, and for the full scan replacing it. */
const REVEAL_MS = 2600;
const SWAP_MS = 1800;

/**
 * Gaussian splats, live: the whole page is the viewer. One renderer for the
 * page's lifetime; switching scans swaps the splat inside it.
 *
 * Dark whatever the site theme, like Lautwasser: a scan reads best on black,
 * and the `dark` class switches the shared nav to match.
 */
const Splats = () => {
    const { t, i18n } = useTranslation();
    useDocumentTitle(t(`projects.${SPLATS_ID}.title`));

    const hostRef = useRef<HTMLDivElement>(null);
    /** Set by the first effect, read by the second; effects run in order, so it's there in time. */
    const stageRef = useRef<Stage | null>(null);
    const [currentId, setCurrentId] = useState(scans[0].id);
    /** A file of the visitor's own, opened here: one more scan, last in the list. */
    const [local, setLocal] = useState<Scan | null>(null);
    // Looked up rather than kept in state: when the tuning panel saves, the list
    // is rebuilt with the new start view, and the scan reloads with it.
    const current = (local?.id === currentId ? local : scans.find((scan) => scan.id === currentId)) ?? scans[0];
    /** The preview: 0–1 while downloading, 1 while decoding, null once on screen. */
    const [progress, setProgress] = useState<number | null>(0);
    /** The full scan behind it: 0–1 while downloading, null before and after. */
    const [detail, setDetail] = useState<number | null>(null);
    /** The full scan has arrived and is going in under the second wave. */
    const [building, setBuilding] = useState(false);
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [coarse] = useState(() => window.matchMedia('(hover: none), (pointer: coarse)').matches);
    // Only while it's still the scan on screen. When a tuning save reloads the
    // scan, this drops in the same render, so the panel lets go of the old mesh
    // before the reload disposes it.
    const ready = loaded?.scan === current ? loaded : null;
    const [params] = useSearchParams();
    // ?tools puts a switch for each tool under blueprint; one tool at a time.
    const tools = params.has('tools');
    const [tool, setTool] = useState<'tune' | 'create' | null>(null);
    const flip = (which: 'tune' | 'create') => setTool((t) => (t === which ? null : which));
    // Tuning saves by scan, so not on a file opened from disk.
    const tunable = tools && !current.file;
    const tuning = tunable && tool === 'tune';
    const creating = tools && tool === 'create';
    // Each tool's panels slide in, and out again before they go.
    const tunePanel = usePresence(tuning);
    /** Where the tuning panel's toggles go, as icons: along the foot, beside the panel. */
    const [toolSlot, setToolSlot] = useState<HTMLDivElement | null>(null);
    // The site's bar takes the panels' dark while a tool is open.
    useEffect(() => {
        setToolOpen(tuning || creating);
        return () => setToolOpen(false);
    }, [tuning, creating]);
    const createPanels = usePresence(creating);
    // The page follows the theme; the creation tool's panels are dark, and so is it under them.
    const { theme } = useTheme();
    const light = theme === 'light' && !creating;
    const lightRef = useRef(light);
    const phone = useMedia(PHONE);
    const low = useMedia(LOW) && !phone;

    const [blueprint, setBlueprint] = useState(false);
    /** True while the camera is on its way in or out; the toggle waits for it. */
    const [switching, setSwitching] = useState(false);
    /** The section: where the slab sits (-1 to 1) and how thick it is (1 is no cut). */
    const [cut, setCut] = useState(0);
    const [depth, setDepth] = useState(1);
    const fromRef = useRef<Before | null>(null);
    /** The point cloud of the scan on screen, built the first time blueprint opens on it; its streaks and pulse, the first time they're on. */
    const pointsRef = useRef<{ mesh: SplatMesh; points: THREE.Points; streaks: Streaks | null; pulse: Pulse | null } | null>(null);
    /** The same points, for the section map to draw from. */
    const [cloud, setCloud] = useState<THREE.Points | null>(null);
    /** Streaks: the points smear behind a fast turn (streaks.ts). */
    const [streaks, setStreaks] = useState(false);
    /** The turntable (views.ts): on or coming to rest, and its speed. */
    const [turning, setTurning] = useState(false);
    const [rpm, setRpm] = useState(8);
    const streaksRef = useRef(streaks);
    useEffect(() => { streaksRef.current = streaks; });
    /** Pulse (pulse.ts): the steady beat it has taken up from the viewer's taps, a minute; null while it's keeping none. */
    const [tempo, setTempo] = useState<number | null>(null);
    /** The section's map, for anyone who'd rather have the room. */
    const [mapOn, setMapOn] = useState(true);
    // The scan's numbers open where the map sits (beside its icon), so it steps aside while they're up.
    const [infoOpen, setInfoOpen] = useState(false);
    const mapFade = usePresence(mapOn && !infoOpen, 300);
    /**
     * On a desktop the blueprint controls sit on the right, centred where the
     * window has the height, and otherwise just under the rail of icons above
     * them. The map sits in the corner, over its icon and the "i", in whatever
     * room the controls leave below them, and beside them where they leave too
     * little. All measured: the controls' size, the rail's foot, the window.
     */
    const [controlsEl, setControlsEl] = useState<HTMLDivElement | null>(null);
    const [railEl, setRailEl] = useState<HTMLDivElement | null>(null);
    const railRef = useCallback((el: HTMLDivElement | null) => {
        inks.watch(el);
        setRailEl(el);
    }, []);
    const [layout, setLayout] = useState({ vw: window.innerWidth, vh: window.innerHeight, height: 0, width: 0, railBottom: 0 });
    useEffect(() => {
        const measure = () => setLayout({
            vw: window.innerWidth,
            vh: window.innerHeight,
            height: controlsEl?.offsetHeight ?? 0,
            width: controlsEl?.offsetWidth ?? 0,
            railBottom: railEl?.getBoundingClientRect().bottom ?? 0,
        });
        const observer = new ResizeObserver(measure);
        if (controlsEl) observer.observe(controlsEl);
        if (railEl) observer.observe(railEl);
        window.addEventListener('resize', measure);
        measure();
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [controlsEl, railEl]);
    // Where the rail leaves too little height above the corner's icons, the controls step left of the rail instead.
    const crowded = layout.railBottom + 24 + layout.height > layout.vh - MAP_BOTTOM;
    const controlsTop = crowded ? Math.max(layout.vh / 2 - layout.height / 2, 88) : Math.max(layout.vh / 2 - layout.height / 2, layout.railBottom + 24);
    const controlsRight = (tuning ? TUNE_WIDTH - 16 : 0) + (crowded ? 64 : 0);
    const mapRoom = {
        below: layout.vh - MAP_BOTTOM - 16 - (controlsTop + layout.height),
        beside: controlsRight + layout.width + 24,
    };
    /** On a phone: which of the blueprint's groups is open, and whether the scan wheel is, which they make way for. */
    const [tab, setTab] = useState<Tab>('view');
    const [wheelOpen, setWheelOpen] = useState(false);
    /** A file is being dragged over the page; and what to say about one that wasn't a splat. */
    const [dropping, setDropping] = useState(false);
    const dragDepth = useRef(0);
    const [notice, setNotice] = useState<string | null>(null);
    const noticeTimer = useRef(0);
    const fileInput = useRef<HTMLInputElement>(null);
    const snapperRef = useRef<ViewSnapper | null>(null);
    const [view, setView] = useState<ViewName | null>(null);
    /** Which view a drag is pulling towards, and how close it is to giving (0–1, in twentieths). */
    const [pullTowards, setPullTowards] = useState<ViewName | null>(null);
    const [pull, setPull] = useState(0);
    /** The section each view glides to, as tuned for this scan; the tuning panel edits them live. */
    const [presets, setPresets] = useState<ViewPresets>(() => current.settings?.views ?? {});
    const presetsRef = useRef(presets);
    useEffect(() => { presetsRef.current = presets; });
    /** The section as it is now, for a glide to start from. */
    const sectionNow = useRef(WHOLE);
    const glide = useRef(0);

    const section = (nextCut: number, nextDepth: number) => {
        setCut(nextCut);
        setDepth(nextDepth);
        sectionNow.current = { cut: nextCut, depth: nextDepth };
        const stage = stageRef.current;
        if (stage) setSection(stage.rig, stage.controls.target, stage.reach, nextCut, nextDepth);
    };

    /** Glide the section to a view's preset, alongside the camera's turn to it. Views without one show the whole scan. */
    const glideTo = (name: ViewName) => {
        cancelAnimationFrame(glide.current);
        const to = presetsRef.current[name] ?? WHOLE;
        const from = sectionNow.current;
        const ms = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SNAP_MS;
        let start = -1;
        const step = (now: number) => {
            if (start < 0) start = now;
            const k = ms ? Math.min(1, (now - start) / ms) : 1;
            const e = easeInOut(k);
            section(from.cut + (to.cut - from.cut) * e, from.depth + (to.depth - from.depth) * e);
            if (k < 1) glide.current = requestAnimationFrame(step);
        };
        glide.current = requestAnimationFrame(step);
    };

    /** A hand on a slider stops a glide. */
    const slide = (nextCut: number, nextDepth: number) => {
        cancelAnimationFrame(glide.current);
        section(nextCut, nextDepth);
    };

    const dropPoints = () => {
        if (!pointsRef.current) return;
        pointsRef.current.streaks?.dispose();
        disposePoints(pointsRef.current.points);
        pointsRef.current = null;
        setCloud(null);
        setTempo(null);
    };

    const onSharpen = useCallback((amount: number) => {
        if (stageRef.current) stageRef.current.post.amount = amount;
    }, []);

    const toggleBlueprint = async (instant = false) => {
        const stage = stageRef.current;
        if (!stage || !ready || switching) return;
        setSwitching(true);
        const ms = instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : BLUEPRINT_MS;
        if (pointsRef.current?.mesh !== ready.mesh) {
            dropPoints();
            const points = buildPoints(ready.mesh, stage.centre, stage.radius * SKY_CUT);
            inkPoints(points, lightRef.current);
            stage.scene.add(points);
            pointsRef.current = { mesh: ready.mesh, points, streaks: null, pulse: null };
            setCloud(points);
        }
        const { points } = pointsRef.current;
        if (!blueprint) {
            setBlueprint(true);
            stage.blueprintOn = true;
            stage.wake();
            stage.renderer.setClearColor(ground(lightRef.current, true));
            const before = await enterBlueprint(stage.rig, ms, (k) => {
                crossfade(points, stage.ink, stage.meshes, k);
                // No sky in blueprint: the added one fades, as Luma's own is cut by SKY_CUT.
                if (stage.sky) stage.sky.mesh.opacity = 1 - k;
            });
            fromRef.current = before;
            section(WHOLE.cut, WHOLE.depth);
            setView(before.view);
            glideTo(before.view);
            snapperRef.current = new ViewSnapper({
                camera: stage.rig.ortho,
                target: stage.controls.target,
                dom: stage.renderer.domElement,
                view: before.view,
                up: before.up,
                setManual: (on) => { stage.rig.manual = on; },
                onView: (name) => {
                    setView(name);
                    glideTo(name);
                },
                onTension: (towards, amount) => {
                    setPullTowards(towards);
                    setPull(Math.round(amount * 20) / 20);
                },
                onTurning: setTurning,
            });
        } else if (fromRef.current) {
            snapperRef.current?.dispose();
            snapperRef.current = null;
            setView(null);
            cancelAnimationFrame(glide.current);
            section(WHOLE.cut, WHOLE.depth);
            await leaveBlueprint(stage.rig, ms, fromRef.current, (k) => {
                crossfade(points, stage.ink, stage.meshes, 1 - k);
                if (stage.sky) stage.sky.mesh.opacity = k;
            });
            stage.renderer.setClearColor(ground(lightRef.current, false));
            stage.blueprintOn = false;
            stage.wake();
            setBlueprint(false);
        }
        setSwitching(false);
    };

    const show = async (scan: Scan) => {
        if (scan.id === current.id || switching) return;
        // A new scan is framed for the perspective camera, so come out first.
        if (blueprint) await toggleBlueprint(true);
        dropPoints();
        setCurrentId(scan.id);
        setPresets(scan.settings?.views ?? {});
        setProgress(0);
        setFailed(false);
        setLoaded(null);
        setDetail(null);
        setBuilding(false);
    };

    /** A file of the visitor's own, from the picker or dropped on the page. It's read here and goes nowhere. */
    const openFile = (file: File | undefined) => {
        if (!file || creating || tuning) return;
        if (!isSplatFile(file)) {
            setNotice(t('splats.notSplat'));
            window.clearTimeout(noticeTimer.current);
            noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
            return;
        }
        const scan = localScan(file);
        setLocal(scan);
        show(scan);
    };
    const pickFile = () => fileInput.current?.click();

    /** A tap on Pulse: a beat through the points, and one more of a rhythm for them to answer or keep. */
    const tapPulse = () => {
        const cloud = pointsRef.current;
        const stage = stageRef.current;
        if (!cloud || !stage) return;
        if (!cloud.pulse) {
            // Out as far as the points go.
            cloud.pulse = new Pulse(cloud.points, stage.centre, stage.radius * SKY_CUT);
            cloud.pulse.onTempo = setTempo;
        }
        cloud.pulse.tap(performance.now());
    };
    const clearPulse = () => {
        pointsRef.current?.pulse?.clear();
        setTempo(null);
    };
    const stepBpm = (by: number) => {
        const beat = pointsRef.current?.pulse;
        if (!beat || beat.bpm === null) return;
        beat.bpm = beat.bpm + by;
        setTempo(beat.bpm);
    };

    const toggleTurntable = () => snapperRef.current?.spin(turning ? 0 : rpm);
    const stepRpm = (by: number) => {
        const next = RPMS[RPMS.indexOf(rpm) + by];
        setRpm(next);
        if (turning) snapperRef.current?.spin(next);
    };

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        renderer.setClearColor(GROUND);
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const spark = new SparkRenderer({ renderer });
        scene.add(spark);
        // Far enough for the dolly zoom into blueprint, which backs a long way off.
        const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 20000);
        const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20000);
        const active: { current: THREE.Camera } = { current: camera };
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotateSpeed = TURN_SPEED;
        const rig: Rig = { perspective: camera, ortho, controls, spark, active, manual: false };

        // Idle turntable: after a while with nobody at the controls, ease back
        // to where the scan opened, the short way round its orbit point, then
        // turn slowly until someone takes over.
        const turntable = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let idleTimer = 0;
        let homing = 0;
        const goHome = () => {
            const s = stageRef.current;
            if (!turntable || !s?.home || s.blueprintOn || s.idleOff) return;
            const home = s.home;
            const fromTarget = controls.target.clone();
            const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
            const to = new THREE.Spherical().setFromVector3(home.position.clone().sub(home.target));
            const turn = THREE.MathUtils.euclideanModulo(to.theta - from.theta + Math.PI, Math.PI * 2) - Math.PI;
            const start = performance.now();
            const step = (now: number) => {
                const k = Math.min(1, (now - start) / HOME_MS);
                const e = easeInOut(k);
                controls.target.lerpVectors(fromTarget, home.target, e);
                const at = new THREE.Spherical(
                    THREE.MathUtils.lerp(from.radius, to.radius, e),
                    THREE.MathUtils.lerp(from.phi, to.phi, e),
                    from.theta + turn * e,
                );
                camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(at));
                if (k < 1) homing = requestAnimationFrame(step);
                else controls.autoRotate = true;
            };
            homing = requestAnimationFrame(step);
        };
        const wake = () => {
            cancelAnimationFrame(homing);
            controls.autoRotate = false;
            clearTimeout(idleTimer);
            idleTimer = window.setTimeout(goHome, IDLE_MS);
        };
        renderer.domElement.addEventListener('pointerdown', wake);
        renderer.domElement.addEventListener('wheel', wake, { passive: true });
        window.addEventListener('keydown', wake);

        const resize = () => {
            const { clientWidth: w, clientHeight: h } = host;
            renderer.setSize(w, h);
            camera.aspect = w / Math.max(h, 1);
            camera.updateProjectionMatrix();
            ortho.left = -ortho.top * camera.aspect;
            ortho.right = ortho.top * camera.aspect;
            ortho.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        const post = new SharpenPass(renderer);
        renderer.setAnimationLoop((time) => {
            if (stageRef.current?.paused) return;
            // While the camera is aimed by hand (a blueprint snap), OrbitControls
            // would re-aim it at its target with the wrong up.
            if (!rig.manual) controls.update();
            stageRef.current?.beforeRender?.();
            const cloud = pointsRef.current;
            const stage = stageRef.current;
            if (cloud && stage) {
                if (streaksRef.current) {
                    cloud.streaks ??= new Streaks(cloud.points);
                    cloud.streaks.follow(active.current, renderer, time, controls.target, stage.reach);
                } else {
                    cloud.streaks?.rest();
                }
                cloud.pulse?.update(time);
            }
            post.render(scene, active.current);
            inks.read(renderer, time);
        });
        stageRef.current = {
            renderer,
            scene,
            camera,
            controls,
            rig,
            ink: createInk(),
            tone: createTone(),
            meshes: new Set(),
            reach: 1,
            centre: new THREE.Vector3(),
            radius: 1,
            home: null,
            blueprintOn: false,
            idleOff: false,
            wake,
            beforeRender: null,
            paused: false,
            post,
            sky: null,
        };
        wake();

        return () => {
            stageRef.current = null;
            clearTimeout(idleTimer);
            cancelAnimationFrame(homing);
            renderer.domElement.removeEventListener('pointerdown', wake);
            renderer.domElement.removeEventListener('wheel', wake);
            window.removeEventListener('keydown', wake);
            renderer.setAnimationLoop(null);
            observer.disconnect();
            controls.dispose();
            post.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    // No turntable while tuning or creating: it would move the view out from under you.
    useEffect(() => {
        const stage = stageRef.current;
        if (stage) stage.idleOff = tuning || creating;
    }, [tuning, creating]);
    // Esc closes the creation tool, as its × does.
    useEffect(() => {
        if (!creating) return;
        const escape = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') setTool(null);
        };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [creating]);

    // The theme, on the canvas: its ground, and the blueprint's ink, light on black or dark on paper.
    useEffect(() => {
        lightRef.current = light;
        const stage = stageRef.current;
        if (!stage) return;
        stage.renderer.setClearColor(ground(light, stage.blueprintOn));
        stage.tone.value = light ? 0 : 1;
        for (const mesh of stage.meshes) mesh.updateVersion();
        if (pointsRef.current) inkPoints(pointsRef.current.points, light);
    }, [light]);

    useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

    /**
     * Loading, in three steps, so there's something to look at within a
     * second or two whatever the connection:
     *   1. the preview (200k splats, a few MB) grows in from the middle;
     *   2. meanwhile the full scan downloads;
     *   3. it replaces the preview under a second wave, and the preview goes.
     */
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;
        let live = true;
        const meshes: SplatMesh[] = [];
        const stops: (() => void)[] = [];
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const add = (mesh: SplatMesh) => {
            mesh.quaternion.copy(orientation(current));
            stage.scene.add(mesh);
            meshes.push(mesh);
            stage.meshes.add(mesh);
            // Inked from the start, so a scan opened in blueprint arrives as points.
            mesh.initialized.then(() => addInk(mesh, stage.ink, stage.tone), () => {});
            return mesh;
        };
        const load = (url: string, onProgress: (e: ProgressEvent) => void) => add(new SplatMesh({ url, onProgress }));

        /** Point the camera at a mesh that's just arrived, and note where the scan is. */
        const frame = (mesh: SplatMesh) => {
            const { camera, controls } = stage;
            const m = measure(mesh, current.view && new THREE.Vector3(...current.view.target));
            camera.position.copy(current.view ? new THREE.Vector3(...current.view.position) : m.position);
            controls.target.copy(m.target);
            controls.update();
            stage.reach = m.reach;
            stage.centre.copy(m.target);
            stage.radius = m.radius;
            stage.home = { position: camera.position.clone(), target: m.target.clone() };
            stage.wake();
            setProgress(null);
            return { m, wave: { origin: m.target, band: m.reach * 0.35, dot: m.reach * 0.002 } };
        };

        /** A file from the visitor's disk: no preview to go first, so it grows in whole. */
        const open = async (file: File) => {
            const bytes = await file.arrayBuffer();
            if (!live) return;
            const whole = add(new SplatMesh({ fileBytes: bytes, fileName: file.name }));
            await whole.initialized;
            if (!live) return;
            const { m, wave } = frame(whole);
            const grow = playFront(addReveal(whole, { mode: 'in', ...wave }), [whole], m.reach + wave.band, still ? 0 : REVEAL_MS);
            stops.push(grow.cancel);
            await grow.done;
            if (!live) return;
            removeReveal(whole);
            setLoaded({ ...stage, mesh: whole, bytes: file.size, scan: current });
        };

        const run = async () => {
            stage.post.amount = current.settings?.sharpen ?? 0;
            if (current.file) return open(current.file);
            const preview = load(previewUrl(current), (e) => {
                if (live && e.lengthComputable) setProgress(e.loaded / e.total);
            });
            // An added sky is a few hundred kB: in long before the full scan.
            // Not inked and not in `meshes`, so blueprint never turns it to points.
            const sky = current.sky ? new SplatMesh({ url: skyUrl(current) }) : null;
            if (sky) {
                sky.opacity = 0;
                stage.scene.add(sky);
                meshes.push(sky);
            }
            await preview.initialized;
            if (!live) return;

            const { m, wave } = frame(preview);
            const distance = m.reach + wave.band;
            const grow = playFront(addReveal(preview, { mode: 'in', ...wave }), [preview], distance, still ? 0 : REVEAL_MS);
            stops.push(grow.cancel);

            // The sky comes up with the scan.
            const skyIn = sky?.initialized.then(() => {
                if (!live) return;
                const radius = skyRadius(sky);
                placeSky(sky, radius, m.target, m.reach, current.settings?.skyLayer ?? SKY_LAYER);
                stage.sky = { mesh: sky, radius };
                const ms = still ? 0 : REVEAL_MS;
                let start = -1;
                const step = (now: number) => {
                    if (start < 0) start = now;
                    const k = ms ? Math.min(1, (now - start) / ms) : 1;
                    if (!stage.blueprintOn) sky.opacity = easeInOut(k);
                    if (k < 1 && live) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }, (error) => console.error(`sky ${current.id}:`, error));

            let bytes: number | null = null;
            const full = load(scanUrl(current), (e) => {
                if (!live || !e.lengthComputable) return;
                bytes = e.total;
                setDetail(e.loaded / e.total);
            });
            // Hidden behind a front at zero the moment it's ready, so it can't
            // flash in whole before its wave.
            const swapFront = await full.initialized.then(() => addReveal(full, { mode: 'in', ...wave }));
            if (live) {
                setDetail(null);
                setBuilding(true);
            }
            await grow.done;
            if (!live) return;
            removeReveal(preview);
            addReveal(preview, { mode: 'out', ...wave, front: swapFront });

            const swap = playFront(swapFront, [full, preview], distance, still ? 0 : SWAP_MS);
            stops.push(swap.cancel);
            await swap.done;
            if (!live) return;
            removeReveal(full);
            stage.scene.remove(preview);
            stage.meshes.delete(preview);
            preview.dispose();
            await skyIn;
            if (!live) return;
            setLoaded({ ...stage, mesh: full, bytes, scan: current });
        };

        run().catch((error) => {
            console.error(`splat ${current.id}:`, error);
            if (live) setFailed(true);
        });

        return () => {
            live = false;
            stage.sky = null;
            for (const stop of stops) stop();
            for (const mesh of meshes) {
                stage.scene.remove(mesh);
                stage.meshes.delete(mesh);
                mesh.dispose();
            }
        };
    }, [current]);

    // Every scan there is to show: the site's, and a file of the visitor's own if one is open.
    const all = local ? [...scans, local] : scans;
    const pick = (id: string) => {
        const scan = all.find((s) => s.id === id);
        if (scan) show(scan);
    };
    /** The same on a phone's wheel, with one more row: open a file. */
    const wheelItems: WheelItem[] = [
        ...all.map((scan) => ({ id: scan.id, title: scan.title, tag: scan.draft ? 'draft' : undefined })),
        { id: 'open', title: t('splats.open'), action: pickFile },
    ];
    const carriesFile = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');
    /** The scans and the viewer are Robin's; the footer says so on every other page, and this one has none. */
    const copyright = `© ${new Date().getFullYear()} Robin Baron`;

    // The controls, in pieces: a desktop spreads them along the window's edges, a phone gathers them at its foot.
    const inBlueprint = blueprint && view !== null;
    const help = (
        <Help
            label={t('splats.help')}
            lines={tuning ? TUNE_HELP : [
                ...t(`splats.${blueprint ? 'hintBlueprint' : 'hint'}${coarse ? 'Touch' : ''}`).split(' · '),
                ...(blueprint ? [t('splats.hintViews'), t('splats.hintRings'), t('splats.hintMap'), t('splats.hintPulse'), t('splats.hintReset')] : []),
            ]}
        />
    );
    const createHelp = <Help label={t('splats.help')} lines={CREATE_HELP} />;
    /** The scan's numbers, once the full file is in: how many splats, how big, in what, and what one costs. */
    const stats = (() => {
        if (!ready) return null;
        const splats = ready.mesh.packedSplats;
        const count = splats?.numSplats ?? 0;
        const extra = splats?.extra ?? {};
        const sh = extra.sh3 || (extra.sh3a && extra.sh3b) ? 3 : extra.sh2 ? 2 : extra.sh1 ? 1 : 0;
        const name = current.file?.name ?? scanUrl(current);
        const format = name.slice(name.lastIndexOf('.') + 1).toUpperCase();
        const n = (value: number, digits = 0) => value.toLocaleString(i18n.language, { maximumFractionDigits: digits, minimumFractionDigits: digits });
        return [
            t('splats.stats.splats', { amount: n(count) }),
            ...(ready.bytes ? [t('splats.stats.size', { mb: n(ready.bytes / 1e6, 1) })] : []),
            t('splats.stats.format', { format, sh }),
            ...(ready.bytes && count ? [t('splats.stats.perSplat', { bytes: n(ready.bytes / count, 1) })] : []),
        ];
    })();
    // The creation tool's switch: in the rail, and on its own beside the tool's panel while it's open, to close it again.
    const createSwitch = tools && (
        <button
            type="button"
            data-ink-part
            onClick={() => flip('create')}
            aria-pressed={creating}
            aria-label="Create"
            title={creating ? 'Close (Esc)' : 'Create'}
            className={`flex flex-col items-center gap-1.5 transition-colors ${creating ? ON : OFF}`}
        >
            <Clapperboard size={20} strokeWidth={1.75} />
            <span aria-hidden className={`h-px w-5 bg-current transition-opacity ${creating ? 'opacity-100' : 'opacity-0'}`} />
        </button>
    );
    const viewButtons = VIEW_NAMES.map((name) => {
        // The view a drag is pulling towards brightens as it nears the edge; none is the view while the turntable runs.
        const lean = pullTowards === name ? pull : 0;
        const on = view === name && !turning;
        return (
            <button
                key={name}
                type="button"
                data-ink-part
                onClick={() => snapperRef.current?.snapTo(name)}
                aria-pressed={on}
                // Buttons don't inherit the uppercase.
                className={`uppercase transition-colors ${on || lean ? ON : OFF}`}
                style={lean && !on ? { opacity: 0.5 + 0.5 * lean } : undefined}
            >
                {t(`splats.views.${name}`)}
            </button>
        );
    });
    const rings = (
        <>
            <Ring
                label={t('splats.cut')} value={cut} min={-1} max={1} {...CUT_RING}
                onChange={(next) => slide(next, depth)} onReset={() => slide(WHOLE.cut, depth)}
                disabled={depth >= 1} lying={phone}
            />
            <Ring
                label={t('splats.depth')} value={depth} min={0} max={1} {...DEPTH_RING}
                onChange={(next) => slide(cut, next)} onReset={() => slide(cut, WHOLE.depth)}
                lying={phone}
            />
        </>
    );
    const mapToggle = (
        <button type="button" data-ink-part onClick={() => setMapOn((on) => !on)} aria-pressed={mapOn} className={toggle(mapOn)}>
            {t('splats.mapToggle')}
        </button>
    );
    // Its room is kept whether it's on or not, so turning it on and off moves nothing else; it fades in and out in place.
    // Below the controls when there's room for a map worth reading; beside them otherwise.
    const mapBelow = mapRoom.below >= MAP_MIN;
    const mapSize = phone ? 136 : mapBelow ? Math.min(172, Math.floor(mapRoom.below)) : 136;
    const map = (
        <div className="relative shrink-0" style={{ width: mapSize, height: mapSize }}>
            {mapFade.mounted && cloud && ready && (
                <div className={`absolute inset-0 transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${mapFade.shown ? 'opacity-100' : 'opacity-0'}`}>
                    <SectionMap
                        points={cloud}
                        camera={ready.rig.ortho}
                        target={ready.controls.target}
                        centre={ready.centre}
                        extent={ready.radius * MAP_REACH}
                        reach={ready.reach}
                        cut={cut}
                        depth={depth}
                        size={mapSize}
                        label={t('splats.map')}
                    />
                </div>
            )}
        </div>
    );
    // A toggle, and beside it, while it's on, how fast.
    const paired = phone ? 'flex items-center justify-between gap-4' : 'flex flex-row-reverse items-center gap-3';
    const motion = (
        <>
            <div data-ink-part className={paired}>
                <button type="button" onClick={() => setStreaks((on) => !on)} aria-pressed={streaks} className={toggle(streaks)}>
                    {t('splats.streaks')}
                </button>
            </div>
            <div data-ink-part className={paired}>
                <button type="button" onClick={toggleTurntable} aria-pressed={turning} className={toggle(turning)}>
                    {t('splats.turntable')}
                </button>
                {turning && (
                    <Stepper
                        value={rpm} unit={t('splats.rpm')} less={t('splats.less')} more={t('splats.more')}
                        onLess={rpm > RPMS[0] ? () => stepRpm(-1) : undefined}
                        onMore={rpm < RPMS[RPMS.length - 1] ? () => stepRpm(1) : undefined}
                    />
                )}
            </div>
            <div data-ink-part className={paired}>
                <span className="flex items-center gap-2">
                    {/* Not a switch: every press is a beat. Underlined while it keeps one going. */}
                    <button
                        type="button"
                        // On the way down, like a drum; from the keyboard there's only the click.
                        onPointerDown={(e) => { if (e.button === 0) tapPulse(); }}
                        onClick={(e) => { if (e.detail === 0) tapPulse(); }}
                        className={`touch-manipulation select-none ${toggle(tempo !== null)}`}
                    >
                        {t('splats.pulse')}
                    </button>
                    {tempo !== null && (
                        <button type="button" onClick={clearPulse} aria-label={t('splats.pulseClear')} className={`-m-2 p-2 transition-colors ${OFF}`}>
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    )}
                </span>
                {tempo !== null && (
                    <Stepper
                        value={tempo} unit={t('splats.bpm')} less={t('splats.less')} more={t('splats.more')}
                        onLess={tempo > BPM.min ? () => stepBpm(-1) : undefined}
                        onMore={tempo < BPM.max ? () => stepBpm(1) : undefined}
                    />
                )}
            </div>
        </>
    );

    return (
        <div className={light ? '[color-scheme:light]' : 'dark [color-scheme:dark]'}>
            <div
                className={`fixed inset-0 ${ON} ${light ? 'bg-slate-50' : blueprint ? 'bg-black' : 'bg-slate-950'}`}
                // A splat file dropped anywhere on the page opens in it.
                onDragEnter={(e) => {
                    if (!carriesFile(e) || creating || tuning) return;
                    dragDepth.current++;
                    setDropping(true);
                }}
                onDragOver={(e) => { if (carriesFile(e)) e.preventDefault(); }}
                onDragLeave={(e) => {
                    if (!carriesFile(e)) return;
                    dragDepth.current = Math.max(0, dragDepth.current - 1);
                    if (!dragDepth.current) setDropping(false);
                }}
                onDrop={(e) => {
                    if (!carriesFile(e)) return;
                    e.preventDefault();
                    dragDepth.current = 0;
                    setDropping(false);
                    openFile(e.dataTransfer.files[0]);
                }}
            >
                {/* The scan fills the window in every mode; the tools' panels are see-through, over it. */}
                <div ref={hostRef} className="absolute inset-0" />

                {/* Up from the start, so its panels are in place while the scan loads. */}
                {createPanels.mounted && (
                    <Suspense fallback={null}>
                        <Create
                            key={current.id}
                            scan={current}
                            scans={scans}
                            onShow={show}
                            insets={CREATE_INSETS}
                            shown={createPanels.shown}
                            onClose={() => setTool(null)}
                            stage={ready}
                            loading={{ progress, detail, building, failed }}
                            setBeforeRender={(fn) => { if (stageRef.current) stageRef.current.beforeRender = fn; }}
                            setPaused={(paused) => { if (stageRef.current) stageRef.current.paused = paused; }}
                            setSharpen={onSharpen}
                        />
                    </Suspense>
                )}

                {tunePanel.mounted && ready && (
                    <Suspense fallback={null}>
                        <Tune
                            key={current.id}
                            shown={tunePanel.shown}
                            icons={toolSlot}
                            scan={current}
                            mesh={ready.mesh}
                            scene={ready.scene}
                            camera={ready.camera}
                            controls={ready.controls}
                            dom={ready.renderer.domElement}
                            fileBytes={ready.bytes}
                            blueprint={blueprint}
                            section={blueprint && view ? { view, cut, depth } : null}
                            presets={presets}
                            onPresets={setPresets}
                            onSharpen={onSharpen}
                            sky={ready.sky}
                            centre={ready.centre}
                            reach={ready.reach}
                        />
                    </Suspense>
                )}

                {/* Nothing on screen yet: the dots in the middle, where the scan will grow from. */}
                {(progress !== null || failed) && (
                    <div ref={inks.watch} className={`absolute inset-0 flex items-center justify-center pointer-events-none ${INK}`} style={creating ? CREATE_INSETS : undefined}>
                        {failed ? (
                            <div className={`text-center font-mono text-xs tracking-widest uppercase ${ON}`}>{t('splats.failed')}</div>
                        ) : (
                            <div role="status">
                                <span className="sr-only">{t('splats.loading')}</span>
                                <Dots />
                            </div>
                        )}
                    </div>
                )}

                {/* The rest of the scan arriving behind the preview, in every mode. */}
                <BuildUp
                    active={progress === null && !failed && !ready}
                    detail={detail}
                    building={building}
                    insets={creating ? CREATE_INSETS : undefined}
                />

                {/* While tuning, the panel's toggles: stacked at the foot, on the rail's axis. */}
                {tuning && (
                    <div ref={inks.watch} className={`absolute bottom-8 z-10 ${INK}`} style={{ right: TUNE_WIDTH + 16 }}>
                        <div ref={setToolSlot} className="flex w-10 flex-col items-center gap-6 md:w-6" />
                    </div>
                )}

                {/* While creating, its switch stays: left of the panel, where the rail would be. */}
                {creating && (
                    <div ref={inks.watch} className={`absolute top-[4.25rem] z-10 flex w-6 flex-col items-center gap-6 ${INK}`} style={{ right: CREATE_INSETS.right + 16 }}>
                        <span aria-hidden className="h-px w-5 bg-current opacity-50" />
                        <div data-ink-part>{createHelp}</div>
                        {createSwitch}
                    </div>
                )}

                {!creating && (
                    <>
                        <h1 className="sr-only">{current.title}</h1>
                        {/* Any file: a phone greys out endings it doesn't know. openFile checks the name. */}
                        <input
                            ref={fileInput}
                            type="file"
                            className="hidden"
                            tabIndex={-1}
                            aria-hidden
                            onChange={(e) => {
                                openFile(e.target.files?.[0]);
                                e.target.value = '';
                            }}
                        />

                        {/*
                          * Under the bar's right end and on its axis (the menu icon on a
                          * phone, the last flag otherwise): a rule, then help, then
                          * blueprint as a mark of its own. Clear of the tuning panel.
                          */}
                        <div className={`absolute top-[4.25rem] z-10 pointer-events-none ${tuning ? '' : 'inset-x-0'}`} style={tuning ? { right: TUNE_WIDTH + 16 } : undefined}>
                            <div className={tuning ? '' : 'flex justify-end px-6'}>
                                <div ref={railRef} className={`pointer-events-auto flex w-10 flex-col items-center gap-6 md:w-6 ${INK}`}>
                                    <span aria-hidden className="h-px w-5 bg-current opacity-50" />
                                    <div data-ink-part>{help}</div>
                                    <button
                                        type="button"
                                        data-ink-part
                                        onClick={() => toggleBlueprint()}
                                        // Needs the full scan: the points are its splat centres.
                                        disabled={!ready || switching}
                                        aria-pressed={blueprint}
                                        aria-label={t('splats.blueprint')}
                                        title={t('splats.blueprint')}
                                        className={`flex flex-col items-center gap-1.5 transition-colors disabled:opacity-30 ${blueprint ? ON : OFF}`}
                                    >
                                        <DraftingCompass size={22} strokeWidth={1.75} />
                                        {/* On, like the toggles' underline. */}
                                        <span aria-hidden className={`h-px w-5 bg-current transition-opacity ${blueprint ? 'opacity-100' : 'opacity-0'}`} />
                                    </button>
                                    {tunable && (
                                        <button
                                            type="button"
                                            data-ink-part
                                            onClick={() => flip('tune')}
                                            disabled={!ready}
                                            aria-pressed={tuning}
                                            aria-label="Tune"
                                            title="Tune"
                                            className={`flex flex-col items-center gap-1.5 transition-colors disabled:opacity-30 ${tuning ? ON : OFF}`}
                                        >
                                            <Pencil size={20} strokeWidth={1.75} />
                                            <span aria-hidden className={`h-px w-5 bg-current transition-opacity ${tuning ? 'opacity-100' : 'opacity-0'}`} />
                                        </button>
                                    )}
                                    {createSwitch}
                                </div>
                            </div>
                        </div>

                        {/*
                          * A desktop gives the scan the whole window; what's on it keeps
                          * to the edges. Scans bottom left, and in blueprint the views and
                          * effects along the right edge, below help and the blueprint mark,
                          * with the section's map and rings flush against it. No
                          * panels: plain type in the ink its ground calls for (ui.ts, ink.ts).
                          */}
                        {!phone && (
                            <>
                                {/* On its side a phone hasn't the height for a list: the wheel again. */}
                                {low && (
                                    <div ref={inks.watch} className={`absolute left-6 bottom-6 z-10 w-72 ${INK}`}>
                                        <Wheel className="-my-9" items={wheelItems} current={current.id} onPick={pick} label={t('splats.scans')} />
                                    </div>
                                )}
                                <nav ref={inks.watch} aria-label={t('splats.scans')} className={`absolute left-6 bottom-6 z-10 ${INK} ${low ? 'hidden' : ''}`}>
                                    <ul className="flex flex-col items-start gap-1">
                                        {all.map((scan) => {
                                            const on = scan.id === current.id;
                                            return (
                                                <li key={scan.id} data-ink-part>
                                                    <button
                                                        type="button"
                                                        onClick={() => show(scan)}
                                                        aria-current={on ? 'true' : undefined}
                                                        className={`text-left text-base transition-colors ${on ? `${ON} font-medium` : OFF}`}
                                                    >
                                                        {scan.title}
                                                        {scan.draft && <span className="ml-2 font-mono text-[9px] tracking-widest uppercase opacity-70">draft</span>}
                                                    </button>
                                                    {on && scan.caption && <p className="text-xs opacity-60">{scan.caption}</p>}
                                                </li>
                                            );
                                        })}
                                        <li className="mt-2" data-ink-part>
                                            <button type="button" onClick={pickFile} className={`${LABEL} transition-colors ${OFF}`}>{t('splats.open')}</button>
                                        </li>
                                    </ul>
                                </nav>

                                {/* Whose it is, where the loading dots were. */}
                                {ready && !tuning && (
                                    <p ref={inks.watch} className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap normal-case ${LABEL} ${INK}`}>
                                        <span className="opacity-60">{copyright} · {t('footer.rights')}</span>
                                    </p>
                                )}

                                {/* The corner: the scan's numbers, then in blueprint the map's switch, under the map. */}
                                {((stats && !tuning) || inBlueprint) && (
                                    <div ref={inks.watch} className={`absolute bottom-6 z-10 flex items-end gap-5 ${INK}`} style={{ right: tuning ? TUNE_WIDTH + 72 : 24 }}>
                                        {stats && !tuning && (
                                            <div data-ink-part><Info key={current.id} label={t('splats.stats.label')} lines={stats} onOpenChange={setInfoOpen} /></div>
                                        )}
                                        {inBlueprint && (
                                            <button
                                                type="button"
                                                data-ink-part
                                                onClick={() => setMapOn((on) => !on)}
                                                aria-pressed={mapOn}
                                                aria-label={t('splats.mapToggle')}
                                                title={t('splats.mapToggle')}
                                                className={`flex flex-col items-center gap-1.5 transition-colors ${mapOn ? ON : OFF}`}
                                            >
                                                <MapIcon size={20} strokeWidth={1.75} />
                                                <span aria-hidden className={`h-px w-5 bg-current transition-opacity ${mapOn ? 'opacity-100' : 'opacity-0'}`} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Behind them the scan fades into the ground, feathered: no panel, but the points don't drown the type. */}
                                {inBlueprint && !tuning && (
                                    <div aria-hidden className={`absolute inset-y-0 right-0 pointer-events-none bg-gradient-to-l from-slate-50/90 via-slate-50/60 to-transparent dark:from-black/90 dark:via-black/60 ${low ? 'w-[28rem]' : 'w-80'}`} />
                                )}
                                {inBlueprint && (
                                    <div ref={setControlsEl} className={`absolute z-10 flex items-center gap-6 ${LABEL} ${INK}`} style={{ top: controlsTop, right: controlsRight }}>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {viewButtons}
                                            <div className="mt-5 flex flex-col items-end gap-2.5">{motion}</div>
                                        </div>
                                        <div className="flex">{rings}</div>
                                    </div>
                                )}
                                {/* The map over its icon in the corner, or beside the controls where there's no room under them. */}
                                {inBlueprint && (
                                    <div
                                        className={`absolute z-10 ${INK}`}
                                        style={mapBelow
                                            ? { right: tuning ? TUNE_WIDTH + 72 : 24, bottom: MAP_BOTTOM }
                                            : { right: mapRoom.beside, bottom: 24 }}
                                    >
                                        {map}
                                    </div>
                                )}
                            </>
                        )}

                        {/*
                          * A phone has no edges to spare: everything else gathers at the
                          * foot of the screen. The scans are a wheel; blueprint's controls come a
                          * group at a time, and step back while the wheel is open.
                          */}
                        {phone && (
                            <>
                                <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none">
                                    {inBlueprint && (
                                        // Blueprint's controls are fine marks on points, half of them lit: no
                                        // ink reads on that. So behind this block alone the ground comes up
                                        // in a soft band, and on it the theme's ink is the right one.
                                        // Over the wheel, whose room reaches up under the tabs.
                                        <div className={`relative z-10 px-4 pt-14 pb-7 bg-[linear-gradient(to_top,transparent,rgb(249_250_251/0.85)_24%,rgb(249_250_251/0.85)_72%,transparent)] dark:bg-[linear-gradient(to_top,transparent,rgb(0_0_0/0.85)_24%,rgb(0_0_0/0.85)_72%,transparent)] transition-opacity duration-300 ${INK} ${LABEL} ${wheelOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}`}>
                                            <div className="mb-5">
                                                {tab === 'view' && <div className="flex flex-wrap justify-between gap-x-4 gap-y-3">{viewButtons}</div>}
                                                {tab === 'cut' && (
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-end justify-between">
                                                            {map}
                                                            {mapToggle}
                                                        </div>
                                                        {rings}
                                                    </div>
                                                )}
                                                {tab === 'motion' && <div className="flex flex-col gap-3.5">{motion}</div>}
                                            </div>
                                            <div className="flex gap-6">
                                                {([['view', t('splats.tabView')], ['cut', t('splats.cut')], ['motion', t('splats.tabMotion')]] as const).map(([id, name]) => (
                                                    <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={toggle(tab === id)}>
                                                        {name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* The scans, straight on the scan: no fade, each row in the ink its ground calls for (ink.ts). */}
                                    <div ref={inks.watch} className={`pointer-events-auto flex items-center justify-between gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${INK}`}>
                                        {/* Three rows of room for five: closed, the outer two are out of sight anyway. */}
                                        <Wheel
                                            className="-my-9 min-w-0 flex-1"
                                            items={wheelItems}
                                            current={current.id}
                                            onPick={pick}
                                            onOpen={setWheelOpen}
                                            label={t('splats.scans')}
                                        />
                                        <p data-ink-part className="shrink-0 font-mono text-[9px] tracking-widest opacity-70">{copyright}</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {(dropping || notice) && (
                            <div className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none ${LABEL} ${INK} ${dropping ? 'bg-slate-50/60 dark:bg-black/60' : ''}`}>
                                <p className="px-6 text-center" role="status">{dropping ? t('splats.drop') : notice}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Splats;
