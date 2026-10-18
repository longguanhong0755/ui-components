"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Breathing Dots — Dave Whyte's pulsing dot field, after Matt Rossman's
 * react-three-fiber tutorial (github.com/mattrossman/breathing-dots-tutorial).
 *
 * A hexagonally offset grid of dots is pushed away from and pulled back toward
 * the centre by a *rounded* square wave — atan(sin(x)/delta), which sits at its
 * extremes for most of the cycle and snaps between them. A plain sine gives a
 * gentle throb; this is what makes the field feel like it is holding a breath.
 * Each dot's phase lags by its distance from the centre, and that distance is
 * measured with an octagonal offset (cos of eight times the angle) so the
 * travelling ring reads as a rotated square rather than a circle.
 *
 * The original gets its red/green/blue fringes from a post-processing chain:
 * render to a target, keep the previous two frames, composite one colour
 * channel from each. That is one delay per *frame*, so the fringe halves on a
 * 120Hz display and the chain costs three full-screen targets. Here the same
 * image is made by drawing the field three times in one pass, each copy masked
 * to one channel and offset by a delay in *seconds*, blended additively. Where
 * all three copies overlap the channels sum back to the dot colour; where only
 * the leading copy has arrived you get the pure fringe. Identical result, no
 * render targets, and it holds up at any refresh rate.
 *
 * Nothing is written per frame: a dot's position is a function of its grid slot
 * and one accumulated phase uniform, so the whole field is a single instanced
 * draw per channel.
 */

// Every dot sits one world unit from its neighbour, so "rows" below is both the
// visible height in world units and the number of dot rows on screen.
const LANES = 3
const MAX_DOTS = 60000
const MAX_GRID_SIDE = 360
// Headroom on the grid beyond what the frame strictly needs. Without it the
// corners emptied out on every inhale and the top rank walked into view.
const GRID_MARGIN = 1.25
const CHANNEL_MASKS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
]

const DEFAULTS = {
    dotColor: "#00F0FF",
    density: 13,
    dotSize: 8,
    speed: 11,
    breath: 12,
    ripple: 20,
    chroma: 20,
}

type Config = {
    dotColor: string
    density: number
    dotSize: number
    speed: number
    breath: number
    ripple: number
    chroma: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const chroma = clamp(cfg.chroma, 0, 20, DEFAULTS.chroma)
    const speed = clamp(cfg.speed, 1, 20, DEFAULTS.speed)
    return {
        // Visible world height. 10 on the panel gives 50 rows, the framing of
        // the original demo in a full-height desktop window.
        rows: 10 + clamp(cfg.density, 1, 20, DEFAULTS.density) * 4,
        // The bottom of the slider used to land near 0.015 units against 1 unit
        // of spacing, which is a dot too small to see at all. The scale now
        // starts where the old 5 sat (the tutorial's 0.15 is around 5 here) and
        // runs half again past the old top.
        radius: 0.06 + clamp(cfg.dotSize, 1, 20, DEFAULTS.dotSize) * 0.018,
        // Fraction of its own offset each dot travels. 0.4 at the default, so
        // the field breathes between 0.9x and 1.7x of its resting spread.
        amp: clamp(cfg.breath, 1, 20, DEFAULTS.breath) * 0.04,
        // Cycles per second. 10 on the panel is the tutorial's 3.8s period.
        freq: speed / 38,
        // Seconds of phase lag per world unit of distance from the centre. At 1
        // the field all but pulses in unison; the default is the 1/25 lag that
        // makes the ring travel outward at a readable pace.
        lag: clamp(cfg.ripple, 1, 20, DEFAULTS.ripple) * 0.004,
        // Seconds between the three channel copies. 4 on the panel is about one
        // frame at 60Hz, which is what the original's frame-delay chain gave.
        chromaDelay: chroma * 0.005,
        split: chroma > 0,
    }
}

const DOT_VERTEX = /* glsl */ `
precision highp float;

attribute vec2 aPos;

uniform float uPhase;      // accumulated cycles, wrapped to [0,1)
uniform float uLaneShift;  // cycles this channel copy trails the live one
uniform float uLag;        // cycles of lag per world unit from the centre
uniform float uAmp;
uniform float uRadius;

varying vec2 vUnit;

const float PI = 3.141592653589793;

void main() {
    float len = length(aPos);
    // Unsigned angle from +X, matching Vector3.angleTo. Being unsigned mirrors
    // the pattern about the X axis, and that mirroring is what closes the
    // octagon — a signed angle here spirals instead.
    vec2 dir = len > 1e-5 ? aPos / len : vec2(1.0, 0.0);
    float dist = len + cos(acos(clamp(dir.x, -1.0, 1.0)) * 8.0) * 0.5;

    // delta is how square the square wave is: small snaps, large rounds off. It
    // grows with distance so the outer ranks ease into the turn while the
    // middle still cracks. Holding it constant made the whole field flick.
    float delta = 0.15 + 0.2 * dist / 72.0;
    float phase = uPhase - uLaneShift - dist * uLag;

    // Rounded square wave, from https://dsp.stackexchange.com/a/56529
    float wave = (2.0 * uAmp / PI) * atan(sin(2.0 * PI * phase) / delta);

    // The dot's rest position scaled about the origin — the field breathes as a
    // whole rather than each dot wobbling in place.
    vec2 centre = aPos * (wave + 1.3);

    vUnit = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix
        * vec4(centre + position.xy * uRadius, 0.0, 1.0);
}
`

const DOT_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3 uColor;   // dot colour already masked down to this copy's channel

varying vec2 vUnit;

void main() {
    float r = length(vUnit);
    // Edge softened by one pixel of the quad's own screen-space derivative, so
    // the discs stay round at any zoom without an antialiasing pass.
    float aa = max(fwidth(r), 0.0001) * 1.2;
    float m = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    if (m <= 0.0) discard;

    // Premultiplied: where all three copies land the channels sum back to the
    // dot colour and alpha saturates; where only one has arrived you get that
    // channel alone at full strength, which is the fringe.
    gl_FragColor = vec4(uColor * m, m);
}
`

class BreathingDotsScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    private geometry: THREE.InstancedBufferGeometry
    private posAttr: THREE.InstancedBufferAttribute
    private materials: THREE.ShaderMaterial[] = []
    private meshes: THREE.Mesh[] = []
    private gridCols = 0
    private gridRows = 0
    private width = 1
    private height = 1
    private phase = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({
            antialias: false, // the fragment shader does its own edge softening
            alpha: true,
            premultipliedAlpha: true,
        })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        const canvas = this.renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        container.appendChild(canvas)

        // One quad, reused by every instance and by all three channel copies.
        const quad = new THREE.PlaneGeometry(2, 2)
        this.geometry = new THREE.InstancedBufferGeometry()
        this.geometry.index = quad.index
        this.geometry.setAttribute("position", quad.getAttribute("position"))
        quad.dispose()

        // Allocated once at the ceiling and refilled in place. Swapping the
        // attribute object out on every reflow left the draw pointing at a
        // buffer sized for the previous frame shape for a frame or two, which
        // showed up as a rank of dots missing along one edge.
        this.posAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_DOTS * 2),
            2
        )
        this.posAttr.setUsage(THREE.DynamicDrawUsage)
        this.geometry.setAttribute("aPos", this.posAttr)
        this.geometry.instanceCount = 0

        for (let lane = 0; lane < LANES; lane++) {
            const material = new THREE.ShaderMaterial({
                vertexShader: DOT_VERTEX,
                fragmentShader: DOT_FRAGMENT,
                uniforms: {
                    uPhase: { value: 0 },
                    uLaneShift: { value: 0 },
                    uLag: { value: 0 },
                    uAmp: { value: 0.4 },
                    uRadius: { value: 0.15 },
                    uColor: { value: new THREE.Color(1, 1, 1) },
                },
                transparent: true,
                blending: THREE.AdditiveBlending,
                premultipliedAlpha: true,
                depthTest: false,
                depthWrite: false,
            })
            const mesh = new THREE.Mesh(this.geometry, material)
            // The vertex shader does the placing, so three has no idea where an
            // instance ends up and would cull the entire draw.
            mesh.frustumCulled = false
            mesh.renderOrder = lane
            this.materials.push(material)
            this.meshes.push(mesh)
            this.scene.add(mesh)
        }

        this.camera.position.set(0, 0, 2)
        this.camera.lookAt(0, 0, 0)
        this.updateConfig(cfg)
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

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.width = width
        this.height = height
        this.renderer.setSize(width, height, false)
        this.updateCamera()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)

        const base = new THREE.Color(1, 1, 1)
        try {
            base.setStyle(
                cfg.dotColor || DEFAULTS.dotColor,
                THREE.SRGBColorSpace
            )
        } catch {
            // A malformed colour should leave white dots, not a blank frame.
        }

        for (let lane = 0; lane < LANES; lane++) {
            const u = this.materials[lane].uniforms
            u.uAmp.value = S.amp
            u.uRadius.value = S.radius
            u.uLag.value = S.lag * S.freq
            // The trailing copies sit a whole number of delays behind; with the
            // split off only the live copy draws, in the full colour.
            u.uLaneShift.value = S.split ? lane * S.chromaDelay * S.freq : 0
            const tint = (u.uColor.value as THREE.Color).copy(base)
            if (S.split) {
                const mask = CHANNEL_MASKS[lane]
                tint.setRGB(tint.r * mask.x, tint.g * mask.y, tint.b * mask.z)
            }
            this.meshes[lane].visible = S.split || lane === 0
        }

        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1e-3, this.width) / Math.max(1e-3, this.height)
        const S = settingsFor(this.cfg)
        const halfH = S.rows / 2
        const halfW = halfH * aspect

        this.camera.left = -halfW
        this.camera.right = halfW
        this.camera.top = halfH
        this.camera.bottom = -halfH
        this.camera.updateProjectionMatrix()

        // At the bottom of the breath the field contracts to (1.3 - amp) of its
        // rest spread, so the grid has to start wider than the frame or the
        // corners empty out on every inhale.
        const shrink = Math.max(0.35, 1.3 - S.amp)
        this.ensureGrid(
            (halfW / shrink) * GRID_MARGIN,
            (halfH / shrink) * GRID_MARGIN
        )
    }

    /** Refill the dot grid whenever the frame it has to cover changes size. */
    private ensureGrid(halfW: number, halfH: number) {
        let cols = Math.min(MAX_GRID_SIDE, 2 * Math.ceil(halfW))
        let rows = Math.min(MAX_GRID_SIDE, 2 * Math.ceil(halfH))
        // Trim the long side when over budget. Taking two off both sides
        // starved the short one to nothing on a wide frame, and a field two
        // rows tall reads as a band stuck against one edge.
        while (cols * rows > MAX_DOTS) {
            if (cols >= rows) cols = Math.max(2, cols - 2)
            else rows = Math.max(2, rows - 2)
        }
        if (cols === this.gridCols && rows === this.gridRows) return

        const count = cols * rows
        const positions = this.posAttr.array as Float32Array
        for (let i = 0; i < count; i++) {
            // Centred on the origin. The wave scales every dot about (0,0), so
            // a grid whose middle sits half a cell off centre drifts the whole
            // pattern off the frame as it expands.
            const x = (i % cols) - (cols - 1) / 2
            // Every other column nudged half a row down — the hexagonal packing
            // that stops the field reading as a plain square lattice.
            const y =
                Math.floor(i / cols) - (rows - 1) / 2 + ((i % 2) - 0.5) * 0.5
            // A touch of jitter, so the rings never resolve into moire. Centred
            // on zero: the tutorial's one-sided random() shifted the entire
            // field up and to the right by a fixed fraction of a cell.
            positions[i * 2] = x + (Math.random() - 0.5) * 0.3
            positions[i * 2 + 1] = y + (Math.random() - 0.5) * 0.3
        }

        this.posAttr.needsUpdate = true
        this.geometry.instanceCount = count
        this.gridCols = cols
        this.gridRows = rows
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05 // a returning tab must not jump the breath

        const S = settingsFor(this.cfg)
        // Phase accumulates in cycles and wraps, so changing Speed never jolts
        // the wave and a session left open overnight never loses precision.
        this.phase = (this.phase + dt * S.freq) % 1
        for (const m of this.materials) m.uniforms.uPhase.value = this.phase

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        for (const m of this.materials) m.dispose()
        this.geometry.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas.parentNode === this.container) {
            this.container.removeChild(canvas)
        }
    }
}

interface BreathingDotsProps {
    dotColor?: string
    density?: number
    dotSize?: number
    speed?: number
    breath?: number
    ripple?: number
    chroma?: number
    style?: React.CSSProperties
}

export default function BreathingDots(props: BreathingDotsProps) {
    const {
        dotColor = DEFAULTS.dotColor,
        density = DEFAULTS.density,
        dotSize = DEFAULTS.dotSize,
        speed = DEFAULTS.speed,
        breath = DEFAULTS.breath,
        ripple = DEFAULTS.ripple,
        chroma = DEFAULTS.chroma,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<BreathingDotsScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        dotColor,
        density,
        dotSize,
        speed,
        breath,
        ripple,
        chroma,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BreathingDotsScene
        try {
            scene = new BreathingDotsScene(container, cfgRef.current)
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
    }, [dotColor, density, dotSize, speed, breath, ripple, chroma])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A field of dots breathing outward in travelling rings"
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

BreathingDots.displayName = "Breathing Dots"
