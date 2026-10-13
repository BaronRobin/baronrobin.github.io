import * as THREE from 'three';

/**
 * Pulse: a heartbeat through the blueprint's points, beaten by the viewer.
 * Every tap sends a soft shell of light out from the scan's middle, with a
 * fainter one close behind it, the way a heart goes lub-dub.
 *
 * Then it's call and response. Tap a rhythm and stop, and the scan answers
 * with the same rhythm, once. Tap a steady beat, four taps or more, and it
 * takes the beat up and keeps it, in step with the hand, until it's cleared.
 * (A shot in the creation tool has no hands: there it just beats, see `show`.)
 *
 * It's the points' own material, taught one more thing: how far each point is
 * from the middle, and so how much of a passing shell it catches. Caught
 * points brighten and swell a little. Everything else dims while there's a
 * pulse about, or the dense parts, already white, would have nowhere to go.
 */

/** The beats a minute it will keep. */
export const BPM = { min: 30, max: 240 };

/** Shells in flight at once: a fast beat, or fast hands. */
const SHELLS = 8;
/** A shell's way out, ms. */
const TRAVEL_MS = 1700;
/** A shell's thickness, and how far behind the second one runs, as shares of the way out. */
const WIDTH = 0.07;
const SECOND = 0.17;
/** The cloud between beats, and what a shell adds, as shares of its usual brightness. */
const DIM = 0.4;
const GAIN = 2.6;
/** How much a caught point grows. */
const SWELL = 0.9;
/** The dimming comes and goes in this long, and holds this long after the last shell has gone, ms. */
const FADE_MS = 350;
const LINGER_MS = 500;
/** Taps further apart than this aren't one rhythm, ms. */
const PHRASE_MS = 2400;
/** A call is over when it's been quiet for this many of its longest gaps, within these bounds, ms. */
const QUIET = 1.7;
const QUIET_MS = { min: 700, max: PHRASE_MS };
/** A steady beat: at least this many taps, none of the last gaps further than this share from their mean. */
const STEADY_TAPS = 4;
const STEADY = 0.16;
/** The gaps a tempo is read from: the latest few, so it follows a hand that speeds up. */
const READ_GAPS = 5;

const gapsOf = (times: number[]) => times.slice(1).map((time, i) => time - times[i]);

export class Pulse {
    /** Told when it takes up a steady beat, and at how many a minute. */
    onTempo: ((bpm: number) => void) | null = null;
    private tempo: number | null = null;
    private uniforms = {
        pulseOrigin: { value: new THREE.Vector3() },
        /** Each shell's radius and strength. */
        pulseShells: { value: Array.from({ length: SHELLS }, () => new THREE.Vector2(0, 0)) },
        pulseWidth: { value: 1 },
        pulseSecond: { value: 1 },
        /** 0 is the points as they were, 1 dimmed for the shells to show. */
        pulseAmount: { value: 0 },
    };
    /** How far a shell goes. */
    private out: number;
    /** When each shell set off, ms; -Infinity for none. */
    private born = new Array<number>(SHELLS).fill(-Infinity);
    private shell = 0;
    private fired = -Infinity;
    /** The viewer's taps in the rhythm under way, and the answer still to be given. */
    private taps: number[] = [];
    private answer: number[] = [];
    /** The steady beat's next. */
    private next = 0;
    private time = 0;

    /** `origin` is where the shells start, and `out` how far they travel, both in world space. */
    constructor(points: THREE.Points, origin: THREE.Vector3, out: number) {
        this.out = out;
        this.uniforms.pulseOrigin.value.copy(origin);
        this.uniforms.pulseWidth.value = out * WIDTH;
        this.uniforms.pulseSecond.value = out * SECOND;
        const material = points.material as THREE.PointsMaterial;
        material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.uniforms);
            shader.vertexShader = shader.vertexShader
                .replace('void main() {', /* glsl */ `
                    uniform vec3 pulseOrigin;
                    uniform vec2 pulseShells[${SHELLS}];
                    uniform float pulseWidth;
                    uniform float pulseSecond;
                    uniform float pulseAmount;
                    varying float pulseLight;
                    void main() {`)
                .replace('#include <fog_vertex>', /* glsl */ `
                    #include <fog_vertex>
                    float pulseFrom = distance((modelMatrix * vec4(transformed, 1.0)).xyz, pulseOrigin);
                    float pulseCaught = 0.0;
                    for (int i = 0; i < ${SHELLS}; i++) {
                        float first = (pulseFrom - pulseShells[i].x) / pulseWidth;
                        float second = (pulseFrom - pulseShells[i].x + pulseSecond) / pulseWidth;
                        pulseCaught += pulseShells[i].y * (exp(-first * first) + 0.45 * exp(-second * second));
                    }
                    pulseCaught = min(pulseCaught, 1.5);
                    pulseLight = mix(1.0, ${DIM.toFixed(2)} + ${GAIN.toFixed(2)} * pulseCaught, pulseAmount);
                    gl_PointSize *= 1.0 + ${SWELL.toFixed(2)} * pulseCaught * pulseAmount;`);
            shader.fragmentShader = shader.fragmentShader
                .replace('void main() {', /* glsl */ `
                    varying float pulseLight;
                    void main() {`)
                .replace('#include <color_fragment>', /* glsl */ `
                    #include <color_fragment>
                    diffuseColor.a *= pulseLight;`);
        };
        material.needsUpdate = true;
    }

    /** The steady beat it's keeping, a minute; null while it isn't keeping one. */
    get bpm() {
        return this.tempo;
    }

    /** Set the beat by hand, or drop it with null. */
    set bpm(bpm: number | null) {
        this.tempo = bpm === null ? null : THREE.MathUtils.clamp(Math.round(bpm), BPM.min, BPM.max);
    }

    /** A tap from the viewer, at `time` on the render loop's clock: a beat now, and one more of a rhythm. */
    tap(time: number) {
        if (this.taps.length && time - this.taps[this.taps.length - 1] > PHRASE_MS) this.taps = [];
        this.taps.push(time);
        // Speaking over the answer ends it.
        this.answer = [];
        this.fire(time);
        const gaps = gapsOf(this.taps).slice(-READ_GAPS);
        const mean = gaps.reduce((sum, gap) => sum + gap, 0) / (gaps.length || 1);
        if (this.taps.length >= STEADY_TAPS && gaps.every((gap) => Math.abs(gap - mean) <= mean * STEADY)) {
            this.bpm = 60000 / mean;
            if (this.tempo !== null) this.onTempo?.(this.tempo);
        }
        // In step with the hand, for as long as it goes on tapping.
        if (this.tempo !== null) this.next = time + 60000 / this.tempo;
    }

    /** No beat, no rhythm, no answer: what's in flight runs out and the points come back up. */
    clear() {
        this.tempo = null;
        this.taps = [];
        this.answer = [];
    }

    /** Once a frame: the steady beat or the answer, when they're due, and the shells in flight. */
    update(time: number) {
        const dt = Math.min(time - this.time, 100);
        this.time = time;
        const last = this.taps[this.taps.length - 1];
        if (this.tempo !== null) {
            const beat = 60000 / this.tempo;
            // Off the beat (a tab coming back): start again from now.
            if (time >= this.next + beat) this.next = time;
            if (time >= this.next) {
                this.fire(this.next);
                this.next += beat;
            }
        } else if (this.taps.length > 1) {
            // The call is over once it's been quiet a while: give it back, gap for gap.
            const gaps = gapsOf(this.taps);
            if (time - last >= THREE.MathUtils.clamp(Math.max(...gaps) * QUIET, QUIET_MS.min, QUIET_MS.max)) {
                let at = time;
                this.answer = [at, ...gaps.map((gap) => (at += gap))];
                this.taps = [];
            }
        } else if (this.taps.length && time - last > PHRASE_MS) {
            this.taps = [];
        }
        while (this.answer.length && time >= this.answer[0]) this.fire(this.answer.shift() as number);

        const about = this.tempo !== null || this.answer.length > 0 || this.taps.length > 0 || time - this.fired < TRAVEL_MS + LINGER_MS;
        const amount = this.uniforms.pulseAmount;
        amount.value = THREE.MathUtils.clamp(amount.value + (about ? dt : -dt) / FADE_MS, 0, 1);
        for (let i = 0; i < SHELLS; i++) this.place(i, time - this.born[i]);
    }

    /**
     * For a shot: the pulse as it stands `time` ms into a steady beat that began
     * at zero, `amount` (0 to 1) of the way on. Nothing is remembered from one
     * call to the next, so any moment can be asked for in any order, and a
     * render repeats.
     */
    show(time: number, bpm: number, amount: number) {
        this.uniforms.pulseAmount.value = THREE.MathUtils.clamp(amount, 0, 1);
        const beat = 60000 / THREE.MathUtils.clamp(bpm, BPM.min, BPM.max);
        const latest = Math.floor(time / beat);
        // The latest beat and the ones before it, as far back as there are shells for.
        for (let i = 0; i < SHELLS; i++) this.place(i, latest - i < 0 ? -1 : time - (latest - i) * beat);
    }

    /** Put a shell where it is `age` ms after setting off; before that, or once it's out, nowhere. */
    private place(i: number, age: number) {
        const shell = this.uniforms.pulseShells.value[i];
        const k = age / TRAVEL_MS;
        if (!(k >= 0 && k < 1)) {
            shell.set(0, 0);
            return;
        }
        // Out fast and slowing; up from nothing at the middle, and fading as it thins out.
        shell.set(this.out * (1 - (1 - k) * (1 - k)), Math.min(1, k * 12) * (1 - k) ** 1.5);
    }

    private fire(time: number) {
        this.born[this.shell] = time;
        this.shell = (this.shell + 1) % SHELLS;
        this.fired = time;
    }
}
