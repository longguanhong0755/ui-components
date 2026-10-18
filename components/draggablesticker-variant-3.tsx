import React, { useEffect, useRef, useCallback, useState } from "react"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

// Shown when no image is uploaded.
const DEFAULT_IMAGE =
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3fb4a247-64e9-4c54-2391-86598eebfe00/w=800"

// ============================================================================
// TYPES
// ============================================================================

type ResponsiveImageSource =
    | string
    | {
          src?: string
          srcSet?: string | Array<{ src?: string }>
          url?: string
          default?: string
          asset?: { url?: string }
          alt?: string
      }
    | null
    | undefined

interface StickerDragProps {
    image?: ResponsiveImageSource
    imageWidth?: number // sticker box width in px
    imageHeight?: number // sticker box height in px
    tilt?: number // max tilt while dragging, in degrees
    tiltSmoothing?: number
    lighting?: boolean // sheen on/off
    lightingStrength?: number // 1-10
    lightingColor?: string // sheen tint
    sheenMode?: "sheen" | "holo"
    elevation?: number // 1-10
    staticShadow?: string // shadow at rest (CSS box-shadow format)
    dynamicShadow?: string // shadow when dragging/peeling (CSS box-shadow format)
    style?: React.CSSProperties
}

// ============================================================================
// CONSTANTS (matching original source exactly)
// ============================================================================

const RENDER_SCALE = 2
const PAD_BASE = 20 // Base padding in pixels
const MESH_GRID_SIZE = 32 // Must use grid for smooth wave deformation
const DRAG_Z_INDEX_BASE = 1000 // Base z-index for dragged stickers

// Global counter to ensure each dragged sticker gets a unique, incrementing z-index
let zIndexCounter = DRAG_Z_INDEX_BASE

/**
 * Get the next z-index value for a dragged sticker
 * Increments the global counter so the most recently dragged sticker is always on top
 */
function getNextZIndex(): number {
    zIndexCounter += 1
    return zIndexCounter
}

// Tweakables from original
const DRAG_TILT_SENSITIVITY = 3
const DRAG_MAX_TILT_DEG = 30
const DRAG_TILT_SMOOTHING = 0.05
const SHEEN_STRENGTH = 0.6
const SHEEN_TILT_SHIFT = 0.05
const SHEEN_TILT_DEADZONE = 0.035
const ANIM_SPEED = 1.92
const HOLO_MOTION_BUMP = 0.15
const HOLO_MOTION_DECAY = 0.88

// ============================================================================
// WebGL Shaders (from original source)
// ============================================================================

const VERTEX_SHADER = `
attribute vec2 aPos;
attribute vec2 aUV;
uniform float uPeel;
uniform float uLift;
uniform float uPeelAngle;
uniform float uPasting;
uniform float uScale;
uniform float uElevation;
varying vec2 vUV;
varying float vHi;
varying float vSh;

void main() {
    vUV = aUV;
    vec2 p = aPos;
    vHi = 0.0;
    vSh = 0.0;

    if (uPeel > 0.0) {
        vec2 peelAxis = vec2(cos(uPeelAngle), sin(uPeelAngle));
        vec2 uvCentered = aUV - vec2(0.5);
        float proj = dot(uvCentered, peelAxis);
        float diag = 0.5 - proj;

        // Peel line travels across sticker and EXITS completely
        float peelLine = -0.3 + uPeel * 2.0;

        // How "lifted" is this vertex? 0 = flat, 1 = fully lifted
        float rampWidth = 0.6;
        float lifted = smoothstep(peelLine - rampWidth, peelLine, diag);
        lifted = 1.0 - lifted;

        // Scale based on how lifted (uElevation controls magnitude)
        float scale = 1.0 + lifted * uElevation;
        p *= scale;

        // Curve outward at the ramp (creates the bent paper look)
        float inRamp = smoothstep(peelLine - rampWidth, peelLine - rampWidth * 0.5, diag) *
                       smoothstep(peelLine + 0.05, peelLine - rampWidth * 0.3, diag);

        float curveAmount = uPasting > 0.5 ? 0.06 : 0.12;
        p += (-peelAxis) * inRamp * curveAmount;

        // Shading on the curved ramp
        float t = smoothstep(peelLine - rampWidth, peelLine, diag);
        vHi = inRamp * 0.75 * pow(1.0 - t, 1.2);
        vSh = inRamp * 0.75 * pow(t, 1.2);
    }

    // Apply scale to fit within padded canvas area
    gl_Position = vec4(p * uScale, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uTilt;
uniform float uSheenStrength;
uniform float uSheenTiltShift;
uniform float uSheenTiltDeadzone;
uniform float uMaxTiltDeg;
uniform float uHoloMode;
uniform float uHoloMotion;
uniform vec3 uSheenColor;
varying vec2 vUV;
varying float vHi;
varying float vSh;

vec3 overlayBlend(vec3 base, vec3 blend) {
    return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else rgb = vec3(c, 0.0, x);
    return rgb + m;
}

void main() {
    vec4 tex = texture2D(uTex, vUV);
    if (tex.a < 0.01) discard;

    vec3 c = tex.rgb * 0.95;

    // Sheen/holo effect
    float maxTilt = max(0.001, uMaxTiltDeg);
    float tiltMag = clamp(length(uTilt) / maxTilt, 0.0, 1.0);
    float tiltGate = smoothstep(uSheenTiltDeadzone, 1.0, tiltMag);

    float gradient = fract(vUV.x * 0.5 + vUV.y * 0.5 + uTilt.x * uSheenTiltShift + uTilt.y * uSheenTiltShift);

    if (uHoloMode > 0.5) {
        float holoStrength = uSheenStrength * uHoloMotion;
        float distFromWhite = length(tex.rgb - vec3(1.0));
        float nonWhiteMask = smoothstep(0.06, 0.22, distFromWhite);
        vec3 rainbow = hsl2rgb(gradient, 0.8, 0.55);
        c = mix(c, rainbow, holoStrength * nonWhiteMask * tex.a);
    } else {
        float effectStrength = uSheenStrength * tiltGate;
        float sheen = smoothstep(0.2, 0.5, gradient) * (1.0 - smoothstep(0.5, 0.8, gradient));
        c = mix(c, uSheenColor, sheen * effectStrength * tex.a);
    }

    // Peel/paste lighting
    float hiW = clamp(vHi, 0.0, 1.0) * 0.55;
    float shW = clamp(vSh, 0.0, 1.0) * 0.60;

    vec3 hi = overlayBlend(c, vec3(1.0));
    c = mix(c, hi, hiW);

    vec3 sh = overlayBlend(c, vec3(0.0));
    c = mix(c, sh, shW);
    c *= (1.0 - shW * 0.35);

    c = clamp(c, 0.0, 1.0);
    gl_FragColor = vec4(c, tex.a);
}
`

// ============================================================================
// UTILITIES
// ============================================================================

const resolveImageSource = (
    input?: ResponsiveImageSource
): string | undefined => {
    if (!input) return undefined
    if (typeof input === "string") return input.trim() || undefined
    return input.src || input.url || input.asset?.url || undefined
}

// Parse a CSS color (#hex / #rgb / rgb()/rgba()) to normalized [r,g,b] 0–1.
function parseColorToRgb(input?: string): [number, number, number] {
    if (!input) return [1, 1, 1]
    const s = input.trim()
    const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255]
    let h = s.replace(/^#/, "")
    if (h.length === 3)
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    if (h.length >= 6)
        return [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
        ]
    return [1, 1, 1]
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
const ELEVATION_DEFAULT = 0.12 // how much the sticker scales/lifts during peel animation
const STATIC_SHADOW_DEFAULT = "0px 1px 2px 0px rgba(0, 0, 0, 0.30)"
const DYNAMIC_SHADOW_DEFAULT = "0px 13px 14px 0px rgba(0, 0, 0, 0.30)"

// Property panel uses 0–1 (elevation) and 0.1–1 (tilt); map to internal ranges
const TILT_DISPLAY_MIN = 0.1
const TILT_DISPLAY_MAX = 1
const TILT_INTERNAL_MIN = 0.5
const TILT_INTERNAL_MAX = 20
const ELEVATION_INTERNAL_MAX = 0.3

function mapTiltDisplayToInternal(display: number): number {
    const d = Math.max(TILT_DISPLAY_MIN, Math.min(TILT_DISPLAY_MAX, display))
    const t = (d - TILT_DISPLAY_MIN) / (TILT_DISPLAY_MAX - TILT_DISPLAY_MIN)
    return TILT_INTERNAL_MIN + t * (TILT_INTERNAL_MAX - TILT_INTERNAL_MIN)
}

function mapElevationDisplayToInternal(display: number): number {
    const d = Math.max(0, Math.min(1, display))
    return d * ELEVATION_INTERNAL_MAX
}

// Default display values for property controls (map from internal defaults)
const TILT_DEFAULT_DISPLAY =
    TILT_DISPLAY_MIN +
    ((DRAG_TILT_SENSITIVITY - TILT_INTERNAL_MIN) /
        (TILT_INTERNAL_MAX - TILT_INTERNAL_MIN)) *
        (TILT_DISPLAY_MAX - TILT_DISPLAY_MIN)
const ELEVATION_DEFAULT_DISPLAY = ELEVATION_DEFAULT / ELEVATION_INTERNAL_MAX

// Helper to parse CSS box-shadow into drop-shadow parameters
// box-shadow: offset-x offset-y blur spread color
// drop-shadow: offset-x offset-y blur color (no spread)
interface ParsedShadow {
    x: number
    y: number
    blur: number
    color: string
}

function parseBoxShadow(shadow: string): ParsedShadow {
    // Default values
    const result: ParsedShadow = {
        x: 0,
        y: 0,
        blur: 0,
        color: "rgba(0,0,0,0.3)",
    }

    if (!shadow) return result

    // Extract color (rgba, rgb, or hex)
    const colorMatch = shadow.match(
        /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b(?=\s*$))/i
    )
    if (colorMatch) {
        result.color = colorMatch[0]
    }

    // Extract numeric values (px values)
    const numbers = shadow.match(/-?\d+(\.\d+)?(px)?/g)
    if (numbers) {
        const vals = numbers.map((n) => parseFloat(n))
        if (vals.length >= 1) result.x = vals[0]
        if (vals.length >= 2) result.y = vals[1]
        if (vals.length >= 3) result.blur = vals[2]
        // vals[3] would be spread, which we ignore for drop-shadow
    }

    return result
}

function lerpShadow(a: ParsedShadow, b: ParsedShadow, t: number): string {
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    const blur = a.blur + (b.blur - a.blur) * t
    // Use the dynamic shadow's color when t > 0.5, otherwise static
    const color = t > 0.5 ? b.color : a.color
    return `drop-shadow(${x.toFixed(2)}px ${y.toFixed(2)}px ${blur.toFixed(2)}px ${color})`
}

function __BaseImpl_StickerDrag(__props: StickerDragProps) {
    const {
        image,
        imageWidth = 600,
        imageHeight = 400,
        tilt = 45,
        tiltSmoothing = DRAG_TILT_SMOOTHING,
        lighting = true,
        lightingStrength = 10,
        lightingColor = "#ffffff",
        sheenMode = "sheen" as const,
        elevation: elevationLevel = 10,
        staticShadow = STATIC_SHADOW_DEFAULT,
        dynamicShadow = DYNAMIC_SHADOW_DEFAULT,
        style,
    } = { ...COMPONENT_DEFAULTS, ...__props }
    // Map 1-10 integer controls + degree tilt to internal ranges
    const tiltSensitivity = DRAG_TILT_SENSITIVITY
    const maxTilt = Math.max(1, tilt)
    const sheenStrength = lighting
        ? Math.max(1, Math.min(10, lightingStrength)) / 10
        : 0
    const sheenColor = React.useMemo(
        () => parseColorToRgb(lightingColor),
        [lightingColor]
    )
    const elevation =
        (Math.max(1, Math.min(10, elevationLevel)) / 10) *
        ELEVATION_INTERNAL_MAX

    const containerRef = useRef<HTMLDivElement>(null)
    const stickerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const zoomProbeRef = useRef<HTMLDivElement>(null)

    // Sizing div: prevents collapse when parent has size=fit; uses zoom probe so we don't react to editor zoom
    const [sizingDimensions, setSizingDimensions] = useState({
        width: 400,
        height: 400,
    })

    // WebGL refs
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const textureRef = useRef<WebGLTexture | null>(null)
    const vboRef = useRef<WebGLBuffer | null>(null)
    const iboRef = useRef<WebGLBuffer | null>(null)
    const indexCountRef = useRef<number>(0)

    // State refs (using refs instead of state for animation performance)
    const stateRef = useRef({
        // Position
        x: 0,
        y: 0,
        width: 200,
        height: 200,

        // Image aspect ratio for contained sizing
        imageAspectRatio: null as number | null,

        // Scale factor for fitting content within padded canvas
        scale: 1.0,

        // Drag state
        held: false,
        peeling: false,
        sticking: false,
        dragStartX: 0,
        dragStartY: 0,
        dragOrigX: 0,
        dragOrigY: 0,

        // Peel/wave animation
        peel: 0,
        lift: 0,
        peelAngle: -Math.PI / 4,

        // Tilt (CSS 3D transform)
        dragTiltX: 0,
        dragTiltY: 0,
        currentTiltX: 0,
        currentTiltY: 0,
        prevTiltX: 0,
        prevTiltY: 0,

        // Holo: only visible while cursor is moving (tilt changing)
        holoMotion: 0,

        // Velocity tracking
        lastMoveX: 0,
        lastMoveY: 0,
        lastMoveT: 0,

        // Animation
        texReady: false,
    })

    const animationRef = useRef<number | null>(null)
    const lastTickTRef = useRef<number | null>(null)

    // Draw function
    const draw = useCallback(() => {
        const gl = glRef.current
        const program = programRef.current
        const texture = textureRef.current
        const state = stateRef.current

        if (!gl || !program || !texture || !state.texReady) return

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        gl.useProgram(program)

        gl.bindBuffer(gl.ARRAY_BUFFER, vboRef.current)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboRef.current)

        const aPos = gl.getAttribLocation(program, "aPos")
        const aUV = gl.getAttribLocation(program, "aUV")
        gl.enableVertexAttribArray(aPos)
        gl.enableVertexAttribArray(aUV)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
        gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8)

        // Set uniforms
        gl.uniform1f(gl.getUniformLocation(program, "uPeel"), state.peel)
        gl.uniform1f(gl.getUniformLocation(program, "uLift"), state.lift)
        gl.uniform1f(
            gl.getUniformLocation(program, "uPeelAngle"),
            state.peelAngle
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uPasting"),
            state.sticking ? 1.0 : 0.0
        )
        gl.uniform1f(gl.getUniformLocation(program, "uScale"), state.scale)
        gl.uniform1f(gl.getUniformLocation(program, "uElevation"), elevation)

        gl.uniform2f(
            gl.getUniformLocation(program, "uTilt"),
            state.currentTiltX,
            state.currentTiltY
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uSheenStrength"),
            sheenStrength
        )
        gl.uniform3f(
            gl.getUniformLocation(program, "uSheenColor"),
            sheenColor[0],
            sheenColor[1],
            sheenColor[2]
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uSheenTiltShift"),
            SHEEN_TILT_SHIFT
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uSheenTiltDeadzone"),
            SHEEN_TILT_DEADZONE
        )
        gl.uniform1f(gl.getUniformLocation(program, "uMaxTiltDeg"), maxTilt)
        gl.uniform1f(
            gl.getUniformLocation(program, "uHoloMode"),
            sheenMode === "holo" ? 1.0 : 0.0
        )
        gl.uniform1f(
            gl.getUniformLocation(program, "uHoloMotion"),
            state.holoMotion
        )

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0)

        gl.drawElements(
            gl.TRIANGLES,
            indexCountRef.current,
            gl.UNSIGNED_SHORT,
            0
        )
    }, [sheenStrength, sheenColor, sheenMode, elevation, maxTilt])

    // Parse shadow props once (memoized)
    const parsedStaticShadow = React.useMemo(
        () => parseBoxShadow(staticShadow),
        [staticShadow]
    )
    const parsedDynamicShadow = React.useMemo(
        () => parseBoxShadow(dynamicShadow),
        [dynamicShadow]
    )

    // Update shadow CSS based on peel/lift, interpolating between static and dynamic
    const updateShadowCSS = useCallback(() => {
        const canvas = canvasRef.current
        const state = stateRef.current
        if (!canvas) return

        const tRaw = Math.max(state.lift, state.peel)
        const t = tRaw * tRaw * (3 - 2 * tRaw) // smoothstep easing

        canvas.style.filter = lerpShadow(
            parsedStaticShadow,
            parsedDynamicShadow,
            t
        )
    }, [parsedStaticShadow, parsedDynamicShadow])

    // Animation tick (from original source)
    const tick = useCallback(
        (timestamp: number) => {
            const state = stateRef.current

            if (lastTickTRef.current === null) {
                lastTickTRef.current = timestamp
            }

            const dt = Math.min((timestamp - lastTickTRef.current) / 1000, 0.1)
            lastTickTRef.current = timestamp

            const step = ANIM_SPEED * dt
            let changed = false

            if (state.peeling) {
                // Peel and lift animate up together
                if (state.peel < 1 || state.lift < 1) {
                    state.peel = Math.min(1, state.peel + step)
                    state.lift = Math.min(1, state.lift + step)
                    changed = true
                }
            }

            if (state.sticking) {
                // Paste animation: peel and lift animate down together
                if (state.peel > 0 || state.lift > 0) {
                    state.peel = Math.max(0, state.peel - step)
                    state.lift = Math.max(0, state.lift - step)
                    changed = true
                } else {
                    state.sticking = false
                }
            }

            // In holo mode, decay motion so effect fades when cursor stops moving
            const holoDecayActive =
                sheenMode === "holo" && state.holoMotion > 0.005
            if (holoDecayActive) {
                state.holoMotion *= HOLO_MOTION_DECAY
                if (state.holoMotion < 0.005) state.holoMotion = 0
                changed = true
            }

            if (changed) {
                updateShadowCSS()
            }

            // Redraw while held, animating, or holo fading
            if (changed || state.held || holoDecayActive) {
                draw()
            }

            // Continue ticking if needed
            if (
                state.held ||
                state.peeling ||
                state.sticking ||
                holoDecayActive
            ) {
                animationRef.current = requestAnimationFrame(tick)
            } else {
                animationRef.current = null
                lastTickTRef.current = null
            }
        },
        [draw, updateShadowCSS, sheenMode]
    )

    // Start animation loop
    const ensureTickRunning = useCallback(() => {
        if (animationRef.current !== null) return
        lastTickTRef.current = null
        animationRef.current = requestAnimationFrame(tick)
    }, [tick])

    // Initialize WebGL
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
        })
        if (!gl) return

        glRef.current = gl

        // Compile shaders
        const compileShader = (
            source: string,
            type: number
        ): WebGLShader | null => {
            const shader = gl.createShader(type)
            if (!shader) return null
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(
                    "Shader compile error:",
                    gl.getShaderInfoLog(shader)
                )
                gl.deleteShader(shader)
                return null
            }
            return shader
        }

        const vs = compileShader(VERTEX_SHADER, gl.VERTEX_SHADER)
        const fs = compileShader(FRAGMENT_SHADER, gl.FRAGMENT_SHADER)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return

        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program))
            return
        }

        programRef.current = program

        // Create grid mesh (32x32 for smooth wave deformation)
        const N = MESH_GRID_SIZE
        const verts: number[] = []
        const inds: number[] = []

        for (let j = 0; j <= N; j++) {
            for (let i = 0; i <= N; i++) {
                // Position: -1 to 1
                // UV: 0 to 1 (flip V coordinate so image is right-side up)
                verts.push(
                    (i / N) * 2 - 1,
                    (j / N) * 2 - 1,
                    i / N,
                    1 - j / N // Flip V coordinate
                )
            }
        }

        for (let j = 0; j < N; j++) {
            for (let i = 0; i < N; i++) {
                const a = j * (N + 1) + i
                inds.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1)
            }
        }

        const vbo = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
        vboRef.current = vbo

        const ibo = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(inds),
            gl.STATIC_DRAW
        )
        iboRef.current = ibo
        indexCountRef.current = inds.length

        // Clear immediately
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            gl.deleteProgram(program)
            if (vboRef.current) gl.deleteBuffer(vboRef.current)
            if (iboRef.current) gl.deleteBuffer(iboRef.current)
            if (textureRef.current) gl.deleteTexture(textureRef.current)
        }
    }, [])

    // Resize handler
    const handleResize = useCallback(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        const sticker = stickerRef.current
        const gl = glRef.current
        const state = stateRef.current

        if (!container || !canvas || !sticker || !gl) return

        const containerWidth = container.clientWidth || 200
        const containerHeight = container.clientHeight || 200

        // Sticker box uses the explicit width/height directly (no aspect-fit
        // scaling) — the image stretches to exactly imageWidth × imageHeight.
        const width = imageWidth > 0 ? imageWidth : containerWidth
        const height = imageHeight > 0 ? imageHeight : containerHeight

        // Add padding to canvas for extra space to prevent clipping during animations
        // Padding scales with elevation to accommodate the lift/scale effect
        const maxDim = Math.max(width, height)
        const elevationPad = maxDim * elevation * 0.6 // extra padding based on elevation
        const effectivePad = PAD_BASE + elevationPad
        const canvasWidth = width + effectivePad * 2
        const canvasHeight = height + effectivePad * 2

        // Calculate scale factor to fit content within padded canvas
        // Use the smaller scale to ensure content fits in both dimensions
        const scaleX = width / canvasWidth
        const scaleY = height / canvasHeight
        const scale = Math.min(scaleX, scaleY)

        // Center the sticker within the container
        const x = (containerWidth - width) / 2
        const y = (containerHeight - height) / 2

        // Update canvas size (larger with padding)
        canvas.width = Math.round(canvasWidth * RENDER_SCALE)
        canvas.height = Math.round(canvasHeight * RENDER_SCALE)
        canvas.style.width = `${canvasWidth}px`
        canvas.style.height = `${canvasHeight}px`

        // Center canvas within sticker element (canvas is larger due to padding)
        canvas.style.position = "absolute"
        canvas.style.left = `${-effectivePad}px`
        canvas.style.top = `${-effectivePad}px`

        // Update sticker element size and position (centered, visible size without padding)
        sticker.style.width = `${width}px`
        sticker.style.height = `${height}px`
        sticker.style.left = `${x}px`
        sticker.style.top = `${y}px`

        // Update state
        state.width = width
        state.height = height
        state.x = x
        state.y = y
        state.scale = scale

        // Update WebGL viewport
        gl.viewport(0, 0, canvas.width, canvas.height)

        // Redraw if texture is ready
        if (state.texReady) {
            draw()
        }
    }, [draw, elevation, imageWidth, imageHeight])

    // Load image
    useEffect(() => {
        const imageSrc = resolveImageSource(image) || DEFAULT_IMAGE

        const gl = glRef.current
        if (!gl || !programRef.current) return

        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
            const state = stateRef.current

            // Store image aspect ratio for contained sizing
            state.imageAspectRatio = img.width / img.height

            // Load texture
            if (textureRef.current) {
                gl.deleteTexture(textureRef.current)
            }

            const texture = gl.createTexture()
            if (!texture) return

            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                img
            )
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

            textureRef.current = texture
            state.texReady = true

            // Resize with contained dimensions
            handleResize()
            updateShadowCSS()
        }

        img.onerror = () => {
            console.error("Failed to load image")
        }

        img.src = imageSrc

        return () => {
            stateRef.current.texReady = false
        }
    }, [image, handleResize, updateShadowCSS])

    // Handle container resize
    // Debounced apply: avoid feedback loop (fit = grow forever) and perf storms
    const applyResizeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const SIZING_THRESHOLD = 5 // only update sizing when container changed by this much (stops fit feedback loop)
    const RESIZE_DEBOUNCE_MS = 180

    const scheduleResize = useCallback(
        (measuredW: number, measuredH: number) => {
            if (applyResizeRef.current) clearTimeout(applyResizeRef.current)
            applyResizeRef.current = setTimeout(() => {
                applyResizeRef.current = null
                setSizingDimensions((prev) => {
                    const w = Math.max(1, Math.round(measuredW)) || prev.width
                    const h = Math.max(1, Math.round(measuredH)) || prev.height
                    // Only update if change is significant (prevents fit feedback + jitter)
                    const dw = Math.abs(w - prev.width)
                    const dh = Math.abs(h - prev.height)
                    if (dw < SIZING_THRESHOLD && dh < SIZING_THRESHOLD)
                        return prev
                    return { width: w, height: h }
                })
                handleResize()
            }, RESIZE_DEBOUNCE_MS)
        },
        [handleResize]
    )

    // Resize detection: zoom-probe in canvas (ignore zoom), ResizeObserver in preview; sizing div prevents fit collapse
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        handleResize()

        const isCanvas = RenderTarget.current() === RenderTarget.canvas

        if (isCanvas && zoomProbeRef.current) {
            let rafId = 0
            const TICK_MS = 400 // throttle probe checks
            const EPS = 2
            const last = { ts: 0, zoom: 0, w: 0, h: 0 }

            const tick = (now?: number) => {
                const probe = zoomProbeRef.current
                if (!container || !probe) {
                    rafId = requestAnimationFrame(tick)
                    return
                }
                // Use actual CSS pixel dimensions (don't divide by zoom - that causes exponential growth when zoomed out)
                const cw = container.clientWidth || container.offsetWidth || 0
                const ch = container.clientHeight || container.offsetHeight || 0
                const zoom = probe.getBoundingClientRect().width / 20

                const timeOk =
                    !last.ts || (now ?? performance.now()) - last.ts >= TICK_MS
                // Only call handleResize when zoom OR actual size changed; use actual CSS pixels for sizing
                const zoomChanged = Math.abs(zoom - last.zoom) > 0.001
                const sizeChanged =
                    Math.abs(cw - last.w) > EPS || Math.abs(ch - last.h) > EPS

                if (timeOk && (sizeChanged || zoomChanged)) {
                    last.ts = now ?? performance.now()
                    last.zoom = zoom
                    last.w = cw
                    last.h = ch
                    // Sizing div uses CSS pixels (cw, ch), not logical; handleResize for any zoom/size change
                    if (cw >= 1 && ch >= 1) {
                        scheduleResize(cw, ch)
                    }
                }
                rafId = requestAnimationFrame(tick)
            }
            rafId = requestAnimationFrame(tick)
            return () => {
                cancelAnimationFrame(rafId)
                if (applyResizeRef.current) clearTimeout(applyResizeRef.current)
            }
        }

        const ro = new ResizeObserver(() => {
            const w = container.clientWidth || container.offsetWidth || 400
            const h = container.clientHeight || container.offsetHeight || 400
            scheduleResize(w, h)
        })
        ro.observe(container)
        return () => {
            ro.disconnect()
            if (applyResizeRef.current) clearTimeout(applyResizeRef.current)
        }
    }, [handleResize, scheduleResize])

    // Mouse down handler
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            const state = stateRef.current
            const container = containerRef.current
            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!container || !sticker || !inner) return

            const rect = sticker.getBoundingClientRect()

            // Calculate grab point for tilt pivot
            const grabOffsetX = e.clientX - rect.left
            const grabOffsetY = e.clientY - rect.top
            inner.style.transformOrigin = `${grabOffsetX}px ${grabOffsetY}px`

            // Calculate angle from sticker center to click point
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const dx = e.clientX - centerX
            const dy = e.clientY - centerY // Y goes down in screen coords, matches flipped UV
            state.peelAngle = Math.atan2(dy, dx)

            // Store drag start
            state.dragStartX = e.clientX
            state.dragStartY = e.clientY
            state.dragOrigX = state.x
            state.dragOrigY = state.y

            // Reset state for new peel
            state.peel = 0
            state.lift = 0

            state.held = true
            state.peeling = true
            state.sticking = false

            // Reset velocity tracking
            state.lastMoveX = e.clientX
            state.lastMoveY = e.clientY
            state.lastMoveT = performance.now()

            // Bring container to front by setting incrementing z-index
            container.style.zIndex = `${getNextZIndex()}`

            // Start animation loop
            ensureTickRunning()
        },
        [ensureTickRunning]
    )

    // Mouse move handler
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const state = stateRef.current
            if (!state.held) return

            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!sticker || !inner) return

            // Update position
            state.x = state.dragOrigX + (e.clientX - state.dragStartX)
            state.y = state.dragOrigY + (e.clientY - state.dragStartY)
            sticker.style.left = `${state.x}px`
            sticker.style.top = `${state.y}px`

            // Calculate velocity
            const now = performance.now()
            const dt = Math.max(1, now - state.lastMoveT)
            const velX = ((e.clientX - state.lastMoveX) / dt) * 16 // normalize to ~60fps
            const velY = ((e.clientY - state.lastMoveY) / dt) * 16
            state.lastMoveX = e.clientX
            state.lastMoveY = e.clientY
            state.lastMoveT = now

            // Tilt based on velocity (clamped)
            const targetTiltY = Math.max(
                -maxTilt,
                Math.min(maxTilt, velX * tiltSensitivity)
            )
            const targetTiltX = Math.max(
                -maxTilt,
                Math.min(maxTilt, -velY * tiltSensitivity)
            )

            // Smooth toward target
            state.dragTiltX += (targetTiltX - state.dragTiltX) * tiltSmoothing
            state.dragTiltY += (targetTiltY - state.dragTiltY) * tiltSmoothing

            // Store for shader
            state.currentTiltX = state.dragTiltX
            state.currentTiltY = state.dragTiltY

            // In holo mode, show effect only while tilting (cursor moving)
            if (sheenMode === "holo") {
                const tiltDelta =
                    Math.abs(state.dragTiltX - state.prevTiltX) +
                    Math.abs(state.dragTiltY - state.prevTiltY)
                state.holoMotion = Math.min(
                    1,
                    state.holoMotion + tiltDelta * HOLO_MOTION_BUMP
                )
                state.prevTiltX = state.dragTiltX
                state.prevTiltY = state.dragTiltY
            }

            // Apply CSS 3D transform for tilt
            inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
        }

        const handleMouseUp = () => {
            const state = stateRef.current
            if (!state.held) return

            const inner = innerRef.current

            state.held = false
            state.peeling = false
            state.sticking = true

            // Reverse peel angle for paste if peel completed
            if (state.peel >= 0.95 && inner) {
                const rect = inner.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height / 2
                const dx = state.lastMoveX - centerX
                const dy = state.lastMoveY - centerY // Y goes down in screen coords
                state.peelAngle = Math.atan2(-dy, -dx)
                state.peel = 1
            }

            // Animate tilt back to zero
            const settleTilt = () => {
                state.dragTiltX *= 0.9
                state.dragTiltY *= 0.9
                state.currentTiltX = state.dragTiltX
                state.currentTiltY = state.dragTiltY

                if (inner) {
                    inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
                }

                if (
                    Math.abs(state.dragTiltX) > 0.1 ||
                    Math.abs(state.dragTiltY) > 0.1
                ) {
                    requestAnimationFrame(settleTilt)
                } else {
                    state.dragTiltX = 0
                    state.dragTiltY = 0
                    state.currentTiltX = 0
                    state.currentTiltY = 0
                    state.prevTiltX = 0
                    state.prevTiltY = 0
                    if (inner) {
                        inner.style.transform = ""
                    }
                }
            }
            settleTilt()

            // Continue animation for paste (and holo fade in holo mode)
            ensureTickRunning()
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [tiltSensitivity, tiltSmoothing, ensureTickRunning, sheenMode, maxTilt])

    // Touch handlers
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault()
            const touch = e.touches[0]
            if (!touch) return

            const state = stateRef.current
            const container = containerRef.current
            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!container || !sticker || !inner) return

            const rect = sticker.getBoundingClientRect()

            const grabOffsetX = touch.clientX - rect.left
            const grabOffsetY = touch.clientY - rect.top
            inner.style.transformOrigin = `${grabOffsetX}px ${grabOffsetY}px`

            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const dx = touch.clientX - centerX
            const dy = touch.clientY - centerY // Y goes down in screen coords, matches flipped UV
            state.peelAngle = Math.atan2(dy, dx)

            state.dragStartX = touch.clientX
            state.dragStartY = touch.clientY
            state.dragOrigX = state.x
            state.dragOrigY = state.y

            state.peel = 0
            state.lift = 0

            state.held = true
            state.peeling = true
            state.sticking = false

            state.lastMoveX = touch.clientX
            state.lastMoveY = touch.clientY
            state.lastMoveT = performance.now()

            // Bring container to front by setting incrementing z-index
            container.style.zIndex = `${getNextZIndex()}`

            ensureTickRunning()
        },
        [ensureTickRunning]
    )

    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0]
            if (!touch) return

            const state = stateRef.current
            if (!state.held) return

            const sticker = stickerRef.current
            const inner = innerRef.current
            if (!sticker || !inner) return

            state.x = state.dragOrigX + (touch.clientX - state.dragStartX)
            state.y = state.dragOrigY + (touch.clientY - state.dragStartY)
            sticker.style.left = `${state.x}px`
            sticker.style.top = `${state.y}px`

            const now = performance.now()
            const dt = Math.max(1, now - state.lastMoveT)
            const velX = ((touch.clientX - state.lastMoveX) / dt) * 16
            const velY = ((touch.clientY - state.lastMoveY) / dt) * 16
            state.lastMoveX = touch.clientX
            state.lastMoveY = touch.clientY
            state.lastMoveT = now

            const targetTiltY = Math.max(
                -maxTilt,
                Math.min(maxTilt, velX * tiltSensitivity)
            )
            const targetTiltX = Math.max(
                -maxTilt,
                Math.min(maxTilt, -velY * tiltSensitivity)
            )

            state.dragTiltX += (targetTiltX - state.dragTiltX) * tiltSmoothing
            state.dragTiltY += (targetTiltY - state.dragTiltY) * tiltSmoothing

            state.currentTiltX = state.dragTiltX
            state.currentTiltY = state.dragTiltY

            if (sheenMode === "holo") {
                const tiltDelta =
                    Math.abs(state.dragTiltX - state.prevTiltX) +
                    Math.abs(state.dragTiltY - state.prevTiltY)
                state.holoMotion = Math.min(
                    1,
                    state.holoMotion + tiltDelta * HOLO_MOTION_BUMP
                )
                state.prevTiltX = state.dragTiltX
                state.prevTiltY = state.dragTiltY
            }

            inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
        }

        const handleTouchEnd = () => {
            const state = stateRef.current
            if (!state.held) return

            const inner = innerRef.current

            state.held = false
            state.peeling = false
            state.sticking = true

            if (state.peel >= 0.95 && inner) {
                const rect = inner.getBoundingClientRect()
                const centerX = rect.left + rect.width / 2
                const centerY = rect.top + rect.height / 2
                const dx = state.lastMoveX - centerX
                const dy = state.lastMoveY - centerY // Y goes down in screen coords
                state.peelAngle = Math.atan2(-dy, -dx)
                state.peel = 1
            }

            const settleTilt = () => {
                state.dragTiltX *= 0.9
                state.dragTiltY *= 0.9
                state.currentTiltX = state.dragTiltX
                state.currentTiltY = state.dragTiltY

                if (inner) {
                    inner.style.transform = `rotateX(${state.dragTiltX}deg) rotateY(${state.dragTiltY}deg)`
                }

                if (
                    Math.abs(state.dragTiltX) > 0.1 ||
                    Math.abs(state.dragTiltY) > 0.1
                ) {
                    requestAnimationFrame(settleTilt)
                } else {
                    state.dragTiltX = 0
                    state.dragTiltY = 0
                    state.currentTiltX = 0
                    state.currentTiltY = 0
                    state.prevTiltX = 0
                    state.prevTiltY = 0
                    if (inner) {
                        inner.style.transform = ""
                    }
                }
            }
            settleTilt()

            ensureTickRunning()
        }

        window.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        })
        window.addEventListener("touchend", handleTouchEnd)

        return () => {
            window.removeEventListener("touchmove", handleTouchMove)
            window.removeEventListener("touchend", handleTouchEnd)
        }
    }, [tiltSensitivity, tiltSmoothing, ensureTickRunning, sheenMode, maxTilt])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
                perspective: "800px",
                ...style,
            }}
        >
            {/* Invisible sizing div: gives container a fixed size when parent is size=fit; resizes only on real layout change (zoom probe in canvas) */}
            <div
                style={{
                    position: "relative",
                    width: sizingDimensions.width,
                    height: sizingDimensions.height,
                    minWidth: sizingDimensions.width,
                    minHeight: sizingDimensions.height,
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                }}
            />
            {/* Zoom probe for canvas: 20px logical size so zoom = getBoundingClientRect().width / 20 */}
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    top: 0,
                    left: 0,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            <div
                ref={stickerRef}
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    cursor: "grab",
                    userSelect: "none",
                    perspective: "800px",
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                    overflow: "visible",
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div
                    ref={innerRef}
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        transformStyle: "preserve-3d",
                        overflow: "visible",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: "block",
                            pointerEvents: "none",
                            position: "absolute",
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

const COMPONENT_DEFAULTS = {
    image: {
        src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3fb4a247-64e9-4c54-2391-86598eebfe00/w=800",
    },
    imageWidth: 600,
    imageHeight: 400,
    tilt: 45,
    lighting: true,
    lightingStrength: 10,
    lightingColor: "#ffffff",
    elevation: 10,
}

StickerDrag.displayName = "Sticker Drag"

const __presetProps = {
  "image": {
    "src": "https://images.unsplash.com/photo-1640960543409-dbe56ccc30e2?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "imageWidth": 229,
  "imageHeight": 400,
  "tilt": 45,
  "lighting": true,
  "lightingStrength": 10,
  "lightingColor": "#520E0E",
  "elevation": 10
};

export default function StickerDrag(props: Record<string, unknown>) {
  return <__BaseImpl_StickerDrag {...(__presetProps as Record<string, unknown>)} {...props} />;
}
