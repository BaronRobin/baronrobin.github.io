import * as THREE from 'three';
import { SparkRenderer } from '@sparkjsdev/spark';
import { sharpenPixels } from '../sharpen';
import { applyFrame, type Look } from './apply';
import { evaluate, PULSE_BPM, type Shot, type Values } from './shot';

/**
 * Renders a shot frame by frame, offscreen, at the output size, and streams
 * the frames to the dev server, which feeds them to ffmpeg
 * (scripts/vite-splat-studio.ts). Nothing is real time: every frame waits
 * until its splats are sorted for its own camera, so renders are clean even
 * where the live view would lag.
 *
 * A second SparkRenderer with a render target does the drawing; Spark routes
 * the scene's renderer to it while it renders (sparkOverride), and
 * supersamples by drawing superXY times larger and averaging down.
 */

const API = '/__splats';
/** Spark's render target can't exceed this on either side, supersampling included. */
export const MAX_TARGET = 8192;

export interface RenderProgress {
    frame: number;
    frames: number;
    /** Seconds left, estimated from the frames so far. */
    eta: number | null;
}

export interface RenderResult {
    path: string;
    bytes: number;
}

interface Job {
    shot: Shot;
    /** Values for tracks without keys: the editor's live ones. */
    live: Values;
    scene: THREE.Scene;
    /** The editor's look; its spark is swapped for the render's own. */
    look: Look;
    /** Point size multiplier: the render's pixel height over the preview frame's. */
    dotScale: number;
    /** Sharpening, applied to each finished frame at its output size. */
    sharpen: number;
    signal: AbortSignal;
    onProgress: (p: RenderProgress) => void;
}

const post = async (url: string, body?: BodyInit) => {
    const res = await fetch(url, { method: 'POST', body });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `${url} failed (${res.status})`);
    return json;
};

/** Largest supersampling a size allows. */
export const maxSuperXY = (width: number, height: number) =>
    Math.max(1, Math.min(4, Math.floor(MAX_TARGET / Math.max(width, height))));

/**
 * Bring the splats up to date for this camera, and wait for the sort. update()
 * returns early when a sort is already running, so keep at it until nothing
 * is sorting or waiting to.
 */
const settle = async (spark: SparkRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
    await spark.update({ scene, camera });
    for (let i = 0; i < 400 && (spark.sorting || spark.sortDirty); i++) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (!spark.sorting && spark.sortDirty) await spark.update({ scene, camera });
    }
};

export const renderShot = async ({ shot, live, scene, look, dotScale, sharpen, signal, onProgress }: Job): Promise<RenderResult> => {
    const { width, height, fps, format } = shot.output;
    const superXY = Math.min(shot.output.superXY, maxSuperXY(width, height));
    const frames = Math.max(1, Math.round(shot.duration * fps));

    const { id } = await post(`${API}/render/start`, JSON.stringify({
        name: `${shot.scan} – ${shot.name}`, format, width, height, fps,
    }));

    // Plain 8-bit storage, flagged as an XR target: then Spark and three.js
    // draw into it exactly as they draw on screen. An ordinary render target
    // makes Spark blend the splats in linear light, not in sRGB as on the
    // canvas (and as they were trained), which comes out brighter in soft
    // edges and haze.
    const spark = new SparkRenderer({ renderer: look.renderer, target: { width, height, superXY, internalFormat: 'RGBA8' }, autoUpdate: false });
    (spark.target as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
    const renderLook: Look = { ...look, spark };
    const sharpened = sharpen > 0 ? new Uint8Array(width * height * 4) : null;
    const cams = { perspective: new THREE.PerspectiveCamera(), ortho: new THREE.OrthographicCamera() };
    const size = new THREE.Vector2(width * superXY, height * superXY);
    const started = performance.now();

    try {
        for (let i = 0; i < frames; i++) {
            if (signal.aborted) throw new DOMException('Render cancelled', 'AbortError');
            const values = evaluate(shot, i / fps, live);
            const camera = applyFrame(values, cams, renderLook, {
                aspect: width / height,
                outAspect: width / height,
                scale: 1,
                dotScale: dotScale * superXY,
            }, { time: i / fps, bpm: shot.bpm ?? PULSE_BPM, size });
            await settle(spark, scene, camera);
            const pixels = await spark.renderReadTarget({ scene, camera });
            // The buffer is reused for the next frame, and may be longer than this one.
            const frame = sharpened ? sharpenPixels(pixels, width, height, sharpen, sharpened) : pixels.slice(0, width * height * 4);
            await post(`${API}/render/${id}/frame`, frame);
            const elapsed = (performance.now() - started) / 1000;
            onProgress({ frame: i + 1, frames, eta: ((frames - i - 1) * elapsed) / (i + 1) });
        }
        return await post(`${API}/render/${id}/finish`);
    } catch (error) {
        await post(`${API}/render/${id}/cancel`).catch(() => {});
        throw error;
    } finally {
        spark.dispose();
    }
};

/** Rough output size, for the disk check: bytes per second of video at this size. */
export const estimateBytes = (shot: Shot) => {
    const { width, height, fps, format } = shot.output;
    const pixelsPerSecond = width * height * fps;
    const bitsPerPixel = format === 'mp4' ? 0.35 : format === 'prores' ? 3.6 : 16;
    return (pixelsPerSecond * bitsPerPixel * shot.duration) / 8;
};

/** Show a finished render in Finder. */
export const reveal = (path: string) => post(`${API}/reveal`, JSON.stringify({ path }));

/** Free bytes where renders go. */
export const freeSpace = async (): Promise<{ free: number; dir: string }> => (await fetch(`${API}/disk`)).json();
