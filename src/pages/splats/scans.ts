import * as THREE from 'three';
import type { Filters } from './filters';
import type { SkyLayer } from './sky';
import type { ViewName } from './views';

/**
 * The scans the viewer can show, in switcher order.
 *
 * Each is a Gaussian splat trained from photos, converted from the trainer’s
 * PLY to SPZ with the first SH band only (splat-transform -H 1): about a
 * fifteenth of the size, and Spark reads it as is. Not SOG, which is smaller
 * still but took longer than 20 minutes for one scan on this machine. Names
 * are proper nouns, so they stay out of i18n.
 */
export interface Scan {
    id: string;
    title: string;
    /** Under the title: where, and what for. */
    caption?: string;
    /**
     * Euler angles in degrees, applied to the splat. Trainers keep the camera
     * convention they were fed, which for photogrammetry is usually Y down.
     */
    rotation?: [number, number, number];
    /** Where the camera starts and what it orbits. Framed from the splats when absent. */
    view?: { position: [number, number, number]; target: [number, number, number] };
    /** Everything the tuning panel saved, for it to pick up where it left off. */
    settings?: ScanSettings;
    /** Has a sky of its own, from a Luma export of the same place (sky.ts). */
    sky?: boolean;
    /** Only on the dev server, until it's chosen for the site. */
    draft?: boolean;
    /** Opened from the visitor's own disk: read in the browser, never uploaded, gone on reload. */
    file?: File;
}

/** What Spark reads, by the name's ending. */
export const SPLAT_FILES = ['.ply', '.spz', '.splat', '.ksplat', '.sog'];
export const isSplatFile = (file: File) => SPLAT_FILES.some((ending) => file.name.toLowerCase().endsWith(ending));

/** A visitor's file as a scan. Y down, like nearly everything a trainer writes. */
export const localScan = (file: File): Scan => ({
    id: `local:${file.name}:${file.size}:${file.lastModified}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    rotation: [180, 0, 0],
    file,
});

/**
 * What the tuning panel (?tools, the pencil) saves, one file per scan in
 * ./settings. The view applies straight away; the crop and the streak filter
 * are baked into the files, since the viewer can't drop splats it never got.
 * All in world space, i.e. after the scan's rotation.
 */
export interface ScanSettings extends Partial<Filters> {
    view?: Scan['view'];
    /**
     * Levelling on top of the rotation, degrees: tilt about X, turn about Y,
     * tilt about Z, as a YXZ Euler in world space. Trainers know where the
     * cameras were, not where gravity points, so up is always a little off.
     */
    level?: [number, number, number];
    /** The section each blueprint view glides to: where the slab sits and how thick it is. Views without one show the whole scan. */
    views?: ViewPresets;
    /** Sharpening of the final image (sharpen.ts), 0 for none. */
    sharpen?: number;
    /** Where the added sky sits, for scans with one. */
    skyLayer?: SkyLayer;
}

export type ViewPresets = Partial<Record<ViewName, { cut: number; depth: number }>>;

/** The levelling as a world-space rotation. */
export const levelQuaternion = (level: [number, number, number] = [0, 0, 0]) => {
    const [x, y, z] = level.map(THREE.MathUtils.degToRad);
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
};

/** How a scan's splats sit in the world: its rotation, then its levelling. */
export const orientation = (scan: Scan, level = scan.settings?.level) => {
    const [x, y, z] = (scan.rotation ?? [0, 0, 0]).map(THREE.MathUtils.degToRad);
    const base = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    return levelQuaternion(level).multiply(base);
};

const saved = import.meta.glob<ScanSettings>('./settings/*.json', { eager: true, import: 'default' });

const BASE = '/projects/13_splats';

/** Drafts come from the dev server (splat-drafts/), so nothing of theirs is in public/ to be published. */
const base = (scan: Scan) => (import.meta.env.DEV && scan.draft ? '/__splats/drafts' : BASE);
export const scanUrl = (scan: Scan) => `${base(scan)}/${scan.id}.spz`;
/** The same scan simplified to 200k splats (splat-transform -d 200000): a few MB, up in a moment. */
export const previewUrl = (scan: Scan) => `${base(scan)}/${scan.id}.preview.spz`;
/** The added sky: Luma's sphere alone, a few hundred kB. */
export const skyUrl = (scan: Scan) => `${base(scan)}/${scan.id}.sky.spz`;

/**
 * New Luma exports (October 2026), waiting for Robin to pick which go live.
 * To publish one: move its files from splat-drafts/ to public/projects/13_splats/,
 * and move its entry up into `list` without `draft`.
 *
 * Their files are in the repo, all but Lilli's: that scan shows people, so it
 * is git-ignored and only loads on the machine that has it.
 */
const DRAFTS: Scan[] = [
    { id: 'burg-lichtenberg-luma', title: 'Burg Lichtenberg (Luma)', rotation: [180, 0, 0], draft: true },
    { id: 'burg-hohenecken', title: 'Burg Hohenecken', rotation: [180, 0, 0], draft: true },
    { id: 'suedtirol-13', title: 'Südtirol 13', rotation: [180, 0, 0], draft: true },
    { id: 'baum', title: 'Baum', rotation: [180, 0, 0], draft: true },
    { id: 'baumstamm', title: 'Baumstamm', rotation: [180, 0, 0], draft: true },
    { id: 'lilli', title: 'Lilli in Betze Casa', rotation: [180, 0, 0], draft: true },
];

const list: Scan[] = [
    { id: 'hambach', title: 'Hambacher Schloss', rotation: [180, 0, 0] },
    // Trained lying on its side: its up was the scan's Z.
    { id: 'hambach-inside', title: 'Hambacher Schloss, inside', rotation: [-90, 0, 0] },
    // Trained in Postshot, without a sky; this one is from the Luma export (Burg Lichtenberg 2).
    { id: 'burg-lichtenberg', title: 'Burg Lichtenberg', rotation: [180, 0, 0], sky: true },
    // On the dev server only; the build drops them, files and all.
    ...(import.meta.env.DEV ? DRAFTS : []),
];

export const scans: Scan[] = list.map((scan) => {
    const settings = saved[`./settings/${scan.id}.json`];
    // Copies, so rememberSettings never touches `list`, which keeps each scan's own view.
    return settings ? { ...scan, settings, view: settings.view ?? scan.view } : { ...scan };
});

/**
 * Take settings the tuning panel just saved. The dev server doesn't hot-reload
 * the page for its own writes (that would rebuild the whole viewer), so the
 * list is brought up to date here, for the next time the scan opens.
 */
export const rememberSettings = (id: string, settings: ScanSettings) => {
    const scan = scans.find((s) => s.id === id);
    if (!scan) return;
    scan.settings = settings;
    scan.view = settings.view ?? list.find((s) => s.id === id)?.view;
};
