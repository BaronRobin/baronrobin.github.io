import * as THREE from 'three';

/**
 * Sharpening for the final image: a luminance unsharp mask, modelled on
 * Unreal's tonemapper sharpen (r.Tonemapper.Sharpen). Gaussian splats draw
 * soft; this gives their edges back some bite. Each pixel's brightness is
 * pushed away from the average of its four neighbours by `amount`, and its
 * colour scaled to match, so hue stays put. 0 is off; 0.5 to 1 is typical.
 *
 * The same arithmetic twice: a shader for the live view, and plain code for
 * offline renders (create/render.ts), which arrive as pixels.
 */

/** Rec. 709 luma. */
const LR = 0.2126, LG = 0.7152, LB = 0.0722;

/**
 * Sharpen RGBA pixels, rows in either order, into `out`. Edge pixels
 * borrow their missing neighbours from themselves.
 */
export const sharpenPixels = (src: Uint8Array, width: number, height: number, amount: number, out = new Uint8Array(width * height * 4)) => {
    const luma = new Float32Array(width * height);
    for (let p = 0, i = 0; p < width * height; p++, i += 4) luma[p] = (LR * src[i] + LG * src[i + 1] + LB * src[i + 2]) / 255;
    for (let y = 0; y < height; y++) {
        const up = y > 0 ? -width : 0, down = y < height - 1 ? width : 0;
        for (let x = 0; x < width; x++) {
            const p = y * width + x, i = p * 4;
            const l = luma[p];
            const around = (luma[x > 0 ? p - 1 : p] + luma[x < width - 1 ? p + 1 : p] + luma[p + up] + luma[p + down]) * 0.25;
            const sharp = l + amount * (l - around);
            const k = sharp > 0 ? sharp / (l > 1e-4 ? l : 1e-4) : 0;
            // Rounded and clamped; the Uint8Array drops the fraction.
            const r = src[i] * k + 0.5, g = src[i + 1] * k + 0.5, b = src[i + 2] * k + 0.5;
            out[i] = r > 255 ? 255 : r;
            out[i + 1] = g > 255 ? 255 : g;
            out[i + 2] = b > 255 ? 255 : b;
            out[i + 3] = src[i + 3];
        }
    }
    return out;
};

const vertexShader = /* glsl */ `
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D image;
uniform float amount;

float luma(vec3 c) { return dot(c, vec3(${LR}, ${LG}, ${LB})); }

vec3 at(ivec2 p) {
    return texelFetch(image, clamp(p, ivec2(0), textureSize(image, 0) - 1), 0).rgb;
}

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec3 c = at(p);
    float l = luma(c);
    float around = 0.25 * (luma(at(p + ivec2(1, 0))) + luma(at(p - ivec2(1, 0))) + luma(at(p + ivec2(0, 1))) + luma(at(p - ivec2(0, 1))));
    float k = max(0.0, l + amount * (l - around)) / max(l, 1e-4);
    gl_FragColor = vec4(min(c * k, 1.0), 1.0);
}`;

/**
 * The live view's last step. With nothing to sharpen it renders the scene as
 * before. Otherwise it renders it, copies what's on the canvas into a texture
 * (the bytes as they are, so no colour shifts) and draws it back sharpened.
 */
export class SharpenPass {
    amount = 0;
    private renderer: THREE.WebGLRenderer;
    private texture: THREE.FramebufferTexture | null = null;
    private material: THREE.ShaderMaterial;
    private quad: THREE.Mesh;
    private scene = new THREE.Scene();
    private camera = new THREE.Camera();
    private size = new THREE.Vector2();

    constructor(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
        this.material = new THREE.ShaderMaterial({
            uniforms: { image: { value: null }, amount: { value: 0 } },
            vertexShader,
            fragmentShader,
            depthTest: false,
            depthWrite: false,
        });
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
        this.quad.frustumCulled = false;
        this.scene.add(this.quad);
    }

    render(scene: THREE.Scene, camera: THREE.Camera) {
        this.renderer.render(scene, camera);
        if (this.amount <= 0) return;
        this.renderer.getDrawingBufferSize(this.size);
        if (!this.texture || this.texture.image.width !== this.size.x || this.texture.image.height !== this.size.y) {
            this.texture?.dispose();
            this.texture = new THREE.FramebufferTexture(this.size.x, this.size.y);
            this.material.uniforms.image.value = this.texture;
        }
        this.renderer.copyFramebufferToTexture(this.texture);
        this.material.uniforms.amount.value = this.amount;
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.texture?.dispose();
        this.material.dispose();
        this.quad.geometry.dispose();
    }
}
