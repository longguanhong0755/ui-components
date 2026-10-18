"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Brick Projection — a photograph carried in by a swarm of tumbling bricks, each
 * holding one chip of it, and legible only in the instant they all line up.
 *
 * After the Codrops texture-projection demo by Marco Fugaro (the noise variant).
 *
 * The mechanism is one idea. Every brick is scattered by Poisson-disc sampling
 * over a rectangle, and the chip of photograph it carries is decided *once*, by
 * where it lands in that rectangle — not by where it currently is. Then each one
 * flies its own path from far off the left, through its landing spot, and away
 * to the right. The picture therefore has no existence of its own: it is what
 * you see when every brick happens to be at the middle of its own curve at the
 * same moment, and it dissolves as they move on.
 *
 * That is why the projection is baked and not live. Sampling the photograph at a
 * brick's *current* position would repaint each brick as it flew, and the swarm
 * would read as a screen of drifting noise that never resolves into anything.
 *
 * The curves are the second half of the effect. Each is 51 control points run
 * through a Catmull-Rom spline: z dips to -1 at both ends and returns to 0 at
 * the middle, so bricks come from behind, pass exactly through the picture
 * plane, and fall back; y is squeezed toward the centreline at the ends and
 * opened to full spread in the middle, so the swarm gathers into the picture
 * rather than sliding into it; and a noise term wanders the path vertically,
 * strongest at the ends and exactly zero at the middle. Each brick is then
 * rotated to face along the tangent of its own curve, which is what makes them
 * tumble level as they arrive and pitch away as they leave.
 *
 * Clicking the right half sends the swarm away to the right and the next
 * photograph follows it back in; clicking the left half runs the same thing
 * mirrored. The direction is one sign — which end of the curve a brick exits
 * from and which end it re-enters at — so the picture always arrives travelling
 * the way the click asked for.
 *
 * The projection needs no camera maths at all here, and that is worth saying:
 * the midpoint of every curve sits exactly on the plane z = 0, which is exactly
 * where the photograph hangs, so projecting from the camera and mapping the
 * landing spot straight onto the rectangle give the same uv. The original
 * carries a saved model matrix per instance to do in the shader what two
 * divisions do here on the CPU.
 */

/** The camera never moves. Everything below is measured against these two. */
const CAM_Z = 5
const CAM_FOV = 45

/** The photograph's share of the viewport, then the swarm's overspill past it. */
const TEXTURE_SCALE = 0.7
const SPREAD_X = 1.5
const SPREAD_Y = 1.1

/** How far behind the picture plane a brick starts and ends its flight. */
const STARTING_Z = -1

/** Control points per curve. Odd, so one of them is exactly the midpoint. */
const SEGMENTS = 51

/** Seconds for one brick to cross, before its own delay is added. Only used
 * when a Transition arrives without a duration on it. */
const FALLBACK_DURATION = 1

/**
 * Splits a brick's delay between waiting to start and taking longer to travel.
 * At 0 the swarm leaves together and arrives strung out; at 1 it leaves strung
 * out and arrives together. Half of each is what gives the drift its weight.
 */
const DELAY_SPLIT = 0.5

/** The wander on the flight path: gentle, and long compared to a brick. */
const PATH_NOISE_FREQ = 0.25
const PATH_NOISE_AMP = 0.6

/** How coarsely the delay noise is sampled across the landing rectangle. */
const DELAY_FREQ = 0.5

/**
 * The standing wave the whole swarm breathes through. The panel owns only its
 * height; these two decide that it reads as a slow swell rather than a shiver,
 * and there is no setting of them worth the two extra controls.
 */
const WAVE_SPEED = 0.2
const WAVE_FREQ = 0.5

/**
 * ponytail: hard cap on the swarm. Every brick walks all 51 of its control
 * points every frame — the source does the same — so this is a CPU ceiling, not
 * a GPU one. If it ever needs to go higher, the fix is to update only the four
 * control points the spline actually reads at the brick's current position.
 */
const MAX_BRICKS = 1800

const DEFAULTS = {
    images: [
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
        },
    ],
    brick: "#9E9B94",
    transition: {
        defaultValue: {"ease":"easeInOut","mass":1,"type":"tween","delay":1.5,"damping":60,"duration":1,"stiffness":800},
        type: "tween",
        duration: 1,
        ease: "easeInOut",
        // Not a wait before anything starts — see the control's note. This is
        // the spread between the first brick to move and the last.
        delay: 1.5,
    } as Transition,
    density: 20,
    brickSize: 8,
    waving: 10,
    pushRadius: 120,
    pushStrength: 10,
}

type ResponsiveImage = { src?: string; srcSet?: string; alt?: string } | string

type Transition = {
    type?: string
    duration?: number
    ease?: string | number[]
}

type Config = {
    images: ResponsiveImage[]
    brick: string
    transition: Transition
    density: number
    brickSize: number
    waving: number
    pushRadius: number
    pushStrength: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

function srcOf(image: ResponsiveImage): string {
    if (typeof image === "string") return image
    return image?.src ?? ""
}

function sourcesOf(cfg: Config): string[] {
    const list = Array.isArray(cfg.images) ? cfg.images : []
    const urls = list.map(srcOf).filter(Boolean)
    return urls.length ? urls : DEFAULTS.images.map((i) => i.src)
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
 * Samples a Framer Transition by hand. There is no motion runtime inside a raw
 * canvas, so the curve is solved here: Newton on the bezier's x to recover the
 * parameter, then its y. A spring has no closed form to sample and falls back to
 * the default curve rather than pretending.
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

/** Never zero: a duration of 0 divides the ramp by nothing and blanks the frame. */
function durationOf(transition?: Transition): number {
    return Math.max(0.05, transition?.duration ?? FALLBACK_DURATION)
}

/** Panel values are whole numbers; the swarm wants the real ones. */
function settingsFor(cfg: Config) {
    const density = clamp(cfg.density, 1, 20, DEFAULTS.density)
    return {
        // Squared, because the swarm has to roughly double before the picture
        // looks meaningfully more resolved, and the low end is where a handful
        // of bricks either reads as a mosaic or reads as confetti.
        bricks: Math.min(MAX_BRICKS, Math.round(120 + density * density * 7)),
        // 8 is the source's 0.1 x 0.2 x 0.1 brick.
        brickSize: clamp(cfg.brickSize, 1, 20, DEFAULTS.brickSize) * 0.125,
        // Straight out of the Transition. A Framer delay normally holds an
        // animation back; there is no single animation to hold back here, so it
        // is spent on the spread between bricks instead — see the control.
        stagger: Math.max(0, cfg.transition?.delay ?? 1.5),
        waveAmp: clamp(cfg.waving, 0, 20, DEFAULTS.waving) * 0.02,
        // Kept in CSS pixels rather than world units: the swarm is laid out
        // against the viewport, so a world-unit radius quietly changed size with
        // the frame and the same setting shoved twice as much on a small one.
        pushRadius: clamp(cfg.pushRadius, 40, 400, DEFAULTS.pushRadius),
        pushStrength:
            clamp(cfg.pushStrength, 0, 20, DEFAULTS.pushStrength) * 0.1,
    }
}

/** Value noise in -1..1. Cheaper than the simplex the source uses, and the two
 * are indistinguishable at these frequencies — nothing here samples fast enough
 * to show value noise's grid. */
function hash2(x: number, y: number): number {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
}

function noise2(x: number, y: number): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const a = hash2(xi, yi)
    const b = hash2(xi + 1, yi)
    const c = hash2(xi, yi + 1)
    const d = hash2(xi + 1, yi + 1)
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}

const quartIn = (t: number) => t * t * t * t
const quartOut = (t: number) => 1 - (1 - t) ** 4

/** Linear map with a value pinned at the middle as well as at both ends. */
function mapTriple(
    v: number,
    inMin: number,
    inMid: number,
    inMax: number,
    outMin: number,
    outMid: number,
    outMax: number
): number {
    if (v < inMid) return outMin + ((v - inMin) / (inMid - inMin)) * (outMid - outMin)
    return outMid + ((v - inMid) / (inMax - inMid)) * (outMax - outMid)
}

/**
 * Bridson's Poisson-disc sampling: points at least `radius` apart, otherwise
 * random. A jittered grid would be a tenth of this code and is what the swarm
 * must not look like — even at heavy jitter the rows survive as faint scan
 * lines across the picture, which is the one artefact a mosaic cannot carry.
 */
function poissonDisc(width: number, height: number, radius: number): number[][] {
    const k = 12
    const cell = radius / Math.SQRT2
    const cols = Math.ceil(width / cell)
    const rows = Math.ceil(height / cell)
    const grid = new Int32Array(cols * rows).fill(-1)
    const points: number[][] = []
    const active: number[] = []

    const insert = (x: number, y: number) => {
        const i = points.length
        points.push([x, y])
        grid[Math.floor(x / cell) + cols * Math.floor(y / cell)] = i
        active.push(i)
    }

    const fits = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return false
        const cx = Math.floor(x / cell)
        const cy = Math.floor(y / cell)
        for (let gy = Math.max(0, cy - 2); gy <= Math.min(rows - 1, cy + 2); gy++) {
            for (let gx = Math.max(0, cx - 2); gx <= Math.min(cols - 1, cx + 2); gx++) {
                const id = grid[gx + cols * gy]
                if (id < 0) continue
                const dx = points[id][0] - x
                const dy = points[id][1] - y
                if (dx * dx + dy * dy < radius * radius) return false
            }
        }
        return true
    }

    insert(Math.random() * width, Math.random() * height)
    while (active.length) {
        const pick = (Math.random() * active.length) | 0
        const [px, py] = points[active[pick]]
        let placed = false
        for (let attempt = 0; attempt < k; attempt++) {
            const angle = Math.random() * Math.PI * 2
            // Between one and two radii: closer would collide, further leaves
            // holes the next round has to find its way back into.
            const r = radius * (1 + Math.random())
            const x = px + Math.cos(angle) * r
            const y = py + Math.sin(angle) * r
            if (fits(x, y)) {
                insert(x, y)
                placed = true
                break
            }
        }
        if (!placed) active.splice(pick, 1)
    }
    return points
}

const BRICK_VERTEX = /* glsl */ `
attribute vec2 aUv;
attribute float aSlot;

varying vec2 vUv;
varying float vSlot;
varying vec3 vNormal;

void main() {
    vUv = aUv;
    vSlot = aSlot;
    // World space, not view space: the key light stays put while the bricks turn
    // through it, and that roll along the flight path is most of what makes them
    // read as solid blocks rather than flat chips.
    vNormal = normalize(mat3(instanceMatrix) * normal);
    gl_Position =
        projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`

const BRICK_FRAGMENT = /* glsl */ `
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec3 uBrick;

varying vec2 vUv;
varying float vSlot;
varying vec3 vNormal;

void main() {
    // Two slots so the outgoing photograph and the incoming one can be on screen
    // together: a brick swaps to the other slot at the far end of its flight,
    // out of sight, and carries the new picture back in.
    vec4 photo = vSlot < 0.5 ? texture2D(uTexA, vUv) : texture2D(uTexB, vUv);

    // Bricks land outside the photograph's rectangle as well as inside it. Those
    // keep their own colour, and that grey border is what frames the picture.
    vec2 within = step(vec2(0.0), vUv) * step(vUv, vec2(1.0));
    vec3 base = mix(uBrick, photo.rgb, within.x * within.y);

    // The source's fill plus one key from above and behind the viewer.
    float key = max(dot(normalize(vNormal), normalize(vec3(0.0, 10.0, 10.0))), 0.0);
    gl_FragColor = vec4(base * (0.72 + 0.6 * key), 1.0);
}
`

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

class BrickScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100)
    private material: THREE.ShaderMaterial
    private geometry: THREE.BoxGeometry | null = null
    private mesh: THREE.InstancedMesh | null = null
    private dummy = new THREE.Object3D()

    private width = 1
    private height = 1
    private builtAspect = 0

    // The rectangle the bricks land in, and the rectangle the photograph hangs
    // in. The first is the second, widened — the overspill is the grey border.
    private boxW = 1
    private boxH = 1

    private count = 0
    // All 51 control points of every curve, live and pristine. One flat array
    // rather than an array of Vector3 per brick: the whole set is rewritten
    // every frame and the object version spends its time chasing pointers.
    private curve = new Float32Array(0)
    private target = new Float32Array(0)
    private landX = new Float32Array(0)
    private landY = new Float32Array(0)
    private delay = new Float32Array(0)
    private pct = new Float32Array(0)
    private pctFrom = new Float32Array(0)
    private pctTo = new Float32Array(0)
    private tStart = new Float32Array(0)
    private slot = new Float32Array(0)
    private uvs = new Float32Array(0)

    private textures: (THREE.Texture | null)[] = []
    private imageIndex = 0
    private liveSlot = 0
    private pendingSlot = -1
    // +1 leaves right and returns from the left, -1 mirrors it. Held for the
    // whole transition, because a brick that has already left has to be told
    // which end to come back in at long after the click that sent it.
    private dir = 1
    private ease = makeEaseFn()
    private duration = FALLBACK_DURATION

    private time = 0
    private mouse: THREE.Vector3 | null = null
    private frameId = 0
    private lastT = 0
    private disposed = false
    private buildToken = 0

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        this.applyTransitions(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        this.camera.position.set(0, 0, CAM_Z)

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTexA: { value: null },
                uTexB: { value: null },
                uBrick: { value: new THREE.Color(cfg.brick) },
            },
            vertexShader: BRICK_VERTEX,
            fragmentShader: BRICK_FRAGMENT,
        })

        this.loadAll()
        container.addEventListener("pointermove", this.onPointerMove)
        container.addEventListener("pointerleave", this.onPointerLeave)
        container.addEventListener("click", this.onClick)
    }

    private applyTransitions(cfg: Config) {
        this.ease = makeEaseFn(cfg.transition)
        this.duration = durationOf(cfg.transition)
    }

    private loadAll() {
        const urls = sourcesOf(this.cfg)
        const token = ++this.buildToken
        Promise.all(urls.map(loadTexture)).then((textures) => {
            if (this.disposed || token !== this.buildToken) return
            this.textures = textures.filter(Boolean)
            if (!this.textures.length) return
            this.imageIndex = 0
            this.liveSlot = 0
            this.pendingSlot = -1
            this.material.uniforms.uTexA.value = this.textures[0]
            this.material.uniforms.uTexB.value =
                this.textures[1 % this.textures.length]
            this.build()
        })
    }

    /** Half-height of what the camera sees at a given z. */
    private visibleHeightAt(z: number): number {
        const depth = z < CAM_Z ? z - CAM_Z : z + CAM_Z
        return 2 * Math.tan(((CAM_FOV * Math.PI) / 180) / 2) * Math.abs(depth)
    }

    private aspectOf(texture: THREE.Texture | null): number {
        const image: any = texture?.image
        const w = image?.naturalWidth || image?.width || 1
        const h = image?.naturalHeight || image?.height || 1
        return w / h
    }

    /**
     * The rectangle one photograph hangs in: the source fits the long side to
     * TEXTURE_SCALE of the viewport and lets the short side follow the aspect,
     * so a portrait and a landscape both sit comfortably inside the frame.
     */
    private photoRect(texture: THREE.Texture | null): [number, number] {
        const aspect = Math.max(1e-3, this.width / Math.max(1, this.height))
        const visibleH = this.visibleHeightAt(0)
        const ratio = this.aspectOf(texture)
        if (ratio < 1) {
            const h = visibleH * TEXTURE_SCALE
            return [h * ratio, h]
        }
        const w = visibleH * aspect * TEXTURE_SCALE
        return [w, w / ratio]
    }

    /** Rebuilds the whole swarm: landing spots, curves, delays, instances. */
    private build() {
        if (!this.textures.length) return
        const S = settingsFor(this.cfg)
        const aspect = Math.max(1e-3, this.width / Math.max(1, this.height))
        this.builtAspect = aspect

        const [pw, ph] = this.photoRect(this.textures[this.imageIndex])
        this.boxW = pw * SPREAD_X
        this.boxH = ph * SPREAD_Y

        // Solve the disc radius from the swarm size wanted rather than exposing
        // the radius: the same radius gives wildly different counts on a wide
        // frame and a narrow one, and it is the count the eye is reading.
        const area = this.boxW * this.boxH
        const radius = Math.sqrt((0.6 * area) / S.bricks)

        let points = poissonDisc(this.boxW, this.boxH, radius)

        // Ragged left and right borders. Three sines beating against each other
        // never repeat over the height of the frame, so the edge reads as torn
        // rather than as a wave — a straight cut here reads as a cropped photo
        // and kills the sense that the bricks arrived from somewhere.
        points = points.filter(([x, y]) => {
            const wave =
                Math.sin(y * 3) * Math.sin(y * 2) * Math.sin(y * 4.7) * 0.5
            if (x < (wave + 0.5) * 0.7) return false
            if (x > (wave - 0.5) * 0.7 + this.boxW) return false
            return true
        })

        const n = Math.min(points.length, MAX_BRICKS)
        this.count = n
        this.curve = new Float32Array(n * SEGMENTS * 3)
        this.target = new Float32Array(n * SEGMENTS * 3)
        this.landX = new Float32Array(n)
        this.landY = new Float32Array(n)
        this.delay = new Float32Array(n)
        this.pct = new Float32Array(n)
        this.pctFrom = new Float32Array(n)
        this.pctTo = new Float32Array(n)
        this.tStart = new Float32Array(n)
        this.slot = new Float32Array(n)
        this.uvs = new Float32Array(n * 2)

        // Where the flight starts and ends: fully off the side of the frame at
        // the depth the bricks travel at, plus the swarm's own width, so nothing
        // is ever seen popping into existence.
        const startX =
            -(this.visibleHeightAt(STARTING_Z) * aspect) / 2 - this.boxW * 0.6

        for (let i = 0; i < n; i++) {
            const x = points[i][0] - this.boxW / 2
            const y = points[i][1] - this.boxH / 2
            this.landX[i] = x
            this.landY[i] = y
            this.buildCurve(i, x, y, startX)
            this.delay[i] =
                (noise2(x * DELAY_FREQ, y * DELAY_FREQ) * 0.5 + 0.5) * S.stagger
            this.pctTo[i] = 0.5
            this.setUv(i, pw, ph)
        }

        // Shift so the earliest brick waits for nothing — otherwise raising
        // Stagger delays the whole swarm instead of spreading it.
        let minDelay = Infinity
        for (let i = 0; i < n; i++) minDelay = Math.min(minDelay, this.delay[i])
        if (isFinite(minDelay)) {
            for (let i = 0; i < n; i++) this.delay[i] -= minDelay
        }

        this.curve.set(this.target)
        this.rebuildMesh(S.brickSize)
        this.time = 0
        this.lastT = performance.now()
    }

    private setUv(i: number, pw: number, ph: number) {
        // The whole projection. The midpoint of every curve is exactly on z = 0,
        // which is exactly where the photograph hangs, so the landing spot maps
        // straight onto the rectangle and no camera matrix is involved.
        this.uvs[i * 2] = this.landX[i] / pw + 0.5
        this.uvs[i * 2 + 1] = this.landY[i] / ph + 0.5
    }

    private buildCurve(i: number, x: number, y: number, startX: number) {
        const half = (SEGMENTS - 1) / 2
        const base = i * SEGMENTS * 3
        for (let j = 0; j < SEGMENTS; j++) {
            const offsetX = startX + ((-startX - startX) * j) / (SEGMENTS - 1)
            // 1 at both ends, 0 at the middle: everything that makes a path a
            // path has to vanish exactly where the picture is assembled.
            const wander = mapTriple(j, 0, half, SEGMENTS - 1, 1, 0, 1)
            const noiseY =
                noise2(0, offsetX * PATH_NOISE_FREQ) *
                PATH_NOISE_AMP *
                quartOut(wander)
            // Squeezes the swarm toward the centreline at the ends so it gathers
            // into the picture rather than sliding in sideways as a block.
            const scaleY = 0.2 + quartIn(1 - wander) * 0.8
            const offsetZ = mapTriple(
                j,
                0,
                half,
                SEGMENTS - 1,
                STARTING_Z,
                0,
                STARTING_Z
            )
            const k = base + j * 3
            this.target[k] = x + offsetX
            this.target[k + 1] = y * scaleY + noiseY
            this.target[k + 2] = offsetZ
        }
    }

    private rebuildMesh(brickSize: number) {
        if (this.mesh) {
            this.scene.remove(this.mesh)
            this.mesh.dispose()
        }
        this.geometry?.dispose()
        // The source's brick: twice as long as it is deep, and laid on its side
        // by the tangent it is rotated onto.
        this.geometry = new THREE.BoxGeometry(0.1, 0.2, 0.1)
        this.geometry.setAttribute(
            "aUv",
            new THREE.InstancedBufferAttribute(this.uvs, 2)
        )
        this.geometry.setAttribute(
            "aSlot",
            new THREE.InstancedBufferAttribute(this.slot, 1)
        )
        this.mesh = new THREE.InstancedMesh(
            this.geometry,
            this.material,
            Math.max(1, this.count)
        )
        // The curves place every brick and three cannot know where they are.
        this.mesh.frustumCulled = false
        const identity = new THREE.Matrix4()
        for (let i = 0; i < this.count; i++) this.mesh.setMatrixAt(i, identity)
        this.mesh.instanceMatrix.needsUpdate = true
        this.mesh.scale.setScalar(1)
        this.dummy.scale.setScalar(brickSize)
        this.scene.add(this.mesh)
    }

    private onPointerMove = (e: PointerEvent) => {
        if (this.disposed) return
        const rect = this.container.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        // Unprojected onto the plane just in front of the picture, so the push
        // lands where the cursor looks like it is rather than where the ray
        // happens to cross z = 0.
        const v = new THREE.Vector3(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
            0.5
        )
        v.unproject(this.camera)
        v.sub(this.camera.position).normalize()
        const distance = (-0.1 - this.camera.position.z) / v.z
        this.mouse = this.camera.position.clone().add(v.multiplyScalar(distance))
    }

    private onPointerLeave = () => {
        this.mouse = null
    }

    private onClick = (e: MouseEvent) => {
        if (this.disposed || this.pendingSlot >= 0) return
        const n = this.textures.length
        if (n < 2 || !this.count) return
        const rect = this.container.getBoundingClientRect()
        if (!rect.width) return
        // Which half was hit, not which way the pointer was moving: a click has
        // no direction of its own, and splitting the frame is the one gesture
        // that needs no affordance drawn on top of the picture.
        this.dir = e.clientX - rect.left < rect.width / 2 ? -1 : 1

        // Send everything to the far end. Each brick swaps its slot when it gets
        // there and comes straight back with the next picture, so the outgoing
        // and incoming photographs overlap in the middle of the frame the way
        // the source's two slide objects do.
        this.pendingSlot = 1 - this.liveSlot
        this.imageIndex = (this.imageIndex + this.dir + n) % n
        const next = this.textures[this.imageIndex]
        if (this.pendingSlot === 0) this.material.uniforms.uTexA.value = next
        else this.material.uniforms.uTexB.value = next
        const exitAt = this.dir > 0 ? 1 : 0
        for (let i = 0; i < this.count; i++) {
            this.pctFrom[i] = this.pct[i]
            this.pctTo[i] = exitAt
            this.tStart[i] = this.time
        }
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        const aspect = this.width / this.height
        this.camera.aspect = aspect
        this.camera.updateProjectionMatrix()
        // The layout is solved from the visible width, so a real change of shape
        // needs the swarm laid out again. Gated, because a ResizeObserver on the
        // Framer canvas fires on every drag frame and a rebuild is not free.
        if (this.builtAspect && Math.abs(aspect / this.builtAspect - 1) > 0.1) {
            this.build()
        }
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        ;(this.material.uniforms.uBrick.value as THREE.Color).set(cfg.brick)
        this.applyTransitions(cfg)
        if (sourcesOf(cfg).join("|") !== sourcesOf(prev).join("|")) {
            this.loadAll()
            return
        }
        // Only Density owns the landing spots and the curves built from them.
        if (cfg.density !== prev.density) {
            this.build()
            return
        }
        if (cfg.transition?.delay !== prev.transition?.delay) {
            const S = settingsFor(cfg)
            let minDelay = Infinity
            for (let i = 0; i < this.count; i++) {
                this.delay[i] =
                    (noise2(this.landX[i] * DELAY_FREQ, this.landY[i] * DELAY_FREQ) *
                        0.5 +
                        0.5) *
                    S.stagger
                minDelay = Math.min(minDelay, this.delay[i])
            }
            if (isFinite(minDelay)) {
                for (let i = 0; i < this.count; i++) this.delay[i] -= minDelay
            }
        }
        if (cfg.brickSize !== prev.brickSize) {
            this.dummy.scale.setScalar(settingsFor(cfg).brickSize)
        }
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
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
        // A returning tab must not teleport the whole swarm across the frame.
        if (dt > 0.05) dt = 0.05
        this.time += dt

        if (this.mesh && this.count) this.advance(dt)
        this.renderer.render(this.scene, this.camera)
    }

    private advance(dt: number) {
        const S = settingsFor(this.cfg)
        const mesh = this.mesh!
        // The source lerps these once per frame; expressed as rates so a 120Hz
        // display pushes the same distance and springs back at the same speed.
        const pushGrip = 1 - Math.exp(-dt * 13.4)
        const relax = 1 - Math.exp(-dt * 18.9)
        const mouse = this.mouse
        // Pixels to world units at the depth the cursor is projected onto, so
        // the panel's radius is the radius on screen.
        const pushRadius =
            (S.pushRadius * this.visibleHeightAt(-0.1)) / Math.max(1, this.height)
        const pushStrength = S.pushStrength
        let allArrived = this.pendingSlot >= 0

        for (let i = 0; i < this.count; i++) {
            // Both legs are timed by the one Transition — leaving and coming
            // back are the same flight read in opposite directions, and two
            // curves on it only ever made the swap look lopsided.
            const entering = this.pctTo[i] === 0.5
            const ramp = clamp01(
                (this.time - (this.tStart[i] + this.delay[i] * DELAY_SPLIT)) /
                    (this.duration + this.delay[i] * (1 - DELAY_SPLIT))
            )
            this.pct[i] =
                this.pctFrom[i] +
                (this.pctTo[i] - this.pctFrom[i]) * this.ease(ramp)

            if (this.pendingSlot >= 0) {
                if (!entering && ramp >= 1) {
                    // Off the side and out of sight: swap the picture this brick
                    // carries and start it back in from the opposite end. Tested
                    // on the ramp and not on the position, because a Back ease
                    // overshoots the end and would trip a position test early,
                    // swapping the picture while the brick is still on screen.
                    this.slot[i] = this.pendingSlot
                    const [pw, ph] = this.photoRect(
                        this.textures[this.imageIndex]
                    )
                    this.setUv(i, pw, ph)
                    const from = this.dir > 0 ? 0 : 1
                    this.pct[i] = from
                    this.pctFrom[i] = from
                    this.pctTo[i] = 0.5
                    this.tStart[i] = this.time
                    allArrived = false
                } else if (!entering || ramp < 1) {
                    allArrived = false
                }
            }

            const base = i * SEGMENTS * 3
            // Only a brick actually in flight is worth walking point by point;
            // one parked at either end is rigid and its curve cannot be seen.
            if (this.pct[i] > 0 && this.pct[i] < 1) {
                for (let j = 0; j < SEGMENTS; j++) {
                    const k = base + j * 3
                    let px = this.curve[k]
                    let py = this.curve[k + 1]
                    const tx = this.target[k]
                    const ty = this.target[k + 1]

                    if (mouse && pushStrength > 0) {
                        const dx = px - mouse.x
                        const dy = py - mouse.y
                        const dz = this.curve[k + 2] - mouse.z
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
                        if (dist < pushRadius && dist > 1e-5) {
                            // Pushed out to the edge of the sphere along the ray
                            // from the cursor, then eased that way — a hard set
                            // makes the swarm snap and lose its weight.
                            const amount =
                                ((pushRadius - dist) / dist) * pushStrength
                            px += dx * amount * pushGrip
                            py += dy * amount * pushGrip
                        }
                        px += (tx - px) * relax
                        py += (ty - py) * relax
                    } else {
                        px = tx
                        py = ty
                    }

                    this.curve[k] = px
                    this.curve[k + 1] = py
                    // The swell. Read off the pristine point, so a curve the
                    // cursor is bending still breathes on the same clock as the
                    // rest and does not drift out of the wave.
                    this.curve[k + 2] =
                        this.target[k + 2] +
                        noise2(tx * WAVE_FREQ - this.time * WAVE_SPEED, ty * WAVE_FREQ) *
                            S.waveAmp
                }
            }

            this.place(mesh, i, base, this.pct[i])
        }

        mesh.instanceMatrix.needsUpdate = true
        const slotAttr = this.geometry?.getAttribute("aSlot")
        if (slotAttr) slotAttr.needsUpdate = true
        const uvAttr = this.geometry?.getAttribute("aUv")
        if (uvAttr) uvAttr.needsUpdate = true

        if (this.pendingSlot >= 0 && allArrived) {
            this.liveSlot = this.pendingSlot
            this.pendingSlot = -1
        }
    }

    private up = new THREE.Vector3(0, 1, 0)
    private axis = new THREE.Vector3()
    private tangent = new THREE.Vector3()
    // Reused every brick every frame. Allocating these inside place() hands the
    // collector two arrays per brick per frame, which at a full swarm is a
    // hitch every couple of seconds.
    private scratchP = new Float64Array(3)
    private scratchD = new Float64Array(3)

    /**
     * Position and orientation at one point along a curve. Uniform Catmull-Rom
     * rather than three's centripetal parameterisation: the control points are
     * evenly spaced in x, which is the case where the two agree, and this skips
     * building a Curve object and an arc-length table per brick per frame.
     */
    private place(
        mesh: THREE.InstancedMesh,
        i: number,
        base: number,
        t: number
    ) {
        const last = SEGMENTS - 1
        const u = clamp01(t) * last
        const seg = Math.min(last - 1, Math.floor(u))
        const w = u - seg
        const i0 = Math.max(0, seg - 1)
        const i1 = seg
        const i2 = Math.min(last, seg + 1)
        const i3 = Math.min(last, seg + 2)

        const px = this.scratchP
        const dv = this.scratchD
        for (let c = 0; c < 3; c++) {
            const p0 = this.curve[base + i0 * 3 + c]
            const p1 = this.curve[base + i1 * 3 + c]
            const p2 = this.curve[base + i2 * 3 + c]
            const p3 = this.curve[base + i3 * 3 + c]
            const a = 2 * p1
            const b = p2 - p0
            const cc = 2 * p0 - 5 * p1 + 4 * p2 - p3
            const d = -p0 + 3 * p1 - 3 * p2 + p3
            px[c] = 0.5 * (a + b * w + cc * w * w + d * w * w * w)
            // Analytic derivative, so the tangent is exact at the ends too —
            // a finite difference collapses on the last segment.
            dv[c] = 0.5 * (b + 2 * cc * w + 3 * d * w * w)
        }

        this.dummy.position.set(px[0], px[1], px[2])
        this.tangent.set(dv[0], dv[1], dv[2])
        if (this.tangent.lengthSq() > 1e-12) {
            this.tangent.normalize()
            this.axis.crossVectors(this.up, this.tangent)
            const len = this.axis.length()
            if (len > 1e-6) {
                this.axis.divideScalar(len)
                const dot = Math.max(-1, Math.min(1, this.up.dot(this.tangent)))
                this.dummy.quaternion.setFromAxisAngle(this.axis, Math.acos(dot))
            }
        }
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointermove", this.onPointerMove)
        this.container.removeEventListener("pointerleave", this.onPointerLeave)
        this.container.removeEventListener("click", this.onClick)
        if (this.mesh) {
            this.scene.remove(this.mesh)
            this.mesh.dispose()
        }
        this.geometry?.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.parentNode?.removeChild(canvas)
    }
}

export interface BrickProjectionProps {
    images?: ResponsiveImage[]
    brick?: string
    transition?: Transition
    density?: number
    brickSize?: number
    waving?: number
    pushRadius?: number
    pushStrength?: number
    style?: React.CSSProperties
}

export default function BrickProjection(props: BrickProjectionProps) {
    const {
        images = [{"src":"https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800"},{"src":"https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800"},{"src":"https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800"}],
        brick = DEFAULTS.brick,
        transition = {"type":"tween","stiffness":800,"damping":60,"mass":1,"duration":1,"ease":"easeInOut","delay":1.5},
        density = DEFAULTS.density,
        brickSize = DEFAULTS.brickSize,
        waving = DEFAULTS.waving,
        pushRadius = DEFAULTS.pushRadius,
        pushStrength = DEFAULTS.pushStrength,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<BrickScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        images,
        brick,
        transition,
        density,
        brickSize,
        waving,
        pushRadius,
        pushStrength,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BrickScene
        try {
            scene = new BrickScene(container, cfgRef.current)
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
        // Contents, not identity: a fresh array can arrive every render.
        Array.isArray(images) ? images.map(srcOf).join("|") : "",
        brick,
        transition?.duration,
        transition?.delay,
        String(transition?.ease),
        density,
        brickSize,
        waving,
        pushRadius,
        pushStrength,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Photograph carried by a swarm of flying bricks; click the right half for the next one, the left half for the previous"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                cursor:
                    Array.isArray(images) && images.length > 1
                        ? "pointer"
                        : "default",
                ...style,
            }}
        />
    )
}

BrickProjection.displayName = "Brick Projection"
BrickProjection.defaultProps = { ...DEFAULTS }
