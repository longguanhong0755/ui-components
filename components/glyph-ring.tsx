"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Glyph Ring — characters set around concentric rings, each turning its own way.
 *
 * The grid is polar rather than square: a pixel is placed by how far out it
 * sits and how far round. The number of slots in a ring falls out of that ring's
 * own circumference divided by the pitch, which works out as a count that
 * depends on nothing but the ring index — so a character near the middle is
 * about as wide as one at the rim, for free. A fixed slot count is the obvious
 * version and it fails badly, crushing the inner rings into slivers while the
 * outer ones stretch into gaps.
 *
 * The pitch of a ring is the height of a character plus the gap after it, and
 * the panel owns those two separately. That is what makes Gap do what it says.
 * An earlier version fixed the pitch and let Gap eat into it, so opening the gap
 * only shrank the type and the rings stayed exactly where they were — the gap
 * you could see never moved. Because the pitch is built up rather than divided
 * out, the disc grows as rings, characters or gaps are added, and Size scales
 * the whole assembly rather than bounding it.
 *
 * Every ring turns at its own seeded rate and alternate rings turn the other
 * way, which is what keeps the disc from reading as one rigid plate. The
 * pointer sweeps a beam of light round with it and lights the ring it is
 * standing on, so the disc answers both parts of where the cursor is.
 *
 * Glyphs are four pixels across and six down, packed into the twenty-four bits
 * a highp float carries exactly. Twenty-five would round the top row away on
 * some drivers and every character would silently lose its lid.
 */

/*
 * How fast the disc chases the cursor, per second — what five on the old slider
 * meant. The beam has to lag a little or it reads as painted on the pointer
 * rather than as light thrown across a surface.
 */
const CURSOR_FOLLOW = 8.5

const GLYPH_ART = [
    ["....", "....", ".##.", "#..#", ".##.", "...."],
    ["....", ".#..", "###.", ".#..", "....", "...."],
    ["....", "#..#", ".##.", ".##.", "#..#", "...."],
    ["....", "####", "....", "####", "....", "...."],
    [".##.", "#..#", "#..#", "#..#", "#..#", ".##."],
    ["....", "#.#.", ".##.", ".##.", "#.#.", "...."],
    ["....", "..##", ".##.", "##..", "....", "...."],
    ["....", "##..", ".##.", "..##", "....", "...."],
    [".#.#", "####", ".#.#", "####", ".#.#", "...."],
    ["....", ".##.", "#..#", "####", "#..#", "...."],
    ["###.", "#..#", "###.", "#..#", "###.", "...."],
    ["..#.", ".##.", "###.", ".##.", "..#.", "...."],
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
    ink: "#FFFFFF",
    lit: "#FFB800",
    rings: 18,
    charSize: 3,
    gap: 6,
    spin: 8,
    beam: 11,
    band: 20,
    churn: 20,
    scale: 200,
}

type Config = {
    ink: string
    lit: string
    rings: number
    charSize: number
    gap: number
    spin: number
    beam: number
    band: number
    churn: number
    scale: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const scale = clamp(cfg.scale, 20, 200, DEFAULTS.scale) / 100
    return {
        rings: clamp(cfg.rings, 1, 20, DEFAULTS.rings),
        /*
         * Both are shares of half the frame's short side, and both already
         * carry Size, so the shader only has to add them together. Keeping them
         * apart is the whole point: a character holds the height it was given
         * however far the gap is opened, which is what makes Gap slide the rings
         * apart rather than shrink the type.
         */
        charH: scale * clamp(cfg.charSize, 1, 20, DEFAULTS.charSize) * 0.008,
        gapH: scale * clamp(cfg.gap, 0, 20, DEFAULTS.gap) * 0.006,
        // Turns per second, before each ring's own seeded multiplier.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.018,
        /*
         * Half the beam's width in turns. Half a turn is the furthest a wrapped
         * angular distance can be, so twenty lights the whole disc and nothing
         * beyond it would do anything. Zero is no beam at all.
         */
        beam: clamp(cfg.beam, 0, 20, DEFAULTS.beam) * 0.025,
        // In rings, so the highlight covers the same number of bands however
        // many the disc has been cut into.
        band: clamp(cfg.band, 0, 20, DEFAULTS.band) * 0.16,
        churn: clamp(cfg.churn, 0, 20, DEFAULTS.churn) * 0.55,
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

const RING_FRAGMENT = /* glsl */ `
    precision highp float;

    #define GLYPH_COUNT ${GLYPHS.length}
    #define TAU 6.28318530718

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTime;
    uniform float uChurnTime;
    uniform vec3 uInk;
    uniform vec3 uLit;
    uniform float uRings;
    uniform float uCharH;
    uniform float uGapH;
    uniform float uBeam;
    uniform float uBand;
    uniform float uGlyphs[GLYPH_COUNT];

    varying vec2 vUv;

    float hash1(float n) {
        return fract(sin(n * 127.1 + 0.371) * 43758.5453123);
    }

    float hash2(vec2 v) {
        return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453123);
    }

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
        vec2 centre = uResolution * 0.5;
        vec2 c = vUv * uResolution - centre;
        float radius = length(c);

        // The short side, so the disc keeps its proportion in any frame shape.
        float unit = min(uResolution.x, uResolution.y) * 0.5;
        /*
         * A ring is as deep as a character plus the gap after it. Built up from
         * the two rather than divided out of a fixed disc, so opening the gap
         * moves the rings apart instead of eating into the characters.
         */
        float pitch = unit * (uCharH + uGapH);
        // The share of a cell the character actually occupies, in both
        // directions at once, so it keeps its shape as the gap opens.
        float fill = uCharH / (uCharH + uGapH);

        float ring = floor(radius / pitch);
        /*
         * The innermost band is left empty and the disc stops at the ring
         * count. That band's circumference is shorter than a couple of
         * characters, and filled it turns the middle into a smear.
         */
        if (ring < 1.0 || ring > uRings) discard;

        /*
         * Circumference over pitch. Both carry the pitch, so it cancels: the
         * count depends only on how far out the ring is, and the characters
         * come out square at every radius without anything being tuned.
         */
        float slots = max(6.0, floor(TAU * (ring + 0.5)));

        float seed = hash1(ring);
        // Alternate rings turn the other way; all turning together, the disc
        // reads as one rigid plate rather than as stacked rings.
        float heading = mod(ring, 2.0) < 0.5 ? 1.0 : -1.0;
        float turn = uTime * (0.5 + seed * 1.1) * heading + seed;

        float around = fract(atan(c.y, c.x) / TAU + 0.5 + turn);
        float slot = floor(around * slots);

        float lo = (1.0 - fill) * 0.5;
        vec2 g = (vec2(fract(around * slots), fract(radius / pitch)) - lo) / fill;
        if (g.x < 0.0 || g.x > 1.0 || g.y < 0.0 || g.y > 1.0) discard;

        float churn = floor(uChurnTime + seed * 17.0);
        float pick = hash2(vec2(ring, slot) + churn * 5.13);
        int idx = int(min(floor(pick * float(GLYPH_COUNT)), float(GLYPH_COUNT - 1)));
        if (glyphAt(idx, g) < 0.5) discard;

        vec2 pc = uPointer - centre;
        // Wrapped to the shorter way round, or the beam would tear at the seam
        // where the angle rolls over.
        float toBeam = abs(fract((atan(c.y, c.x) - atan(pc.y, pc.x)) / TAU + 0.5) - 0.5);
        // Guarded rather than clamped: a smoothstep whose two edges are equal
        // is undefined, and at nought the beam is meant to be gone entirely.
        float beam = uBeam > 0.0 ? 1.0 - smoothstep(0.0, uBeam, toBeam) : 0.0;
        float onRing = uBand > 0.0
            ? 1.0 - smoothstep(0.0, uBand, abs(radius - length(pc)) / pitch)
            : 0.0;
        float near = clamp(max(beam, onRing), 0.0, 1.0) * uHold;

        vec3 col = mix(uInk, uLit, near);
        float a = 0.4 + 0.6 * near;

        // Premultiplied, so the frame shows between the characters.
        gl_FragColor = vec4(col * a, a);
    }
`

class RingScene {
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
    private churnTime = 0

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
            fragmentShader: RING_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
                uHold: { value: 0 },
                uTime: { value: 0 },
                uChurnTime: { value: 0 },
                uInk: { value: new THREE.Color(cfg.ink) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uRings: { value: S.rings },
                uCharH: { value: S.charH },
                uGapH: { value: S.gapH },
                uBeam: { value: S.beam },
                uBand: { value: S.band },
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
        // A returning tab must not snap every ring round to a new angle.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.spin
        // The characters change on their own clock, so stopping the spin does
        // not also freeze the disc into one fixed pattern.
        this.churnTime += dt * S.churn
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 5))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uChurnTime.value = this.churnTime
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        // Every measurement below is a share of the frame or of a ring, so none
        // of them needs the device pixel ratio applied.
        u.uRings.value = S.rings
        u.uCharH.value = S.charH
        u.uGapH.value = S.gapH
        u.uBeam.value = S.beam
        u.uBand.value = S.band

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

export interface GlyphRingProps {
    /** The characters out of the light. */
    ink?: string
    /** What a character turns as the pointer passes it. */
    lit?: string
    /** How many rings are drawn. The disc grows outward as they are added. */
    rings?: number
    /** 1 is a speck; 20 is a large character. The gap between rings is unaffected. */
    charSize?: number
    /** 0 stacks the rings straight onto each other; 20 opens wide space between them. */
    gap?: number
    /** 0 holds the disc still; neighbouring rings always oppose. */
    spin?: number
    /** 0 puts the beam out; 20 opens it until the whole disc is lit. */
    beam?: number
    /** 0 lights only the beam; higher also lights the ring under the cursor. */
    band?: number
    /** 0 fixes each character in place; 20 scrambles constantly. */
    churn?: number
    /** Scales characters and gaps together. Drop it when a high ring count runs off the frame. */
    scale?: number
    style?: React.CSSProperties
}

export default function GlyphRing(props: GlyphRingProps) {
    const {
        ink = DEFAULTS.ink,
        lit = DEFAULTS.lit,
        rings = DEFAULTS.rings,
        charSize = DEFAULTS.charSize,
        gap = DEFAULTS.gap,
        spin = DEFAULTS.spin,
        beam = DEFAULTS.beam,
        band = DEFAULTS.band,
        churn = DEFAULTS.churn,
        scale = DEFAULTS.scale,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<RingScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        lit,
        rings,
        charSize,
        gap,
        spin,
        beam,
        band,
        churn,
        scale,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: RingScene
        try {
            scene = new RingScene(container, cfgRef.current)
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
    }, [ink, lit, rings, charSize, gap, spin, beam, band, churn, scale])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Concentric rings of characters turning under a pointer-led beam"
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

GlyphRing.displayName = "Glyph Ring"
