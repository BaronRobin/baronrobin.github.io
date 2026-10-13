import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sectionPlanes } from './blueprint';
import { ON } from './ui';

/**
 * Where the cut is: the scan seen from over the camera's shoulder, thinned to
 * a few thousand points, with the section drawn across it the way a renderer
 * shows its focus. The camera is the mark at the foot, looking up the map;
 * the two lines from it are what the view takes in; the dashed line across is
 * the plane the cut is centred on, and the band about it is how much is kept.
 *
 * The map is laid out for the camera, not for north: what's on the right of
 * the view is on the right of the map, and further away is further up. So the
 * scan turns under the marks when the view does, and the marks hold still.
 * From the side that makes it a plan. From above or below the cut is level,
 * and the map becomes an elevation, the right way up, with the camera at the
 * top when it's looking down.
 *
 * Drawn in 2D: the points whenever the view has turned, the marks every frame.
 */

/** Enough points to know the place by. */
const POINTS = 26000;
/** Looking more down than along: the map is an elevation, kept the right way up. */
const STEEP = Math.SQRT1_2;
/** How much one point adds to its pixel, of 255. */
const DOT = 90;
/** The view has turned when either axis of the map is off by more than this (a cosine). */
const TURNED = 0.99995;

interface Props {
    points: THREE.Points;
    camera: THREE.OrthographicCamera;
    /** The orbit point, read every frame: panning moves it. */
    target: THREE.Vector3;
    /** The scan's middle, and how far from it the map reaches. */
    centre: THREE.Vector3;
    extent: number;
    /** The section, as the rings set it. */
    reach: number;
    cut: number;
    depth: number;
    /** Px across. */
    size: number;
    label: string;
}

const SectionMap = ({ points, camera, target, centre, extent, reach, cut, depth, size, label }: Props) => {
    const scanRef = useRef<HTMLCanvasElement>(null);
    const marksRef = useRef<HTMLCanvasElement>(null);
    const section = useRef({ cut, depth });
    useEffect(() => { section.current = { cut, depth }; });

    /** Every nth point, in the world, from the scan's middle. */
    const cloud = useMemo(() => {
        const position = points.geometry.getAttribute('position');
        const step = Math.max(1, Math.floor(position.count / POINTS));
        const out = new Float32Array(Math.ceil(position.count / step) * 3);
        const p = new THREE.Vector3();
        points.updateMatrixWorld(true);
        for (let i = 0, n = 0; i < position.count; i += step, n += 3) {
            p.fromBufferAttribute(position, i).applyMatrix4(points.matrixWorld).sub(centre);
            out[n] = p.x;
            out[n + 1] = p.y;
            out[n + 2] = p.z;
        }
        return out;
    }, [points, centre]);

    useEffect(() => {
        const scan = scanRef.current, marks = marksRef.current;
        const pixels = scan?.getContext('2d'), context = marks?.getContext('2d');
        if (!scan || !marks || !pixels || !context) return;
        const ratio = Math.min(window.devicePixelRatio, 2);
        const px = Math.round(size * ratio);
        scan.width = scan.height = marks.width = marks.height = px;
        // Drawn in the type's colour, which follows the scan under the map (ink.ts) and so can change at any time.
        const style = getComputedStyle(marks);
        let colour = '';
        let r = 255, g = 255, b = 255;
        const tone = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;
        const image = pixels.createImageData(px, px);
        const half = size / 2;
        const scale = half / extent;

        const forward = new THREE.Vector3();
        /** The map's axes in the world: across it to the right, and up it. */
        const right = new THREE.Vector3(), up = new THREE.Vector3();
        const drawn = { right: new THREE.Vector3(), up: new THREE.Vector3() };
        const from = new THREE.Vector3();
        let frame = 0;

        const draw = () => {
            frame = requestAnimationFrame(draw);
            camera.getWorldDirection(forward);
            right.set(1, 0, 0).applyQuaternion(camera.quaternion);
            // Further away is further up; looking down, that would stand the scan on its head.
            const down = forward.y < -STEEP;
            up.copy(forward).multiplyScalar(down ? -1 : 1);

            const inked = style.color !== colour;
            if (inked) {
                colour = style.color;
                [r, g, b] = (colour.match(/[\d.]+/g) ?? ['255', '255', '255']).slice(0, 3).map(Number);
            }

            // The scan, when the view has turned or the ink has.
            if (inked || drawn.right.dot(right) < TURNED || drawn.up.dot(up) < TURNED) {
                drawn.right.copy(right);
                drawn.up.copy(up);
                image.data.fill(0);
                const k = (px / 2) / extent;
                for (let n = 0; n < cloud.length; n += 3) {
                    const x = Math.floor(px / 2 + (cloud[n] * right.x + cloud[n + 1] * right.y + cloud[n + 2] * right.z) * k);
                    const y = Math.floor(px / 2 - (cloud[n] * up.x + cloud[n + 1] * up.y + cloud[n + 2] * up.z) * k);
                    if (x < 0 || y < 0 || x >= px || y >= px) continue;
                    const at = (y * px + x) * 4;
                    image.data[at] = r;
                    image.data[at + 1] = g;
                    image.data[at + 2] = b;
                    image.data[at + 3] = Math.min(255, image.data[at + 3] + DOT);
                }
                pixels.putImageData(image, 0, 0);
            }

            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, size, size);
            context.lineWidth = 1;
            // Where the camera looks, on the map: up it, or down it from the top.
            const way = down ? 1 : -1;
            from.copy(target).sub(centre);
            const tx = half + from.dot(right) * scale, ty = half - from.dot(up) * scale;
            const wide = ((camera.right - camera.left) / 2 / camera.zoom) * scale;
            const line = (ax: number, ay: number, bx: number, by: number) => {
                context.beginPath();
                context.moveTo(Math.round(ax) + 0.5, Math.round(ay) + 0.5);
                context.lineTo(Math.round(bx) + 0.5, Math.round(by) + 0.5);
                context.stroke();
            };

            // What the view takes in: its two edges, the length of the map.
            context.strokeStyle = tone(0.3);
            for (const x of [tx - wide, tx + wide]) line(x, 0, x, size);

            const { cut: c, depth: d } = section.current;
            if (d < 1) {
                // The same planes the camera cuts with, measured from the orbit point.
                const distance = camera.position.distanceTo(target);
                const planes = sectionPlanes(distance, reach, c, d);
                const near = ty + way * (planes.near - distance) * scale, far = ty + way * (planes.far - distance) * scale;
                const top = Math.min(near, far), tall = Math.max(Math.abs(far - near), 1);
                // The range, right across like the plane it is, and stronger where the view is.
                context.fillStyle = tone(0.14);
                context.fillRect(0, top, size, tall);
                context.fillStyle = tone(0.2);
                context.fillRect(tx - wide, top, wide * 2, tall);
                context.strokeStyle = tone(0.95);
                line(0, near, size, near);
                line(0, far, size, far);
                // The plane it's centred on.
                context.setLineDash([3, 3]);
                context.strokeStyle = tone(0.7);
                line(0, (near + far) / 2, size, (near + far) / 2);
                context.setLineDash([]);
            }

            // The orbit point, and the camera at the rim, looking in.
            context.fillStyle = tone(0.95);
            context.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
            const cy = half - way * half * 0.68;
            context.beginPath();
            context.moveTo(tx, cy + way * 8);
            context.lineTo(tx - 6, cy - way * 3);
            context.lineTo(tx + 6, cy - way * 3);
            context.closePath();
            context.fill();
        };
        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [cloud, camera, target, centre, extent, reach, size]);

    const layer = 'absolute inset-0 h-full w-full';
    return (
        <div
            role="img"
            aria-label={label}
            data-ink-part
            className={`relative shrink-0 rounded-full ${ON} [mask-image:radial-gradient(closest-side,black_80%,transparent)]`}
            style={{ width: size, height: size }}
        >
            <canvas ref={scanRef} className={`${layer} opacity-80`} />
            <canvas ref={marksRef} className={layer} />
        </div>
    );
};

export default SectionMap;
