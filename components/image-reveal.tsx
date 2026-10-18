"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Image Reveal — a photograph dissolved into perlin noise, torn open from the
 * centre outward. Click and the picture burns away; the next one burns back in.
 *
 * The shader is the one from colindmg/r3f-image-reveal-effect, kept intact: a
 * domain-warped 3D perlin field (noise sampled at a coordinate that another
 * sample of the noise displaced) added to a radial ramp, clamped and inverted
 * into the alpha channel. The mask therefore has soft filaments at its edge
 * instead of a clean circle, and the frame is opaque only once the ramp has been
 * pushed past the noise everywhere.
 *
 * The wave lives in the vertex shader, not in a transform: the plane is 32x32
 * segments and each vertex rides sin(distanceToCenter * 20 - progress * 5)
 * scaled by (1 - progress), so the sheet is still buckling while the mask is
 * still dissolving and both settle on the same frame. A CSS transform could only
 * move the plane as one rigid piece.
 *
 * Two half-animations, not one crossfade: progress runs 1 -> 0 with the current
 * texture, the texture is swapped at the bottom, then 0 -> 1. Crossfading two
 * planes was the obvious alternative and it reads as a dip to grey, because both
 * layers are half-transparent at the midpoint and whatever sits behind shows
 * through twice over.
 */

// Shared with the other element components so perspective matches when they sit
// side by side on a page.
const PERSPECTIVE = 0.15

// The world height of the frame. The field of view is solved from it, so plane,
// wave amplitude and camera are all in the same units.
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
        defaultValue: {"ease":"easeInOut","mass":1,"type":"tween","damping":60,"duration":1.5,"stiffness":800},
        type: "tween",
        duration: 1.5,
        ease: "easeInOut",
    } as Transition,
    ripple: 20,
    grain: 20,
    fit: "cover",
    focusY: 50,
    cardWidth: 400,
    cardHeight: 600,
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
    ripple: number
    grain: number
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
    let pts: number[] = NAMED_EASES.easeInOut
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

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // 10 reproduces the original amplitude exactly. The term is a fraction
        // of the plane's own height, so the buckle reads the same at any size.
        ripple: clamp(cfg.ripple, 0, 20, DEFAULTS.ripple) / 10,
        // Noise frequency. 5.0 is the original: below it the tear is a few fat
        // lobes, above it the edge shreds into static.
        grain: clamp(cfg.grain, 1, 20, DEFAULTS.grain),
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

const REVEAL_VERTEX = /* glsl */ `
uniform float uProgress;
uniform float uWave;

varying vec2 vUv;

void main() {
    vec3 newPosition = position;

    // Measured in uv rather than world units, so the ring spacing does not
    // change when the plane is resized.
    float distanceToCenter = distance(vec2(0.5), uv);

    float wave = (1.0 - uProgress) * sin(distanceToCenter * 20.0 - uProgress * 5.0);

    newPosition.z += wave * uWave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

    vUv = uv;
}
`

const REVEAL_FRAGMENT = /* glsl */ `
uniform sampler2D uTexture;
uniform float uTime;
uniform float uProgress;
uniform float uGrain;
uniform float uFocusY;
uniform vec2 uRes;
uniform vec2 uImageRes;

varying vec2 vUv;

//    Classic Perlin 3D Noise
//    by Stefan Gustavson
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);

    return 2.2 * n_xyz;
}

// Background-cover uv: u = plane uv, s = plane size, i = image size, f = which
// slice of a vertical crop to keep (0.5 centres it, as the original did).
// Without it a photograph in a card of a different aspect stretches instead of
// cropping.
vec2 CoverUV(vec2 u, vec2 s, vec2 i, float f) {
    float rs = s.x / s.y;
    float ri = i.x / i.y;
    vec2 st = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    // The card is wider than the photograph, so the crop is horizontal and there
    // is no vertical slack for the focus to slide along — centre it.
    vec2 o = (rs < ri ? vec2((st.x - s.x) * 0.5, 0.0) : vec2(0.0, (st.y - s.y) * f)) / st;
    return u * s / st + o;
}

void main() {
    vec2 newUv = CoverUV(vUv, uRes, uImageRes, uFocusY);

    // Domain warp: the noise is read at a coordinate another sample of the noise
    // moved. One round gives lobes; this is what draws them into filaments.
    vec2 displacedUv = vUv + cnoise(vec3(vUv * uGrain, uTime * 0.1));

    float strength = cnoise(vec3(displacedUv * uGrain, uTime * 0.2));

    // The ramp that does the revealing: progress pushes the whole field below
    // zero from the centre outward.
    float radialGradient = distance(vUv, vec2(0.5)) * 12.5 - 7.0 * uProgress;
    strength += radialGradient;

    strength = clamp(strength, 0.0, 1.0);
    strength = 1.0 - strength;

    vec3 textureColor = texture2D(uTexture, newUv).rgb;

    // The last stretch of the ramp barely moves the mask, so opacity carries the
    // final settle on its own.
    float opacityProgress = smoothstep(0.0, 0.7, uProgress);

    gl_FragColor = vec4(textureColor, strength * opacityProgress);
}
`

type Phase = "idle" | "hiding" | "showing"

class ImageRevealScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    private geometry = new THREE.PlaneGeometry(1, 1, 32, 32)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private time = 0
    private disposed = false

    private items: ImageItem[] = []
    private sources: string[] = []
    private textures: (THREE.Texture | null)[] = []
    private index = 0
    private phase: Phase = "showing"
    private phaseT = 0
    private progress = 0
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
        el.style.cursor = "pointer"
        el.style.touchAction = "manipulation"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: REVEAL_VERTEX,
            fragmentShader: REVEAL_FRAGMENT,
            transparent: true,
            depthWrite: false,
            // The wave tips the sheet far enough that its back is visible at the
            // rim; single-sided it punches holes there.
            side: THREE.DoubleSide,
            uniforms: {
                uTexture: { value: null },
                uTime: { value: 0 },
                uProgress: { value: 0 },
                uWave: { value: 0 },
                uGrain: { value: DEFAULTS.grain },
                uFocusY: { value: 0.5 },
                uRes: { value: new THREE.Vector2(1, 1) },
                uImageRes: { value: new THREE.Vector2(1, 1) },
            },
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)

        el.addEventListener("pointerdown", this.onPointerDown)
        this.loadAll()
    }

    private onPointerDown = () => {
        // Clicks during a transition are dropped rather than queued: a queue
        // lets an impatient viewer skip past photographs they never saw.
        if (this.phase !== "idle" || this.sources.length < 2) return
        this.phase = "hiding"
        this.phaseT = 0
    }

    private loadAll() {
        // Entries with no image are dropped, and the anchors are dropped with
        // them — the two lists have to stay index-aligned or a photograph is
        // cropped by its neighbour's anchor.
        this.items = itemsOf(this.cfg)
        const sources = this.items.map(srcOf)
        this.sources = sources
        this.textures = sources.map(() => null)
        this.index = 0
        this.phase = "showing"
        this.phaseT = 0
        this.progress = 0
        sources.forEach((src, i) => {
            loadTexture(src).then((tex) => {
                // The list may have been edited while this was in flight.
                if (this.disposed || this.sources[i] !== src) return
                this.textures[i] = tex
                if (i === this.index) this.applyTexture()
            })
        })
    }

    /**
     * Writes the current texture, its crop anchor and re-solves the plane from
     * its aspect. The anchor is read here rather than in `settingsFor` because
     * it belongs to the entry being shown, not to the component.
     */
    private applyTexture() {
        const tex = this.textures[this.index] ?? null
        this.material.uniforms.uTexture.value = tex
        const img = tex?.image as { width?: number; height?: number } | undefined
        const iw = img?.width || 1
        const ih = img?.height || 1
        ;(this.material.uniforms.uImageRes.value as THREE.Vector2).set(iw, ih)
        // Read off the live config rather than the snapshot taken at load, so
        // dragging the anchor moves the crop while the photograph is on screen.
        const live = itemsOf(this.cfg)
        this.material.uniforms.uFocusY.value = focusOf(
            live[this.index] ?? this.items[this.index]
        )
        this.layout()
    }

    /**
     * The card is given in pixels but the scene is in world units, so it is
     * converted through the one ratio the camera fixes: FRAME_H world units
     * spans the container's height. Cover fills the card and lets CoverUV crop;
     * contain shrinks the plane to the photograph's own aspect inside the card,
     * where the uv is then an identity and nothing is cropped at all.
     */
    private layout() {
        const aspect = Math.max(1e-3, this.width / Math.max(1, this.height))
        const S = settingsFor(this.cfg)
        const res = this.material.uniforms.uImageRes.value as THREE.Vector2
        const perPx = FRAME_H / Math.max(1, this.height)

        let planeW = S.cardWidth * perPx
        let planeH = S.cardHeight * perPx
        if (this.cfg.fit === "contain") {
            const iw = res.x || 1
            const ih = res.y || 1
            const s = Math.min(planeW / iw, planeH / ih)
            planeW = iw * s
            planeH = ih * s
        }

        this.mesh.scale.set(planeW, planeH, 1)
        ;(this.material.uniforms.uRes.value as THREE.Vector2).set(planeW, planeH)
        // Measured against the plane's own height, so the buckle reads the same
        // whether the picture is a thumbnail or fills the frame.
        this.material.uniforms.uWave.value = planeH * 0.65 * S.ripple

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
        this.material.uniforms.uGrain.value = settingsFor(cfg).grain
        // Only an edit to the photographs themselves restarts the sequence.
        // Everything else — an anchor dragged, the card resized — is a uniform
        // write and a re-layout on whatever is currently on screen.
        if (sourcesOf(cfg) !== sourcesOf(prev)) {
            this.loadAll()
        }
        this.applyTexture()
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
        // A tab returning from the background must not jump the reveal to its end.
        if (dt > 0.05) dt = 0.05

        this.time += dt
        const S = settingsFor(this.cfg)

        if (this.phase !== "idle") {
            this.phaseT += dt
            const t = Math.min(1, this.phaseT / S.duration)
            const eased = this.ease(t)
            this.progress = this.phase === "hiding" ? 1 - eased : eased
            if (t >= 1) {
                if (this.phase === "hiding") {
                    // Swapped at the bottom of the dip, where nothing is drawn.
                    const n = Math.max(1, this.sources.length)
                    this.index = (this.index + 1) % n
                    this.applyTexture()
                    this.phase = "showing"
                    this.phaseT = 0
                    this.progress = 0
                } else {
                    this.phase = "idle"
                    this.progress = 1
                }
            }
        }

        this.material.uniforms.uTime.value = this.time
        this.material.uniforms.uProgress.value = this.progress
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointerdown", this.onPointerDown)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
        // Textures are shared through the module cache and are deliberately not
        // disposed — another instance on the page may still be drawing them.
    }
}

export interface ImageRevealProps extends Config {
    style?: React.CSSProperties
}

export default function ImageReveal(props: ImageRevealProps) {
    const {
        images = DEFAULTS.images,
        transition = DEFAULTS.transition,
        ripple = DEFAULTS.ripple,
        grain = DEFAULTS.grain,
        fit = DEFAULTS.fit as Config["fit"],
        cardWidth = DEFAULTS.cardWidth,
        cardHeight = DEFAULTS.cardHeight,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<ImageRevealScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        images,
        transition,
        ripple,
        grain,
        fit,
        cardWidth,
        cardHeight,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: ImageRevealScene
        try {
            scene = new ImageRevealScene(container, cfgRef.current)
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
        ripple,
        grain,
        fit,
        cardWidth,
        cardHeight,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Photograph that dissolves into noise and reveals the next one when clicked"
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

ImageReveal.displayName = "Image Reveal"
