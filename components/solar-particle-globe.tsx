"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

// ── Tuning constants ────────────────────────────────────────────────────────

const DOT_REF_PX = 1.35
const SPIN_RAD_PER_SEC = 0.22
const SPIN_TILT = 0.38
const CAMERA_FACTOR = 1.8

const MAX_COLORS = 6

const SPHERE_PER_DENSITY = 180
const MAX_DPR = 2

const CURSOR_PUSH = 0.6
const CURSOR_PULL = 0.95
const CURSOR_EASE = 10

const TAU = Math.PI * 2

// ── Types ───────────────────────────────────────────────────────────────────

type CursorOptions = {
    mode?: "attract" | "repel"
    strength?: number
    reach?: number
}

type Props = {
    background?: string
    colors?: string[]
    density?: number
    dotSize?: number
    speed?: number
    size?: number
    cursor?: CursorOptions
    style?: React.CSSProperties
}

type Live = {
    palette: { data: Float32Array; count: number }
    density: number
    dotSize: number
    speed: number
    size: number
    cursorSign: number
    strength: number
    reach: number
}

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
    background: "#04060B",
    colors: ["#5B8CFF", "#9FE8FF"],
    density: 100,
    dotSize: 100,
    speed: 50,

    // This is now intentionally smaller because
    // the complete globe must remain visible.
    size: 100,

    cursor: {
        mode: "repel" as "attract" | "repel",
        strength: 50,
        reach: 25,
    },
}

// ── Number helper ───────────────────────────────────────────────────────────

function num(
    value: unknown,
    min: number,
    max: number,
    fallback: number
): number {
    const n =
        typeof value === "number" &&
        isFinite(value)
            ? value
            : fallback

    return Math.max(
        min,
        Math.min(max, n)
    )
}

// ── Color parser ────────────────────────────────────────────────────────────

const colorCache =
    new Map<
        string,
        [number, number, number]
    >()

let colorCtx:
    CanvasRenderingContext2D | null =
    null

function parseColor(
    input: string,
    fallback: string
): [number, number, number] {

    let value =
        (input || fallback).trim()

    const variable =
        /^var\([^,]+,\s*(.+)\)$/
            .exec(value)

    if (variable) {
        value =
            variable[1].trim()
    }

    const cached =
        colorCache.get(value)

    if (cached)
        return cached

    let output:
        [number, number, number] =
        [1, 1, 1]

    if (
        typeof document !==
        "undefined"
    ) {

        if (!colorCtx) {
            colorCtx =
                document
                    .createElement(
                        "canvas"
                    )
                    .getContext("2d")
        }

        if (colorCtx) {

            colorCtx.fillStyle =
                "#000"

            colorCtx.fillStyle =
                value

            const normalized =
                String(
                    colorCtx.fillStyle
                )

            if (
                normalized[0] === "#"
            ) {

                output = [
                    parseInt(
                        normalized.slice(
                            1,
                            3
                        ),
                        16
                    ) / 255,

                    parseInt(
                        normalized.slice(
                            3,
                            5
                        ),
                        16
                    ) / 255,

                    parseInt(
                        normalized.slice(
                            5,
                            7
                        ),
                        16
                    ) / 255,
                ]

            } else {

                const match =
                    normalized.match(
                        /[\d.]+/g
                    )

                if (
                    match &&
                    match.length >= 3
                ) {

                    output = [
                        +match[0] / 255,
                        +match[1] / 255,
                        +match[2] / 255,
                    ]
                }
            }
        }
    }

    colorCache.set(
        value,
        output
    )

    return output
}

// ── Palette builder ─────────────────────────────────────────────────────────

function buildPalette(
    colors: string[]
): { data: Float32Array; count: number } {

    const list =
        (
            Array.isArray(colors) &&
            colors.length > 0
                ? colors
                : DEFAULTS.colors
        ).slice(0, MAX_COLORS)

    const count =
        Math.max(1, list.length)

    const data =
        new Float32Array(
            MAX_COLORS * 3
        )

    for (
        let i = 0;
        i < MAX_COLORS;
        i++
    ) {

        const source =
            list[
                Math.min(
                    i,
                    list.length - 1
                )
            ] ?? DEFAULTS.colors[0]

        const [r, g, b] =
            parseColor(
                source,
                DEFAULTS.colors[0]
            )

        data[i * 3] = r
        data[i * 3 + 1] = g
        data[i * 3 + 2] = b
    }

    return { data, count }
}

// ── Vertex Shader ───────────────────────────────────────────────────────────

const VS = `#version 300 es
precision highp float;

layout(location = 0) in vec4 aP;

uniform vec2 uRes;
uniform float uDpr;

uniform vec2 uCenter;
uniform float uRadius;

uniform float uSpin;
uniform float uClock;

uniform float uDot;

uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;

uniform vec2 uPointer;

uniform float uPush;
uniform float uPull;
uniform float uReach;

out vec3 vCol;
out float vA;

const float TAU = 6.28318530718;
const float TILT = ${SPIN_TILT.toFixed(4)};
const float CAM = ${CAMERA_FACTOR.toFixed(4)};

vec3 sampleGradient(float t) {

    int count = uColorCount;

    if (count <= 1)
        return uColors[0];

    float scaled =
        t * float(count - 1);

    int idx =
        int(floor(scaled));

    idx =
        clamp(idx, 0, count - 2);

    float localT =
        scaled - float(idx);

    vec3 result = uColors[0];

    for (int i = 0; i < ${MAX_COLORS - 1}; i++) {

        if (i == idx) {

            result =
                mix(
                    uColors[i],
                    uColors[i + 1],
                    localT
                );
        }
    }

    return result;
}

void main() {

    // ── Globe particle ──────────────────────────────────────────────────

    vec3 n = aP.xyz;

    // Rotate around Y.
    float cs = cos(uSpin);
    float sn = sin(uSpin);

    n = vec3(
        cs * n.x + sn * n.z,
        n.y,
        -sn * n.x + cs * n.z
    );

    // Tilt.
    float ct = cos(TILT);
    float st = sin(TILT);

    n = vec3(
        n.x,
        ct * n.y - st * n.z,
        st * n.y + ct * n.z
    );

    float r =
        uRadius *
        (
            0.97 +
            0.03 * aP.w
        );

    vec3 p =
        n * r;

    // ── Globe shading ───────────────────────────────────────────────────

    float facing =
        n.z * 0.5 +
        0.5;

    float twinkle =
        0.75 +
        0.25 *
        sin(
            uClock * 2.3 +
            aP.w * 61.0
        );

    // Latitude ramp: the palette is painted onto the sphere's original
    // position, so it stays put as the globe spins (rotation is around Y).
    float t =
        clamp(
            (1.0 - aP.y) * 0.5,
            0.0,
            1.0
        );

    vec3 col =
        sampleGradient(t);

    float alpha =
        (
            0.16 +
            0.34 * facing
        ) *
        twinkle;

    // ── Perspective ─────────────────────────────────────────────────────

    float F =
        CAM *
        max(
            uRes.x,
            uRes.y
        );

    vec3 world =
        vec3(
            uCenter,
            0.0
        ) +
        p;

    float perspective =
        F /
        max(
            F - world.z,
            1.0
        );

    vec2 screen =
        world.xy *
        perspective;

    // ── Cursor ──────────────────────────────────────────────────────────

    vec2 delta =
        screen -
        uPointer;

    float distanceToPointer =
        length(delta);

    if (
        distanceToPointer >
        0.001
    ) {

        float q =
            (
                distanceToPointer *
                distanceToPointer
            ) /
            (
                uReach *
                uReach
            );

        // Repel.
        screen +=
            delta /
            distanceToPointer *
            (
                uPush *
                exp(-q)
            );

        // Attract.
        screen -=
            delta *
            (
                uPull *
                exp(
                    -0.5 * q
                )
            );
    }

    // ── Final position ──────────────────────────────────────────────────

    gl_Position =
        vec4(
            screen.x /
                (
                    uRes.x *
                    0.5
                ),

            -screen.y /
                (
                    uRes.y *
                    0.5
                ),

            0.0,
            1.0
        );

    gl_PointSize =
        max(
            1.0,
            2.0 *
            uDot *
            perspective *
            uDpr
        );

    vCol =
        col;

    vA =
        clamp(
            alpha,
            0.0,
            1.0
        );
}
`

// ── Fragment Shader ─────────────────────────────────────────────────────────

const FS = `#version 300 es
precision highp float;

in vec3 vCol;
in float vA;

out vec4 o;

void main() {

    vec2 q =
        gl_PointCoord *
        2.0 -
        1.0;

    float d =
        dot(q, q);

    if (
        d > 1.0
    )
        discard;

    float glow =
        exp(
            -d * 3.2
        ) *
        vA;

    o =
        vec4(
            vCol * glow,
            glow
        );
}
`

// ── Random generator ────────────────────────────────────────────────────────

function mulberry32(
    seed: number
) {

    let state =
        seed >>> 0

    return () => {

        state =
            (
                state +
                0x6d2b79f5
            ) >>> 0

        let t =
            state

        t =
            Math.imul(
                t ^
                    (t >>> 15),
                t | 1
            )

        t ^=
            t +
            Math.imul(
                t ^
                    (t >>> 7),
                t | 61
            )

        return (
            (
                t ^
                (t >>> 14)
            ) >>> 0
        ) / 4294967296
    }
}

// ── Globe geometry ──────────────────────────────────────────────────────────

function buildGeometry(
    density: number
) {

    const count =
        Math.round(
            SPHERE_PER_DENSITY *
            density
        )

    const positions =
        new Float32Array(
            count * 4
        )

    const random =
        mulberry32(
            1337
        )

    const goldenAngle =
        Math.PI *
        (
            3 -
            Math.sqrt(5)
        )

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const y =
            1 -
            (
                (
                    i +
                    0.5
                ) /
                count
            ) *
            2

        const radius =
            Math.sqrt(
                1 -
                y * y
            )

        const theta =
            i *
            goldenAngle

        positions[
            i * 4
        ] =
            Math.cos(theta) *
            radius

        positions[
            i * 4 + 1
        ] =
            y

        positions[
            i * 4 + 2
        ] =
            Math.sin(theta) *
            radius

        positions[
            i * 4 + 3
        ] =
            random()
    }

    return {
        positions,
        count,
    }
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 */

export default function GlobeParticleSphere(
    props: Props
) {

    const {
        background =
            DEFAULTS.background,

        colors =
            ["#0082FF","#9FE8FF"],

        density =
            DEFAULTS.density,

        dotSize =
            DEFAULTS.dotSize,

        speed =
            DEFAULTS.speed,

        size =
            DEFAULTS.size,

        cursor =
            DEFAULTS.cursor,

        style,
    } = props

    const rootRef =
        useRef<HTMLDivElement>(
            null
        )

    const canvasRef =
        useRef<HTMLCanvasElement>(
            null
        )

    const live: Live = {

        palette:
            buildPalette(
                colors
            ),

        density:
            Math.round(
                num(
                    density,
                    1,
                    100,
                    DEFAULTS.density
                )
            ),

        dotSize:
            num(
                dotSize,
                10,
                400,
                DEFAULTS.dotSize
            ),

        speed:
            num(
                speed,
                0,
                100,
                DEFAULTS.speed
            ),

        size:
            num(
                size,
                10,
                100,
                DEFAULTS.size
            ),

        cursorSign:
            (
                cursor.mode ??
                DEFAULTS.cursor.mode
            ) === "attract"
                ? -1
                : 1,

        strength:
            num(
                cursor.strength,
                0,
                100,
                DEFAULTS.cursor.strength
            ),

        reach:
            num(
                cursor.reach,
                1,
                100,
                DEFAULTS.cursor.reach
            ),
    }

    const config =
        useRef(live)

    config.current =
        live

    useEffect(() => {

        const root =
            rootRef.current

        const canvas =
            canvasRef.current

        if (
            !root ||
            !canvas
        )
            return

        const gl =
            canvas.getContext(
                "webgl2",
                {
                    alpha: true,
                    antialias: false,
                    premultipliedAlpha:
                        true,
                }
            )

        if (!gl)
            return

        // ── Shader compilation ──────────────────────────────────────────

        const compileShader =
            (
                type: number,
                source: string
            ) => {

                const shader =
                    gl.createShader(
                        type
                    )!

                gl.shaderSource(
                    shader,
                    source
                )

                gl.compileShader(
                    shader
                )

                if (
                    !gl.getShaderParameter(
                        shader,
                        gl.COMPILE_STATUS
                    )
                ) {

                    console.error(
                        gl.getShaderInfoLog(
                            shader
                        )
                    )
                }

                return shader
            }

        const program =
            gl.createProgram()!

        gl.attachShader(
            program,
            compileShader(
                gl.VERTEX_SHADER,
                VS
            )
        )

        gl.attachShader(
            program,
            compileShader(
                gl.FRAGMENT_SHADER,
                FS
            )
        )

        gl.linkProgram(
            program
        )

        if (
            !gl.getProgramParameter(
                program,
                gl.LINK_STATUS
            )
        ) {

            console.error(
                gl.getProgramInfoLog(
                    program
                )
            )
        }

        gl.useProgram(
            program
        )

        // ── Uniforms ────────────────────────────────────────────────────

        const getUniform =
            (name: string) =>
                gl.getUniformLocation(
                    program,
                    name
                )

        const u = {

            res:
                getUniform(
                    "uRes"
                ),

            dpr:
                getUniform(
                    "uDpr"
                ),

            center:
                getUniform(
                    "uCenter"
                ),

            radius:
                getUniform(
                    "uRadius"
                ),

            spin:
                getUniform(
                    "uSpin"
                ),

            clock:
                getUniform(
                    "uClock"
                ),

            dot:
                getUniform(
                    "uDot"
                ),

            colors:
                getUniform(
                    "uColors[0]"
                ),

            colorCount:
                getUniform(
                    "uColorCount"
                ),

            pointer:
                getUniform(
                    "uPointer"
                ),

            push:
                getUniform(
                    "uPush"
                ),

            pull:
                getUniform(
                    "uPull"
                ),

            reach:
                getUniform(
                    "uReach"
                ),
        }

        // ── VAO ─────────────────────────────────────────────────────────

        const vao =
            gl.createVertexArray()

        gl.bindVertexArray(
            vao
        )

        const positionBuffer =
            gl.createBuffer()

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            positionBuffer
        )

        gl.enableVertexAttribArray(
            0
        )

        gl.vertexAttribPointer(
            0,
            4,
            gl.FLOAT,
            false,
            0,
            0
        )

        // ── Geometry ────────────────────────────────────────────────────

        let builtDensity =
            -1

        let particleCount =
            0

        const rebuild =
            (densityValue: number) => {

                const geometry =
                    buildGeometry(
                        densityValue
                    )

                gl.bindBuffer(
                    gl.ARRAY_BUFFER,
                    positionBuffer
                )

                gl.bufferData(
                    gl.ARRAY_BUFFER,
                    geometry.positions,
                    gl.STATIC_DRAW
                )

                particleCount =
                    geometry.count

                builtDensity =
                    densityValue
            }

        // ── GL state ────────────────────────────────────────────────────

        gl.disable(
            gl.DEPTH_TEST
        )

        gl.enable(
            gl.BLEND
        )

        gl.blendFunc(
            gl.ONE,
            gl.ONE
        )

        gl.clearColor(
            0,
            0,
            0,
            0
        )

        // ── Resize ──────────────────────────────────────────────────────

        let width =
            root.clientWidth

        let height =
            root.clientHeight

        const resizeObserver =
            new ResizeObserver(
                () => {

                    width =
                        root.clientWidth

                    height =
                        root.clientHeight
                }
            )

        resizeObserver.observe(
            root
        )

        // ── Animation ───────────────────────────────────────────────────

        let animationFrame = 0

        let lastTime =
            -1

        let rotation =
            0

        let clock =
            0

        // ── Pointer ─────────────────────────────────────────────────────

        let targetX = 0
        let targetY = 0

        let pointerX = 0
        let pointerY = 0

        let pointerInside =
            false

        let presence =
            0

        const handlePointerMove =
            (event: PointerEvent) => {

                const rect =
                    root.getBoundingClientRect()

                const scale =
                    root.offsetWidth > 0
                        ? rect.width /
                          root.offsetWidth
                        : 1

                targetX =
                    (
                        event.clientX -
                        rect.left
                    ) /
                        scale -
                    root.offsetWidth /
                        2

                targetY =
                    (
                        event.clientY -
                        rect.top
                    ) /
                        scale -
                    root.offsetHeight /
                        2

                if (
                    !pointerInside
                ) {

                    if (
                        presence <
                        0.01
                    ) {

                        pointerX =
                            targetX

                        pointerY =
                            targetY
                    }

                    pointerInside =
                        true
                }
            }

        const handlePointerLeave =
            () => {

                pointerInside =
                    false
            }

        root.addEventListener(
            "pointermove",
            handlePointerMove
        )

        root.addEventListener(
            "pointerdown",
            handlePointerMove
        )

        root.addEventListener(
            "pointerleave",
            handlePointerLeave
        )

        // ── Render ──────────────────────────────────────────────────────

        const render =
            (time: number) => {

                animationFrame =
                    requestAnimationFrame(
                        render
                    )

                const deltaTime =
                    lastTime < 0
                        ? 0
                        : Math.max(
                              0,
                              Math.min(
                                  0.05,
                                  (
                                      time -
                                      lastTime
                                  ) /
                                      1000
                              )
                          )

                lastTime =
                    time

                const c =
                    config.current

                if (
                    c.density !==
                    builtDensity
                ) {

                    rebuild(
                        c.density
                    )
                }

                if (
                    width < 1 ||
                    height < 1
                )
                    return

                // ── Canvas resolution ──────────────────────────────────

                const dpr =
                    Math.min(
                        window.devicePixelRatio ||
                            1,
                        MAX_DPR
                    )

                const canvasWidth =
                    Math.round(
                        width *
                        dpr
                    )

                const canvasHeight =
                    Math.round(
                        height *
                        dpr
                    )

                if (
                    canvas.width !==
                        canvasWidth ||
                    canvas.height !==
                        canvasHeight
                ) {

                    canvas.width =
                        canvasWidth

                    canvas.height =
                        canvasHeight
                }

                gl.viewport(
                    0,
                    0,
                    canvasWidth,
                    canvasHeight
                )

                // ── Center ─────────────────────────────────────────────

                gl.uniform2f(
                    u.center,
                    0,
                    0
                )

                /*
                 * IMPORTANT:
                 *
                 * The old calculation allowed the globe to become
                 * larger than the visible viewport because the sphere
                 * is rendered with perspective.
                 *
                 * This calculation intentionally leaves a large
                 * safety margin around the globe.
                 */

                const shortestSide =
                    Math.min(
                        width,
                        height
                    )

                // Maximum radius is 36% of the shortest side.
                // Therefore the diameter is ~72%, leaving ~14%
                // of the frame around it.
                const maximumRadius =
                    shortestSide *
                    0.36

                const requestedRadius =
                    (
                        c.size /
                        100
                    ) *
                    maximumRadius

                const radius =
                    Math.min(
                        requestedRadius,
                        maximumRadius
                    )

                // ── Animation ──────────────────────────────────────────

                const animationSpeed =
                    c.speed /
                    50

                rotation =
                    (
                        rotation +
                        deltaTime *
                        animationSpeed *
                        SPIN_RAD_PER_SEC
                    ) %
                    TAU

                clock =
                    (
                        clock +
                        deltaTime *
                        animationSpeed
                    ) %
                    1000

                // ── Uniforms ────────────────────────────────────────────

                gl.uniform2f(
                    u.res,
                    width,
                    height
                )

                gl.uniform1f(
                    u.dpr,
                    dpr
                )

                gl.uniform1f(
                    u.radius,
                    radius
                )

                gl.uniform1f(
                    u.spin,
                    rotation
                )

                gl.uniform1f(
                    u.clock,
                    clock
                )

                gl.uniform1f(
                    u.dot,
                    (
                        c.dotSize /
                        100
                    ) *
                        DOT_REF_PX
                )

                gl.uniform3fv(
                    u.colors,
                    c.palette.data
                )

                gl.uniform1i(
                    u.colorCount,
                    c.palette.count
                )

                // ── Cursor ──────────────────────────────────────────────

                const ease =
                    1 -
                    Math.exp(
                        -deltaTime *
                        CURSOR_EASE
                    )

                pointerX +=
                    (
                        targetX -
                        pointerX
                    ) *
                    ease

                pointerY +=
                    (
                        targetY -
                        pointerY
                    ) *
                    ease

                presence +=
                    (
                        (
                            pointerInside
                                ? 1
                                : 0
                        ) -
                        presence
                    ) *
                    ease

                const reach =
                    Math.max(
                        1,
                        (
                            c.reach /
                            100
                        ) *
                            Math.hypot(
                                width,
                                height
                            ) *
                            0.5
                    )

                gl.uniform2f(
                    u.pointer,
                    pointerX,
                    pointerY
                )

                gl.uniform1f(
                    u.reach,
                    reach
                )

                const strength =
                    (
                        c.strength /
                        100
                    ) *
                    presence

                gl.uniform1f(
                    u.push,
                    c.cursorSign >
                        0
                        ? strength *
                          CURSOR_PUSH *
                          reach
                        : 0
                )

                gl.uniform1f(
                    u.pull,
                    c.cursorSign <
                        0
                        ? strength *
                          CURSOR_PULL
                        : 0
                )

                // ── Draw ────────────────────────────────────────────────

                gl.clear(
                    gl.COLOR_BUFFER_BIT
                )

                gl.bindVertexArray(
                    vao
                )

                gl.drawArrays(
                    gl.POINTS,
                    0,
                    particleCount
                )
            }

        animationFrame =
            requestAnimationFrame(
                render
            )

        // ── Cleanup ─────────────────────────────────────────────────────

        return () => {

            cancelAnimationFrame(
                animationFrame
            )

            resizeObserver.disconnect()

            root.removeEventListener(
                "pointermove",
                handlePointerMove
            )

            root.removeEventListener(
                "pointerdown",
                handlePointerMove
            )

            root.removeEventListener(
                "pointerleave",
                handlePointerLeave
            )
        }

    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                position:
                    "relative",

                width:
                    "100%",

                height:
                    "100%",

                minWidth:
                    1200,

                minHeight:
                    800,

                ...style,

                background,

                overflow:
                    "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position:
                        "absolute",

                    inset: 0,

                    width:
                        "100%",

                    height:
                        "100%",

                    display:
                        "block",
                }}
            />
        </div>
    )
}

GlobeParticleSphere.displayName =
    "Globe Particle Sphere"

// ── Framer Controls ─────────────────────────────────────────────────────────
