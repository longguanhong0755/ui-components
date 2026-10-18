"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * RippleField — ten thousand charged specks standing in the interference rings
 * of a single moving attractor.
 *
 * Ported from a Processing sketch. Every speck carries a signed mass drawn from
 * a Gaussian, and the force toward the attractor is
 *
 *     f = sin(d * k) / d * mass
 *
 * which is the whole piece. The sine makes the pull reverse every half
 * wavelength, so the field is a set of concentric shells that alternate
 * attracting and repelling; specks pile up on the nodes between them and the
 * rings draw themselves. The 1/d keeps the far shells weak. The sign of the
 * mass decides which shells a speck falls into, so the two colours separate
 * into interleaved rings on their own rather than by being told to.
 *
 * Velocity is not integrated, it is REPLACED each step: `v = v * retain + f *
 * offset`. With the source's retain of 0.5 a speck has almost no memory, which
 * is why the field snaps into its rings instead of sloshing. Damping is that
 * retain, and it is the difference between a crisp standing pattern and a
 * smear.
 *
 * Nothing is ever cleared. Each step lays a translucent Background over the
 * whole frame and draws the specks on top, so the picture is a decaying
 * exponential of every position of the last few steps — that is the trail, and
 * Trail is that rectangle's alpha.
 *
 * Machinery, per rule 6's recipe: canvas and context built once in
 * useEffect([]), every live value read from a ref inside the loop, raw rAF, no
 * per-frame setState. Positions live in typed arrays and go straight to the
 * canvas.
 *
 * Deviations from the source, deliberate:
 *   - Drift. The sketch is driven entirely by the mouse; with the pointer away
 *     the field converges and sits dead, which on a Framer canvas — where
 *     there is no pointer at all — is the whole of what a designer would see.
 *     The attractor therefore walks a slow Lissajous path of its own, and the
 *     pointer takes it over while it is on the component. The path keeps
 *     advancing underneath, so a pointer leaving hands back without a jump.
 *   - Fixed 60Hz timestep. The sketch is frame-locked, so on a 120Hz display it
 *     would run at double speed and fade twice as fast. Steps are accumulated
 *     against a fixed 60Hz clock instead, and the fade and the draw happen once
 *     per STEP rather than per frame, so the trail decays at the same rate per
 *     unit time whatever the display does.
 *   - Everything is in drawing-buffer pixels with mass and ring spacing scaled
 *     by the device pixel ratio, so a retina frame is the same picture rather
 *     than the same picture at half scale.
 *   - The specks start from a fixed seed, so a canvas repaints the same field
 *     rather than a new one every render. Clicking still re-rolls it, which is
 *     the sketch's mousePressed.
 *
 * Held from the source and not exposed (rule 1): the Gaussian mass
 * distribution, the wrap-to-the-far-edge at the frame's edges (a hard teleport,
 * not a modulo, exactly as written), and the 1/d falloff.
 */

/** The source's sketch ran at 60 frames a second and assumed it. */
const STEP_HZ = 60
const MAX_STEPS_PER_FRAME = 3

/** Retina past this buys nothing on a field of one-pixel specks. */
const MAX_DPR = 1.5

/** The source's `randomGaussian() * 16`, at Force 100. */
const MASS = 16
/** The source's `sin(d * 0.04)`, as the wavelength it actually is. */
const REF_RING = (2 * Math.PI) / 0.04
/** The source's `fill(0, 32)`, as a fraction: this is Trail 50. */
const REF_FADE = 32 / 255
/** Below this the trail never resolves and the frame just fills in. */
const MIN_FADE = 0.004

/** How fast the attractor closes on where it is being asked to be. */
const CHASE = 0.14
/** Lissajous half-extents, as a fraction of the frame, and its two rates. */
const DRIFT_X = 0.34
const DRIFT_Y = 0.3
const DRIFT_A = 0.21
const DRIFT_B = 0.148
/** Seconds for one Lissajous lap at Drift 50. */
const DRIFT_REF = 0.55

/**
 * The specks start from this. The sketch re-rolls on every run; a constant
 * means a canvas repaints the same field instead of a new one each render, and
 * a click still re-rolls exactly as the sketch does.
 */
const SEED = 1917

const DEFAULTS = {
    background: "#000000",
    baseColor: "#00FFCA",
    accentColor: "#D400FF",
    density: 10,
    dotSize: 293,
    trail: 44,
    drift: 0,
    field: {
        defaultValue: {"force":300,"rings":202,"damping":1}, force: 100, rings: 157, damping: 50 },
}

type Field = { force: number; rings: number; damping: number }

type Config = {
    background: string
    baseColor: string
    accentColor: string
    density: number
    dotSize: number
    trail: number
    drift: number
    field: Field
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/* ------------------------------------------------------------------ colour */

let probeCtx: CanvasRenderingContext2D | null | undefined

/**
 * ControlType.Color does not hand back hex. It emits `rgb()`, `rgba()`,
 * `hsl()` and `var(--token, value)`, so the string goes through the browser's
 * own parser rather than a regex. Two sentinels catch a string the parser
 * rejected: a rejected assignment leaves the sentinel in place, so the two
 * reads disagree only when nothing was parsed.
 */
function parseColor(input: unknown, fallback: string): string {
    if (probeCtx === undefined) {
        probeCtx =
            typeof document === "undefined"
                ? null
                : document.createElement("canvas").getContext("2d")
    }
    const ctx = probeCtx
    if (!ctx) return fallback
    let s = String(input ?? "").trim()
    const v = s.match(/^var\(\s*--[^,]+,\s*([\s\S]+)\)$/)
    if (v) s = v[1].trim()
    if (!s) return fallback
    ctx.fillStyle = "#000000"
    ctx.fillStyle = s
    const a = ctx.fillStyle
    ctx.fillStyle = "#ffffff"
    ctx.fillStyle = s
    if (ctx.fillStyle !== a) return fallback
    return a as string
}

/** The fade plate is the Background at Trail's alpha, so it needs the channels. */
function parseRgb(
    input: unknown,
    fallback: [number, number, number]
): [number, number, number] {
    const norm = parseColor(input, "")
    if (!norm) return fallback
    const hex = norm.match(/^#([0-9a-f]{6})$/i)
    if (hex) {
        const n = parseInt(hex[1], 16)
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const rgb = norm.match(/rgba?\(([^)]+)\)/i)
    if (rgb) {
        const p = rgb[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(Number)
        if (p.length >= 3 && p.slice(0, 3).every((x) => isFinite(x))) {
            return [p[0], p[1], p[2]]
        }
    }
    return fallback
}

/* --------------------------------------------------------------- tuned sim */

type Tuned = {
    count: number
    mass: number
    k: number
    retain: number
    fade: string
    base: string
    accent: string
    dotPx: number
    driftRate: number
}

/** Panel values are whole numbers; the field wants the source's real ones. */
function tune(cfg: Config, dpr: number): Tuned {
    const field = { ...DEFAULTS.field, ...(cfg.field || {}) }
    const density = clamp(cfg.density, 10, 250, DEFAULTS.density) / 100
    const rings = clamp(field.rings, 40, 600, DEFAULTS.field.rings) * dpr
    const bg = parseRgb(cfg.background, [0, 0, 0])
    // Trail is cubed so that 50 lands on the source's alpha of 32/255 and the
    // whole upper half of the dial is not crammed into the last few numbers.
    const t = clamp(cfg.trail, 0, 100, DEFAULTS.trail) / 100
    const fadeA = Math.max(MIN_FADE, Math.pow(1 - t, 3) * (REF_FADE / 0.125))

    return {
        count: Math.round(10000 * density),
        // Mass and ring spacing both scale with the buffer, so the pattern is
        // the same picture on a retina frame rather than half the size.
        mass: (clamp(field.force, 0, 300, DEFAULTS.field.force) / 100) * MASS * dpr,
        k: (2 * Math.PI) / Math.max(1, rings),
        // Damping is how fast it settles, so the retained fraction is its
        // complement: 100 keeps nothing and the field is pure snap.
        retain: 1 - clamp(field.damping, 1, 100, DEFAULTS.field.damping) / 100,
        fade: `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${fadeA})`,
        base: parseColor(cfg.baseColor, DEFAULTS.baseColor),
        accent: parseColor(cfg.accentColor, DEFAULTS.accentColor),
        dotPx: Math.max(
            1,
            Math.round((clamp(cfg.dotSize, 50, 400, DEFAULTS.dotSize) / 100) * dpr)
        ),
        driftRate: (clamp(cfg.drift, 0, 100, DEFAULTS.drift) / 50) * DRIFT_REF,
    }
}

/* ----------------------------------------------------------------- the field */

class RippleScene {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private w = 0
    private h = 0
    private dpr = 1

    private cfg: Config
    private t!: Tuned

    private n = 0
    private m!: Float64Array
    private x!: Float64Array
    private y!: Float64Array
    private vx!: Float64Array
    private vy!: Float64Array
    /** Index of the first negative-mass speck after the two are partitioned. */
    private split = 0

    private seedState = SEED
    private spare: number | null = null

    private raf = 0
    private last = 0
    private acc = 0
    private clock = 0

    // Where the attractor is, where it is being asked to be, and whether the
    // pointer is the one asking. CSS pixels relative to the host, which is the
    // element's own coordinate space and so already free of the canvas zoom.
    private ax = 0
    private ay = 0
    private ptrOn = false
    private ptrX = 0
    private ptrY = 0

    constructor(canvas: HTMLCanvasElement, cfg: Config) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d", { alpha: false })
        if (!ctx) throw new Error("no 2d context")
        this.ctx = ctx
        this.cfg = cfg
    }

    /* ------------------------------------------------------------ randomness */

    private rand(): number {
        // mulberry32, so a repaint is the same field rather than a new one.
        this.seedState = (this.seedState + 0x6d2b79f5) | 0
        let z = this.seedState
        z = Math.imul(z ^ (z >>> 15), z | 1)
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296
    }

    /** Box-Muller, mean 0, unit sd. Processing's randomGaussian, seeded. */
    private gauss(): number {
        if (this.spare !== null) {
            const s = this.spare
            this.spare = null
            return s
        }
        let u = 0
        while (u <= 1e-12) u = this.rand()
        const r = Math.sqrt(-2 * Math.log(u))
        const a = 2 * Math.PI * this.rand()
        this.spare = r * Math.sin(a)
        return r * Math.cos(a)
    }

    /* ------------------------------------------------------------------ size */

    setSize(cssW: number, cssH: number, dpr: number): boolean {
        const w = Math.max(1, Math.round(cssW * dpr))
        const h = Math.max(1, Math.round(cssH * dpr))
        if (w === this.w && h === this.h && dpr === this.dpr) return false
        const first = this.w === 0
        this.w = w
        this.h = h
        this.dpr = dpr
        this.canvas.width = w
        this.canvas.height = h
        this.paintGround()
        if (!first) this.rescatter()
        return true
    }

    /** A context with alpha:false starts opaque black; make it Background. */
    private paintGround() {
        this.ctx.fillStyle = parseColor(this.cfg.background, "#000000")
        this.ctx.fillRect(0, 0, this.w, this.h)
    }

    /* ------------------------------------------------------------- lifecycle */

    configure(cfg: Config, dpr: number) {
        this.cfg = cfg
        const before = this.t?.count ?? -1
        this.t = tune(cfg, dpr)
        this.paintGround()
        if (this.t.count !== before) this.rescatter()
    }

    /**
     * A fresh cast, from wherever the generator currently stands. Called on
     * mount, on a resize, on a count change and on a click — the click is the
     * sketch's mousePressed, and it must give a NEW field, so the seed is not
     * rewound here.
     */
    rescatter() {
        const n = this.t.count
        this.n = n
        const m = new Float64Array(n)
        const x = new Float64Array(n)
        const y = new Float64Array(n)

        // The source tests the sign of the mass per speck per frame to pick a
        // colour. Partitioning once at scatter time instead lets the draw run
        // as two flat runs with one fillStyle each, rather than ten thousand
        // state changes a frame.
        let lo = 0
        let hi = n - 1
        for (let i = 0; i < n; i++) {
            const mass = this.gauss()
            const px = this.rand() * this.w
            const py = this.rand() * this.h
            const at = mass >= 0 ? lo++ : hi--
            m[at] = mass
            x[at] = px
            y[at] = py
        }
        this.split = lo
        this.m = m
        this.x = x
        this.y = y
        this.vx = new Float64Array(n)
        this.vy = new Float64Array(n)

        this.ax = this.w / 2
        this.ay = this.h / 2
    }

    /* --------------------------------------------------------------- pointer */

    setPointer(on: boolean, cssX: number, cssY: number) {
        this.ptrOn = on
        this.ptrX = cssX
        this.ptrY = cssY
    }

    /* ------------------------------------------------------------------ step */

    private step() {
        const t = this.t
        const k = t.k
        const mass = t.mass
        const retain = t.retain
        const w = this.w
        const h = this.h

        // Where the attractor wants to be. The Lissajous keeps advancing even
        // while the pointer has the wheel, so handing back is seamless.
        this.clock += t.driftRate / STEP_HZ
        let tx: number
        let ty: number
        if (this.ptrOn) {
            tx = this.ptrX * this.dpr
            ty = this.ptrY * this.dpr
        } else {
            tx = w / 2 + Math.sin(this.clock * DRIFT_A * Math.PI * 2) * w * DRIFT_X
            ty = h / 2 + Math.sin(this.clock * DRIFT_B * Math.PI * 2) * h * DRIFT_Y
        }
        this.ax += (tx - this.ax) * CHASE
        this.ay += (ty - this.ay) * CHASE
        const ax = this.ax
        const ay = this.ay

        const m = this.m
        const x = this.x
        const y = this.y
        const vx = this.vx
        const vy = this.vy

        for (let i = 0; i < this.n; i++) {
            const dx = ax - x[i]
            const dy = ay - y[i]
            let d = Math.sqrt(dx * dx + dy * dy)
            if (d < 1) d = 1
            // The sine reverses the pull every half wavelength, so the field is
            // alternating shells and the specks settle on the nodes between.
            const f = (Math.sin(d * k) * m[i] * mass) / d
            // Replaced, not integrated: a speck keeps only `retain` of what it
            // had, which is why the pattern snaps rather than sloshes.
            const nvx = vx[i] * retain + f * dx
            const nvy = vy[i] * retain + f * dy
            vx[i] = nvx
            vy[i] = nvy

            let nx = x[i] + nvx
            let ny = y[i] + nvy
            // The source's wrap is a teleport to the far edge, not a modulo. A
            // speck thrown clear past the frame lands on the edge and is pulled
            // in again from there; that is where the rings get their supply.
            if (nx < 0) nx = w
            else if (nx > w) nx = 0
            if (ny < 0) ny = h
            else if (ny > h) ny = 0
            x[i] = nx
            y[i] = ny
        }
    }

    /* ------------------------------------------------------------------ draw */

    private render() {
        const ctx = this.ctx
        const t = this.t
        // Nothing is cleared. The plate is Background at Trail's alpha, so what
        // is underneath decays exponentially and every speck leaves a tail.
        ctx.fillStyle = t.fade
        ctx.fillRect(0, 0, this.w, this.h)

        const s = t.dotPx
        const x = this.x
        const y = this.y
        ctx.fillStyle = t.base
        for (let i = 0; i < this.split; i++) {
            ctx.fillRect(x[i] | 0, y[i] | 0, s, s)
        }
        ctx.fillStyle = t.accent
        for (let i = this.split; i < this.n; i++) {
            ctx.fillRect(x[i] | 0, y[i] | 0, s, s)
        }
    }

    /* ------------------------------------------------------------------ loop */

    start() {
        if (this.raf) return
        this.last = 0
        this.raf = requestAnimationFrame(this.tick)
    }

    stop() {
        if (this.raf) cancelAnimationFrame(this.raf)
        this.raf = 0
    }

    private tick = (now: number) => {
        this.raf = requestAnimationFrame(this.tick)
        // The first rAF timestamp can precede the effect that started the loop,
        // so the first delta is seeded rather than measured.
        const dt = this.last ? Math.min(0.25, (now - this.last) / 1000) : 1 / STEP_HZ
        this.last = now
        this.acc += dt * STEP_HZ
        let steps = 0
        while (this.acc >= 1 && steps < MAX_STEPS_PER_FRAME) {
            this.step()
            // Fade and draw once per STEP, never per frame: on a 120Hz display
            // a per-frame fade would eat the trail twice as fast.
            this.render()
            this.acc -= 1
            steps++
        }
        if (this.acc > MAX_STEPS_PER_FRAME) this.acc = MAX_STEPS_PER_FRAME
    }

    dispose() {
        this.stop()
    }
}

/* -------------------------------------------------------------- component */

export interface RippleFieldProps {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    trail?: number
    drift?: number
    field?: Partial<Field>
    style?: React.CSSProperties
}

export default function RippleField(props: RippleFieldProps) {
    const {
        background = DEFAULTS.background,
        baseColor = DEFAULTS.baseColor,
        accentColor = DEFAULTS.accentColor,
        density = DEFAULTS.density,
        dotSize = DEFAULTS.dotSize,
        trail = DEFAULTS.trail,
        drift = DEFAULTS.drift,
        field,
        style,
    } = props

    const f: Field = { ...DEFAULTS.field, ...(field || {}) }

    const hostRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const sceneRef = useRef<RippleScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        background,
        baseColor,
        accentColor,
        density,
        dotSize,
        trail,
        drift,
        field: f,
    }

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let scene: RippleScene
        try {
            scene = new RippleScene(canvas, cfgRef.current)
        } catch {
            return
        }
        sceneRef.current = scene

        const dprOf = () => Math.min(MAX_DPR, window.devicePixelRatio || 1)
        scene.setSize(host.clientWidth, host.clientHeight, dprOf())
        scene.configure(cfgRef.current, dprOf())
        scene.rescatter()
        scene.start()

        const ro = new ResizeObserver(() => {
            scene.setSize(host.clientWidth, host.clientHeight, dprOf())
        })
        ro.observe(host)

        // offsetX/offsetY are in the host's own coordinate space, so they carry
        // no canvas zoom — unlike clientX minus getBoundingClientRect. Move is a
        // hover, not a drag, so the host is the right listener; there is no
        // press to release on window.
        const move = (e: PointerEvent) => scene.setPointer(true, e.offsetX, e.offsetY)
        const leave = () => scene.setPointer(false, 0, 0)
        // The sketch's mousePressed: a click re-rolls the field.
        const press = () => scene.rescatter()
        host.addEventListener("pointermove", move)
        host.addEventListener("pointerleave", leave)
        host.addEventListener("pointercancel", leave)
        host.addEventListener("pointerdown", press)

        return () => {
            ro.disconnect()
            host.removeEventListener("pointermove", move)
            host.removeEventListener("pointerleave", leave)
            host.removeEventListener("pointercancel", leave)
            host.removeEventListener("pointerdown", press)
            scene.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => {
        const scene = sceneRef.current
        if (!scene) return
        scene.configure(
            cfgRef.current,
            Math.min(MAX_DPR, window.devicePixelRatio || 1)
        )
    }, [
        background,
        baseColor,
        accentColor,
        density,
        dotSize,
        trail,
        drift,
        f.force,
        f.rings,
        f.damping,
    ])

    return (
        <div
            ref={hostRef}
            role="img"
            aria-label="Field of specks standing in the rings of a moving attractor"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

RippleField.displayName = "Ripple Field"
