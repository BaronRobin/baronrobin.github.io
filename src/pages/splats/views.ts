import * as THREE from 'three';

/**
 * The blueprint's six views, and the snapping between them.
 *
 * In blueprint the camera doesn't orbit freely. It sits square on to one of
 * six axes, and a drag only leans it: the further you pull, the harder it
 * resists, up to a threshold where it gives and the view eases over to the
 * next one. Let go before then and it eases back. You feel the edge coming,
 * and the label of the view you're pulling towards lights up as you get close.
 *
 * The turntable is the one exception: it turns the view steadily about the
 * upright axis, and comes to rest square on the next view ahead.
 */

export const VIEW_NAMES = ['top', 'front', 'right', 'back', 'left', 'bottom'] as const;
export type ViewName = (typeof VIEW_NAMES)[number];

/** From the orbit point towards the camera. */
const AXES: Record<ViewName, THREE.Vector3> = {
    top: new THREE.Vector3(0, 1, 0),
    bottom: new THREE.Vector3(0, -1, 0),
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    left: new THREE.Vector3(-1, 0, 0),
};
const HORIZONTALS = [AXES.right, AXES.left, AXES.front, AXES.back];

/** How far a drag can lean the view before it gives. */
const PLAY = THREE.MathUtils.degToRad(14);
/** Px of drag for the resistance to build: the lean is PLAY · tanh(drag / RESIST). */
const RESIST = 110;
/** Px of drag at which it gives and snaps over. */
const THRESHOLD = 190;
/** Over to the next view; the section glides to that view's preset in the same time (index.tsx). */
export const SNAP_MS = 420;
/** Back square, after letting go before the edge. */
const SPRING_MS = 300;
/** The turntable's way up to speed, and to a new one, ms. */
const SPIN_EASE_MS = 450;
/** Coming to rest takes at least this long, so a fast turn runs on to a later view rather than stopping dead, ms. */
const LAND_MIN_MS = 280;
/** And a slow one doesn't crawl there: at most this for a quarter turn, ms. */
const LAND_MAX_MS = 900;
const QUARTER = Math.PI / 2;

const nearest = (dir: THREE.Vector3, among: THREE.Vector3[]) =>
    among.reduce((best, axis) => (axis.dot(dir) > best.dot(dir) ? axis : best));

/** The view whose axis is nearest a direction from the orbit point. */
export const nearestView = (dir: THREE.Vector3): ViewName =>
    VIEW_NAMES.reduce((best, name) => (AXES[name].dot(dir) > AXES[best].dot(dir) ? name : best), 'front' as ViewName);

/**
 * Up on screen. From the sides it's the sky. From above or below there is no
 * sky, so it's the level axis nearest the way up was pointing before: a plan
 * keeps the heading you came in on.
 */
const upFor = (name: ViewName, hint: THREE.Vector3) => {
    if (name !== 'top' && name !== 'bottom') return AXES.top.clone();
    const level = hint.clone().setY(0);
    return nearest(level.lengthSq() > 1e-8 ? level.normalize() : AXES.back, HORIZONTALS).clone();
};

/** How a camera at the origin sits to look at the orbit point from a view. */
export const viewPose = (name: ViewName, upHint = AXES.back) => {
    const up = upFor(name, upHint);
    const m = new THREE.Matrix4().lookAt(AXES[name], new THREE.Vector3(), up);
    return { quaternion: new THREE.Quaternion().setFromRotationMatrix(m), up };
};

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

const BACK = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

interface SnapperOptions {
    camera: THREE.Camera;
    /** The orbit point; read live, since panning moves it. */
    target: THREE.Vector3;
    dom: HTMLElement;
    view: ViewName;
    up: THREE.Vector3;
    /** While true, the page must not let OrbitControls re-aim the camera. */
    setManual: (on: boolean) => void;
    onView: (name: ViewName) => void;
    /** The view a drag is pulling towards, and how close to giving it is (0–1). */
    onTension: (towards: ViewName | null, amount: number) => void;
    /** The turntable was started, or told to stop (it may still be coming to rest). */
    onTurning?: (on: boolean) => void;
}

/** A turntable under way: how far round from the base view, how fast, and how it's coming to rest, if it is. */
interface Spin {
    turn: number;
    /** rad/s, now and wanted. */
    rate: number;
    want: number;
    /** Up on screen when it started. */
    up: THREE.Vector3;
    last: number;
    landing: { from: number; to: number; rate: number; start: number; ms: number } | null;
}

export class ViewSnapper {
    private o: SnapperOptions;
    private view: ViewName;
    private base: THREE.Quaternion;
    private drag: { id: number; x: number; y: number; done: boolean } | null = null;
    private pointers = new Set<number>();
    private frame = 0;
    /** Mid snap, spring or turntable: a new drag waits until the view is square again. */
    private busy = false;
    private spinning: Spin | null = null;
    /** A turntable asked for mid snap, rad/s: it starts once the view is square. */
    private queued = 0;

    constructor(o: SnapperOptions) {
        this.o = o;
        this.view = o.view;
        this.base = o.camera.quaternion.clone();
        o.camera.up.copy(o.up);
        o.dom.addEventListener('pointerdown', this.down);
        o.dom.addEventListener('pointermove', this.move);
        o.dom.addEventListener('pointerup', this.up);
        o.dom.addEventListener('pointercancel', this.up);
    }

    dispose() {
        cancelAnimationFrame(this.frame);
        if (this.spinning) this.o.onTurning?.(false);
        this.o.dom.removeEventListener('pointerdown', this.down);
        this.o.dom.removeEventListener('pointermove', this.move);
        this.o.dom.removeEventListener('pointerup', this.up);
        this.o.dom.removeEventListener('pointercancel', this.up);
        this.o.setManual(false);
        this.o.onTension(null, 0);
    }

    /** Snap to a view, from wherever the camera is now. */
    snapTo(name: ViewName, upHint?: THREE.Vector3) {
        // Off a turntable the base view is behind: the heading is the camera's own.
        const pose = viewPose(name, upHint ?? UP.clone().applyQuaternion(this.spinning ? this.o.camera.quaternion : this.base));
        if (this.spinning || this.queued) {
            this.spinning = null;
            this.queued = 0;
            this.o.onTurning?.(false);
        }
        this.view = name;
        this.o.onView(name);
        this.o.onTension(null, 0);
        this.animate(pose.quaternion, SNAP_MS, () => {
            this.base.copy(pose.quaternion);
            this.o.camera.up.copy(pose.up);
        });
    }

    /** Aim the camera, keeping its distance from the orbit point. */
    private pose(q: THREE.Quaternion) {
        const { camera, target } = this.o;
        const d = camera.position.distanceTo(target);
        camera.quaternion.copy(q);
        camera.position.copy(target).addScaledVector(BACK.clone().applyQuaternion(q), d);
        camera.updateMatrixWorld();
    }

    private animate(to: THREE.Quaternion, ms: number, done: () => void) {
        cancelAnimationFrame(this.frame);
        this.busy = true;
        this.o.setManual(true);
        const from = this.o.camera.quaternion.clone();
        const start = performance.now();
        const step = (now: number) => {
            const k = Math.min(1, (now - start) / ms);
            this.pose(from.clone().slerp(to, easeInOut(k)));
            if (k < 1) {
                this.frame = requestAnimationFrame(step);
            } else {
                done();
                this.busy = false;
                this.o.setManual(false);
                if (this.queued) this.spin(this.queued * 30 / Math.PI);
            }
        };
        this.frame = requestAnimationFrame(step);
    }

    /**
     * The turntable: turn about the upright axis through the orbit point, at
     * `rpm` turns a minute. From above or below that spins the plan in place.
     * 0 brings it to rest, square on the next view ahead.
     *
     * The camera stays where OrbitControls would put it, so the page keeps
     * updating them and zoom and pan work throughout.
     */
    spin(rpm: number) {
        const want = rpm * Math.PI / 30;
        const spin = this.spinning;
        if (!spin) {
            if (!want) {
                if (this.queued) this.o.onTurning?.(false);
                this.queued = 0;
                return;
            }
            this.o.onTurning?.(true);
            // Mid snap or spring: wait for the view to be square.
            if (this.busy || this.drag) { this.queued = want; return; }
            this.queued = 0;
            this.busy = true;
            this.spinning = { turn: 0, rate: 0, want, up: this.o.camera.up.clone(), last: performance.now(), landing: null };
            this.frame = requestAnimationFrame(this.turn);
            return;
        }
        if (want) {
            // Faster, slower, or back up to speed from a landing.
            if (spin.landing) this.o.onTurning?.(true);
            spin.landing = null;
            spin.want = want;
            return;
        }
        if (spin.landing) return;
        this.o.onTurning?.(false);
        // Far enough ahead to slow down evenly; a slow turn gets there in good time instead.
        const least = spin.turn + spin.rate * LAND_MIN_MS / 2000;
        const to = Math.max(1, Math.ceil(least / QUARTER - 1e-6)) * QUARTER;
        const even = spin.rate > 1e-6 ? 2000 * (to - spin.turn) / spin.rate : Infinity;
        const ms = Math.min(even, LAND_MAX_MS * Math.max(0.5, (to - spin.turn) / QUARTER));
        spin.landing = { from: spin.turn, to, rate: spin.rate, start: spin.last, ms: Math.max(ms, 1) };
    }

    private turn = (now: number) => {
        const spin = this.spinning;
        if (!spin) return;
        const dt = Math.min(now - spin.last, 100) / 1000;
        spin.last = now;
        const landing = spin.landing;
        let done = false;
        if (landing) {
            // A cubic from the speed it had to a standstill: it never runs past.
            const k = Math.min(1, (now - landing.start) / landing.ms);
            const lead = landing.rate * landing.ms / 1000;
            const turn = landing.from + lead * (k * k * k - 2 * k * k + k) + (landing.to - landing.from) * (3 * k * k - 2 * k * k * k);
            if (dt > 0) spin.rate = (turn - spin.turn) / dt;
            spin.turn = turn;
            done = k >= 1;
        } else {
            spin.rate += (spin.want - spin.rate) * (1 - Math.exp(-dt * 1000 / SPIN_EASE_MS));
            spin.turn += spin.rate * dt;
        }
        const round = new THREE.Quaternion().setFromAxisAngle(UP, spin.turn);
        const q = round.clone().multiply(this.base);
        const up = spin.up.clone().applyQuaternion(round);
        if (done) {
            // Square on a view again, to the last digit.
            const name = nearestView(BACK.clone().applyQuaternion(q));
            const pose = viewPose(name, up);
            this.o.camera.up.copy(pose.up);
            this.pose(pose.quaternion);
            this.base.copy(pose.quaternion);
            this.view = name;
            this.spinning = null;
            this.busy = false;
            this.o.onView(name);
            return;
        }
        this.o.camera.up.copy(up);
        this.pose(q);
        this.frame = requestAnimationFrame(this.turn);
    };

    /** The base view turned by `angle` about one of its own axes. */
    private turned(axis: THREE.Vector3, angle: number) {
        return this.base.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
    }

    /** Which view a full quarter turn in a drag's direction lands on. */
    private neighbour(dx: number, dy: number) {
        const q = Math.abs(dx) >= Math.abs(dy) ? this.turned(UP, -Math.sign(dx) * Math.PI / 2) : this.turned(RIGHT, -Math.sign(dy) * Math.PI / 2);
        return { name: nearestView(BACK.clone().applyQuaternion(q)), upHint: UP.clone().applyQuaternion(q) };
    }

    private down = (e: PointerEvent) => {
        this.pointers.add(e.pointerId);
        // A second finger is a pinch or a pan, which OrbitControls handles.
        if (this.pointers.size > 1) { this.release(); return; }
        if (e.button !== 0 || this.busy) return;
        this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
        this.o.setManual(true);
    };

    private move = (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || drag.done || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        const pull = Math.max(Math.abs(dx), Math.abs(dy));
        const next = this.neighbour(dx, dy);
        if (pull >= THRESHOLD) {
            drag.done = true;
            this.snapTo(next.name, next.upHint);
            return;
        }
        // Lean, with the resistance building towards the edge.
        const yaw = -PLAY * Math.tanh(dx / RESIST);
        const pitch = -PLAY * Math.tanh(dy / RESIST);
        this.pose(this.turned(UP, yaw).multiply(new THREE.Quaternion().setFromAxisAngle(RIGHT, pitch)));
        this.o.onTension(next.name !== this.view ? next.name : null, pull / THRESHOLD);
    };

    private up = (e: PointerEvent) => {
        this.pointers.delete(e.pointerId);
        if (this.drag?.id === e.pointerId) this.release();
    };

    /** Let go before the edge: spring back square. */
    private release() {
        const drag = this.drag;
        this.drag = null;
        if (!drag || drag.done) return;
        this.o.onTension(null, 0);
        this.animate(this.base.clone(), SPRING_MS, () => {});
    }
}
