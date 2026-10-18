"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Mandala Bloom — concentric bands of ornament, drawn the way one is drawn.
 *
 * A mandala is not a scattering of motifs about a centre. It is a set of rings,
 * each ruled off from the next, each divided into a whole number of equal cells,
 * and each cell holding one ornament that fills it. Everything meets its
 * neighbour along a line somebody chose. That is why it reads as designed and a
 * scattering never does — and it is also why nothing here can overlap: a motif
 * is not placed at a position and given a size, it is fitted to a cell and
 * clipped to it. Overlap is not avoided, it is impossible.
 *
 * The divisions double outward. A band twice as far out has twice the room, so
 * it takes twice the cells — which is how the ornament stays the same size all
 * the way to the rim instead of stretching. Doubling rather than any other step
 * is what keeps every division of every band landing on the divisions of the one
 * inside it, so the spokes run true from the middle to the edge.
 *
 * The rules between bands are the other half of it. Without them the bands are
 * separate rings of things; with them they are one figure, and the eye reads the
 * whole before it reads any part.
 *
 * Every motif is built to the same contract: it is handed a cell as an inner and
 * outer radius and a share of the turn, and it must return a distance that is
 * negative only inside that cell. Anything can be added to the set as long as it
 * keeps to that, which is the whole reason there are six of them.
 */

/*
 * How fast the figure answers the cursor, per second. Slow: it is a heavy thing
 * turning about a fixed point.
 */
const CURSOR_FOLLOW = 3.0

/** The loop bound in the shader. The panel maximum must not exceed it. */
const MAX_BANDS = 8

/** How many kinds of ornament a band can be given. */
const MOTIF_KINDS = 6.0

/*
 * How much of its cell an ornament takes. Never the whole of it, or the ones
 * either side of it meet along their edges and the band fills into a solid ring.
 */
const CELL_FILL = 0.9

const DEFAULTS = {
    line: "#F2E4CF",
    warm: "#59001C",
    cool: "#6900BA",
    bands: 8,
    symmetry: 16,
    variety: 11,
    point: 8,
    fill: 20,
    weight: 1,
    rules: 0,
    spin: 10,
    scale: 200,
}

type Config = {
    line: string
    warm: string
    cool: string
    bands: number
    symmetry: number
    variety: number
    point: number
    fill: number
    weight: number
    rules: number
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
        // The loop bound in the shader is this same constant; raising the panel
        // maximum without raising it there is a silent cap.
        bands: Math.round(clamp(cfg.bands, 1, MAX_BANDS, DEFAULTS.bands)),
        /*
         * Whole divisions only, and the bands take multiples of this one. A
         * count that does not divide the circle leaves a cell of the wrong width
         * lying across the seam where the angle rolls over.
         */
        symmetry: Math.round(clamp(cfg.symmetry, 3, 16, DEFAULTS.symmetry)),
        /*
         * How far the ornament is allowed to differ from band to band. At nought
         * every band is the same one, which is a target rather than a mandala.
         */
        variety: clamp(cfg.variety, 0, 20, DEFAULTS.variety) / 20,
        /*
         * The power on a petal's width. Above one the width leaves nought as a
         * square or a cube and the tip comes to a point; below one it leaves at a
         * right angle and goes blunt. The range crosses one near the middle.
         */
        point: 0.5 + clamp(cfg.point, 1, 20, DEFAULTS.point) * 0.11,
        // 0 is line art, 1 fills every shape in behind its own outline.
        fill: clamp(cfg.fill, 0, 20, DEFAULTS.fill) / 20,
        // Half the drawn line in pixels, held above one so a hairline does not
        // dash itself apart against the pixel grid.
        weight: Math.max(1.0, 0.6 + clamp(cfg.weight, 1, 20, DEFAULTS.weight) * 0.26),
        // How heavily the circles between bands are ruled, as a multiple of the
        // line. Nought leaves the bands as separate rings of things.
        rules: clamp(cfg.rules, 0, 20, DEFAULTS.rules) * 0.09,
        // Turns per second.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.012,
        scale: clamp(cfg.scale, 20, 200, DEFAULTS.scale) / 100,
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

const MANDALA_FRAGMENT = /* glsl */ `
    precision highp float;

    #define MAX_BANDS ${MAX_BANDS}
    /*
     * Spelled with its decimal point, always. A whole number written into the
     * shader arrives as an int, and this dialect will not multiply an int by a
     * float — so the whole thing fails to compile, which shows up as an empty
     * frame rather than as anything misdrawn.
     */
    #define KINDS ${MOTIF_KINDS.toFixed(1)}
    #define CELL_FILL ${CELL_FILL}
    #define TAU 6.28318530718
    #define PI 3.14159265359

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTurn;
    uniform vec3 uLine;
    uniform vec3 uWarm;
    uniform vec3 uCool;
    uniform float uBands;
    uniform float uSymmetry;
    uniform float uVariety;
    uniform float uPoint;
    uniform float uFill;
    uniform float uWeight;
    uniform float uRules;
    uniform float uScale;

    varying vec2 vUv;

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

    float hash1(float n) {
        return fract(sin(n * 127.1 + 0.371) * 43758.5453123);
    }

    /*
     * One ornament, fitted to its cell.
     *
     * The cell runs from inner to outer in x and is half a share of the turn wide
     * in y, and every kind below is clipped to it before it is returned. That
     * clip is the whole reason nothing in this figure can overlap anything else:
     * a motif is never given a position and a size, it is given a cell.
     */
    float motifDist(float kind, vec2 q, float inner, float outer, float sector) {
        float span = max(outer - inner, 0.0001);
        float t = clamp((q.x - inner) / span, 0.0, 1.0);
        // Half the cell at this radius, and half of it at the middle.
        float room = q.x * sin(sector * 0.5) * CELL_FILL;
        float mid = (inner + outer) * 0.5;
        float wide = mid * sin(sector * 0.5) * CELL_FILL;
        // What fits in the cell either way, which is what keeps the round motifs
        // from spilling out of a band narrower than it is wide.
        float fits = min(span * 0.5, wide);

        float d;
        if (kind < 1.0) {
            /*
             * A petal: broad where it meets the band below and pointed outward.
             * Held under the room at this radius near the base, so it fills the
             * cell there and its neighbours meet it.
             *
             * Floored at nought before the power — at the tip the cosine comes
             * out a hair below zero in floating point, and a negative base under
             * a fractional power is undefined, which arrives as a ring of white
             * rather than as anything that looks like a fault in a petal.
             */
            float taper = wide * pow(max(cos(PI * 0.5 * t), 0.0), uPoint);
            d = abs(q.y) - min(room, taper);
        } else if (kind < 2.0) {
            // A disc, centred in the cell.
            d = length(q - vec2(mid, 0.0)) - fits * 0.8;
        } else if (kind < 3.0) {
            // A ring, which is what gives the eye somewhere to rest between the
            // busier bands.
            float r = fits * 0.82;
            d = abs(length(q - vec2(mid, 0.0)) - r) - r * 0.34;
        } else if (kind < 4.0) {
            // A spike: the full cell where it leaves the band below, a point at
            // the rim. Neighbours meet along their bases and part going out.
            d = abs(q.y) - room * (1.0 - t);
        } else if (kind < 5.0) {
            /*
             * A scallop: an arc struck from the outer edge of the cell, so the
             * row of them reads as a scalloped border rather than as separate
             * marks.
             */
            float r = span * 0.85;
            d = abs(length(q - vec2(outer, 0.0)) - r) - span * 0.13;
            d = max(d, abs(q.y) - room);
        } else {
            // A lattice: two bars crossing, clipped to the cell, which is what
            // turns a row of them into a woven band.
            vec2 c = q - vec2(mid, 0.0);
            float w = min(span, wide * 2.0) * 0.11;
            float bar = min(
                abs(dot(c, vec2(0.70710678, 0.70710678))) - w,
                abs(dot(c, vec2(0.70710678, -0.70710678))) - w
            );
            d = max(bar, abs(q.y) - room);
        }

        // Clipped to the band, always. Without it every one of these runs on
        // past its cell and into the bands either side.
        d = max(d, q.x - outer);
        return max(d, inner - q.x);
    }

    void main() {
        // The short side, so the figure keeps its proportion in any frame.
        float unit = min(uResolution.x, uResolution.y);
        vec2 p = (vUv * uResolution - uResolution * 0.5) / (unit * uScale);

        float radius = length(p);
        float angle = atan(p.y, p.x) + uTurn;

        // The whole figure reaches a little past a half, so it fills a square
        // frame corner to corner at a hundred per cent.
        float span = 0.5;
        float bandWidth = span / uBands;
        if (radius > span) discard;

        vec3 lineCol = rgbFromOklab(uLine);
        vec3 col = vec3(0.0);
        float cover = 0.0;

        // Loop bounds must be constant; the count is compared inside instead.
        for (int i = 0; i < MAX_BANDS; i++) {
            float fi = float(i);
            if (fi < uBands) {
                float inner = fi * bandWidth;
                float outer = inner + bandWidth;
                // Only the band this pixel is in has anything to say about it.
                if (radius < inner || radius > outer) continue;

                /*
                 * The divisions double outward. A band twice as far out has
                 * twice the room, so it takes twice the cells and the ornament
                 * keeps its size instead of stretching to the rim. Doubling and
                 * not some other step is what lands every division on the ones
                 * inside it, so the spokes run true.
                 */
                float reps = uSymmetry * pow(2.0, floor(fi * 0.5));
                float sector = TAU / reps;

                // The fold: the angle taken modulo one cell and mirrored about
                // the middle of it, so every cell in the band is the same cell.
                float a = mod(angle + sector * 0.5, sector) - sector * 0.5;
                vec2 q = vec2(cos(a), sin(a)) * radius;

                // Which ornament this band wears. Hashed off the band rather
                // than stepped through the list, so the bands do not read as a
                // sequence counting up.
                float kind = floor(hash1(fi * 5.7 + 2.1) * KINDS * uVariety);

                float d = motifDist(kind, q, inner, outer, sector);
                float aa = max(fwidth(d), 0.0001);
                float w = uWeight / (unit * uScale);

                float solid = 1.0 - smoothstep(-aa, aa, d);
                float stroke = 1.0 - smoothstep(w - aa, w + aa, abs(d));

                // Warm and cool alternating outward, which is what stops six
                // bands of ornament reading as one texture.
                vec3 body = mod(fi, 2.0) < 0.5
                    ? rgbFromOklab(uWarm)
                    : rgbFromOklab(uCool);

                // Fill first, then the line over it: a filled shape with a drawn
                // edge, rather than the soft thing a crossfade gives.
                col = mix(col, body, solid * uFill);
                col = mix(col, lineCol, stroke);
                cover = max(cover, max(solid * uFill, stroke));
            }
        }

        /*
         * The rules between the bands. These are what make the figure one thing
         * rather than a set of rings that happen to share a centre — drawn last,
         * so every ornament runs up to them and stops.
         */
        if (uRules > 0.0) {
            float steps = radius / bandWidth;
            float toRule = min(fract(steps), 1.0 - fract(steps)) * bandWidth;
            float rule = min(toRule, abs(radius - span));
            float aaR = max(fwidth(radius), 0.0001);
            float wR = (uWeight * uRules) / (unit * uScale);
            float ink = 1.0 - smoothstep(wR - aaR, wR + aaR, rule);
            col = mix(col, lineCol, ink);
            cover = max(cover, ink);
        }

        if (cover < 0.004) discard;

        // Premultiplied, so the frame shows between the ornament.
        gl_FragColor = vec4(col * cover, cover);
    }
`

class MandalaScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private target = new THREE.Vector2(0, 0)
    private eased = new THREE.Vector2(0, 0)
    private hold = 0
    private wantHold = 0
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
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: MANDALA_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(0, 0) },
                uHold: { value: 0 },
                uTurn: { value: 0 },
                uLine: { value: toOklab(cfg.line, DEFAULTS.line) },
                uWarm: { value: toOklab(cfg.warm, DEFAULTS.warm) },
                uCool: { value: toOklab(cfg.cool, DEFAULTS.cool) },
                uBands: { value: S.bands },
                uSymmetry: { value: S.symmetry },
                uVariety: { value: S.variety },
                uPoint: { value: S.point },
                uFill: { value: S.fill },
                uWeight: { value: S.weight },
                uRules: { value: S.rules },
                uScale: { value: S.scale },
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
        if (this.wantHold === 0) {
            this.target.set(this.width * 0.5, this.height * 0.5)
            this.eased.copy(this.target)
        }
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const u = this.material.uniforms
        u.uLine.value.copy(toOklab(cfg.line, DEFAULTS.line))
        u.uWarm.value.copy(toOklab(cfg.warm, DEFAULTS.warm))
        u.uCool.value.copy(toOklab(cfg.cool, DEFAULTS.cool))
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not turn the figure through a dozen divisions.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        // Folded to one turn, which leaves the figure exactly where it was, so
        // the fold never shows and the phase never grows large enough to lose
        // precision over a long session.
        this.turn = (this.turn + dt * S.spin) % 1
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 2.5))

        const u = this.material.uniforms
        u.uTurn.value = this.turn * Math.PI * 2
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        u.uBands.value = S.bands
        u.uSymmetry.value = S.symmetry
        u.uVariety.value = S.variety
        u.uPoint.value = S.point
        u.uFill.value = S.fill
        // The one measurement in real pixels rather than a share of the frame.
        u.uWeight.value = S.weight * this.renderer.getPixelRatio()
        u.uRules.value = S.rules
        u.uScale.value = S.scale

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

export interface MandalaBloomProps {
    line?: string
    warm?: string
    cool?: string
    bands?: number
    symmetry?: number
    variety?: number
    point?: number
    fill?: number
    weight?: number
    rules?: number
    spin?: number
    scale?: number
    style?: React.CSSProperties
}

export default function MandalaBloom(props: MandalaBloomProps) {
    const {
        line = DEFAULTS.line,
        warm = DEFAULTS.warm,
        cool = DEFAULTS.cool,
        bands = DEFAULTS.bands,
        symmetry = DEFAULTS.symmetry,
        variety = DEFAULTS.variety,
        point = DEFAULTS.point,
        fill = DEFAULTS.fill,
        weight = DEFAULTS.weight,
        rules = DEFAULTS.rules,
        spin = DEFAULTS.spin,
        scale = DEFAULTS.scale,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<MandalaScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        line,
        warm,
        cool,
        bands,
        symmetry,
        variety,
        point,
        fill,
        weight,
        rules,
        spin,
        scale,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: MandalaScene
        try {
            scene = new MandalaScene(container, cfgRef.current)
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
        line,
        warm,
        cool,
        bands,
        symmetry,
        variety,
        point,
        fill,
        weight,
        rules,
        spin,
        scale,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A mandala of concentric ruled bands of ornament"
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

MandalaBloom.displayName = "Mandala Bloom"
MandalaBloom.defaultProps = { ...DEFAULTS }
