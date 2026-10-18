"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------- constants --- */

const MIN_W = 1200
const MIN_H = 800

const TRAIL_COUNT = 12

// Cut controls, frozen at the reference's defaults (rule 11b).
const IDLE_DELAY = 2.0 // s of no pointer movement before the window fades
const FADE_IN = 0.35 // s
const FADE_OUT = 0.7 // s
const FIXED_STEP = 1 / 120 // s, the trail's integration step

const DEFAULT_OUTER =
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop"
const DEFAULT_INNER =
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1920&auto=format&fit=crop"

/* ---------------------------------------------------------------- shaders --- */

const VERT = `
attribute vec2 a_position;
varying vec2 vUv;
void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform sampler2D u_imageOuter;
uniform sampler2D u_imageInner;
uniform vec2 u_resolution;
uniform vec2 u_imageOuterRes;
uniform vec2 u_imageInnerRes;

uniform vec2 u_mouse;
uniform float u_time;
uniform float u_visibility;
uniform vec2 u_trail[12];
uniform float u_trailLength;
uniform float u_trailTaper;

uniform float u_radius;
uniform float u_distortion;
uniform float u_noiseScale;
uniform float u_speed;
uniform float u_edgeSoftness;
uniform float u_refraction;
uniform float u_parallax;

varying vec2 vUv;

// --- Noise & FBM ---
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    // Rotate between octaves to hide the value noise's blocky grid.
    mat2 rot = mat2(0.87, -0.48, 0.48, 0.87);
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// Exact tapered-capsule distance AND its continuous outward gradient.
vec3 taperedCapsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
    vec2 segment = b - a;
    float segmentLength = length(segment);
    float radiusDelta = rb - ra;
    if (segmentLength <= abs(radiusDelta) + 0.00001) {
        vec2 offset = p - (ra >= rb ? a : b);
        float distanceToCenter = length(offset);
        return vec3(distanceToCenter - max(ra, rb), offset / max(distanceToCenter, 0.00001));
    }
    vec2 axis = segment / segmentLength;
    vec2 relative = p - a;
    float along = dot(relative, axis);
    vec2 perpendicular = relative - axis * along;
    float slope = radiusDelta / segmentLength;
    float tangent = sqrt(max(1.0 - slope * slope, 0.000001));
    float h = clamp((along + slope * length(perpendicular) / tangent) / segmentLength, 0.0, 1.0);
    vec2 offset = relative - segment * h;
    float distanceToCenter = length(offset);
    return vec3(distanceToCenter - mix(ra, rb, h), offset / max(distanceToCenter, 0.00001));
}

// Smooth-min that blends the GRADIENT as well as the distance, so overlapping
// segments do not put a refraction seam down the middle of the tail.
vec3 mergeFields(vec3 a, vec3 b, float width) {
    if (width < 0.000001) return a.x < b.x ? a : b;
    float h = clamp(0.5 + 0.5 * (b.x - a.x) / width, 0.0, 1.0);
    return vec3(mix(b.x, a.x, h) - width * h * (1.0 - h), mix(b.yz, a.yz, h));
}

// object-fit: cover, in uv space.
vec2 getCoverUv(vec2 uv, vec2 res, vec2 texRes) {
    vec2 ratio = res / texRes;
    float coverRatio = max(ratio.x, ratio.y);
    vec2 scaledRes = texRes * coverRatio;
    vec2 offset = (scaledRes - res) * 0.5 / scaledRes;
    return uv * (res / scaledRes) + offset;
}

void main() {
    // Procedural stand-ins so the component is never blank without pictures.
    vec3 fallbackOut = mix(vec3(0.05, 0.05, 0.08), vec3(0.15, 0.2, 0.3), vUv.y);
    vec3 fallbackIn = mix(vec3(0.9, 0.2, 0.4), vec3(0.1, 0.8, 0.9), vUv.x);

    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 p = (vUv - u_mouse) * aspect;

    float n = fbm(p * u_noiseScale + u_time * u_speed);

    // Head disc, then eleven tapered capsules chained through the lagged
    // pointer samples. Rounded caps meet the segment sides tangentially.
    vec3 liquidField = vec3(length(p) - u_radius, p / max(length(p), 0.00001));
    for (int i = 0; i < 11; i++) {
        vec2 a = (u_trail[i] - u_mouse) * aspect * u_trailLength;
        vec2 b = (u_trail[i + 1] - u_mouse) * aspect * u_trailLength;
        float ra = u_radius * (1.0 - u_trailTaper * float(i) / 11.0);
        float rb = u_radius * (1.0 - u_trailTaper * float(i + 1) / 11.0);
        vec3 segmentField = taperedCapsule(p, a, b, ra, rb);
        float blendWidth = u_radius * 0.12 * smoothstep(0.0, u_radius * 0.15, length(b - a));
        liquidField = mergeFields(liquidField, segmentField, blendWidth);
    }

    float field = liquidField.x - u_radius * (n - 0.5) * u_distortion * 2.0;
    float mask = 1.0 - smoothstep(-u_edgeSoftness, u_edgeSoftness, field);
    float edgeProfile = smoothstep(0.0, 0.5, mask) * (1.0 - smoothstep(0.5, 1.0, mask));
    vec2 refractionDir = liquidField.yz;
    vec2 finalUvOffset = refractionDir * edgeProfile * u_refraction * u_visibility;

    vec4 colOuter = vec4(fallbackOut, 1.0);
    if (u_imageOuterRes.x > 0.0) {
        vec2 outerUv = getCoverUv(vUv + finalUvOffset, u_resolution, u_imageOuterRes);
        colOuter = texture2D(u_imageOuter, outerUv);
    }

    vec4 colInner = vec4(fallbackIn, 1.0);
    if (u_imageInnerRes.x > 0.0) {
        vec2 parallaxOffset = (u_mouse - 0.5) * u_parallax;
        vec2 innerUv = getCoverUv(vUv - finalUvOffset, u_resolution, u_imageInnerRes) + parallaxOffset;
        colInner = texture2D(u_imageInner, innerUv);
    }

    vec4 finalCol = mix(colOuter, colInner, mask * u_visibility);
    gl_FragColor = vec4(finalCol.rgb, 1.0);
}
`

/* ------------------------------------------------------------------ props --- */

interface LiquidProps {
    /** Field displacement, % of the base radius. Reference: 18. */
    distortion?: number
    /** Noise frequency x10. Reference: 57 (= 5.7). */
    noiseScale?: number
    /** Edge blur, % of uv. Reference: 6. */
    softness?: number
}

interface TrailProps {
    /** Pointer follow, higher settles faster. Reference: 6. */
    damping?: number
    /** Tail reach, % of the raw sample spacing. Reference: 108. */
    length?: number
    /** Sample lag time constant, %s. Reference: 65 (= 0.65s). */
    persistence?: number
    /** How far the tail thins by its tip, %. Reference: 86. */
    taper?: number
}

interface LiquidMaskCursorProps {
    outerImage?: string
    innerImage?: string
    size?: number
    speed?: number
    refraction?: number
    parallax?: number
    liquid?: LiquidProps
    trail?: TrailProps
    style?: CSSProperties
}

const LIQUID_DEFAULTS: Required<LiquidProps> = {
    distortion: 18,
    noiseScale: 57,
    softness: 6,
}

const TRAIL_DEFAULTS: Required<TrailProps> = {
    damping: 6,
    length: 108,
    persistence: 65,
    taper: 86,
}

export default function LiquidMaskCursor(props: LiquidMaskCursorProps) {
    const {
        outerImage = "https://plus.unsplash.com/premium_photo-1754165733093-964c6d10cb70?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fHZpYnJhbnQlMjBpbWFnZSUyMG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
        innerImage = "https://images.unsplash.com/photo-1770034285769-4a5a3f410346?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTF8fHZpYnJhbnQlMjBpbWFnZSUyMG5hdHVyZXxlbnwwfHwwfHx8MA%3D%3D",
        size = 14,
        speed = 92,
        refraction = 14,
        parallax = 14,
        liquid,
        trail,
        style,
    } = props

    // A group the designer never opened arrives undefined; spread-merge over a
    // typed literal rather than a ?? chain, where one missed key pins a dial.
    const L: Required<LiquidProps> = { ...LIQUID_DEFAULTS, ...liquid }
    const T: Required<TrailProps> = { ...TRAIL_DEFAULTS, ...trail }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input reaches the loop through this ref, so no prop change can
    // tear the GL context down (rule 6).
    const live = useRef({
        radius: size / 100,
        // 50 on the dial is the rate the reference shipped at (0.1).
        speed: (speed / 50) * 0.1,
        refraction: refraction / 100,
        parallax: parallax / 100,
        distortion: L.distortion / 100,
        noiseScale: L.noiseScale / 10,
        softness: L.softness / 100,
        smoothness: T.damping / 100,
        trailLength: T.length / 100,
        persistence: T.persistence / 100,
        taper: T.taper / 100,
    })
    live.current = {
        radius: size / 100,
        speed: (speed / 50) * 0.1,
        refraction: refraction / 100,
        parallax: parallax / 100,
        distortion: L.distortion / 100,
        noiseScale: L.noiseScale / 10,
        softness: L.softness / 100,
        smoothness: T.damping / 100,
        trailLength: T.length / 100,
        persistence: T.persistence / 100,
        taper: T.taper / 100,
    }

    // The loader is published by the GL effect; a new picture re-uploads one
    // texture and never rebuilds the context.
    const loadRef = useRef<((src: string, outer: boolean) => void) | null>(null)
    useEffect(() => {
        loadRef.current?.(outerImage, true)
    }, [outerImage])
    useEffect(() => {
        loadRef.current?.(innerImage, false)
    }, [innerImage])

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
        })
        if (!gl) return

        const compile = (src: string, type: number) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error("LiquidMaskCursor shader:", gl.getShaderInfoLog(sh))
                gl.deleteShader(sh)
                return null
            }
            return sh
        }

        const vs = compile(VERT, gl.VERTEX_SHADER)
        const fs = compile(FRAG, gl.FRAGMENT_SHADER)
        if (!vs || !fs) return

        const program = gl.createProgram()!
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("LiquidMaskCursor link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const u = (name: string) => gl.getUniformLocation(program, name)
        const U = {
            imageOuter: u("u_imageOuter"),
            imageInner: u("u_imageInner"),
            resolution: u("u_resolution"),
            outerRes: u("u_imageOuterRes"),
            innerRes: u("u_imageInnerRes"),
            mouse: u("u_mouse"),
            time: u("u_time"),
            visibility: u("u_visibility"),
            // An array's guaranteed queryable name is its first element.
            trail: u("u_trail[0]"),
            trailLength: u("u_trailLength"),
            trailTaper: u("u_trailTaper"),
            radius: u("u_radius"),
            distortion: u("u_distortion"),
            noiseScale: u("u_noiseScale"),
            speed: u("u_speed"),
            edgeSoftness: u("u_edgeSoftness"),
            refraction: u("u_refraction"),
            parallax: u("u_parallax"),
        }

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        )
        const posLoc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        /* --- textures ---------------------------------------------------- */

        // TextureLoader ships flipY = true, and the quad's v is 0 at the
        // bottom exactly as PlaneGeometry's uv is — so the picture lands
        // upright only with the unpack flip ON.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        const makeTex = (unit: number) => {
            const tex = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            // Pictures are NPOT: LINEAR without mipmaps, clamped.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                1,
                1,
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 255])
            )
            return tex
        }

        const texOuter = makeTex(0)
        const texInner = makeTex(1)
        gl.uniform1i(U.imageOuter, 0)
        gl.uniform1i(U.imageInner, 1)

        // Zero size = "no picture", which is what switches the shader to its
        // procedural fallbacks.
        const outerRes = { w: 0, h: 0 }
        const innerRes = { w: 0, h: 0 }
        let disposed = false

        const load = (src: string, outer: boolean) => {
            if (!src) {
                if (outer) outerRes.w = outerRes.h = 0
                else innerRes.w = innerRes.h = 0
                return
            }
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (disposed) return
                gl.activeTexture(gl.TEXTURE0 + (outer ? 0 : 1))
                gl.bindTexture(gl.TEXTURE_2D, outer ? texOuter : texInner)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    img
                )
                const target = outer ? outerRes : innerRes
                target.w = img.naturalWidth
                target.h = img.naturalHeight
            }
            img.onerror = () => {
                // A cross-origin refusal is not a crash: the shader keeps the
                // procedural gradient for whichever layer failed.
                if (outer) outerRes.w = outerRes.h = 0
                else innerRes.w = innerRes.h = 0
            }
            img.src = src
        }

        loadRef.current = load
        load(outerImage, true)
        load(innerImage, false)

        /* --- size -------------------------------------------------------- */

        let width = 0
        let height = 0
        const resize = () => {
            // clientWidth, never the injected width/height props: those are
            // not numeric in preview.
            const w = Math.max(1, canvas.clientWidth || host.clientWidth)
            const h = Math.max(1, canvas.clientHeight || host.clientHeight)
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const bw = Math.round(w * dpr)
            const bh = Math.round(h * dpr)
            if (bw === canvas.width && bh === canvas.height) return
            canvas.width = bw
            canvas.height = bh
            width = bw
            height = bh
            gl.viewport(0, 0, bw, bh)
            gl.uniform2f(U.resolution, bw, bh)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(host)

        /* --- pointer ----------------------------------------------------- */

        const trailPoints = new Float32Array(TRAIL_COUNT * 2).fill(0.5)
        const current = { x: 0.5, y: 0.5 }
        const target = { x: 0.5, y: 0.5 }

        let pointerInside = false
        let lastActivity = -Infinity
        let visibility = 0
        let prevX = NaN
        let prevY = NaN

        const activate = (e: PointerEvent) => {
            // A ratio of rect over rect is zoom-invariant, which is why the
            // rect is legitimate here (rule G is about absolute measurement).
            const b = canvas.getBoundingClientRect()
            if (b.width <= 0 || b.height <= 0) return
            target.x = (e.clientX - b.left) / b.width
            target.y = 1 - (e.clientY - b.top) / b.height
            // Collapse the tail onto the pointer while invisible, or the window
            // whips in from wherever it was last seen.
            if (visibility === 0) {
                current.x = target.x
                current.y = target.y
                for (let i = 0; i < TRAIL_COUNT; i++) {
                    trailPoints[i * 2] = target.x
                    trailPoints[i * 2 + 1] = target.y
                }
            }
            pointerInside = true
            lastActivity = performance.now()
            prevX = e.clientX
            prevY = e.clientY
        }

        const deactivate = () => {
            pointerInside = false
            prevX = NaN
            prevY = NaN
        }

        const onMove = (e: PointerEvent) => {
            if (!pointerInside || e.clientX !== prevX || e.clientY !== prevY) {
                activate(e)
            }
        }
        const onUp = (e: PointerEvent) => {
            if (e.pointerType === "touch") deactivate()
        }

        canvas.addEventListener("pointerenter", activate)
        canvas.addEventListener("pointermove", onMove)
        canvas.addEventListener("pointerleave", deactivate)
        canvas.addEventListener("pointercancel", deactivate)
        // Released on window: a pointer that leaves mid-press must still
        // release (rule K).
        window.addEventListener("pointerup", onUp)
        window.addEventListener("blur", deactivate)

        let raf = 0
        let previousTime = performance.now()
        let accumulator = 0
        let time = 0

        const onVisibility = () => {
            if (document.hidden) {
                deactivate()
                visibility = 0
            }
            previousTime = performance.now()
            accumulator = 0
        }
        document.addEventListener("visibilitychange", onVisibility)

        /* --- loop -------------------------------------------------------- */

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const delta = Math.min(Math.max((now - previousTime) / 1000, 0), 0.05)
            previousTime = now
            if (document.hidden) return

            const v = live.current

            const active =
                pointerInside && now - lastActivity < IDLE_DELAY * 1000
            visibility = Math.min(
                1,
                Math.max(
                    0,
                    visibility +
                        (active ? delta / FADE_IN : -delta / FADE_OUT)
                )
            )
            gl.uniform1f(
                U.visibility,
                visibility * visibility * (3 - 2 * visibility)
            )

            // Wrapped so the noise offset never costs float32 precision; an
            // hour of drift is far past anything a viewer sits through.
            time = (time + delta) % 3600
            gl.uniform1f(U.time, time)

            accumulator += delta
            const mouseAlpha = 1 - Math.pow(1 - v.smoothness, FIXED_STEP * 60)
            const trailAlpha =
                1 - Math.exp((-FIXED_STEP * (TRAIL_COUNT - 1)) / v.persistence)
            while (accumulator >= FIXED_STEP) {
                current.x += (target.x - current.x) * mouseAlpha
                current.y += (target.y - current.y) * mouseAlpha
                trailPoints[0] = current.x
                trailPoints[1] = current.y
                for (let i = TRAIL_COUNT - 1; i > 0; i--) {
                    trailPoints[i * 2] +=
                        (trailPoints[(i - 1) * 2] - trailPoints[i * 2]) *
                        trailAlpha
                    trailPoints[i * 2 + 1] +=
                        (trailPoints[(i - 1) * 2 + 1] -
                            trailPoints[i * 2 + 1]) *
                        trailAlpha
                }
                accumulator -= FIXED_STEP
            }

            gl.uniform2f(U.mouse, current.x, current.y)
            gl.uniform2fv(U.trail, trailPoints)
            gl.uniform2f(U.outerRes, outerRes.w, outerRes.h)
            gl.uniform2f(U.innerRes, innerRes.w, innerRes.h)
            gl.uniform1f(U.radius, v.radius)
            gl.uniform1f(U.distortion, v.distortion)
            gl.uniform1f(U.noiseScale, v.noiseScale)
            gl.uniform1f(U.speed, v.speed)
            gl.uniform1f(U.edgeSoftness, v.softness)
            gl.uniform1f(U.refraction, v.refraction)
            gl.uniform1f(U.parallax, v.parallax)
            gl.uniform1f(U.trailLength, v.trailLength)
            gl.uniform1f(U.trailTaper, v.taper)

            if (width && height) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            disposed = true
            loadRef.current = null
            cancelAnimationFrame(raf)
            ro.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            canvas.removeEventListener("pointerenter", activate)
            canvas.removeEventListener("pointermove", onMove)
            canvas.removeEventListener("pointerleave", deactivate)
            canvas.removeEventListener("pointercancel", deactivate)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("blur", deactivate)
            // Never loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black.
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the spread, so an explicit size on the instance
                // still wins and a 100% root cannot collapse under Fit Content.
                minWidth: MIN_W,
                minHeight: MIN_H,
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                overflow: "hidden",
                background: "#000",
                touchAction: "none",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
