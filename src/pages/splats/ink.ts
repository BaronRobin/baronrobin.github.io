import type * as THREE from 'three';

/**
 * Which ink the controls are set in. Type straight on a scan has to read on
 * whatever the scan puts behind it, and no one colour does: white is lost on
 * a pale wall, black in a night sky. So each group of controls is set to suit
 * its own ground: every so often the picture under it is read back from the
 * canvas, and the group goes dark on a light ground and light on a dark one.
 * A group that runs across both, a list down a wall and on into the trees,
 * is taken label by label: whatever in it is marked `data-ink-part` gets an
 * ink of its own, from the same reading. The colours themselves are in
 * index.css (.splat-ink).
 *
 * Only for groups that sit straight on the canvas. One on a fade of the
 * page's own ground just keeps the theme's ink, which is what the fade makes
 * right.
 */

/** One group is looked at this often, ms: reading the canvas back makes the GPU wait. */
const EVERY_MS = 110;
/** No more of a group's ground than this is read, px a side. */
const MOST = 640;
/** Lighter than this, a ground wants dark ink; darker than that, light. Between, it keeps what it has. */
const TO_DARK = 0.56;
const TO_LIGHT = 0.44;

class InkReader {
    private groups: HTMLElement[] = [];
    private turn = 0;
    private last = 0;
    private bytes = new Uint8Array(0);
    /** What's laid over the canvas and darkens it, and how much of the light under it gets through. */
    private shades: { el: HTMLElement; keep: number }[] = [];

    /** A ref for a group of controls: from now on its ink follows what's under it. */
    watch = (el: HTMLElement | null) => {
        if (el && !this.groups.includes(el)) this.groups.push(el);
    };

    /**
     * A ref for something drawn over the canvas that darkens it, a tool's
     * panel or the dim around its frame: the canvas doesn't have it, so
     * whatever sits on it reads as `keep` times as bright as the canvas says.
     */
    shade = (keep: number) => {
        // Remembered, so the shade goes when the ref lets go, even of an element that stays.
        let mine: HTMLElement | null = null;
        return (el: HTMLElement | null) => {
            if (el) {
                mine = el;
                if (!this.shades.some((s) => s.el === el)) this.shades.push({ el, keep });
            } else if (mine) {
                const gone = mine;
                this.shades = this.shades.filter((s) => s.el !== gone);
                mine = null;
            }
        };
    };

    /** How much of the canvas's light reaches the eye at this point of the page. */
    private through(x: number, y: number) {
        let keep = 1;
        for (const { el, keep: k } of this.shades) {
            const r = el.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) keep *= k;
        }
        return keep;
    }

    /** Once a frame, straight after drawing it, while the picture is still there to read. */
    read(renderer: THREE.WebGLRenderer, time: number) {
        if (time - this.last < EVERY_MS) return;
        this.last = time;
        this.groups = this.groups.filter((el) => el.isConnected);
        this.shades = this.shades.filter((s) => s.el.isConnected);
        if (!this.groups.length) return;
        const el = this.groups[this.turn++ % this.groups.length];
        const gl = renderer.getContext();
        const canvas = renderer.domElement.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        if (!canvas.width || !box.width || !box.height) return;
        // The middle of the group, in the canvas's own pixels, which count up from the bottom.
        const k = gl.drawingBufferWidth / canvas.width;
        const w = Math.min(MOST, Math.floor(box.width * k)), h = Math.min(MOST, Math.floor(box.height * k));
        const x = Math.round(((box.left + box.right) / 2 - canvas.left) * k - w / 2);
        const y = Math.round((canvas.bottom - (box.top + box.bottom) / 2) * k - h / 2);
        if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > gl.drawingBufferWidth || y + h > gl.drawingBufferHeight) return;
        if (this.bytes.length < w * h * 4) this.bytes = new Uint8Array(w * h * 4);
        gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, this.bytes);
        this.set(el, 0, 0, w, h, w, this.through((box.left + box.right) / 2, (box.top + box.bottom) / 2));
        // Its labels, each from its own patch of the same reading.
        for (const part of el.querySelectorAll<HTMLElement>('[data-ink-part]')) {
            const at = part.getBoundingClientRect();
            const left = Math.max(0, Math.round((at.left - canvas.left) * k) - x), right = Math.min(w, Math.round((at.right - canvas.left) * k) - x);
            const bottom = Math.max(0, Math.round((canvas.bottom - at.bottom) * k) - y), top = Math.min(h, Math.round((canvas.bottom - at.top) * k) - y);
            if (right > left && top > bottom) this.set(part, left, bottom, right, top, w, this.through((at.left + at.right) / 2, (at.top + at.bottom) / 2));
        }
    }

    /** Give an element the ink for a patch of the reading, `stride` pixels to a row, `keep` of it seen through what's over it. */
    private set(el: HTMLElement, left: number, bottom: number, right: number, top: number, stride: number, keep: number) {
        // Every other pixel of every other row is plenty for an average.
        let sum = 0, n = 0;
        for (let row = bottom; row < top; row += 2) {
            for (let i = (row * stride + left) * 4, end = (row * stride + right) * 4; i < end; i += 8, n++) {
                sum += 0.2126 * this.bytes[i] + 0.7152 * this.bytes[i + 1] + 0.0722 * this.bytes[i + 2];
            }
        }
        if (!n) return;
        const light = (sum / n / 255) * keep;
        const now = el.dataset.ink;
        if (light > TO_DARK || (!now && light > 0.5)) el.dataset.ink = 'dark';
        else if (light < TO_LIGHT || !now) el.dataset.ink = 'light';
    }
}

/** The one reader: the viewer's controls, and the site's bar while it's over the viewer. */
export const inks = new InkReader();
