"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Petal Vortex — a flower of groups of lines, each line tipped with a node, the
 * whole figure turning clockwise while a wave runs out along it.
 *
 * A line is a run of particles laid along its own path, not motes travelling
 * down a shared one. That is what gives it two ends: the particles of one line
 * know where they sit along it, so the last of them can be its node. Motes given
 * their own places along a common curve draw the curve and nothing else.
 *
 * Everything about a group is the same for every line in it except one number —
 * where the line sits across the group — and every group is the same as every
 * other except which way it points. That regularity is the point. Lengths, leans
 * and phases drawn at random shuffle the tips into noise and the flower stops
 * being a figure; here the only variation is ordered, so ten lines read as one
 * thing moving.
 *
 * The wave arrives at one edge of a group before the other, by a lag that runs
 * evenly across it. That is what makes a group shear like hair rather than
 * flutter, and it is also what staggers the nodes into a little arc instead of
 * stacking them on one point.
 */

/*
 * The power the sweep grows by along a line. The panel used to own this; a
 * little above one is what makes the groups leave the middle almost straight and
 * curl at the ends, and there is one right answer for a figure this regular.
 */
const SWEEP_POWER = 1.35

/*
 * Particles laid along one line. Enough that they overlap into a stroke: at the
 * reach and weight below the gap between them is under a particle wide, and a
 * sparser run beads into a dotted line the moment the flower is scaled up.
 */
const SAMPLES = 150

const DEFAULTS = {
    core: "#00FFE6",
    tip: "#00BDFF",
    petals: 21,
    lines: 20,
    twist: 8,
    wave: 20,
    node: 20,
    speed: 20,
    spin: 20,
    scale: 79,
}

type Config = {
    core: string
    tip: string
    petals: number
    lines: number
    twist: number
    wave: number
    node: number
    speed: number
    spin: number
    scale: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * Linear-light RGB to Oklab. Framer hands colours over as sRGB and three
 * converts them to linear light on the way into a Color, which is what these
 * coefficients expect.
 */
function toOklab(hex: string, fallback: string): THREE.Vector3 {
    const c = new THREE.Color(hex || fallback)
    const l = Math.cbrt(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b)
    const m = Math.cbrt(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b)
    const s = Math.cbrt(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b)
    return new THREE.Vector3(
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    )
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Whole groups and whole lines: both are counted out into the buffer, and
        // a fraction of either leaves one group short.
        petals: Math.round(clamp(cfg.petals, 3, 24, DEFAULTS.petals)),
        lines: Math.round(clamp(cfg.lines, 2, 20, DEFAULTS.lines)),
        // Turns of sweep from the middle to the end of a line.
        twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.032,
        sweepPower: SWEEP_POWER,
        /*
         * A share of a group's own slot, so raising the group count narrows the
         * wave with it and groups never grow into each other however the panel
         * is set.
         */
        wave: clamp(cfg.wave, 0, 20, DEFAULTS.wave) * 0.032,
        // A share of the frame's short side.
        node: clamp(cfg.node, 0, 20, DEFAULTS.node) * 0.0011,
        // Waves per second, running outward along the lines.
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.016,
        // Turns per second, clockwise.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.008,
        scale: clamp(cfg.scale, 20, 200, DEFAULTS.scale) / 100,
    }
}

const VORTEX_VERTEX = /* glsl */ `
    precision highp float;

    // Spelled with its decimal point: a whole number written into a shader
    // arrives as an int, and this dialect will not mix the two.
    #define TAU 6.28318530718
    #define PI 3.14159265359

    // Reach and spread are shares of the frame's short side and of a group's
    // own slot; stagger is radians of lag across a group; weight is the share
    // of the short side a line draws at.
    #define REACH_C 0.46
    #define STAGGER_C 1.1
    #define SPREAD_C 0.44
    #define WEIGHT_C 0.0081

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uTurn;
    uniform float uPetals;
    uniform float uTwist;
    uniform float uSweepPower;
    uniform float uWave;
    uniform float uNode;
    uniform float uScale;

    /*
     * Which group this particle belongs to, how far along its line it sits, and
     * where that line lies across the group. Packed into one attribute: three
     * separate ones cost three buffers and three bindings to carry twelve bytes.
     */
    attribute vec3 aData;

    varying float vAlong;
    varying float vBody;
    varying float vHead;

    void main() {
        float petal = aData.x;
        float along = aData.y;
        float lane = aData.z;

        float slot = TAU / uPetals;
        float clock = uTime * TAU;

        // Every line is the same length, so a group's nodes land together rather
        // than trailing off into a comet.
        float radius = along * REACH_C;

        /*
         * The wave runs outward along the line — the minus is what sends it out
         * rather than in — and reaches one edge of the group before the other by
         * a lag that runs evenly across it. That ordered lag is the whole of the
         * shear: give each line a phase of its own and the group comes apart.
         */
        float lag = lane * STAGGER_C;
        float swim = sin(along * 2.6 - clock + lag);
        // Weighted by how far out it is: pinned at the middle, free at the end.
        float wave = uWave * slot * swim * pow(along, 1.2);

        /*
         * The lines sit a fixed distance apart and stay near enough parallel. A
         * separation that opens toward the ends splays the group into a spray and
         * the nodes stop reading as a row.
         */
        float apart = lane * SPREAD_C * slot * (0.12 + 0.88 * along);

        // The arc the group is swept through by the time it gets here.
        float sweep = uTwist * pow(along, uSweepPower);

        /*
         * Subtracted, all three of them: clip space has y upward, so an angle
         * that falls is a figure that turns clockwise.
         */
        float angle = (petal + 0.5) * slot + apart + wave - (sweep + uTurn) * TAU;
        vec2 at = vec2(cos(angle), sin(angle)) * radius;

        /*
         * Straight to clip space. Everything is laid out in units of the frame's
         * short side, so the only thing needed is that scale — a camera would be
         * a matrix multiply per particle to arrive at the same place.
         */
        float unit = min(uResolution.x, uResolution.y) * uScale;
        gl_Position = vec4(at * (2.0 * unit) / uResolution, 0.0, 1.0);

        /*
         * Thin where it leaves the middle, fuller along the body — a stroke laid
         * with a brush, which a line of even thickness never looks like. Held off
         * zero because the sine undershoots by a hair at both ends, and a
         * negative base under a fractional power is a NaN that would take the
         * whole line with it.
         */
        float body = pow(max(sin(PI * along), 0.0), 0.4);
        // The last particles of a line are its node.
        float head = smoothstep(0.9, 1.0, along);

        gl_PointSize = unit * (WEIGHT_C * (0.35 + 0.75 * body) + uNode * head);

        vAlong = along;
        vBody = body;
        vHead = head;
    }
`

const VORTEX_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uCore;
    uniform vec3 uTip;

    varying float vAlong;
    varying float vBody;
    varying float vHead;

    /** Oklab back to linear-light RGB. */
    vec3 rgbFromOklab(vec3 lab) {
        float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
        float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
        float s = lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z;
        l = l * l * l;
        m = m * m * m;
        s = s * s * s;
        return vec3(
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
        );
    }

    void main() {
        // Across the sprite: one at the middle, nothing at the rim.
        float fall = 1.0 - min(length(gl_PointCoord - 0.5) * 2.0, 1.0);
        /*
         * A spike and a bloom: the same falloff at a high power and at a low one.
         * One curve cannot be both the hard point of light and the haze around
         * it, and the spike alone reads as grit on the lens. The bloom is also
         * what welds the particles of a line into a stroke rather than beads.
         */
        float shape = pow(fall, 5.0) + pow(fall, 1.6) * 0.35;

        // Out of the dark at the middle, so the lines look emitted rather than
        // cut off at a rim around the core.
        float emerge = smoothstep(0.0, 0.1, vAlong);

        /*
         * Brightness follows the stroke's own thickness rather than the distance
         * out, so a line swells and fades as one thing. Carried on distance
         * alone, a stroke that has already tapered to a hair still burns at full
         * strength and the taper does not read.
         */
        vec3 col = rgbFromOklab(mix(uCore, uTip, smoothstep(0.1, 1.0, vAlong)));
        float a = shape * emerge * (0.08 + 0.5 * vBody + 0.95 * vHead);
        if (a < 0.003) discard;

        // Premultiplied and additive, so crossing lines compound into brightness
        // and no particle has an edge against the frame.
        gl_FragColor = vec4(col * a, a);
    }
`

class VortexScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private material: THREE.ShaderMaterial
    private geometry: THREE.BufferGeometry | null = null
    private points: THREE.Points | null = null

    private time = 0
    private turn = 0

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
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: VORTEX_VERTEX,
            fragmentShader: VORTEX_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uTime: { value: 0 },
                uTurn: { value: 0 },
                uCore: { value: toOklab(cfg.core, DEFAULTS.core) },
                uTip: { value: toOklab(cfg.tip, DEFAULTS.tip) },
                uPetals: { value: S.petals },
                uTwist: { value: S.twist },
                uSweepPower: { value: S.sweepPower },
                uWave: { value: S.wave },
                uNode: { value: S.node },
                uScale: { value: S.scale },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        })

        this.build()
    }

    /** The only thing here that allocates. Rebuilt only when a count moves. */
    private build() {
        const S = settingsFor(this.cfg)

        if (this.points) this.scene.remove(this.points)
        this.geometry?.dispose()

        const count = S.petals * S.lines * SAMPLES
        const data = new Float32Array(count * 3)
        /*
         * three needs a position attribute to know how many vertices to draw, and
         * every particle works out its own place in the vertex shader — so these
         * are all nought and never read.
         */
        const positions = new Float32Array(count * 3)

        let i = 0
        for (let p = 0; p < S.petals; p++) {
            for (let f = 0; f < S.lines; f++) {
                // Where this line lies across its group, spread evenly from one
                // edge to the other. This is the only thing that distinguishes it
                // from the other nine, and every group is otherwise identical.
                const lane = (f / (S.lines - 1)) * 2 - 1
                for (let s = 0; s < SAMPLES; s++) {
                    data[i * 3 + 0] = p
                    data[i * 3 + 1] = s / (SAMPLES - 1)
                    data[i * 3 + 2] = lane
                    i++
                }
            }
        }

        this.geometry = new THREE.BufferGeometry()
        this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        this.geometry.setAttribute("aData", new THREE.BufferAttribute(data, 3))

        this.points = new THREE.Points(this.geometry, this.material)
        // Every particle is placed by the shader, so three cannot work out where
        // this object is by looking at its geometry.
        this.points.frustumCulled = false
        this.scene.add(this.points)
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
        const prev = this.cfg
        this.cfg = cfg
        const u = this.material.uniforms
        u.uCore.value.copy(toOklab(cfg.core, DEFAULTS.core))
        u.uTip.value.copy(toOklab(cfg.tip, DEFAULTS.tip))
        // Only these two own the buffer. Dragging a colour or a twist must not
        // reallocate tens of thousands of particles.
        if (cfg.petals !== prev.petals || cfg.lines !== prev.lines) {
            this.build()
        }
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not run the wave through a dozen cycles at once.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        /*
         * Both folded to one whole unit. A wave and a turn each leave the flower
         * exactly where it was, so neither fold shows — and neither clock grows
         * large enough to lose the precision the sine needs.
         */
        this.time = (this.time + dt * S.speed) % 1
        this.turn = (this.turn + dt * S.spin) % 1

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uTurn.value = this.turn
        u.uPetals.value = S.petals
        u.uTwist.value = S.twist
        u.uSweepPower.value = S.sweepPower
        u.uWave.value = S.wave
        u.uNode.value = S.node
        u.uScale.value = S.scale

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        this.geometry?.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface PetalVortexProps {
    core?: string
    tip?: string
    petals?: number
    lines?: number
    twist?: number
    wave?: number
    node?: number
    speed?: number
    spin?: number
    scale?: number
    style?: React.CSSProperties
}

export default function PetalVortex(props: PetalVortexProps) {
    const {
        core = DEFAULTS.core,
        tip = DEFAULTS.tip,
        petals = DEFAULTS.petals,
        lines = DEFAULTS.lines,
        twist = DEFAULTS.twist,
        wave = DEFAULTS.wave,
        node = DEFAULTS.node,
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        scale = DEFAULTS.scale,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<VortexScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        core,
        tip,
        petals,
        lines,
        twist,
        wave,
        node,
        speed,
        spin,
        scale,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: VortexScene
        try {
            scene = new VortexScene(container, cfgRef.current)
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
        core,
        tip,
        petals,
        lines,
        twist,
        wave,
        node,
        speed,
        spin,
        scale,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A flower of line groups turning clockwise, each line tipped with a bright node"
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

PetalVortex.displayName = "Petal Vortex"
