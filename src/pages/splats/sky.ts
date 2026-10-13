import * as THREE from 'three';
import type { SplatMesh } from '@sparkjsdev/spark';

/**
 * A sky for scans that came without one: the sphere Luma puts around its
 * scans, taken from a Luma export of the same place (`<scan>.sky.spz`) and
 * set around this scan as its own mesh.
 *
 * Luma's sphere sits on its export's origin, so here it's centred on the
 * scan and sized to it; the scan's own scale doesn't matter. It's turned
 * upright as Luma scans are, then by `turn` about the vertical, to put the
 * sun where the scan's light comes from; `lift` raises or lowers the horizon.
 */

export interface SkyLayer {
    /** Degrees about the vertical. */
    turn: number;
    /** Radius, in multiples of how far the scan reaches. */
    size: number;
    /** Up or down, as a share of the radius. */
    lift: number;
}

export const SKY_LAYER: SkyLayer = { turn: 0, size: 6, lift: 0 };

/** Luma exports lie upside down: the same half turn as their scans' rotation. */
const UPRIGHT = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));

/** The sphere's own radius: its splats all sit on it. */
export const skyRadius = (sky: SplatMesh) => {
    let sum = 0, count = 0;
    sky.forEachSplat((_i, center) => {
        sum += center.length();
        count++;
    });
    return count ? sum / count : 1;
};

/** Put the sky around a scan: centred on `centre`, `layer.size` times its reach out. */
export const placeSky = (sky: SplatMesh, radius: number, centre: THREE.Vector3, reach: number, layer: SkyLayer) => {
    const r = layer.size * reach;
    sky.scale.setScalar(r / radius);
    sky.position.copy(centre).add(new THREE.Vector3(0, layer.lift * r, 0));
    sky.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(layer.turn)).multiply(UPRIGHT);
    sky.updateMatrixWorld(true);
};
