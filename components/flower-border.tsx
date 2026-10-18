"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Flower Border — a fan of flowers rooted outside a chosen edge of the frame.
 *
 * WHICH EDGES. Top, Bottom, Left and Right are four switches, not one enum, so
 * "which side" and "how many sides" are the same control: turn on the edges you
 * want and the count of them falls out. An enum could only offer the handful of
 * combinations someone thought to list.
 *
 * Every edge is described the same way — a centre point on the edge, an inward
 * normal, and a tangent along it — so nothing in the flower maths knows which
 * edge it is drawing. Left and Right are not a special case of Top and Bottom;
 * they are the same case with a different frame.
 *
 * All of it happens in HEIGHT UNITS: y runs 0..1 across the frame and x runs
 * 0..aspect. A radius is therefore the same physical size wherever it is used,
 * and the half-span of an edge (aspect/2 across the top, 1/2 down the side)
 * comes out of the same space rather than needing its own conversion.
 *
 * THE COUNT BUILDS A FAN, NOT A ROW. The first flower stands in the middle of
 * the edge; every one after it goes to alternating sides, further out and
 * smaller each time, and is drawn BEFORE the ones nearer the middle — so the
 * middle flower is laid down last and the rest tuck in behind it. Drawn in index
 * order instead, the newest flower would sit on top of the one it was meant to
 * hide behind, and a fan becomes a row.
 *
 * SPREAD IS A SHARE OF THE ROOM, NOT A FIXED STEP. It used to be a fixed gap per
 * rank, which meant the fan's width was the count multiplied by that gap: at the
 * shipped setting the outermost flower of a nine-flower fan sat at uv.x 1.14,
 * clean off the frame, so every value of the count past about five added a
 * flower nobody could see. The gap is now derived — the outermost rank is placed
 * at `Spread` percent of the edge's half-span and the rest divide that up — so
 * the fan fits the frame at ANY count, and `Spread` means one thing (how far
 * across the edge the fan opens) rather than meaning something different for
 * every count.
 *
 * Every flower is rooted outside the frame. A flower cut by the edge belongs to
 * something continuing past it; one sitting whole against the edge belongs to
 * nothing, and the border reads as a shelf of stickers.
 *
 * The petals are drawn once each. The plane is folded into a single wedge — the
 * angle taken modulo one petal's share of the turn and mirrored — so every petal
 * of a flower is the same petal seen from a different side, and the symmetry is
 * exact by construction rather than by a loop getting each one right.
 *
 * A petal is broad where it meets the core and pointed at the tip, and it takes
 * two different limits to get both. Near the core it is held to the room its own
 * wedge has at that radius, so it fills the ring there and its neighbours touch
 * it — that is what makes the petals look attached to the flower rather than
 * scattered around it. Further out that room keeps growing, so a second limit
 * takes over: a fixed width shaped by a quarter cosine, which is full at the base
 * and falls to nothing at the tip. Whichever is smaller wins, and the crossover
 * lands about a third of the way out, which is where a petal is widest.
 *
 * The profile has to be a quarter cosine and not the obvious half sine. A sine
 * closes at both ends, so the petal comes to a point where it meets the core as
 * well as at its tip — it looks like a grain of rice floating near the middle,
 * which is exactly what this did before.
 *
 * The power on that cosine is what sharpens the tip: above one the width leaves
 * nought as a square or a cube and the edge meets the axis tangentially, which is
 * a needle. The cosine is floored at nought first — at the very tip it comes out
 * a hair below zero in floating point, and a negative base under a fractional
 * power is undefined, which arrives as a ring of white around every flower rather
 * than as anything that looks like a mistake in a petal.
 *
 * Fill and outline are separate passes rather than a crossfade: the shape is
 * laid down, then its edge is drawn over the top. That is what makes these read
 * as illustration — a filled shape with a drawn line around it, not a soft one.
 *
 * three is the exception here rather than the rule (rule 10 prefers raw WebGL,
 * and the rest of this folder is raw): the whole component is one full-screen
 * quad and one fragment shader, so the dependency buys a renderer and a colour
 * conversion and nothing else. Noted so it is a known trade rather than a habit.
 */

/** The loop bound in the shader. The panel maximum must not exceed it. */
const MAX_FLOWERS = 9

/*
 * How much smaller each step out from the middle is. The panel used to own it
 * and there was no setting worth having: much less and the fan reads as a row,
 * much more and everything past the second flower is a sliver.
 */
const RANK_SHRINK = 0.82
/*
 * And how much deeper each step is rooted, as a share of ITS OWN radius. An
 * absolute sink was the bug: the radius falls off as 0.82^rank while a fixed
 * sink does not, so by rank three the flower was rooted further outside the
 * frame than it was wide and drew nothing at all. Ranks seven, eight and nine
 * were invisible, and picking nine over seven LOST coverage, because the fan
 * packed tighter to fit flowers nobody could see.
 */
const RANK_SINK = 0.09

/*
 * How much of the room its wedge has a petal takes. Near the core this is what
 * sets its width outright, so it wants to be close to the whole of it — the
 * petals then meet along their edges there, which is what reads as attached.
 * Not quite the whole, or the line between them closes up.
 */
const PETAL_FULLNESS = 0.92

/*
 * Half the drawn line, in pixels. One is a hairline, which is all this wants —
 * the shapes carry themselves and a heavier line only thickens the gaps between
 * petals until they close.
 */
const LINE_WEIGHT = 1

type Sides = {
    top: boolean
    bottom: boolean
    left: boolean
    right: boolean
}

/*
 * Typed, because an untyped literal narrows every field and the optional reads
 * below stop compiling in Framer's editor (rule 10).
 */
const DEFAULT_SIDES: Sides = {
    top: true,
    bottom: true,
    left: false,
    right: false,
}

const DEFAULTS = {
    petal: "#F2879F",
    line: "#3A1730",
    heart: "#FFD166",
    sides: { top: false, left: true, right: true, bottom: false },
    flowers: 9,
    petals: 5,
    size: 15,
    point: 14,
    spread: 100,
    sway: 20,
}

type Config = {
    petal: string
    line: string
    heart: string
    sides: Sides
    flowers: number
    petals: number
    size: number
    point: number
    spread: number
    sway: number
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
    /*
     * A group the designer never opened arrives undefined, and one they opened
     * to flip a single switch arrives holding only that switch. Spread-merged
     * over the defaults rather than read through a chain of ??, because a chain
     * is where one missed key silently pins a control forever.
     */
    const sides: Sides = { ...DEFAULT_SIDES, ...(cfg.sides || {}) }

    return {
        sides: [
            sides.top ? 1 : 0,
            sides.bottom ? 1 : 0,
            sides.left ? 1 : 0,
            sides.right ? 1 : 0,
        ] as [number, number, number, number],
        // The loop bound in the shader is this same constant; raising the panel
        // maximum without raising it there is a silent cap.
        flowers: Math.round(clamp(cfg.flowers, 1, MAX_FLOWERS, DEFAULTS.flowers)),
        /*
         * Whole petals only. The fold takes the angle modulo one petal's share
         * of the turn, and a share that does not divide the circle leaves a
         * wedge of the wrong width lying across the seam. Under five they are
         * so wide apart the head stops reading as a flower.
         */
        petals: Math.round(clamp(cfg.petals, 5, 16, DEFAULTS.petals)),
        // A share of the frame's height, so a head keeps its size in any frame.
        size: 0.06 + clamp(cfg.size, 1, 20, DEFAULTS.size) * 0.013,
        /*
         * The power on the petal's width profile, and the panel runs with it
         * rather than against it. Above one the width leaves nought as a square
         * or a cube, so the edge meets the tip tangentially and the petal is a
         * needle; below one it leaves at a right angle and the tip goes blunt.
         * The range crosses one near the middle of the slider, which is where a
         * petal stops being a paddle and starts being a leaf.
         */
        point: 0.5 + clamp(cfg.point, 1, 20, DEFAULTS.point) * 0.11,
        /*
         * A share of the edge's own half-span, not a fixed step per rank. The
         * shader divides it by the outermost rank, so the fan is this wide
         * whatever the count and can never walk off the frame.
         */
        spread: clamp(cfg.spread, 0, 100, DEFAULTS.spread) / 100,
        // Radians a head leans as it sways.
        sway: clamp(cfg.sway, 0, 20, DEFAULTS.sway) * 0.018,
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

const BORDER_FRAGMENT = /* glsl */ `
    precision highp float;

    #define MAX_FLOWERS ${MAX_FLOWERS}
    #define RANK_SHRINK ${RANK_SHRINK}
    #define RANK_SINK ${RANK_SINK}
    #define FULLNESS ${PETAL_FULLNESS}
    #define TAU 6.28318530718
    #define PI 3.14159265359

    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec3 uPetal;
    uniform vec3 uLine;
    uniform vec3 uHeart;
    uniform vec4 uSides;
    uniform float uCount;
    uniform float uPetals;
    uniform float uSize;
    uniform float uPoint;
    uniform float uWeight;
    uniform float uSpread;
    uniform float uSway;

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

    /*
     * One petal, lying along the positive x axis of the wedge it was folded
     * into: broad where it meets the core, widest about a third of the way out,
     * and pointed at the tip.
     */
    float petalDist(vec2 q, float inner, float outer, float sector) {
        float t = clamp((q.x - inner) / max(outer - inner, 0.0001), 0.0, 1.0);

        /*
         * The room its own wedge has at this radius. Near the core this is the
         * smaller of the two and so the one that decides: the petal fills the
         * ring there and its neighbours meet it, which is what makes the flower
         * read as one thing rather than as petals scattered near a dot.
         */
        float room = q.x * sin(sector * 0.5) * FULLNESS;

        /*
         * And a fixed width, taken from the room at the middle of the reach and
         * shaped by a quarter cosine: full at the base, nothing at the tip.
         * Further out this is the smaller one, which is what stops the petal
         * carrying on widening with the radius the way a plain wedge does.
         *
         * A quarter cosine and not the obvious half sine: a sine closes at both
         * ends, so the petal would come to a point where it meets the core as
         * well as at its tip and float there like a grain of rice.
         *
         * Floored at nought before the power. At the tip the cosine comes out a
         * hair below zero in floating point, and a negative base under a
         * fractional power is undefined — what comes back is not a number, it
         * survives every max and mix after it, and it lands as a ring of white
         * right around the flower.
         */
        float wide = (inner + outer) * 0.5 * sin(sector * 0.5) * FULLNESS;
        float taper = wide * pow(max(cos(PI * 0.5 * t), 0.0), uPoint);

        float d = abs(q.y) - min(room, taper);
        // Cut at both ends, or the petal runs on as a hairline along the axis.
        d = max(d, q.x - outer);
        return max(d, inner - q.x);
    }

    void main() {
        float aspect = uResolution.x / max(uResolution.y, 1.0);

        /*
         * Height units: y runs 0..1 across the frame and x runs 0..aspect. Every
         * radius, gap and half-span below lives in this one space, so nothing has
         * to be converted per edge and a size means the same thing on all four.
         */
        vec2 p = vec2(vUv.x * aspect, vUv.y);

        vec3 petalCol = rgbFromOklab(uPetal);
        vec3 lineCol = rgbFromOklab(uLine);
        vec3 heartCol = rgbFromOklab(uHeart);

        vec3 col = vec3(0.0);
        float cover = 0.0;

        /*
         * The outermost rank in the fan. Spread places THAT one, and every rank
         * inside it divides the same room up — which is what keeps the fan on
         * the frame at any count.
         */
        float maxRank = max(ceil((uCount - 1.0) * 0.5), 1.0);

        /*
         * Walked from the outside of the fan inward, so the middle flower is
         * laid down last and everything else tucks in behind it. Taken in index
         * order, the newest flower would sit on top of the one it is meant to
         * hide behind.
         */
        for (int j = 0; j < MAX_FLOWERS; j++) {
            int i = MAX_FLOWERS - 1 - j;
            float fi = float(i);
            if (fi < uCount) {
                // Nought is the middle; every one after alternates sides and
                // steps one further out.
                float rank = ceil(fi * 0.5);
                float side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;

                // Top, bottom, left, right — each with its own phase so no two
                // rows are one row flipped.
                for (int e = 0; e < 4; e++) {
                    // A loop index is a constant-index-expression, so this is a
                    // legal vector subscript in GLSL ES 1.00.
                    if (uSides[e] > 0.5) {
                        float fe = float(e);
                        float seed = fract(sin((fi + fe * 13.0) * 37.13) * 43758.5453);

                        /*
                         * The edge as a frame: a point at the middle of it, the
                         * inward normal, the tangent the fan opens along, and
                         * how much room that tangent has to either side. Past
                         * this nothing below knows which edge it is drawing.
                         */
                        vec2 c, n, t;
                        float halfSpan;
                        if (e == 0) {
                            c = vec2(aspect * 0.5, 0.0);
                            n = vec2(0.0, 1.0);
                            t = vec2(1.0, 0.0);
                            halfSpan = aspect * 0.5;
                        } else if (e == 1) {
                            c = vec2(aspect * 0.5, 1.0);
                            n = vec2(0.0, -1.0);
                            t = vec2(1.0, 0.0);
                            halfSpan = aspect * 0.5;
                        } else if (e == 2) {
                            c = vec2(0.0, 0.5);
                            n = vec2(1.0, 0.0);
                            t = vec2(0.0, 1.0);
                            halfSpan = 0.5;
                        } else {
                            c = vec2(aspect, 0.5);
                            n = vec2(-1.0, 0.0);
                            t = vec2(0.0, 1.0);
                            halfSpan = 0.5;
                        }

                        float radius = uSize * pow(RANK_SHRINK, rank);

                        // Along the edge: the outermost rank lands at Spread of
                        // the half-span, the rest share it out evenly.
                        float along = side * rank * (uSpread * halfSpan / maxRank);
                        /*
                         * And into the frame: rooted outside it, and deeper the
                         * further back in the fan it stands. Both terms scale
                         * with the flower's OWN radius, so a rank can never sink
                         * further out than it is wide however far the shrink has
                         * taken it.
                         */
                        float into = radius * (0.55 - rank * RANK_SINK);

                        vec2 centre = c + t * along + n * into;

                        float tip = sin(uTime * (0.7 + seed * 0.7) + seed * TAU) * uSway;

                        vec2 q0 = p - centre;
                        float r0 = length(q0);
                        float a0 = atan(q0.y, q0.x) - tip;

                        float sector = TAU / uPetals;
                        /*
                         * The fold: the angle taken modulo one petal's share
                         * and mirrored about the middle of it. Every petal is
                         * now the same petal, so the flower is exactly
                         * symmetric.
                         */
                        float a = mod(a0 + sector * 0.5, sector) - sector * 0.5;
                        vec2 q = vec2(cos(a), sin(a)) * r0;

                        /*
                         * Starting at the core's own radius, so the petals
                         * spring from its edge. Started further in they cross
                         * underneath it and the flat cut at their base shows
                         * through.
                         */
                        float d = petalDist(q, radius * 0.2, radius, sector);
                        float aa = max(fwidth(d), 0.0001);
                        float solid = 1.0 - smoothstep(-aa, aa, d);

                        float w = uWeight / uResolution.y;
                        float stroke = 1.0 - smoothstep(w - aa, w + aa, abs(d));

                        // The heart, drawn over its own petals and under the
                        // next flower in front. A shade wider than where the
                        // petals begin, so the cut across each of their bases is
                        // covered by it.
                        float dc = r0 - radius * 0.22;
                        float aac = max(fwidth(dc), 0.0001);
                        float eye = 1.0 - smoothstep(-aac, aac, dc);
                        float eyeLine = 1.0 - smoothstep(w - aac, w + aac, abs(dc));

                        /*
                         * Fill first, then the line over it. Crossfaded between
                         * the two it would be a soft shape; laid in this order
                         * it is a filled shape with a drawn edge, which is what
                         * reads as drawn.
                         */
                        col = mix(col, petalCol, solid);
                        col = mix(col, lineCol, stroke);
                        col = mix(col, heartCol, eye);
                        col = mix(col, lineCol, eyeLine);

                        cover = max(cover, max(max(solid, stroke), max(eye, eyeLine)));
                    }
                }
            }
        }

        if (cover < 0.004) discard;

        // Premultiplied, so the frame shows between the flowers.
        gl_FragColor = vec4(col * cover, cover);
    }
`

class BorderScene {
    private container: HTMLElement

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private time = 0

    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container

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
            vertexShader: QUAD_VERTEX,
            fragmentShader: BORDER_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uTime: { value: 0 },
                uPetal: { value: new THREE.Vector3() },
                uLine: { value: new THREE.Vector3() },
                uHeart: { value: new THREE.Vector3() },
                uSides: { value: new THREE.Vector4(1, 1, 0, 0) },
                uCount: { value: 1 },
                uPetals: { value: 5 },
                uSize: { value: 0.1 },
                uPoint: { value: 1 },
                uWeight: { value: LINE_WEIGHT },
                uSpread: { value: 0 },
                uSway: { value: 0 },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        // Every uniform but the clock is written here, so the loop only ticks.
        this.updateConfig(cfg)
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
        this.material.uniforms.uResolution.value.set(width * dpr, height * dpr)
        // The one measurement in real pixels rather than a share of the frame.
        this.material.uniforms.uWeight.value = LINE_WEIGHT * dpr
    }

    /*
     * Called on every prop change and nowhere else, so no per-frame object is
     * built to read numbers that only move when the panel does.
     */
    updateConfig(cfg: Config) {
        if (this.disposed) return
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uPetal.value.copy(toOklab(cfg.petal, DEFAULTS.petal))
        u.uLine.value.copy(toOklab(cfg.line, DEFAULTS.line))
        u.uHeart.value.copy(toOklab(cfg.heart, DEFAULTS.heart))
        u.uSides.value.set(S.sides[0], S.sides[1], S.sides[2], S.sides[3])
        u.uCount.value = S.flowers
        u.uPetals.value = S.petals
        u.uSize.value = S.size
        u.uPoint.value = S.point
        u.uSpread.value = S.spread
        u.uSway.value = S.sway
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not swing the garland right across the frame.
        if (dt > 0.05) dt = 0.05

        // The sway runs on its own clock, so it is a fixed rate rather than one
        // more thing on the panel.
        this.time += dt * 1.1
        this.material.uniforms.uTime.value = this.time

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface FlowerBorderProps {
    petal?: string
    line?: string
    heart?: string
    sides?: Sides
    flowers?: number
    petals?: number
    size?: number
    point?: number
    spread?: number
    sway?: number
    style?: React.CSSProperties
}

export default function FlowerBorder(props: FlowerBorderProps) {
    const {
        petal = DEFAULTS.petal,
        line = DEFAULTS.line,
        heart = DEFAULTS.heart,
        sides = { top: false, left: true, right: true, bottom: false },
        flowers = DEFAULTS.flowers,
        petals = DEFAULTS.petals,
        size = DEFAULTS.size,
        point = DEFAULTS.point,
        spread = DEFAULTS.spread,
        sway = DEFAULTS.sway,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<BorderScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        petal,
        line,
        heart,
        sides,
        flowers,
        petals,
        size,
        point,
        spread,
        sway,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BorderScene
        try {
            scene = new BorderScene(container, cfgRef.current)
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

    /*
     * Framer hands back a fresh group object every render, so the switches are
     * depended on one at a time — the object itself would fire this effect on
     * every render whether or not a switch moved (rule G).
     */
    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current)
    }, [
        petal,
        line,
        heart,
        sides?.top,
        sides?.bottom,
        sides?.left,
        sides?.right,
        flowers,
        petals,
        size,
        point,
        spread,
        sway,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Flowers fanned out along the edges of the frame"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                // Repo floor (rule 6): a percentage root collapses to 0×0 under
                // Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

FlowerBorder.displayName = "Flower Border"
FlowerBorder.defaultProps = { ...DEFAULTS }
