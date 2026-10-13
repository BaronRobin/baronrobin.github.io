import * as THREE from 'three';
import { dyno, type SplatMesh } from '@sparkjsdev/spark';

/**
 * The reveal, after Luma's: a front travels out from the middle of a scan.
 * Ahead of it there is nothing; where it arrives, splats appear as points;
 * behind it they grow to full size over a band. It runs on the GPU as a
 * modifier on the splats, and comes off again once the scan is whole.
 *
 * 'out' is the same front read the other way, for the preview that the full
 * scan replaces: it fades wherever the full one has grown in, so the swap
 * happens under the wave instead of as a jump.
 */
export type RevealMode = 'in' | 'out';

interface RevealOptions {
    mode: RevealMode;
    /** Where the front starts, in world space. */
    origin: THREE.Vector3;
    /** Width of the growing band, world units. */
    band: number;
    /** Size of a splat just reached, world units: a point, not yet a splat. */
    dot: number;
    /** Share one front between meshes, so a swap stays in step. */
    front?: dyno.DynoFloat<string>;
}

const GLSL: Record<RevealMode, string> = {
    // t: 0 where the front is, 1 a band behind it.
    in: `
        float t = clamp(behind / band, 0.0, 1.0);
        gs.scales = mix(min(gs.scales, vec3(dotSize)), gs.scales, smoothstep(0.25, 1.0, t));
        gs.rgba.a *= behind < 0.0 ? 0.0 : smoothstep(0.0, 0.25, t);
    `,
    out: `
        float t = clamp(behind / band, 0.0, 1.0);
        gs.rgba.a *= 1.0 - smoothstep(0.6, 1.0, t);
    `,
};

/** Attach a reveal to a loaded mesh. Returns the front, which starts at 0. */
export const addReveal = (mesh: SplatMesh, { mode, origin, band, dot, front = dyno.dynoFloat(0) }: RevealOptions) => {
    // The modifier sees splats in the mesh's own space.
    mesh.updateMatrixWorld(true);
    const local = mesh.worldToLocal(origin.clone());
    const inputs = { front, origin: dyno.dynoVec3(local), band: dyno.dynoFloat(band), dot: dyno.dynoFloat(dot) };

    mesh.objectModifier = dyno.dynoBlock({ gsplat: dyno.Gsplat }, { gsplat: dyno.Gsplat }, ({ gsplat }) => {
        const wave = new dyno.Dyno({
            inTypes: { gsplat: dyno.Gsplat, front: 'float', origin: 'vec3', band: 'float', dot: 'float' },
            outTypes: { gsplat: dyno.Gsplat },
            statements: ({ inputs: i, outputs: o }) => dyno.unindentLines(`
                ${o.gsplat} = ${i.gsplat};
                {
                    float band = ${i.band};
                    float dotSize = ${i.dot};
                    float behind = ${i.front} - distance(${i.gsplat}.center, ${i.origin});
                    ${GLSL[mode].replace(/gs\./g, `${o.gsplat}.`)}
                }
            `),
        });
        return { gsplat: wave.apply({ gsplat, ...inputs }).gsplat };
    });
    mesh.updateGenerator();
    return front;
};

/** Take the reveal off once it's done; the modifier costs a pass per frame. */
export const removeReveal = (mesh: SplatMesh) => {
    mesh.objectModifier = undefined;
    mesh.updateGenerator();
};

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

/**
 * Run a front out to `reach` over `ms`. The meshes are told to regenerate each
 * frame, since a uniform change alone doesn't redo the modifier. Resolves when
 * done; the returned cancel stops it where it is.
 */
export const playFront = (front: dyno.DynoFloat<string>, meshes: SplatMesh[], reach: number, ms: number) => {
    let frame = 0;
    let cancel = () => {};
    const done = new Promise<void>((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
            const k = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
            front.value = easeOut(k) * reach;
            for (const mesh of meshes) mesh.updateVersion();
            if (k < 1) frame = requestAnimationFrame(step);
            else resolve();
        };
        frame = requestAnimationFrame(step);
        cancel = () => { cancelAnimationFrame(frame); resolve(); };
    });
    return { done, cancel: () => cancel() };
};
