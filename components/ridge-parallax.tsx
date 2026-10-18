"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/* ---------------------------------------------------------------- constants */

const MAX_LAYERS = 12
const DPR_CAP = 1.5

const Z_MAX = 5

const BASE_NEAR = -0.95
const BASE_FAR = 0.3
const AMP_NEAR = 0.34
const AMP_FAR = 0.2
const FLOOR = -1.28

const DOT_FULL = 10
const DOT_PERSP = 0.35

const PER_DENSITY = 260
const MAX_POINTS = 260000

const DRIFT_RATE = 45

// Maximum cursor parallax in CSS pixels at Pointer 100%.
const POINTER_DISTANCE = 180

// How quickly the cursor position catches up to its target.
const POINTER_SMOOTH = 8

const COVER = 1.15

const GRID_ASPECT = 2.3
const JITTER = 0.4
const V_BIAS = 1.15

const SIZE_REF_H = 800
const SIZE_SCALE_MIN = 0.5
const SIZE_SCALE_MAX = 2.5

/* ------------------------------------------------------------------ shaders */

const VERT = `
precision highp float;

attribute vec2 aP;
attribute vec2 aQ;

uniform vec2 uRes;
uniform float uWrapW;
uniform float uPan[12];

uniform float uTravel;
uniform float uPara;
uniform float uLayers;
uniform float uHeight;
uniform float uFall;
uniform float uRough;
uniform float uSeed;
uniform float uDot;

uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uBg;
uniform float uHaze;

// Cursor-driven depth parallax in device pixels.
uniform float uPointer;

varying vec3 vCol;
varying float vA;

const float PI = 3.14159265;
const float Z_MAX = ${Z_MAX}.0;
const float BASE_NEAR = ${BASE_NEAR};
const float BASE_FAR = ${BASE_FAR};
const float AMP_NEAR = ${AMP_NEAR};
const float AMP_FAR = ${AMP_FAR};
const float FLOOR = ${FLOOR};
const float DOT_PERSP = ${DOT_PERSP};

float hash2(float a, float b) {
    return fract(
        sin(a * 127.1 + b * 311.7 + uSeed * 74.7)
        * 43758.5453
    );
}

float oct(float q, float li, float k, float f) {
    return 1.0 - abs(
        sin(
            PI * (
                f * q
                + hash2(li + 1.0, k + 1.0)
            )
        )
    );
}

float ridged(float q, float li) {
    float w1 = uRough;
    float w2 = w1 * uRough;
    float w3 = w2 * uRough;

    float sum =
          oct(q, li, 0.0, 3.0)
        + w1 * oct(q, li, 1.0, 7.0)
        + w2 * oct(q, li, 2.0, 13.0)
        + w3 * oct(q, li, 3.0, 23.0);

    return sum / (1.0 + w1 + w2 + w3);
}

float panOf(float li) {
    float p = uPan[0];

    for (int i = 1; i < 12; i++) {
        if (float(i) >= uLayers) break;

        if (float(i) == li) {
            p = uPan[i];
        }
    }

    return p;
}

void main() {
    float li = aQ.y;

    float t =
        uLayers > 1.0
        ? li / (uLayers - 1.0)
        : 0.0;

    float halfH = uRes.y * 0.5;

    // 1 = foreground, Z_MAX = background.
    float zr =
        1.0 + t * (Z_MAX - 1.0);

    float baseline =
        mix(
            BASE_NEAR,
            BASE_FAR,
            t
        ) * halfH;

    float amp =
        uHeight
        * mix(
            AMP_NEAR,
            AMP_FAR,
            t
        )
        * halfH;

    float crest =
        baseline
        + amp * ridged(aP.x, li);

    float y =
        crest
        - aP.y
        * uFall
        * (
            crest
            - FLOOR * halfH
        );

    /*
     * Normal autonomous movement.
     */
    float k =
        pow(
            1.0 / zr,
            uPara
        );

    /*
     * Cursor parallax.
     *
     * Foreground:
     *   k ~= 1
     *
     * Background:
     *   k becomes smaller
     *
     * Therefore the foreground follows the cursor more strongly,
     * producing a clear depth cue.
     */
    float pointerShift =
        uPointer * k;

    float x =
        mod(
            aP.x * uWrapW
            - panOf(li)
            - uTravel * k
            + pointerShift
            + uWrapW * 0.5,
            uWrapW
        )
        - uWrapW * 0.5;

    gl_Position =
        vec4(
            x / (uRes.x * 0.5),
            y / halfH,
            0.0,
            1.0
        );

    gl_PointSize =
        clamp(
            uDot
            * mix(
                1.0,
                1.0 / zr,
                DOT_PERSP
            ),
            0.9,
            64.0
        );

    vec3 col =
        mix(
            uAccent,
            uBase,
            t
        );

    col =
        mix(
            col,
            uBg,
            uHaze * t
        );

    vCol =
        col
        * (
            0.82
            + 0.18 * aQ.x
        );

    vA =
        1.0
        - smoothstep(
            0.82,
            1.0,
            aP.y
        );
}
`

const FRAG = `
precision highp float;

varying vec3 vCol;
varying float vA;

void main() {
    float d =
        length(
            gl_PointCoord - 0.5
        ) * 2.0;

    float a =
        (
            1.0
            - smoothstep(
                0.72,
                1.0,
                d
            )
        )
        * vA;

    if (a <= 0.002) discard;

    gl_FragColor =
        vec4(
            vCol * a,
            a
        );
}
`

/* ------------------------------------------------------------------ helpers */

function parseColor(
    input: string
): [number, number, number] {
    if (!input) {
        return [0, 0, 0]
    }

    const s = input.trim()

    const fn =
        s.match(
            /rgba?\(([^)]+)\)/i
        )

    if (fn) {
        const p =
            fn[1]
                .split(",")
                .map((v) =>
                    parseFloat(v.trim())
                )

        return [
            (p[0] || 0) / 255,
            (p[1] || 0) / 255,
            (p[2] || 0) / 255,
        ]
    }

    let h =
        s.replace("#", "")

    if (
        h.length === 3 ||
        h.length === 4
    ) {
        h =
            h
                .split("")
                .map(
                    (c) =>
                        c + c
                )
                .join("")
    }

    h =
        h.padEnd(
            6,
            "0"
        )

    return [
        parseInt(
            h.slice(0, 2),
            16
        ) / 255,

        parseInt(
            h.slice(2, 4),
            16
        ) / 255,

        parseInt(
            h.slice(4, 6),
            16
        ) / 255,
    ]
}

function mulberry32(a: number) {
    return function () {
        a |= 0

        a =
            (a + 0x6d2b79f5) |
            0

        let t =
            Math.imul(
                a ^ (a >>> 15),
                1 | a
            )

        t =
            (t +
                Math.imul(
                    t ^ (t >>> 7),
                    61 | t
                )) ^
            t

        return (
            (t ^
                (t >>> 14)) >>>
            0
        ) / 4294967296
    }
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
) {
    const sh =
        gl.createShader(type)!

    gl.shaderSource(
        sh,
        src
    )

    gl.compileShader(sh)

    if (
        !gl.getShaderParameter(
            sh,
            gl.COMPILE_STATUS
        )
    ) {
        console.warn(
            "RidgeParallax shader:",
            gl.getShaderInfoLog(sh)
        )
    }

    return sh
}

const clamp = (
    v: number,
    lo: number,
    hi: number
) =>
    v < lo
        ? lo
        : v > hi
          ? hi
          : v

/* --------------------------------------------------------------------- props */

interface RangeGroup {
    layers: number
    height: number
    roughness: number
    fall: number
    seed: number
}

interface DepthGroup {
    parallax: number
    haze: number
    travelStart: number
    travelEnd: number
}

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string

    density?: number
    dotSize?: number
    speed?: number

    // Cursor interaction strength.
    pointer?: number

    range?: Partial<RangeGroup>
    depth?: Partial<DepthGroup>

    width?: number
    height?: number

    style?: React.CSSProperties
}

const DEFAULT_RANGE: RangeGroup = {
    layers: 6,
    height: 100,
    roughness: 55,
    fall: 100,
    seed: 7,
}

const DEFAULT_DEPTH: DepthGroup = {
    parallax: 100,
    haze: 35,
    travelStart: -400,
    travelEnd: 400,
}

/* ---------------------------------------------------------------- component */

export default function RidgeParallax(
    props: Props
) {
    const {
        background = "#1C0A0A",
        baseColor = "#FF7979",
        accentColor = "#FF3C3C",

        density = 200,
        dotSize = 400,
        speed = 100,

        pointer = 50,

        range = {
            layers: 12,
            height: 174,
            roughness: 100,
            fall: 300,
            seed: 0,
        },

        depth = {
            parallax: 200,
            haze: 100,
            travelStart: 3000,
            travelEnd: 3000,
        },

        style,
    } = props

    const rng: RangeGroup = {
        ...DEFAULT_RANGE,
        ...range,
    }

    const dep: DepthGroup = {
        ...DEFAULT_DEPTH,
        ...depth,
    }

    const hostRef =
        useRef<HTMLDivElement>(
            null
        )

    const canvasRef =
        useRef<HTMLCanvasElement>(
            null
        )

    /*
     * All live values are read
     * through this ref so the GL context
     * never needs to be rebuilt.
     */
    const live =
        useRef({
            background,
            baseColor,
            accentColor,
            density,
            dotSize,
            speed,
            pointer,
            ...rng,
            ...dep,
        })

    live.current = {
        background,
        baseColor,
        accentColor,
        density,
        dotSize,
        speed,
        pointer,
        ...rng,
        ...dep,
    }

    useEffect(() => {
        const host =
            hostRef.current

        const canvas =
            canvasRef.current

        if (!host || !canvas) {
            return
        }

        const gl =
            canvas.getContext(
                "webgl",
                {
                    alpha: true,
                    antialias: false,
                    premultipliedAlpha:
                        true,
                    depth: false,
                }
            ) as
                | WebGLRenderingContext
                | null

        if (!gl) {
            return
        }

        /* --------------------------------------------------------- program */

        const prog =
            gl.createProgram()!

        gl.attachShader(
            prog,
            compile(
                gl,
                gl.VERTEX_SHADER,
                VERT
            )
        )

        gl.attachShader(
            prog,
            compile(
                gl,
                gl.FRAGMENT_SHADER,
                FRAG
            )
        )

        gl.linkProgram(prog)

        if (
            !gl.getProgramParameter(
                prog,
                gl.LINK_STATUS
            )
        ) {
            console.warn(
                "RidgeParallax link:",
                gl.getProgramInfoLog(prog)
            )

            return
        }

        gl.useProgram(prog)

        const aP =
            gl.getAttribLocation(
                prog,
                "aP"
            )

        const aQ =
            gl.getAttribLocation(
                prog,
                "aQ"
            )

        const U = (
            n: string
        ) =>
            gl.getUniformLocation(
                prog,
                n
            )

        const u = {
            res: U("uRes"),
            wrapW: U("uWrapW"),
            pan: U("uPan[0]"),

            travel: U("uTravel"),
            para: U("uPara"),
            layers: U("uLayers"),
            height: U("uHeight"),
            fall: U("uFall"),
            rough: U("uRough"),
            seed: U("uSeed"),
            dot: U("uDot"),

            base: U("uBase"),
            accent: U("uAccent"),
            bg: U("uBg"),
            haze: U("uHaze"),

            pointer: U("uPointer"),
        }

        const pBuf =
            gl.createBuffer()!

        const qBuf =
            gl.createBuffer()!

        const panPx =
            new Float32Array(
                MAX_LAYERS
            )

        let builtDensity = -1
        let builtLayers = -1
        let count = 0

        /* ------------------------------------------------------------ build */

        const build = (
            d: number,
            n: number
        ) => {
            const layers =
                clamp(
                    Math.round(n),
                    1,
                    MAX_LAYERS
                )

            const perLayer =
                Math.max(
                    64,
                    Math.min(
                        Math.round(
                            Math.max(
                                1,
                                d
                            ) *
                                PER_DENSITY
                        ),
                        Math.floor(
                            MAX_POINTS /
                                layers
                        )
                    )
                )

            const rows =
                Math.max(
                    2,
                    Math.round(
                        Math.sqrt(
                            perLayer /
                                GRID_ASPECT
                        )
                    )
                )

            const cols =
                Math.max(
                    2,
                    Math.round(
                        perLayer /
                            rows
                    )
                )

            count =
                layers *
                rows *
                cols

            const P =
                new Float32Array(
                    count * 2
                )

            const Q =
                new Float32Array(
                    count * 2
                )

            const rnd =
                mulberry32(
                    0x9e3779b9
                )

            let i = 0

            // FAR FIRST.
            for (
                let L =
                    layers - 1;
                L >= 0;
                L--
            ) {
                for (
                    let r = 0;
                    r < rows;
                    r++
                ) {
                    for (
                        let c = 0;
                        c < cols;
                        c++
                    ) {
                        let u =
                            (
                                c +
                                0.5 +
                                (rnd() -
                                    0.5) *
                                    2 *
                                    JITTER
                            ) /
                            cols

                        u -=
                            Math.floor(u)

                        const v =
                            (
                                r +
                                0.5 +
                                (rnd() -
                                    0.5) *
                                    2 *
                                    JITTER
                            ) /
                            rows

                        P[i * 2] =
                            u

                        P[
                            i * 2 + 1
                        ] =
                            Math.sign(v) *
                            Math.pow(
                                Math.abs(v),
                                V_BIAS
                            )

                        Q[i * 2] =
                            rnd()

                        Q[
                            i * 2 + 1
                        ] =
                            L

                        i++
                    }
                }
            }

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                pBuf
            )

            gl.bufferData(
                gl.ARRAY_BUFFER,
                P,
                gl.STATIC_DRAW
            )

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                qBuf
            )

            gl.bufferData(
                gl.ARRAY_BUFFER,
                Q,
                gl.STATIC_DRAW
            )

            builtDensity = d
            builtLayers = layers
        }

        /* ---------------------------------------------------------- blending */

        gl.disable(
            gl.DEPTH_TEST
        )

        gl.enable(
            gl.BLEND
        )

        gl.blendFunc(
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA
        )

        /* ------------------------------------------------------------ resize */

        let cssW = 0
        let cssH = 0
        let dpr = 1
        let sizeScale = 1

        const resize = () => {
            dpr =
                Math.min(
                    window.devicePixelRatio ||
                        1,
                    DPR_CAP
                )

            cssW =
                canvas.clientWidth ||
                host.clientWidth ||
                0

            cssH =
                canvas.clientHeight ||
                host.clientHeight ||
                0

            sizeScale =
                cssH > 0
                    ? clamp(
                          cssH /
                              SIZE_REF_H,
                          SIZE_SCALE_MIN,
                          SIZE_SCALE_MAX
                      )
                    : 1

            const w =
                Math.max(
                    1,
                    Math.round(
                        cssW * dpr
                    )
                )

            const h =
                Math.max(
                    1,
                    Math.round(
                        cssH * dpr
                    )
                )

            if (
                canvas.width !== w ||
                canvas.height !== h
            ) {
                canvas.width = w
                canvas.height = h
            }

            gl.viewport(
                0,
                0,
                w,
                h
            )
        }

        resize()

        const ro =
            new ResizeObserver(
                resize
            )

        ro.observe(canvas)

        /* --------------------------------------------------------- pointer */

        /*
         * Meaningful cursor interaction:
         *
         * Cursor position controls depth parallax.
         *
         * We DO NOT accumulate pointer movement.
         *
         * This is important:
         *
         * old behavior:
         *   mouse movement -> velocity -> accumulated state
         *
         * new behavior:
         *   mouse position -> target offset
         *
         * Therefore leaving and re-entering can never inherit a stale
         * velocity or get stuck.
         */

        let pointerTarget = 0
        let pointerCurrent = 0

        const onPointerMove = (
            e: PointerEvent
        ) => {
            const r =
                host.getBoundingClientRect()

            if (r.width <= 0) {
                return
            }

            const normalized =
                clamp(
                    (
                        e.clientX -
                        r.left
                    ) /
                        r.width,
                    0,
                    1
                )

            /*
             * -1 at left
             *  0 at center
             * +1 at right
             */
            const centered =
                normalized * 2 - 1

            /*
             * Negative because the environment
             * moves opposite to the cursor,
             * creating a camera/parallax feeling.
             */
            pointerTarget =
                -centered *
                POINTER_DISTANCE *
                dpr
        }

        const onPointerLeave =
            () => {
                pointerTarget = 0
            }

        host.addEventListener(
            "pointermove",
            onPointerMove
        )

        host.addEventListener(
            "pointerleave",
            onPointerLeave
        )

        /* ------------------------------------------------------------- loop */

        let raf = 0

        let last =
            performance.now()

        const frame = (
            now: number
        ) => {
            raf =
                requestAnimationFrame(
                    frame
                )

            const dt =
                clamp(
                    (now - last) /
                        1000,
                    0,
                    0.05
                )

            last = now

            if (
                cssW <= 0 ||
                cssH <= 0
            ) {
                resize()

                if (
                    cssW <= 0 ||
                    cssH <= 0
                ) {
                    return
                }
            }

            const L =
                live.current

            const layers =
                clamp(
                    Math.round(
                        L.layers
                    ),
                    1,
                    MAX_LAYERS
                )

            if (
                L.density !==
                    builtDensity ||
                layers !== builtLayers
            ) {
                build(
                    L.density,
                    layers
                )
            }

            if (count === 0) {
                return
            }

            const wDev =
                canvas.width

            const hDev =
                canvas.height

            const wrapW =
                wDev * COVER

            const para =
                Math.max(
                    0,
                    L.parallax
                ) / 100

            /* ------------------------------------------------ pointer smoothing */

            /*
             * Frame-rate independent smoothing.
             *
             * When the cursor leaves:
             *
             * target = 0
             *
             * current smoothly approaches 0.
             */
            const smoothing =
                1 -
                Math.exp(
                    -POINTER_SMOOTH *
                        dt
                )

            pointerCurrent +=
                (
                    pointerTarget -
                    pointerCurrent
                ) *
                smoothing

            /* ------------------------------------------------ autonomous drift */

            const rate =
                (L.speed / 50) *
                DRIFT_RATE *
                dpr *
                dt

            for (
                let i = 0;
                i < layers;
                i++
            ) {
                const t =
                    layers > 1
                        ? i /
                          (layers - 1)
                        : 0

                const k =
                    Math.pow(
                        1 /
                            (
                                1 +
                                t *
                                    (
                                        Z_MAX -
                                        1
                                    )
                            ),
                        para
                    )

                panPx[i] =
                    (
                        panPx[i] +
                        rate * k
                    ) % wrapW
            }

            /* ------------------------------------------------------- travel */

            const r =
                host.getBoundingClientRect()

            const vh =
                window.innerHeight ||
                1

            const prog =
                clamp(
                    (
                        vh -
                        r.top
                    ) /
                        (
                            vh +
                            r.height
                        ),
                    0,
                    1
                )

            const travel =
                (
                    L.travelStart +
                    (
                        L.travelEnd -
                        L.travelStart
                    ) *
                        prog
                ) * dpr

            /* ------------------------------------------------------- colors */

            const [
                br,
                bg2,
                bb,
            ] =
                parseColor(
                    L.baseColor
                )

            const [
                ar,
                ag,
                ab,
            ] =
                parseColor(
                    L.accentColor
                )

            const [
                gr,
                gg,
                gb,
            ] =
                parseColor(
                    L.background
                )

            /* ---------------------------------------------------- uniforms */

            gl.uniform2f(
                u.res,
                wDev,
                hDev
            )

            gl.uniform1f(
                u.wrapW,
                wrapW
            )

            gl.uniform1fv(
                u.pan,
                panPx
            )

            gl.uniform1f(
                u.travel,
                travel
            )

            gl.uniform1f(
                u.para,
                para
            )

            gl.uniform1f(
                u.layers,
                layers
            )

            gl.uniform1f(
                u.height,
                Math.max(
                    0,
                    L.height
                ) / 100
            )

            gl.uniform1f(
                u.fall,
                Math.max(
                    0,
                    L.fall
                ) / 100
            )

            gl.uniform1f(
                u.rough,
                clamp(
                    L.roughness,
                    0,
                    100
                ) /
                    100 *
                    0.7
            )

            gl.uniform1f(
                u.seed,
                Math.round(
                    L.seed
                )
            )

            gl.uniform1f(
                u.dot,
                (
                    L.dotSize /
                    100
                ) *
                    DOT_FULL *
                    dpr *
                    sizeScale
            )

            gl.uniform3f(
                u.base,
                br,
                bg2,
                bb
            )

            gl.uniform3f(
                u.accent,
                ar,
                ag,
                ab
            )

            gl.uniform3f(
                u.bg,
                gr,
                gg,
                gb
            )

            gl.uniform1f(
                u.haze,
                clamp(
                    L.haze,
                    0,
                    100
                ) / 100
            )

            /*
             * Pointer strength.
             *
             * 0   = no cursor interaction
             * 100 = full depth parallax
             * 200 = exaggerated
             */
            gl.uniform1f(
                u.pointer,
                pointerCurrent *
                    (
                        Math.max(
                            0,
                            L.pointer
                        ) / 100
                    )
            )

            /* ----------------------------------------------------- attributes */

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                pBuf
            )

            gl.enableVertexAttribArray(
                aP
            )

            gl.vertexAttribPointer(
                aP,
                2,
                gl.FLOAT,
                false,
                0,
                0
            )

            gl.bindBuffer(
                gl.ARRAY_BUFFER,
                qBuf
            )

            gl.enableVertexAttribArray(
                aQ
            )

            gl.vertexAttribPointer(
                aQ,
                2,
                gl.FLOAT,
                false,
                0,
                0
            )

            /* --------------------------------------------------------- draw */

            gl.clearColor(
                0,
                0,
                0,
                0
            )

            gl.clear(
                gl.COLOR_BUFFER_BIT
            )

            gl.drawArrays(
                gl.POINTS,
                0,
                count
            )
        }

        raf =
            requestAnimationFrame(
                frame
            )

        return () => {
            cancelAnimationFrame(
                raf
            )

            ro.disconnect()

            host.removeEventListener(
                "pointermove",
                onPointerMove
            )

            host.removeEventListener(
                "pointerleave",
                onPointerLeave
            )
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position:
                        "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
