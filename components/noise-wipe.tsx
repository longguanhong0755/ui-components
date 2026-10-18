"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Noise Wipe — demo 1 of akella/webGLImageTransitions (Codrops "Creative WebGL
 * Image Transitions").
 *
 * A vertical edge crosses the frame, and 4D perlin noise is added to the mask
 * before it is thresholded, so the boundary is not a line but a field of
 * filaments that dissolve one photograph into the next. The fragment shader is
 * the original; only two things were added and both are mechanical:
 *
 *   1. `newUV` was `(vUv - 0.5) * resolution.zw + 0.5` — a centred cover crop
 *      solved once from the first texture. Here each of the two textures gets
 *      its own crop (`newUV` / `newUV2`) so a list of mixed aspect ratios does
 *      not inherit the first photograph's letterboxing, and the crop takes a
 *      focus offset so a portrait can be anchored on a face instead of always
 *      on its middle.
 *   2. `texture2D(texture1, p)` became `s1(p)`, the same sample with the
 *      out-of-range test folded into alpha. It does nothing in Cover, where the
 *      crop is inside the image by construction; in Contain it is what makes
 *      the letterbox transparent rather than a smear of the edge pixels.
 *
 * Clicking the right half advances, the left half goes back, and the mask is
 * mirrored for the backwards trip so the wipe travels the way the click did —
 * running the same left-to-right wipe in both directions reads as a mistake.
 *
 * The sequencing is the original's: `texture2` is set to the image being moved
 * to, progress runs 0 -> 1, then at the top `texture1` becomes that image and
 * progress resets to 0. Nothing crossfades between two planes — this is one
 * shader mixing two samplers.
 */

// Shared with the other element components so perspective matches when they sit
// side by side on a page.
const PERSPECTIVE = 0.15

// The world height of the frame. The field of view is solved from it, so plane
// and camera are in the same units.
const FRAME_H = 2

const DEFAULTS = {
    images: [
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
            },
            focusY: 50,
        },
    ],
    transition: {
        defaultValue: {"ease":[0,0,0.58,1],"mass":1,"type":"tween","delay":0,"damping":60,"duration":1,"stiffness":800},
        type: "tween",
        duration: 1.5,
        ease: "easeOut",
    } as Transition,
    // Whole numbers on the panel, divided into the shader's real range inside
    // `settingsFor`. These are akella's own defaults: 0.5, 40 and 40.
    edge: 20,
    grainX: 34,
    grainY: 40,
    fit: "cover",
    focusY: 50,
    cardWidth: 600,
    cardHeight: 400,
}

type Transition = {
    type?: string
    duration?: number
    ease?: string | number[]
}

/**
 * Each entry carries its own Y Position: a set of photographs with the subject
 * at different heights each need their own crop anchor, and one global anchor is
 * wrong for half of them. Plain strings and bare image objects are still read,
 * so an instance placed before the entry became an object keeps working.
 */
type ImageItem =
    | string
    | {
          image?: { src?: string } | string
          src?: string
          focusY?: number
      }
    | null
    | undefined

type Config = {
    images: ImageItem[]
    transition: Transition
    edge: number
    grainX: number
    grainY: number
    fit: "cover" | "contain"
    cardWidth: number
    cardHeight: number
}

const NAMED_EASES: Record<string, number[]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    circIn: [0.55, 0, 1, 0.45],
    circOut: [0, 0.55, 0.45, 1],
    circInOut: [0.85, 0, 0.15, 1],
    backIn: [0.36, 0, 0.66, -0.56],
    backOut: [0.34, 1.56, 0.64, 1],
    backInOut: [0.68, -0.6, 0.32, 1.6],
    anticipate: [0.36, 0, 0.66, -0.56],
}

/**
 * A raw canvas has no motion runtime, so the panel's Transition is sampled by
 * hand. Springs have no closed form here and fall back to the default curve.
 */
function makeEaseFn(transition?: Transition) {
    let pts: number[] = NAMED_EASES.easeOut
    const ease = transition?.ease
    if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite))
        pts = ease as number[]
    else if (typeof ease === "string" && NAMED_EASES[ease])
        pts = NAMED_EASES[ease]

    const [x1, y1, x2, y2] = pts
    if (x1 === y1 && x2 === y2) return (t: number) => t

    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
    }
    return (t: number) => {
        const x = Math.max(0, Math.min(1, t))
        let s = x
        for (let i = 0; i < 8; i++) {
            const cx = bez(x1, x2, s) - x
            const u = 1 - s
            const dx =
                3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2)
            if (Math.abs(dx) < 1e-6) break
            s -= cx / dx
            s = Math.max(0, Math.min(1, s))
        }
        return bez(y1, y2, s)
    }
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants akella's real ones. */
function settingsFor(cfg: Config) {
    return {
        // 5 reproduces the original 0.5 exactly.
        width: clamp(cfg.edge, 0, 20, DEFAULTS.edge) / 10,
        scaleX: clamp(cfg.grainX, 1, 60, DEFAULTS.grainX),
        scaleY: clamp(cfg.grainY, 1, 60, DEFAULTS.grainY),
        cardWidth: clamp(cfg.cardWidth, 40, 4000, DEFAULTS.cardWidth),
        cardHeight: clamp(cfg.cardHeight, 40, 4000, DEFAULTS.cardHeight),
        duration: Math.max(0.05, cfg.transition?.duration ?? 1.5),
    }
}

function srcOf(item: ImageItem): string {
    if (typeof item === "string") return item
    const image = item?.image
    if (typeof image === "string") return image
    return image?.src ?? item?.src ?? ""
}

/**
 * Where the crop sits on a photograph taller than the card: 0 pins the top, 50
 * centres it, 100 pins the bottom. The panel reads top-down like the page and uv
 * runs bottom-up, so the axis is flipped exactly once — here.
 */
function focusOf(item: ImageItem): number {
    const value = typeof item === "string" ? undefined : item?.focusY
    const n = clamp(value as number, 0, 100, DEFAULTS.focusY)
    return 1 - n / 100
}

function itemsOf(cfg: Config): ImageItem[] {
    const list = Array.isArray(cfg.images) ? cfg.images : []
    return list.filter((item) => srcOf(item) !== "")
}

/** The identity of the list: a change here, and only here, restarts it. */
function sourcesOf(cfg: Config): string {
    return itemsOf(cfg).map(srcOf).join("|")
}

/** One texture per URL per document, shared by every instance on the page. */
const textureCache = new Map<string, THREE.Texture>()
const texturePending = new Map<string, Promise<THREE.Texture | null>>()

function loadTexture(url: string): Promise<THREE.Texture | null> {
    const cached = textureCache.get(url)
    if (cached) return Promise.resolve(cached)
    const pending = texturePending.get(url)
    if (pending) return pending
    const p = new Promise<THREE.Texture | null>((resolve) => {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        loader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                texture.minFilter = THREE.LinearMipmapLinearFilter
                textureCache.set(url, texture)
                resolve(texture)
            },
            undefined,
            () => resolve(null)
        )
    })
    texturePending.set(url, p)
    return p
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * `resolution.xy` is the card in pixels and `resolution.zw` the cover scale of
 * the outgoing texture, exactly as akella's sketch.js wrote them;
 * `resolution2.zw` is the same pair for the incoming one.
 */
const FRAGMENT = /* glsl */ `
uniform float progress;
uniform float width;
uniform float scaleX;
uniform float scaleY;
uniform float uClip;
uniform float uBack;
uniform vec2 uFocus;
uniform vec4 resolution;
uniform vec4 resolution2;
uniform sampler2D texture1;
uniform sampler2D texture2;

varying vec2 vUv;

// The cover crop, plus whatever vertical slack that crop leaves handed to the
// entry's own anchor. When the card is wider than the photograph there is no
// vertical slack, c.y is 1, and the focus term cancels itself.
vec2 coverUV(vec2 uv, vec2 c, float f) {
    return vec2(
        (uv.x - 0.5) * c.x + 0.5,
        (uv.y - 0.5) * c.y + 0.5 + (f - 0.5) * (1.0 - c.y)
    );
}

float inBox(vec2 uv) {
    vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    return s.x * s.y;
}

vec4 s1(vec2 p) {
    vec4 c = texture2D(texture1, p);
    c.a *= mix(1.0, inBox(p), uClip);
    return c;
}

vec4 s2(vec2 p) {
    vec4 c = texture2D(texture2, p);
    c.a *= mix(1.0, inBox(p), uClip);
    return c;
}

//	Classic Perlin 4D Noise
//	by Stefan Gustavson
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec4 fade(vec4 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec4 P){
  vec4 Pi0 = floor(P);
  vec4 Pi1 = Pi0 + 1.0;
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec4 Pf0 = fract(P);
  vec4 Pf1 = Pf0 - 1.0;
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = vec4(Pi0.zzzz);
  vec4 iz1 = vec4(Pi1.zzzz);
  vec4 iw0 = vec4(Pi0.wwww);
  vec4 iw1 = vec4(Pi1.wwww);

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 ixy00 = permute(ixy0 + iw0);
  vec4 ixy01 = permute(ixy0 + iw1);
  vec4 ixy10 = permute(ixy1 + iw0);
  vec4 ixy11 = permute(ixy1 + iw1);

  vec4 gx00 = ixy00 / 7.0;
  vec4 gy00 = floor(gx00) / 7.0;
  vec4 gz00 = floor(gy00) / 6.0;
  gx00 = fract(gx00) - 0.5;
  gy00 = fract(gy00) - 0.5;
  gz00 = fract(gz00) - 0.5;
  vec4 gw00 = vec4(0.75) - abs(gx00) - abs(gy00) - abs(gz00);
  vec4 sw00 = step(gw00, vec4(0.0));
  gx00 -= sw00 * (step(0.0, gx00) - 0.5);
  gy00 -= sw00 * (step(0.0, gy00) - 0.5);

  vec4 gx01 = ixy01 / 7.0;
  vec4 gy01 = floor(gx01) / 7.0;
  vec4 gz01 = floor(gy01) / 6.0;
  gx01 = fract(gx01) - 0.5;
  gy01 = fract(gy01) - 0.5;
  gz01 = fract(gz01) - 0.5;
  vec4 gw01 = vec4(0.75) - abs(gx01) - abs(gy01) - abs(gz01);
  vec4 sw01 = step(gw01, vec4(0.0));
  gx01 -= sw01 * (step(0.0, gx01) - 0.5);
  gy01 -= sw01 * (step(0.0, gy01) - 0.5);

  vec4 gx10 = ixy10 / 7.0;
  vec4 gy10 = floor(gx10) / 7.0;
  vec4 gz10 = floor(gy10) / 6.0;
  gx10 = fract(gx10) - 0.5;
  gy10 = fract(gy10) - 0.5;
  gz10 = fract(gz10) - 0.5;
  vec4 gw10 = vec4(0.75) - abs(gx10) - abs(gy10) - abs(gz10);
  vec4 sw10 = step(gw10, vec4(0.0));
  gx10 -= sw10 * (step(0.0, gx10) - 0.5);
  gy10 -= sw10 * (step(0.0, gy10) - 0.5);

  vec4 gx11 = ixy11 / 7.0;
  vec4 gy11 = floor(gx11) / 7.0;
  vec4 gz11 = floor(gy11) / 6.0;
  gx11 = fract(gx11) - 0.5;
  gy11 = fract(gy11) - 0.5;
  gz11 = fract(gz11) - 0.5;
  vec4 gw11 = vec4(0.75) - abs(gx11) - abs(gy11) - abs(gz11);
  vec4 sw11 = step(gw11, vec4(0.0));
  gx11 -= sw11 * (step(0.0, gx11) - 0.5);
  gy11 -= sw11 * (step(0.0, gy11) - 0.5);

  vec4 g0000 = vec4(gx00.x,gy00.x,gz00.x,gw00.x);
  vec4 g1000 = vec4(gx00.y,gy00.y,gz00.y,gw00.y);
  vec4 g0100 = vec4(gx00.z,gy00.z,gz00.z,gw00.z);
  vec4 g1100 = vec4(gx00.w,gy00.w,gz00.w,gw00.w);
  vec4 g0010 = vec4(gx10.x,gy10.x,gz10.x,gw10.x);
  vec4 g1010 = vec4(gx10.y,gy10.y,gz10.y,gw10.y);
  vec4 g0110 = vec4(gx10.z,gy10.z,gz10.z,gw10.z);
  vec4 g1110 = vec4(gx10.w,gy10.w,gz10.w,gw10.w);
  vec4 g0001 = vec4(gx01.x,gy01.x,gz01.x,gw01.x);
  vec4 g1001 = vec4(gx01.y,gy01.y,gz01.y,gw01.y);
  vec4 g0101 = vec4(gx01.z,gy01.z,gz01.z,gw01.z);
  vec4 g1101 = vec4(gx01.w,gy01.w,gz01.w,gw01.w);
  vec4 g0011 = vec4(gx11.x,gy11.x,gz11.x,gw11.x);
  vec4 g1011 = vec4(gx11.y,gy11.y,gz11.y,gw11.y);
  vec4 g0111 = vec4(gx11.z,gy11.z,gz11.z,gw11.z);
  vec4 g1111 = vec4(gx11.w,gy11.w,gz11.w,gw11.w);

  vec4 norm00 = taylorInvSqrt(vec4(dot(g0000, g0000), dot(g0100, g0100), dot(g1000, g1000), dot(g1100, g1100)));
  g0000 *= norm00.x;
  g0100 *= norm00.y;
  g1000 *= norm00.z;
  g1100 *= norm00.w;

  vec4 norm01 = taylorInvSqrt(vec4(dot(g0001, g0001), dot(g0101, g0101), dot(g1001, g1001), dot(g1101, g1101)));
  g0001 *= norm01.x;
  g0101 *= norm01.y;
  g1001 *= norm01.z;
  g1101 *= norm01.w;

  vec4 norm10 = taylorInvSqrt(vec4(dot(g0010, g0010), dot(g0110, g0110), dot(g1010, g1010), dot(g1110, g1110)));
  g0010 *= norm10.x;
  g0110 *= norm10.y;
  g1010 *= norm10.z;
  g1110 *= norm10.w;

  vec4 norm11 = taylorInvSqrt(vec4(dot(g0011, g0011), dot(g0111, g0111), dot(g1011, g1011), dot(g1111, g1111)));
  g0011 *= norm11.x;
  g0111 *= norm11.y;
  g1011 *= norm11.z;
  g1111 *= norm11.w;

  float n0000 = dot(g0000, Pf0);
  float n1000 = dot(g1000, vec4(Pf1.x, Pf0.yzw));
  float n0100 = dot(g0100, vec4(Pf0.x, Pf1.y, Pf0.zw));
  float n1100 = dot(g1100, vec4(Pf1.xy, Pf0.zw));
  float n0010 = dot(g0010, vec4(Pf0.xy, Pf1.z, Pf0.w));
  float n1010 = dot(g1010, vec4(Pf1.x, Pf0.y, Pf1.z, Pf0.w));
  float n0110 = dot(g0110, vec4(Pf0.x, Pf1.yz, Pf0.w));
  float n1110 = dot(g1110, vec4(Pf1.xyz, Pf0.w));
  float n0001 = dot(g0001, vec4(Pf0.xyz, Pf1.w));
  float n1001 = dot(g1001, vec4(Pf1.x, Pf0.yz, Pf1.w));
  float n0101 = dot(g0101, vec4(Pf0.x, Pf1.y, Pf0.z, Pf1.w));
  float n1101 = dot(g1101, vec4(Pf1.xy, Pf0.z, Pf1.w));
  float n0011 = dot(g0011, vec4(Pf0.xy, Pf1.zw));
  float n1011 = dot(g1011, vec4(Pf1.x, Pf0.y, Pf1.zw));
  float n0111 = dot(g0111, vec4(Pf0.x, Pf1.yzw));
  float n1111 = dot(g1111, Pf1);

  vec4 fade_xyzw = fade(Pf0);
  vec4 n_0w = mix(vec4(n0000, n1000, n0100, n1100), vec4(n0001, n1001, n0101, n1101), fade_xyzw.w);
  vec4 n_1w = mix(vec4(n0010, n1010, n0110, n1110), vec4(n0011, n1011, n0111, n1111), fade_xyzw.w);
  vec4 n_zw = mix(n_0w, n_1w, fade_xyzw.z);
  vec2 n_yzw = mix(n_zw.xy, n_zw.zw, fade_xyzw.y);
  float n_xyzw = mix(n_yzw.x, n_yzw.y, fade_xyzw.x);
  return 2.2 * n_xyzw;
}

float parabola( float x, float k ) {
  return pow( 4. * x * ( 1. - x ), k );
}

void main() {
    vec2 newUV = coverUV(vUv, resolution.zw, uFocus.x);
    vec2 newUV2 = coverUV(vUv, resolution2.zw, uFocus.y);

    float dt = parabola(progress, 1.);
    float border = 1.;

    vec4 color1 = s1(newUV);
    vec4 color2 = s2(newUV2);

    float realnoise = 0.5 * (cnoise(vec4(newUV.x * scaleX, newUV.y * scaleY, 0., 0.)) + 1.);

    float w = width * dt;

    // The axis the wipe travels along. Going back mirrors it, so the edge always
    // moves away from the half that was clicked.
    float ax = mix(vUv.x, 1.0 - vUv.x, uBack);

    float maskvalue = smoothstep(1. - w, 1., ax + mix(-w / 2., 1. - w / 2., progress));

    float mask = maskvalue + maskvalue * realnoise;

    float final = smoothstep(border, border + 0.01, mask);

    gl_FragColor = mix(color1, color2, final);
}
`

class WipeScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    private geometry = new THREE.PlaneGeometry(1, 1, 2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    private items: ImageItem[] = []
    private sources: string[] = []
    private textures: (THREE.Texture | null)[] = []
    private current = 0
    private next = 0
    private running = false
    private phaseT = 0
    private ease = makeEaseFn()

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.transition)

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        // Set per pointer position, not once: only the picture is clickable, so
        // only the picture may look it.
        el.style.cursor = "default"
        el.style.touchAction = "manipulation"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
                progress: { value: 0 },
                width: { value: 0.5 },
                scaleX: { value: 40 },
                scaleY: { value: 40 },
                uClip: { value: 0 },
                uBack: { value: 0 },
                uFocus: { value: new THREE.Vector2(0.5, 0.5) },
                resolution: { value: new THREE.Vector4(1, 1, 1, 1) },
                resolution2: { value: new THREE.Vector4(1, 1, 1, 1) },
                texture1: { value: null },
                texture2: { value: null },
            },
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)

        el.addEventListener("pointerdown", this.onPointerDown)
        el.addEventListener("pointermove", this.onPointerMove)
        this.loadAll()
        this.applyUniforms()
    }

    /**
     * Left half of the picture goes back, right half goes forward, and anything
     * outside it is not a click at all — the canvas fills the frame but the
     * photograph is only the card in the middle of it, so the transparent
     * margin has to stay inert.
     *
     * Returns null for a miss. The card is centred and, because the camera's
     * field of view is solved from the container's height, its world size lands
     * on exactly the pixel size the panel asked for. Contain letterboxes the
     * photograph further inside that card, by the same z/w the shader crops
     * with, which is why the margin is divided back out here.
     */
    private hitTest(e: PointerEvent): boolean | null {
        const rect = this.renderer.domElement.getBoundingClientRect()
        const S = settingsFor(this.cfg)
        const r = this.material.uniforms.resolution.value as THREE.Vector4
        const w = S.cardWidth / Math.max(1, r.z)
        const h = S.cardHeight / Math.max(1, r.w)
        const x = e.clientX - rect.left - (rect.width - w) / 2
        const y = e.clientY - rect.top - (rect.height - h) / 2
        if (x < 0 || x > w || y < 0 || y > h) return null
        return x < w / 2
    }

    private onPointerMove = (e: PointerEvent) => {
        this.renderer.domElement.style.cursor =
            this.sources.length > 1 && this.hitTest(e) !== null
                ? "pointer"
                : "default"
    }

    private onPointerDown = (e: PointerEvent) => {
        // Clicks during a transition are dropped rather than queued: a queue
        // lets an impatient viewer skip past photographs they never saw.
        const n = this.sources.length
        if (this.running || n < 2) return
        const back = this.hitTest(e)
        if (back === null) return
        this.running = true
        this.phaseT = 0
        this.next = (this.current + (back ? -1 : 1) + n) % n
        this.material.uniforms.uBack.value = back ? 1 : 0
        this.material.uniforms.texture2.value = this.textures[this.next]
        this.applyAspect()
    }

    private loadAll() {
        // Entries with no image are dropped, and the anchors are dropped with
        // them — the two lists have to stay index-aligned or a photograph is
        // cropped by its neighbour's anchor.
        this.items = itemsOf(this.cfg)
        const sources = this.items.map(srcOf)
        this.sources = sources
        this.textures = sources.map(() => null)
        this.current = 0
        this.next = 0
        this.running = false
        this.phaseT = 0
        this.material.uniforms.progress.value = 0
        sources.forEach((src, i) => {
            loadTexture(src).then((tex) => {
                // The list may have been edited while this was in flight.
                if (this.disposed || this.sources[i] !== src) return
                this.textures[i] = tex
                if (i === this.current)
                    this.material.uniforms.texture1.value = tex
                if (i === this.next) this.material.uniforms.texture2.value = tex
                this.applyAspect()
            })
        })
    }

    /**
     * The cover (or contain) scale for one texture against the card, in akella's
     * z/w form: below 1 the axis is cropped, above 1 it is letterboxed and the
     * overhang is what `inBox` cuts away.
     */
    private scaleFor(tex: THREE.Texture | null, out: THREE.Vector4) {
        const img = tex?.image as { width?: number; height?: number } | undefined
        const iw = img?.width || 1
        const ih = img?.height || 1
        const S = settingsFor(this.cfg)
        const planeAspect = S.cardWidth / S.cardHeight
        const imgAspect = iw / ih
        const narrow = planeAspect < imgAspect
        const contain = this.cfg.fit === "contain"
        if (narrow !== contain) {
            out.z = planeAspect / imgAspect
            out.w = 1
        } else {
            out.z = 1
            out.w = imgAspect / planeAspect
        }
    }

    private applyAspect() {
        const r1 = this.material.uniforms.resolution.value as THREE.Vector4
        const r2 = this.material.uniforms.resolution2.value as THREE.Vector4
        this.scaleFor(this.textures[this.current] ?? null, r1)
        this.scaleFor(this.textures[this.next] ?? null, r2)
        // Read off the live config rather than the snapshot taken at load, so
        // dragging an anchor moves the crop while the photograph is on screen.
        const live = itemsOf(this.cfg)
        const focus = this.material.uniforms.uFocus.value as THREE.Vector2
        focus.set(
            focusOf(live[this.current] ?? this.items[this.current]),
            focusOf(live[this.next] ?? this.items[this.next])
        )
    }

    private applyUniforms() {
        const S = settingsFor(this.cfg)
        const u = this.material.uniforms
        u.width.value = S.width
        u.scaleX.value = S.scaleX
        u.scaleY.value = S.scaleY
        u.uClip.value = this.cfg.fit === "contain" ? 1 : 0
        this.applyAspect()
        this.layout()
    }

    /**
     * The card is given in pixels but the scene is in world units, so it is
     * converted through the one ratio the camera fixes: FRAME_H world units
     * spans the container's height.
     */
    private layout() {
        const aspect = Math.max(1e-3, this.width / Math.max(1, this.height))
        const S = settingsFor(this.cfg)
        const perPx = FRAME_H / Math.max(1, this.height)

        this.mesh.scale.set(S.cardWidth * perPx, S.cardHeight * perPx, 1)
        const r = this.material.uniforms.resolution.value as THREE.Vector4
        r.x = S.cardWidth
        r.y = S.cardHeight

        const distance = 1 / PERSPECTIVE
        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov = 2 * Math.atan(FRAME_H / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 8)
        this.camera.far = distance + 8
        this.camera.updateProjectionMatrix()
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.layout()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.transition)
        // Only an edit to the photographs themselves restarts the sequence.
        // Everything else — an anchor dragged, the card resized — is a uniform
        // write on whatever is currently on screen.
        if (sourcesOf(cfg) !== sourcesOf(prev)) this.loadAll()
        this.applyUniforms()
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning from the background must not jump the wipe to its end.
        if (dt > 0.05) dt = 0.05

        if (this.running) {
            this.phaseT += dt
            const t = Math.min(1, this.phaseT / settingsFor(this.cfg).duration)
            this.material.uniforms.progress.value = this.ease(t)
            if (t >= 1) {
                // Promoted at the top, where the shader is already showing
                // texture2 alone, so resetting progress to 0 is invisible.
                this.current = this.next
                this.material.uniforms.texture1.value =
                    this.textures[this.current]
                this.material.uniforms.progress.value = 0
                this.running = false
                this.applyAspect()
            }
        }

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointerdown", this.onPointerDown)
        el.removeEventListener("pointermove", this.onPointerMove)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
        // Textures are shared through the module cache and are deliberately not
        // disposed — another instance on the page may still be drawing them.
    }
}

export interface NoiseWipeProps {
    images?: ImageItem[]
    transition?: Transition
    edge?: number
    grainX?: number
    grainY?: number
    fit?: "cover" | "contain"
    cardWidth?: number
    cardHeight?: number
    style?: React.CSSProperties
}

function __BaseImpl_NoiseWipe(props: NoiseWipeProps) {
    const {
        images = DEFAULTS.images,
        transition = DEFAULTS.transition,
        edge = DEFAULTS.edge,
        grainX = DEFAULTS.grainX,
        grainY = DEFAULTS.grainY,
        fit = DEFAULTS.fit as "cover" | "contain",
        cardWidth = DEFAULTS.cardWidth,
        cardHeight = DEFAULTS.cardHeight,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<WipeScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        images,
        transition,
        edge,
        grainX,
        grainY,
        fit,
        cardWidth,
        cardHeight,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: WipeScene
        try {
            scene = new WipeScene(container, cfgRef.current)
        } catch {
            // No WebGL — render an empty frame rather than throwing.
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)
        scene.start()

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight)
        })
        ro.observe(container)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current)
    }, [
        // Contents, not identity: a fresh array may arrive every render,
        // and the anchors travel in it alongside the sources.
        Array.isArray(images)
            ? images.map((i) => `${srcOf(i)}@${focusOf(i)}`).join("|")
            : "",
        transition?.duration,
        String(transition?.ease),
        edge,
        grainX,
        grainY,
        fit,
        cardWidth,
        cardHeight,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Photograph that dissolves into the next one. Click the right half for the next image, the left half for the previous one."
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

NoiseWipe.displayName = "Noise Wipe"

const __presetProps = {
  "images": [
    {
      "image": {
        "src": "https://plus.unsplash.com/premium_photo-1770121173383-b8026e8fab58?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDQ0fHx8ZW58MHx8fHx8"
      },
      "focusY": 100
    },
    {
      "image": {
        "src": "https://plus.unsplash.com/premium_photo-1705440332779-359bc0421fc1?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDUwfHx8ZW58MHx8fHx8"
      },
      "focusY": 18
    },
    {
      "image": {
        "src": "https://plus.unsplash.com/premium_photo-1701842913388-ed20fb6b6e1f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDM4fHx8ZW58MHx8fHx8"
      },
      "focusY": 42
    }
  ],
  "cardWidth": 600,
  "cardHeight": 400,
  "fit": "cover",
  "edge": 20,
  "grainX": 34,
  "grainY": 40,
  "transition": {
    "ease": [
      0,
      0,
      0.58,
      1
    ],
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 1,
    "stiffness": 800
  }
};

export default function NoiseWipe(props: Record<string, unknown>) {
  return <__BaseImpl_NoiseWipe {...(__presetProps as Record<string, unknown>)} {...props} />;
}
