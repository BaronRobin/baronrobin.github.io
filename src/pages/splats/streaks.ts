import * as THREE from 'three';

/**
 * Streaks: the blueprint's points smeared by the camera's own speed, like the
 * smear frames of drawn animation. Turn fast enough and every point drags a
 * line behind it across the black, from where it just was to where it is.
 *
 * A second, lagging camera does it: a projection that follows the real one a
 * few frames late. Each point is drawn once more as a line from its place in
 * the real view back to its place in the late one, bright at the head and gone
 * at the tail. At rest the two agree, the lines have no length, and nothing is
 * drawn. The lag only ever closes the gap, so the streaks come and go eased,
 * and by the clock rather than by the frame.
 */

/** How far behind the tail runs, ms: streak length is speed times this. */
const LAG_MS = 45;
/** One point in this many streaks: all of them fill a wall to white, and cost a phone its frame rate. */
const EVERY = 4;
/** Shorter than this a streak hides under its own point, px. */
const MIN_PX = 1.5;
/** No streak is longer than this share of the view's height. */
const MAX_LENGTH = 0.3;
/** A streak this long is as bright as its point; longer ones thin out, px. */
const FULL_PX = 24;
/** How fast they thin: 1 would keep a point's light exactly, 0 never dims. */
const THIN = 0.5;
/** Tails closer than this have caught up, px. */
const REST_PX = 0.25;
/** A frame longer than this is a tab coming back, not motion, ms. */
const MAX_FRAME_MS = 120;

const vertexShader = /* glsl */ `
attribute vec3 centre;
uniform mat4 ghost;
uniform vec2 resolution;
uniform float opacity;
uniform float scale;
varying float strength;
varying float along;

void main() {
    vec4 world = modelMatrix * vec4(centre, 1.0);
    vec4 head = projectionMatrix * viewMatrix * world;
    vec4 was = ghost * world;
    vec2 trail = was.xy / was.w - head.xy / head.w;
    float px = length(trail * resolution) * 0.5;
    float most = resolution.y * ${MAX_LENGTH.toFixed(2)};
    if (px > most) {
        trail *= most / px;
        px = most;
    }
    // The tail at the head's depth, so the section cuts a streak whole.
    gl_Position = vec4(head.xy + trail * position.x * head.w, head.z, head.w);
    along = position.x;
    // Lengths as the screen would have them, so a larger render thins and hides its streaks the same.
    float seen = px / scale;
    strength = opacity * smoothstep(${MIN_PX.toFixed(1)}, ${(MIN_PX * 3).toFixed(1)}, seen)
        * pow(min(1.0, ${FULL_PX.toFixed(1)} / seen), ${THIN.toFixed(2)});
    if (seen < ${MIN_PX.toFixed(1)}) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
varying float strength;
varying float along;

void main() {
    // Bright at the head, gone well before the tail's end.
    float alpha = strength * (1.0 - along) * (1.0 - along);
    gl_FragColor = vec4(vec3(alpha), alpha);
}`;

/** The streaks of one point cloud: its child, so it's placed and hidden with it. */
export class Streaks {
    private points: THREE.Points;
    private lines: THREE.LineSegments;
    private material: THREE.ShaderMaterial;
    private ghost = new THREE.Matrix4();
    private now = new THREE.Matrix4();
    /** The camera the ghost is following: a different one starts it afresh. */
    private camera: THREE.Camera | null = null;
    private time = 0;
    private size = new THREE.Vector2();
    private a = new THREE.Vector3();
    private b = new THREE.Vector3();

    constructor(points: THREE.Points) {
        this.points = points;
        // One two-ended line, drawn once for every few points: the points' own array, read with a stride.
        const geometry = new THREE.InstancedBufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0]), 3));
        const centres = points.geometry.getAttribute('position');
        const strided = new THREE.InstancedInterleavedBuffer(centres.array, 3 * EVERY);
        geometry.setAttribute('centre', new THREE.InterleavedBufferAttribute(strided, 3, 0));
        geometry.instanceCount = Math.floor(centres.count / EVERY);
        this.material = new THREE.ShaderMaterial({
            uniforms: { ghost: { value: this.ghost }, resolution: { value: this.size }, opacity: { value: 0 }, scale: { value: 1 } },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            premultipliedAlpha: true,
        });
        this.lines = new THREE.LineSegments(geometry, this.material);
        // Its bounds are the one line's, not the cloud's.
        this.lines.frustumCulled = false;
        this.lines.visible = false;
        points.add(this.lines);
    }

    /**
     * Once a frame, before rendering with `camera`: let the ghost catch up some
     * and show the streaks if it's still behind. `origin` and `reach` say where
     * the scan is, to tell whether any of it is still moving on screen.
     *
     * `time` is whatever clock the picture runs on: the page's, or a shot's, so
     * a render comes out the same every time. A shot also says how strong the
     * streaks are (`gain`), and a render what it's drawing into (`size`, px)
     * and how much larger than the screen that is (`scale`): lines stay one
     * pixel wide however large the picture, so they're made up in brightness.
     */
    follow(
        camera: THREE.Camera, renderer: THREE.WebGLRenderer, time: number, origin: THREE.Vector3, reach: number,
        { gain = 1, size, scale = 1 }: { gain?: number; size?: THREE.Vector2; scale?: number } = {},
    ) {
        camera.updateMatrixWorld();
        this.now.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        const dt = time - this.time;
        this.time = time;
        // A clock that jumps, or runs back (a scrub, a loop coming round), isn't motion.
        if (camera !== this.camera || dt <= 0 || dt > MAX_FRAME_MS || !this.points.visible) {
            this.camera = camera;
            this.rest();
            return;
        }
        const k = 1 - Math.exp(-dt / LAG_MS);
        const g = this.ghost.elements, n = this.now.elements;
        for (let i = 0; i < 16; i++) g[i] += (n[i] - g[i]) * k;

        if (size) this.size.copy(size);
        else renderer.getDrawingBufferSize(this.size);
        if (this.behind(origin, reach) < REST_PX * scale) {
            this.rest();
            return;
        }
        // Drawn like the points: as bright, and light on black or ink on paper as they are.
        const like = this.points.material as THREE.PointsMaterial;
        this.material.uniforms.opacity.value = Math.min(1, like.opacity * gain * scale);
        this.material.uniforms.scale.value = scale;
        this.material.blending = like.blending;
        this.lines.visible = true;
    }

    /** No streaks: the ghost is where the camera is. */
    rest() {
        this.ghost.copy(this.now);
        this.lines.visible = false;
    }

    /** How far the ghost's picture of the scan is from the camera's, px: the most over its middle and three points a reach out. */
    private behind(origin: THREE.Vector3, reach: number) {
        let most = 0;
        for (let i = 0; i < 4; i++) {
            this.a.copy(origin);
            if (i > 0) this.a.setComponent(i - 1, this.a.getComponent(i - 1) + reach);
            this.b.copy(this.a).applyMatrix4(this.ghost);
            this.a.applyMatrix4(this.now);
            most = Math.max(most, Math.hypot((this.a.x - this.b.x) * this.size.x, (this.a.y - this.b.y) * this.size.y) / 2);
        }
        return most;
    }

    dispose() {
        this.lines.removeFromParent();
        this.lines.geometry.dispose();
        this.material.dispose();
    }
}
