"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Ascii Tunnel — a corridor of characters running away to a vanishing point.
 *
 * A row is one step in the logarithm of the distance from the centre. That is
 * the whole trick, and it is what makes the wall uniform: the height of a row
 * on screen grows in proportion to the radius, exactly as the width of a
 * column already does, so every cell in the frame is the same shape as every
 * other one all the way in. Taking depth as one over the radius is the usual
 * way to draw a tunnel and it is what this component did first — rows an inch
 * tall at the rim, sub-pixel rows near the middle, and characters sheared into
 * ribbons at both ends.
 *
 * Because a row is a fixed ratio rather than a fixed distance, running the
 * clock through it is a steady zoom that never arrives anywhere. Nothing is
 * integrated and nothing accumulates, so a long session does not drift.
 *
 * Depth is carried entirely by how brightly a cell is drawn. The whole wall
 * wears one character, picked on the panel. Choosing the character by depth
 * instead — a ramp from blank to solid, the way a terminal draws a gradient —
 * is the obvious thing to do here and it was what this did at first: a ring
 * changes character several times on its way out, and the corridor reads as
 * something continuously reshaping itself rather than as something moving.
 * Staggering neighbouring columns to soften those changes only made it worse,
 * turning the wall into a crawling checkerboard.
 *
 * For the same reason the cursor tints the wall and lifts it out of the dark,
 * but never touches the character. Pushed through the ramp instead, the patch
 * under the pointer filled in to solid blocks and the characters vanished
 * exactly where the eye was looking.
 *
 * The glyph is four pixels across and six down, packed into the twenty-four
 * bits a highp float carries exactly. Twenty-five would round the top row away
 * on some drivers and the character would silently lose its lid.
 */

const GLYPH_ART = [
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

/*
 * How fast the field chases the cursor, per second — what five on the old
 * slider meant. Slower than this and the effect stops reading as the cursor's;
 * faster and it snaps to the pointer, which loses the sense of weight.
 */
const CURSOR_FOLLOW = 8.5

const DEFAULTS = {
    ink: "#00F4FF",
    lit: "#D6FF00",
    columns: 8,
    depth: 20,
    weight: 9,
    twist: 0,
    speed: 6,
    direction: "out",
    fade: 0,
    reach: 20,
}

type Config = {
    ink: string
    lit: string
    columns: number
    depth: number
    weight: number
    twist: number
    speed: number
    direction: "in" | "out"
    fade: number
    reach: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const weight = clamp(cfg.weight, 1, 20, DEFAULTS.weight)
    return {
        columns: clamp(cfg.columns, 8, 72, DEFAULTS.columns),
        /*
         * How tall a row is against how wide a column is. Ten is square; above
         * it the characters stand up like a terminal's, which is what makes the
         * corridor read as deep rather than as a target.
         */
        aspect: clamp(cfg.depth, 1, 20, DEFAULTS.depth) * 0.1,
        /*
         * One character for the whole wall, resolved here rather than in the
         * shader. Picking it per cell needs the entire table as a uniform array
         * and a walk through it on every pixel, and a walk that always lands on
         * the same entry is work bought for nothing.
         */
        glyph: GLYPHS[Math.round(((weight - 1) / 19) * (GLYPHS.length - 1))],
        // Turns of the wall per row of depth, so the corridor spirals.
        twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.02,
        // Rows per second. A row is a fixed ratio, so this is a rate of zoom.
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.25,
        /*
         * Taken off the screen rather than argued from the algebra. Reasoning
         * about which way a row index travels gets this backwards as often as
         * not, and both times it was settled that way it came out inverted.
         */
        heading: cfg.direction === "out" ? -1 : 1,
        // 0 is an evenly lit wall, 1 takes the far end down to nothing.
        fade: clamp(cfg.fade, 0, 20, DEFAULTS.fade) / 20,
        // Squared, because the useful settings are the tight ones.
        reach: 60 + Math.pow(clamp(cfg.reach, 1, 20, DEFAULTS.reach), 2) * 2.2,
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

const TUNNEL_FRAGMENT = /* glsl */ `
    precision highp float;

    #define TAU 6.28318530718

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTime;
    uniform vec3 uInk;
    uniform vec3 uLit;
    uniform float uColumns;
    uniform float uAspect;
    uniform float uGlyph;
    uniform float uTwist;
    uniform float uFade;
    uniform float uReach;

    varying vec2 vUv;

    /** One pixel of the four-by-six character, read out of its packed mask. */
    float glyphAt(vec2 g) {
        float x = min(floor(g.x * 4.0), 3.0);
        float y = min(floor((1.0 - g.y) * 6.0), 5.0);
        return mod(floor(uGlyph / exp2(x + 4.0 * y)), 2.0);
    }

    void main() {
        vec2 centre = uResolution * 0.5;
        // Normalised on height, so the corridor keeps its shape in any frame.
        vec2 c = (vUv * uResolution - centre) / uResolution.y;
        // Never zero: the logarithm of the exact centre is not a number, and a
        // single bad pixel there poisons the whole derivative neighbourhood.
        float radius = max(length(c), 0.00001);

        /*
         * Rows counted in the logarithm of the radius. One row is then a fixed
         * ratio rather than a fixed distance, so its height on screen scales
         * with the radius just as a column's width does, and every cell holds
         * the same shape from the rim to the vanishing point.
         */
        float k = uColumns / (TAU * uAspect);
        float v = log(radius) * k + uTime;
        float row = floor(v);
        // Back out of the fold to the middle of this row.
        float radiusMid = exp((row + 0.5 - uTime) / k);

        float angle = atan(c.y, c.x) / TAU + 0.5;
        float around = fract(angle + v * uTwist);
        float column = floor(around * uColumns);

        // The character is the same everywhere, so this is the whole shape of
        // the wall and it never changes as a ring travels.
        float mask = glyphAt(vec2(fract(around * uColumns), fract(v)));
        if (mask < 0.5) discard;

        // The middle of the cell, back in screen pixels, so the light lands on
        // whole characters instead of cutting them along its own contour.
        float angleMid = (column + 0.5) / uColumns - (row + 0.5) * uTwist - 0.5;
        vec2 mid = centre + vec2(cos(angleMid * TAU), sin(angleMid * TAU)) * radiusMid * uResolution.y;

        float near = 1.0 - smoothstep(0.0, uReach, length(mid - uPointer));
        near = near * near * uHold;

        // Depth is brightness and nothing else. Fade takes the wall from evenly
        // lit to one that sinks away entirely toward the vanishing point.
        float shade = mix(1.0, smoothstep(0.02, 0.85, radiusMid), uFade);
        // The cursor lifts the wall out of the dark and tints it. It must not
        // touch the character, or the patch under the pointer fills in solid.
        float a = clamp(max(shade, near * 0.85), 0.0, 1.0);
        if (a < 0.01) discard;

        vec3 col = mix(uInk, uLit, near);

        // Premultiplied, so the frame shows between the characters.
        gl_FragColor = vec4(col * a, a);
    }
`

class TunnelScene {
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
        // Capped at 1.5, not 2. Every pixel runs a logarithm and an exponential,
        // and on a retina panel the full ratio is what turns a glide into a
        // stutter.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
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
            fragmentShader: TUNNEL_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
                uHold: { value: 0 },
                uTime: { value: 0 },
                uInk: { value: new THREE.Color(cfg.ink) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uColumns: { value: S.columns },
                uAspect: { value: S.aspect },
                uGlyph: { value: S.glyph },
                uTwist: { value: S.twist },
                uFade: { value: S.fade },
                uReach: { value: S.reach },
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
        // A returning tab must not fly a hundred rows down the corridor at once.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed * S.heading
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 5))

        const dpr = this.renderer.getPixelRatio()
        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        u.uColumns.value = S.columns
        u.uAspect.value = S.aspect
        u.uGlyph.value = S.glyph
        u.uTwist.value = S.twist
        u.uFade.value = S.fade
        u.uReach.value = S.reach * dpr

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

export interface AsciiTunnelProps {
    /** The characters lining the corridor. */
    ink?: string
    /** What the wall tints toward around the pointer. */
    lit?: string
    /** How many characters it takes to go once round the wall. */
    columns?: number
    /** 10 is square cells; higher stands them up and lengthens the corridor. */
    depth?: number
    /** 1 is a single speck; 20 fills every cell solid. */
    weight?: number
    /** 0 runs the wall straight back; higher winds it into a spiral. */
    twist?: number
    /** 0 holds the corridor still. */
    speed?: number
    direction?: "in" | "out"
    /** 0 lights the wall evenly all the way in; 20 sinks the far end into the dark. */
    fade?: number
    /** How wide a patch of wall the cursor lights up. */
    reach?: number
    style?: React.CSSProperties
}

export default function AsciiTunnel(props: AsciiTunnelProps) {
    const {
        ink = DEFAULTS.ink,
        lit = DEFAULTS.lit,
        columns = DEFAULTS.columns,
        depth = DEFAULTS.depth,
        weight = DEFAULTS.weight,
        twist = DEFAULTS.twist,
        speed = DEFAULTS.speed,
        direction = DEFAULTS.direction as "in" | "out",
        fade = DEFAULTS.fade,
        reach = DEFAULTS.reach,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<TunnelScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        lit,
        columns,
        depth,
        weight,
        twist,
        speed,
        direction,
        fade,
        reach,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: TunnelScene
        try {
            scene = new TunnelScene(container, cfgRef.current)
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
        ink,
        lit,
        columns,
        depth,
        weight,
        twist,
        speed,
        direction,
        fade,
        reach,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A corridor of characters running away to a vanishing point"
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

AsciiTunnel.displayName = "Ascii Tunnel"
