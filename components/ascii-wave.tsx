"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Ascii Wave — a ring wave crossing a sheet of typed characters.
 *
 * The height of the wave at each cell picks a glyph out of a ramp that runs
 * from blank to solid, which is how a terminal has always drawn a gradient. The
 * pointer does two separate things to it: it drags the phase forward, so the
 * rings bulge toward the cursor, and it raises the level, so the characters
 * under the cursor thicken.
 *
 * The wave is sampled at the centre of the cell, never at the pixel. Sampled
 * per pixel a glyph is cut in half by whichever contour happens to cross it,
 * and the sheet stops reading as characters and starts reading as a blurred
 * bitmap.
 *
 * Glyphs are four pixels across and six down, packed into the twenty-four bits
 * a highp float carries exactly. A five-by-five cell needs twenty-five, and on
 * some drivers the top row rounds away — the glyph loses its lid and the whole
 * ramp reads wrong.
 */

/*
 * How fast the sheet chases the cursor, per second — what five on the old
 * slider meant. Slower than this and the swell stops reading as the cursor's;
 * faster and the sheet looks like a hole cut in it rather than something being
 * pushed.
 */
const CURSOR_FOLLOW = 8.5

const GLYPH_ART = [
    ["....", "....", "....", "....", "....", "...."],
    ["....", "....", "....", "....", ".#..", "...."],
    ["....", "....", ".#..", "....", ".#..", "...."],
    ["....", "....", ".##.", "....", "....", "...."],
    ["....", "....", ".#..", "###.", ".#..", "...."],
    ["....", "....", ".##.", "#..#", ".##.", "...."],
    ["....", "#..#", ".##.", ".##.", "#..#", "...."],
    ["....", "#.#.", ".##.", ".##.", "#.#.", "...."],
    [".##.", "#..#", "#..#", "#..#", "#..#", ".##."],
    [".#.#", "####", ".#.#", "####", ".#.#", "...."],
    ["####", "####", "####", "####", "####", "####"],
]

/** Bit k of a mask is the pixel at column k mod 4, row k over 4, counted down. */
const GLYPHS = GLYPH_ART.map((rows) =>
    rows.reduce(
        (bits, row, y) =>
            bits +
            Array.from(row).reduce(
                (acc, ch, x) => acc + (ch === "#" ? Math.pow(2, x + 4 * y) : 0),
                0
            ),
        0
    )
)

const DEFAULTS = {
    ink: "#00FFF8",
    lit: "#FFFFFF",
    cell: 25,
    rings: 20,
    speed: 8,
    swell: 4,
    warp: 20,
    radius: 163,
    weight: 1,
}

type Config = {
    ink: string
    lit: string
    cell: number
    rings: number
    speed: number
    swell: number
    warp: number
    radius: number
    weight: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        cell: clamp(cfg.cell, 8, 60, DEFAULTS.cell),
        // Radians of wave per pixel of radius, so the rings keep their width
        // whatever size the frame is.
        freq: 0.004 + clamp(cfg.rings, 1, 20, DEFAULTS.rings) * 0.0022,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.42,
        swell: clamp(cfg.swell, 0, 20, DEFAULTS.swell) * 0.055,
        // Radians the phase is dragged forward under the cursor. A full turn is
        // as far as it can go before the bulge folds back over itself.
        warp: clamp(cfg.warp, 0, 20, DEFAULTS.warp) * 0.31,
        // Already a radius in pixels, so nothing is mapped: the number on the
        // panel is the distance the cursor carries.
        reach: clamp(cfg.radius, 40, 400, DEFAULTS.radius),
        // Reversed: a high panel value is a low exponent, which is a heavier
        // sheet. Left as an exponent in the shader it would read backwards.
        gamma: 2.2 - clamp(cfg.weight, 1, 20, DEFAULTS.weight) * 0.08,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera object is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const WAVE_FRAGMENT = /* glsl */ `
    precision highp float;

    #define GLYPH_COUNT ${GLYPHS.length}

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTime;
    uniform vec3 uInk;
    uniform vec3 uLit;
    uniform float uCell;
    uniform float uFreq;
    uniform float uSwell;
    uniform float uWarp;
    uniform float uReach;
    uniform float uGamma;
    uniform float uGlyphs[GLYPH_COUNT];

    varying vec2 vUv;

    /** One pixel of a four-by-six glyph, read out of its packed mask. */
    float glyphAt(int idx, vec2 g) {
        float bits = 0.0;
        // A uniform array cannot be indexed by a value in this dialect; loop
        // over it and compare instead.
        for (int i = 0; i < GLYPH_COUNT; i++) {
            if (i == idx) bits = uGlyphs[i];
        }
        float x = min(floor(g.x * 4.0), 3.0);
        float y = min(floor((1.0 - g.y) * 6.0), 5.0);
        return mod(floor(bits / exp2(x + 4.0 * y)), 2.0);
    }

    void main() {
        vec2 p = vUv * uResolution;
        vec2 cell = floor(p / uCell);
        vec2 mid = (cell + 0.5) * uCell;

        // Read at the middle of the cell. Per pixel, a contour slices glyphs in
        // half and the sheet stops reading as characters.
        float radius = length(mid - uResolution * 0.5);
        float near = 1.0 - smoothstep(0.0, uReach, length(mid - uPointer));
        near = near * near * uHold;

        float wave = sin(radius * uFreq - uTime + near * uWarp) * 0.5 + 0.5;
        float level = pow(clamp(wave, 0.0, 1.0), uGamma) + near * uSwell * 3.0;
        level = clamp(level, 0.0, 1.0);

        int idx = int(min(floor(level * float(GLYPH_COUNT)), float(GLYPH_COUNT - 1)));
        float mask = glyphAt(idx, fract(p / uCell));
        if (mask < 0.5) discard;

        vec3 col = mix(uInk, uLit, near);
        // The lightest glyphs sit back a little, so the ramp has somewhere to
        // start from instead of snapping on at full strength.
        float a = 0.35 + 0.65 * level;

        // Premultiplied, so the frame shows between the characters.
        gl_FragColor = vec4(col * a, a);
    }
`

class WaveScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private target = new THREE.Vector2(-1e4, -1e4)
    private eased = new THREE.Vector2(-1e4, -1e4)
    private hold = 0
    private wantHold = 0
    private time = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: WAVE_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
                uHold: { value: 0 },
                uTime: { value: 0 },
                uInk: { value: new THREE.Color(cfg.ink) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uCell: { value: S.cell },
                uFreq: { value: S.freq },
                uSwell: { value: S.swell },
                uWarp: { value: S.warp },
                uReach: { value: S.reach },
                uGamma: { value: S.gamma },
                uGlyphs: { value: GLYPHS },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        el.addEventListener("pointermove", this.onPointerMove)
        el.addEventListener("pointerdown", this.onPointerMove)
        el.addEventListener("pointerleave", this.onPointerLeave)
        el.addEventListener("pointercancel", this.onPointerLeave)
    }

    private onPointerMove = (e: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        // The shader works in device pixels, so the pointer arrives in them too.
        const x = ((e.clientX - rect.left) / rect.width) * this.width
        const y = (1 - (e.clientY - rect.top) / rect.height) * this.height
        this.target.set(x, y)
        if (this.wantHold === 0) this.eased.copy(this.target)
        this.wantHold = 1
    }

    private onPointerLeave = () => {
        this.wantHold = 0
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        loop()
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.renderer.setSize(width, height, false)
        const dpr = this.renderer.getPixelRatio()
        this.width = width * dpr
        this.height = height * dpr
        this.material.uniforms.uResolution.value.set(this.width, this.height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const u = this.material.uniforms
        u.uInk.value.set(cfg.ink || DEFAULTS.ink)
        u.uLit.value.set(cfg.lit || DEFAULTS.lit)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not teleport the wave halfway across the sheet.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 5))

        const dpr = this.renderer.getPixelRatio()
        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        u.uCell.value = S.cell * dpr
        // Per device pixel rather than per CSS pixel, or the rings tighten on a
        // retina screen and loosen on a plain one.
        u.uFreq.value = S.freq / dpr
        u.uSwell.value = S.swell
        u.uWarp.value = S.warp
        u.uReach.value = S.reach * dpr
        u.uGamma.value = S.gamma

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointermove", this.onPointerMove)
        el.removeEventListener("pointerdown", this.onPointerMove)
        el.removeEventListener("pointerleave", this.onPointerLeave)
        el.removeEventListener("pointercancel", this.onPointerLeave)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface AsciiWaveProps {
    /** The characters at rest. */
    ink?: string
    /** What the sheet tints toward around the pointer. */
    lit?: string
    /** The size of one character cell. */
    cell?: number
    /** 1 is one slow swell; 20 is a tight bullseye. */
    rings?: number
    /** 0 freezes the wave where it stands. */
    speed?: number
    /** 0 ignores the cursor; 20 burns a solid patch under it. */
    swell?: number
    /** How far the rings are dragged forward by the pointer. */
    warp?: number
    /** How far from the cursor the sheet still feels it. */
    radius?: number
    /** 1 is thin and airy; 20 fills most cells in. */
    weight?: number
    style?: React.CSSProperties
}

export default function AsciiWave(props: AsciiWaveProps) {
    const {
        ink = DEFAULTS.ink,
        lit = DEFAULTS.lit,
        cell = DEFAULTS.cell,
        rings = DEFAULTS.rings,
        speed = DEFAULTS.speed,
        swell = DEFAULTS.swell,
        warp = DEFAULTS.warp,
        radius = DEFAULTS.radius,
        weight = DEFAULTS.weight,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<WaveScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        lit,
        cell,
        rings,
        speed,
        swell,
        warp,
        radius,
        weight,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: WaveScene
        try {
            scene = new WaveScene(container, cfgRef.current)
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
    }, [ink, lit, cell, rings, speed, swell, warp, radius, weight])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A ring wave crossing a sheet of typed characters"
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

AsciiWave.displayName = "Ascii Wave"
AsciiWave.defaultProps = { ...DEFAULTS }
