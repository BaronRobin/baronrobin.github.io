import * as THREE from 'three';
import { dyno, type SparkRenderer, type SplatMesh } from '@sparkjsdev/spark';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { nearestView, viewPose, type ViewName } from './views';

/**
 * Blueprint: the scan as a technical drawing. The splats give way to the
 * points they were trained from, one white pixel per splat centre on black,
 * seen through an orthographic camera whose near and far planes cut a section
 * you can move through the scan.
 *
 * Getting there is a dolly zoom: the field of view narrows while the camera
 * backs off to keep the framing, until perspective is all but gone, and only
 * then does the real orthographic camera take over, so the switch can't be
 * seen. Meanwhile the splats whiten, shrink and fade while the points come up,
 * so the scan condenses into its point cloud. Leaving runs it backwards.
 */

/** Degrees. Narrow enough that handing over to orthographic doesn't show. */
export const NARROW_FOV = 1.5;
/** What the splats shrink to as they fade, px. */
const POINT_PX = 1.4;
/** Point size in px, and how much each adds: additive, so density reads as brightness. */
export const DOT_PX = 1.25;
const DOT_OPACITY = 0.2;
/** Splats fainter than this are haze, not surface, and get no point. */
const MIN_OPACITY = 0.2;
/** The points stop this many core radii out: past it is sky. */
export const SKY_CUT = 2.2;
/** Page and canvas colour: slate-950 as photographed; a blueprint is black. */
export const GROUND = 0x020617;
/** In the light theme both are paper, slate-50, and the blueprint is ink on it. */
export const PAPER = 0xf9fafb;

const rad = THREE.MathUtils.degToRad;
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** 0 is the scan as photographed, 1 is splats gone to white and faded out. One for every mesh. */
export const createInk = () => dyno.dynoFloat(0);
/** What the ink is: 1 is white, for black ground; 0 is black, for paper. */
export const createTone = () => dyno.dynoFloat(1);

/** Give a mesh the ink. A world modifier, so it sits alongside the reveal's. */
export const addInk = (mesh: SplatMesh, ink: dyno.DynoFloat<string>, tone = createTone()) => {
    mesh.worldModifier = dyno.dynoBlock({ gsplat: dyno.Gsplat }, { gsplat: dyno.Gsplat }, ({ gsplat }) => {
        const toInk = new dyno.Dyno({
            inTypes: { gsplat: dyno.Gsplat, ink: 'float', tone: 'float' },
            outTypes: { gsplat: dyno.Gsplat },
            statements: ({ inputs: i, outputs: o }) => dyno.unindentLines(`
                ${o.gsplat} = ${i.gsplat};
                ${o.gsplat}.rgba.rgb = mix(${i.gsplat}.rgba.rgb, vec3(${i.tone}), ${i.ink});
                ${o.gsplat}.rgba.a = ${i.gsplat}.rgba.a * (1.0 - ${i.ink});
            `),
        });
        return { gsplat: toInk.apply({ gsplat, ink, tone }).gsplat };
    });
    mesh.updateGenerator();
};

/**
 * The point cloud under a scan: one point per splat centre, placed like the
 * mesh. Only within `maxDistance` of `centre` (world space): the sky is a
 * shell of splats far out, and a drawing has no sky.
 */
export const buildPoints = (mesh: SplatMesh, centre: THREE.Vector3, maxDistance: number) => {
    const n = mesh.packedSplats?.numSplats ?? 0;
    const positions = new Float32Array(n * 3);
    const world = new THREE.Vector3();
    const max2 = maxDistance * maxDistance;
    let count = 0;
    mesh.updateMatrixWorld(true);
    mesh.forEachSplat((_, center, _scales, _quaternion, opacity) => {
        if (opacity < MIN_OPACITY) return;
        if (world.copy(center).applyMatrix4(mesh.matrixWorld).distanceToSquared(centre) > max2) return;
        positions[count * 3] = center.x;
        positions[count * 3 + 1] = center.y;
        positions[count * 3 + 2] = center.z;
        count++;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, count * 3), 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: DOT_PX,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // The same picture on black, and what lets the points be ink on paper (inkPoints).
        premultipliedAlpha: true,
    });
    const points = new THREE.Points(geometry, material);
    points.position.copy(mesh.position);
    points.quaternion.copy(mesh.quaternion);
    points.scale.copy(mesh.scale);
    points.visible = false;
    return points;
};

/**
 * Light on black, or ink on paper: on paper each point takes a little light
 * away instead of adding some, so density reads as darkness.
 */
export const inkPoints = (points: THREE.Points, paper: boolean) => {
    (points.material as THREE.PointsMaterial).blending = paper ? THREE.SubtractiveBlending : THREE.AdditiveBlending;
};

export const disposePoints = (points: THREE.Points) => {
    points.removeFromParent();
    points.geometry.dispose();
    (points.material as THREE.Material).dispose();
};

/** 0 to 1: splats fade to white and out, points come up. */
export const crossfade = (points: THREE.Points, ink: dyno.DynoFloat<string>, meshes: Iterable<SplatMesh>, k: number) => {
    ink.value = k;
    for (const mesh of meshes) {
        mesh.visible = k < 1;
        mesh.updateVersion();
    }
    points.visible = k > 0;
    (points.material as THREE.PointsMaterial).opacity = DOT_OPACITY * k;
};

/**
 * Splat size on the way to blueprint, 0 to 1: from the renderer's own limit
 * down to points. Exponential, so the shrink looks even rather than all at
 * the end.
 */
export const pointPx = (px0: number, k: number) => px0 * Math.pow(POINT_PX / px0, k);

/**
 * Everything blueprint changes about the splats, at one amount: the editor
 * sets it per frame. `dotScale` sizes the points for a render larger than
 * the screen, since they're measured in pixels.
 */
export const setBlueprintAmount = (
    spark: SparkRenderer,
    points: THREE.Points,
    ink: dyno.DynoFloat<string>,
    meshes: Iterable<SplatMesh>,
    k: number,
    px0: number,
    dotScale = 1,
) => {
    crossfade(points, ink, meshes, k);
    spark.maxPixelRadius = pointPx(px0, k) * Math.pow(dotScale, k);
    (points.material as THREE.PointsMaterial).size = DOT_PX * dotScale;
};

export interface Rig {
    perspective: THREE.PerspectiveCamera;
    ortho: THREE.OrthographicCamera;
    controls: OrbitControls;
    spark: SparkRenderer;
    /** The camera the loop renders with. */
    active: { current: THREE.Camera };
    /** While true the camera is being aimed by hand, and the loop leaves OrbitControls out. */
    manual: boolean;
}

/** What entering saved, for leaving: where the camera was and how it drew. */
export interface Before {
    fov0: number;
    px0: number;
    q0: THREE.Quaternion;
    view: ViewName;
    up: THREE.Vector3;
}

const tween = (ms: number, step: (k: number) => void) => new Promise<void>((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
        const k = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
        step(ease(k));
        if (k < 1) requestAnimationFrame(frame);
        else resolve();
    };
    requestAnimationFrame(frame);
});

const BACK = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);

/** Half the height of what's in view at the orbit point. */
const halfHeight = (cam: THREE.PerspectiveCamera, target: THREE.Vector3) =>
    cam.position.distanceTo(target) * Math.tan(rad(cam.fov / 2));

/** Back the perspective camera off along its own axis to where `half` fills the view. */
const place = (cam: THREE.PerspectiveCamera, target: THREE.Vector3, half: number) => {
    cam.position.copy(target).addScaledVector(BACK.clone().applyQuaternion(cam.quaternion), half / Math.tan(rad(cam.fov / 2)));
    cam.updateProjectionMatrix();
};

/**
 * Into blueprint. The camera swings square on to the nearest of the six
 * views while it flattens; `fade` runs alongside with the eased progress.
 */
export const enterBlueprint = async (rig: Rig, ms: number, fade: (k: number) => void): Promise<Before> => {
    const { perspective: cam, ortho, controls, spark } = rig;
    controls.enabled = false;
    controls.autoRotate = false;
    rig.manual = true;
    const target = controls.target.clone();
    const half = halfHeight(cam, target);
    const fov0 = cam.fov;
    const px0 = spark.maxPixelRadius;
    const q0 = cam.quaternion.clone();
    const view = nearestView(cam.position.clone().sub(target).normalize());
    const pose = viewPose(view, UP.clone().applyQuaternion(q0));

    await tween(ms, (k) => {
        cam.fov = THREE.MathUtils.lerp(fov0, NARROW_FOV, k);
        cam.quaternion.copy(q0).slerp(pose.quaternion, k);
        place(cam, target, half);
        spark.maxPixelRadius = pointPx(px0, k);
        fade(k);
    });

    ortho.quaternion.copy(pose.quaternion);
    ortho.position.copy(cam.position);
    ortho.up.copy(pose.up);
    ortho.zoom = 1;
    ortho.top = half;
    ortho.bottom = -half;
    ortho.left = -half * cam.aspect;
    ortho.right = half * cam.aspect;
    ortho.updateProjectionMatrix();
    ortho.updateMatrixWorld();
    spark.sortRadial = false; // depth along the view axis is what orthographic means
    controls.object = ortho;
    controls.enableRotate = false; // turning is the snapper's job here
    rig.active.current = ortho;
    rig.manual = false;
    controls.update();
    controls.enabled = true;
    return { fov0, px0, q0, view, up: pose.up };
};

/** Out of blueprint: back to where the camera was before, at the current zoom. */
export const leaveBlueprint = async (rig: Rig, ms: number, before: Before, fade: (k: number) => void) => {
    const { perspective: cam, ortho, controls, spark } = rig;
    controls.enabled = false;
    rig.manual = true;
    const target = controls.target.clone();
    const half = ortho.top / ortho.zoom;
    const from = ortho.quaternion.clone();

    cam.fov = NARROW_FOV;
    cam.quaternion.copy(from);
    place(cam, target, half);
    spark.sortRadial = true;
    controls.object = cam;
    controls.enableRotate = true;
    rig.active.current = cam;

    await tween(ms, (k) => {
        cam.fov = THREE.MathUtils.lerp(NARROW_FOV, before.fov0, k);
        cam.quaternion.copy(from).slerp(before.q0, k);
        place(cam, target, half);
        spark.maxPixelRadius = pointPx(before.px0, 1 - k);
        fade(k);
    });
    cam.up.set(0, 1, 0);
    rig.manual = false;
    controls.update();
    controls.enabled = true;
};

/**
 * The section: a slab of the scan between a camera's near and far planes, for
 * a camera `distance` from the orbit point. `cut` moves it along the view axis
 * and `depth` is its thickness, both as fractions of the scan's reach; depth 1
 * is no cut at all.
 */
export const sectionPlanes = (distance: number, reach: number, cut: number, depth: number) => {
    if (depth >= 1) return { near: 0.01, far: distance + reach * 4 };
    const thickness = Math.max(reach * 0.005, depth * reach * 2);
    const centre = distance + cut * reach;
    const near = Math.max(0.01, centre - thickness / 2);
    // A slab entirely behind the camera shows nothing, rather than crossing its planes.
    return { near, far: Math.max(centre + thickness / 2, near + 1e-3) };
};

/** The live blueprint's section, on its orthographic camera. */
export const setSection = (rig: Rig, target: THREE.Vector3, reach: number, cut: number, depth: number) => {
    const { ortho } = rig;
    Object.assign(ortho, sectionPlanes(ortho.position.distanceTo(target), reach, cut, depth));
    ortho.updateProjectionMatrix();
};
