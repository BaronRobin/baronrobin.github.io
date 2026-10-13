import * as THREE from 'three';
import type { dyno, SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { GROUND, NARROW_FOV, sectionPlanes, setBlueprintAmount } from '../blueprint';
import type { Pulse } from '../pulse';
import type { Streaks } from '../streaks';
import { fovFromFocal, type Values } from './shot';

/**
 * Turns a moment of a shot into a camera and a look. The editor's preview
 * and the renderer both go through here, so what you scrub is what renders.
 *
 * Framing is the frame's half-height at the target, h = |P - T| · tan(fov/2),
 * with the field of view from the focal length. Blueprint is the live
 * toggle's dolly zoom made continuous: as it goes 0 → 1 the field of view
 * narrows towards NARROW_FOV while the camera backs off to keep h, and at 1
 * the orthographic camera takes over, showing exactly h. So moves in and out
 * of blueprint can be keyframed like any other.
 */

/**
 * Full aperture angle at aperture 1, radians. Scans have no real scale, so
 * this is a feel, not an f-stop; squared, so the low end, where most shots
 * live, gets most of the slider.
 */
const APERTURE_MAX = 0.03;

export interface Cameras {
    perspective: THREE.PerspectiveCamera;
    ortho: THREE.OrthographicCamera;
}

export interface Look {
    renderer: THREE.WebGLRenderer;
    spark: SparkRenderer;
    /** The scan's point cloud, for blueprint; null until built. */
    points: THREE.Points | null;
    ink: dyno.DynoFloat<string>;
    meshes: Iterable<SplatMesh>;
    /** The renderer's own splat size limit, which blueprint shrinks from. */
    px0: number;
    /** How far the scan reaches from its orbit point, for the section. */
    reach: number;
    /** An added sky (sky.ts), which blueprint fades away. */
    sky?: SplatMesh | null;
    /** The point cloud's streaks and pulse; made with it. */
    streaks?: Streaks | null;
    pulse?: Pulse | null;
}

export interface Framing {
    /** The camera's aspect: the canvas for the preview, the output for a render. */
    aspect: number;
    /** The output's aspect, which the focal length is measured against. */
    outAspect: number;
    /** How much more than the output frame the view shows: 1 for a render, more for the preview's margin. */
    scale: number;
    /** Point size multiplier, for renders larger than the screen. */
    dotScale: number;
}

/** When in the shot this is, for what goes by the clock: the pulse's beat, the streaks' lag. */
export interface Moment {
    /** Seconds from the shot's start. */
    time: number;
    /** The pulse's beats a minute. */
    bpm: number;
    /** What's being drawn into, px, when it isn't the canvas: a render's target. */
    size?: THREE.Vector2;
}

const PHOTO = new THREE.Color(GROUND);
const BLUEPRINT = new THREE.Color(0x000000);
const rad = THREE.MathUtils.degToRad;
const deg = THREE.MathUtils.radToDeg;
const v3 = (v: [number, number, number]) => new THREE.Vector3(v[0], v[1], v[2]);

/** Apply a moment to the cameras and the look; returns the camera to render with. */
export const applyFrame = (v: Values, cams: Cameras, look: Look, framing: Framing, moment: Moment): THREE.Camera => {
    const target = v3(v.camera.target);
    const offset = v3(v.camera.position).sub(target);
    const distance = Math.max(offset.length(), 1e-6);
    const axis = offset.divideScalar(distance);
    const up = v3(v.camera.up);

    // What the output frame holds at the target, and the view around it.
    const fovOut = fovFromFocal(v.focal, framing.outAspect);
    const half = distance * Math.tan(rad(fovOut / 2)) * framing.scale;
    const b = v.blueprint;

    let camera: THREE.Camera;
    let d: number;
    if (b < 1) {
        const cam = cams.perspective;
        // On a log scale, so the narrowing reads as even.
        const fovView = 2 * deg(Math.atan(Math.tan(rad(fovOut / 2)) * framing.scale));
        cam.fov = Math.exp(THREE.MathUtils.lerp(Math.log(fovView), Math.log(NARROW_FOV), b));
        cam.aspect = framing.aspect;
        d = half / Math.tan(rad(cam.fov / 2));
        cam.position.copy(target).addScaledVector(axis, d);
        cam.up.copy(up);
        cam.lookAt(target);
        Object.assign(cam, v.depth >= 1 ? { near: 0.01, far: d + 20000 } : sectionPlanes(d, look.reach, v.cut, v.depth));
        cam.updateProjectionMatrix();
        camera = cam;
    } else {
        const cam = cams.ortho;
        d = half / Math.tan(rad(NARROW_FOV / 2));
        cam.zoom = 1;
        cam.top = half;
        cam.bottom = -half;
        cam.left = -half * framing.aspect;
        cam.right = half * framing.aspect;
        cam.position.copy(target).addScaledVector(axis, d);
        cam.up.copy(up);
        cam.lookAt(target);
        Object.assign(cam, v.depth >= 1 ? { near: 0.01, far: d + 20000 } : sectionPlanes(d, look.reach, v.cut, v.depth));
        cam.updateProjectionMatrix();
        camera = cam;
    }
    camera.updateMatrixWorld();

    // Splats to points, on a ground going from slate to black.
    look.renderer.setClearColor(PHOTO.clone().lerp(BLUEPRINT, b));
    look.spark.sortRadial = b < 1;
    if (look.points) setBlueprintAmount(look.spark, look.points, look.ink, look.meshes, b, look.px0, framing.dotScale);
    if (look.sky) look.sky.opacity = 1 - b;

    // Depth of field: focus on the point, measured along the view. Spark's
    // blur is perspective maths, so it fades out on the way to blueprint.
    const focusDistance = v3(v.focus).sub(camera.position).dot(axis.clone().negate());
    look.spark.focalDistance = Math.max(0.001, focusDistance);
    look.spark.apertureAngle = v.aperture * v.aperture * APERTURE_MAX * (1 - b) ** 3;

    // The points' effects, on the shot's own clock, so a render comes out the same every time.
    look.pulse?.show(moment.time * 1000, moment.bpm, v.pulse);
    if (v.streaks > 0 && b > 0) {
        look.streaks?.follow(camera, look.renderer, moment.time * 1000, target, look.reach, { gain: v.streaks, size: moment.size, scale: framing.dotScale });
    } else {
        look.streaks?.rest();
    }
    return camera;
};

/** Undo everything applyFrame set on the shared renderer and meshes. */
export const resetLook = (look: Look) => {
    look.renderer.setClearColor(PHOTO);
    if (look.points) setBlueprintAmount(look.spark, look.points, look.ink, look.meshes, 0, look.px0);
    look.streaks?.rest();
    look.pulse?.show(0, 60, 0);
    if (look.sky) look.sky.opacity = 1;
    look.spark.maxPixelRadius = look.px0;
    look.spark.apertureAngle = 0;
    look.spark.sortRadial = true;
};
