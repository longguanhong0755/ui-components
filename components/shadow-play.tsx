"use client"
import * as React from "react"
import {
    useEffect,
    useLayoutEffect,
    useCallback,
    useRef,
    type CSSProperties,
} from "react"

const useIsStaticRenderer = () => false

// ---- Types ------------------------------------------------------------------

type Align = "left" | "center" | "right"

interface VolumetricTextProps {
    text?: string
    font?: CSSProperties
    textColor?: string
    backgroundColor?: string
    shadowColor?: string
    /** Grow the type until the wrapped block fills the frame. */
    fitToWidth?: boolean
    fitPadding?: number
    align?: Align
    /** Resting light position before the pointer is first seen, as a
     *  percentage of the frame. */
    lightX?: number
    lightY?: number
    /** How quickly the light chases the pointer, 1–100. */
    followEase?: number
    /** Radius term of the falloff — a bigger light reaches further. */
    lightSize?: number
    /** Falloff exponent. Low is a flat, ambient wash; high pulls the lit area
     *  in tight around the light and lets the rest go to the backdrop. */
    lightFalloff?: number
    shadowStrength?: number
    rainbow?: number
    dither?: number
    /** Ray-march steps per pixel. The cost knob. */
    samples?: number
    /** Render the effect at a fraction of full resolution. */
    quality?: number
    style?: CSSProperties
}

// ---- Shaders ----------------------------------------------------------------

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

// The pen's fragment shader, with its hardcoded constants lifted to uniforms
// and the final `discard` replaced by compositing the glyph colour (see the
// note on the text mask below). SAMPLES stays a #define because GLSL ES 1.0
// requires a constant loop bound.
const FRAG = (samples: number) => `
precision highp float;
uniform vec2 resolution;
uniform vec2 mouse;
uniform sampler2D src;
uniform vec3 textColor;
uniform vec3 bgColor;
uniform float lightSize;
uniform float lightFalloff;
uniform float shadowStrength;
uniform float rainbow;
uniform float dither;
uniform vec3 shadowColor;
uniform float lightActive;

#define PI 3.141593
#define SAMPLES ${samples.toFixed(1)}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(489., 589.))) * 492.) * 2. - 1.;
}
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(489., 589., 58.))) * 492.) * 2. - 1.;
}
vec2 hash2(vec3 p) {
  return vec2(hash(p), hash(p + 1.));
}
vec4 readTex(vec2 uv) {
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
  return texture2D(src, uv);
}
vec3 spectrum(float x) {
  return cos((x - vec3(0, .5, 1)) * vec3(.6, 1., .5) * PI);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float mask = readTex(uv).r;
  // Fully inside a glyph: nothing to light, just paint the type.
  if (mask > 0.995) {
    gl_FragColor = vec4(textColor, 1.0);
    return;
  }

  vec2 p = uv * 2. - 1.;
  p.x *= resolution.x / resolution.y;

  // Light position in the same aspect-corrected space.
  vec2 mp = mouse / resolution;
  mp = mp * 2. - 1.;
  mp.x *= resolution.x / resolution.y;

  // March from this pixel toward the light, accumulating occlusion. The
  // per-step jitter is what softens the penumbra instead of banding it.
  vec2 rp = p;
  vec2 d = (mp - p) / SAMPLES;
  float acc = 0.;
  for (float i = 0.; i < SAMPLES; i++) {
    rp += d;
    rp += hash2(vec3(rp, i)) * 0.5 / SAMPLES;

    vec2 uv2 = rp;
    uv2.x /= resolution.x / resolution.y;
    uv2 = uv2 * 0.5 + 0.5;
    acc += readTex(uv2).r / SAMPLES;
  }

  // Distance-based falloff still shapes intensity near vs far from the
  // light, but nothing is drawn where there is no occlusion — the light no
  // longer casts a visible glow of its own, only the shadow it makes.
  float lm = length(p - mp);
  float falloff = smoothstep(0., 1., pow(lightSize / lm, lightFalloff));
  float shade = acc * shadowStrength * falloff * lightActive;
  vec3 rainbowCol = spectrum(cos(acc * 3.5)) * acc * rainbow * falloff * lightActive;

  vec3 c = shadowColor * shade + rainbowCol;
  c -= hash(vec3(uv.xyy)) * dither;                           // dither

  // The original draws this as a translucent overlay above the page, so its
  // alpha channel is part of the look: it darkens the ambient field and lets
  // shadowed areas fall back to the backdrop. Reproduce that source-over
  // blend explicitly rather than compositing, since we own the background.
  float a = clamp(shade + acc * rainbow * falloff * lightActive, 0.0, 1.0);
  vec3 col = mix(bgColor, clamp(c, 0.0, 1.0), a);
  // Blend the glyph edge in by coverage so type and shadow can never misalign.
  gl_FragColor = vec4(mix(col, textColor, mask), 1.0);
}
`

// ---- Helpers ----------------------------------------------------------------

// Parse any CSS colour the browser understands into 0..1 RGB, by letting the
// browser do the parsing on a 1x1 canvas.
let probeCtx: CanvasRenderingContext2D | null = null
function parseColor(css: string, fallback: [number, number, number]) {
    if (typeof document === "undefined") return fallback
    if (!probeCtx) {
        const cv = document.createElement("canvas")
        cv.width = 1
        cv.height = 1
        probeCtx = cv.getContext("2d", { willReadFrequently: true })
    }
    if (!probeCtx) return fallback
    try {
        probeCtx.clearRect(0, 0, 1, 1)
        probeCtx.fillStyle = "#000"
        probeCtx.fillStyle = css
        probeCtx.fillRect(0, 0, 1, 1)
        const d = probeCtx.getImageData(0, 0, 1, 1).data
        return [d[0] / 255, d[1] / 255, d[2] / 255] as [number, number, number]
    } catch {
        return fallback
    }
}

/**
 * Greedy word-wrap against the context's current font.
 *
 * A word wider than maxWidth has no space to break at, so it is split by
 * character rather than left on a line of its own to run out of the frame —
 * one long URL or compound word would otherwise overflow at any font size.
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length === 0) return [text]
    const lines: string[] = []
    let current = ""

    const place = (word: string) => {
        if (current === "") {
            if (ctx.measureText(word).width <= maxWidth) {
                current = word
                return
            }
            // Nothing to break at: chop the word across as many lines as it
            // takes. Array.from so surrogate pairs aren't split down the middle.
            let chunk = ""
            for (const ch of Array.from(word)) {
                if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
                    lines.push(chunk)
                    chunk = ch
                } else {
                    chunk += ch
                }
            }
            current = chunk
            return
        }
        if (ctx.measureText(`${current} ${word}`).width <= maxWidth) {
            current = `${current} ${word}`
        } else {
            lines.push(current)
            current = ""
            place(word)
        }
    }

    for (const word of words) place(word)
    if (current !== "") lines.push(current)
    return lines.length ? lines : [text]
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, source)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
    }
    return sh
}

function buildProgram(gl: WebGLRenderingContext, samples: number) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG(samples))
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    if (!prog) return null
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog)
        return null
    }
    return prog
}

// ---- Component --------------------------------------------------------------

/**
 * Volumetric Text
 *
 * Type that casts real shadows. A light source follows the pointer, throwing
 * rays through the letterforms; whatever they occlude falls dark, with a
 * spectral fringe at the shadow's edge.
 *
 * The copy wraps to the frame: lines break where they need to, and the whole
 * block is sized so it fits the width and the height at once.
 */
function __BaseImpl_VolumetricText(props: VolumetricTextProps) {
    const {
        text = "Thru.",
        font = {
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.03em",
        } as CSSProperties,
        textColor = "#ffffff",
        backgroundColor = "#000000",
        shadowColor = "#000000",
        fitToWidth = true,
        fitPadding = 8,
        align = "center",
        lightX = 50,
        lightY = 30,
        followEase = 12,
        lightSize = 10,
        lightFalloff = 60,
        shadowStrength = 100,
        rainbow = 250,
        dither = 1,
        samples = 64,
        quality = 100,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const glRef = useRef<WebGLRenderingContext | null>(null)
    const progRef = useRef<WebGLProgram | null>(null)
    const texRef = useRef<WebGLTexture | null>(null)
    const bufRef = useRef<WebGLBuffer | null>(null)
    const maskRef = useRef<HTMLCanvasElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
    // Light position in CSS pixels, y measured from the bottom to match
    // gl_FragCoord. `target` is where it wants to be, `light` where it is.
    const targetRef = useRef({ x: 0, y: 0 })
    const lightRef = useRef({ x: 0, y: 0 })
    const pointerSeenRef = useRef(false)
    const visibleRef = useRef(true)

    const propsRef = useRef<any>({})
    propsRef.current = {
        text,
        font,
        textColor,
        backgroundColor,
        shadowColor,
        fitToWidth,
        fitPadding,
        align,
        lightX,
        lightY,
        followEase,
        lightSize,
        lightFalloff,
        shadowStrength,
        rainbow,
        dither,
        quality,
    }

    // --- The text mask -------------------------------------------------------
    //
    // The pen leaves the DOM <h1> in place and `discard`s inside the glyphs so
    // the real text shows through. Here the type is drawn into an offscreen
    // canvas that the shader reads as both the occluder AND the glyph colour —
    // one source of truth, so the shadows can never drift a pixel away from
    // the letterforms they belong to.
    const drawMask = useCallback(() => {
        const { w, h, dpr } = sizeRef.current
        if (w <= 0 || h <= 0) return
        let cv = maskRef.current
        if (!cv) {
            cv = document.createElement("canvas")
            maskRef.current = cv
        }
        const p = propsRef.current
        cv.width = Math.max(1, Math.round(w * dpr))
        cv.height = Math.max(1, Math.round(h * dpr))
        const ctx = cv.getContext("2d")
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, w, h)

        const f = (p.font || {}) as CSSProperties & Record<string, unknown>
        const family = (f.fontFamily as string) || "Inter, system-ui, sans-serif"
        const weight = (f.fontWeight as string | number) || 900
        const styleStr = (f.fontStyle as string) || "normal"
        const lineHeight = (() => {
            const lh = f.lineHeight
            if (typeof lh === "number") return lh
            if (typeof lh === "string") {
                const v = parseFloat(lh)
                if (isNaN(v)) return 1
                if (lh.endsWith("%")) return v / 100
                if (lh.endsWith("em")) return v
                // A bare number in a string is a multiplier; anything with a
                // unit we can't resolve without a size falls back to 1.
                return /[a-z]/i.test(lh) ? 1 : v
            }
            return 1
        })()

        const REFERENCE_WIDTH = 900
        const MIN_FONT_SIZE = 10
        // With Fit off, the authored size still tracks the frame: a component
        // half as wide as the reference draws its type half as large.
        const baseSize = (() => {
            const fs = f.fontSize
            const scale = Math.max(w, 1) / REFERENCE_WIDTH
            if (typeof fs === "number") return Math.max(MIN_FONT_SIZE, fs * scale)
            if (typeof fs === "string") {
                const v = parseFloat(fs)
                if (!isNaN(v)) return Math.max(MIN_FONT_SIZE, v * scale)
            }
            return Math.max(MIN_FONT_SIZE, h * 0.4)
        })()

        const fontStr = (size: number) =>
            `${styleStr} ${weight} ${size}px ${family}`

        // Letter-spacing changes every measurement, so it has to be in force
        // while the block is being measured, not applied afterwards — with a
        // positive tracking the fitted size would otherwise overflow.
        const ls = f.letterSpacing
        const applyFont = (size: number) => {
            ctx.font = fontStr(size)
            if (typeof ls === "string" && "letterSpacing" in ctx) {
                try {
                    ;(ctx as any).letterSpacing = ls.endsWith("em")
                        ? `${parseFloat(ls) * size}px`
                        : ls
                    // Some engines reset the font when letterSpacing is set.
                    ctx.font = fontStr(size)
                } catch {
                    /* letterSpacing unsupported — ignore */
                }
            }
        }

        const hardLines = String(p.text ?? "").split("\n")
        const inset = Math.max(0, Math.min(45, p.fitPadding)) / 50
        const availW = Math.max(1, w * (1 - inset))
        const availH = Math.max(1, h * (1 - inset))

        /** Wrap at `size` and report what the resulting block measures. */
        const layout = (size: number, maxWidth: number) => {
            applyFont(size)
            const wrapped = hardLines.flatMap((l) => wrapText(ctx, l, maxWidth))
            let widest = 0
            for (const l of wrapped) {
                const lw = ctx.measureText(l).width
                if (lw > widest) widest = lw
            }
            return {
                wrapped,
                widest,
                height: size * lineHeight * wrapped.length,
            }
        }

        let size = baseSize
        if (p.fitToWidth) {
            // Largest size whose wrapped block fits BOTH ways. Height alone is
            // not enough: a single word can't be wrapped, so with only a height
            // test it grows to the frame height and runs off the sides.
            const fits = (s: number) => {
                const l = layout(s, availW)
                return l.widest <= availW && l.height <= availH
            }
            let lo = MIN_FONT_SIZE
            // One line can never need a size past this and still fit vertically.
            let hi = Math.max(MIN_FONT_SIZE + 1, availH / Math.max(0.1, lineHeight))
            if (fits(hi)) {
                lo = hi
            } else {
                for (let i = 0; i < 22; i++) {
                    const mid = (lo + hi) / 2
                    if (fits(mid)) lo = mid
                    else hi = mid
                }
            }
            size = Math.max(MIN_FONT_SIZE, lo)
        }

        const { wrapped } = layout(size, p.fitToWidth ? availW : availW)

        ctx.fillStyle = "#ffffff"
        ctx.textBaseline = "middle"
        ctx.textAlign =
            p.align === "left" ? "left" : p.align === "right" ? "right" : "center"
        // Anchor to the inset box, not the raw frame, so alignment and padding
        // agree with the width the text was wrapped to.
        const boxLeft = (w - availW) / 2
        const x =
            p.align === "left"
                ? boxLeft
                : p.align === "right"
                  ? boxLeft + availW
                  : w / 2

        const lh = size * lineHeight
        const total = lh * wrapped.length
        for (let i = 0; i < wrapped.length; i++) {
            ctx.fillText(wrapped[i], x, h / 2 - total / 2 + lh * (i + 0.5))
        }

        const gl = glRef.current
        const tex = texRef.current
        if (gl && tex) {
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                cv
            )
        }
    }, [])

    // --- Sizing --------------------------------------------------------------
    const resize = useCallback(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const gl = glRef.current
        if (!root || !canvas || !gl) return
        const rect = root.getBoundingClientRect()
        const w = Math.max(1, Math.round(rect.width))
        const h = Math.max(1, Math.round(rect.height))
        const q = Math.max(25, Math.min(100, propsRef.current.quality)) / 100
        const dpr =
            Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2) * q
        sizeRef.current = { w, h, dpr }
        canvas.width = Math.max(1, Math.round(w * dpr))
        canvas.height = Math.max(1, Math.round(h * dpr))
        gl.viewport(0, 0, canvas.width, canvas.height)
        drawMask()
    }, [drawMask])

    // --- Frame ---------------------------------------------------------------
    const render = useCallback((now: number) => {
        const gl = glRef.current
        const prog = progRef.current
        const canvas = canvasRef.current
        if (!gl || !prog || !canvas) return
        const p = propsRef.current
        const { w, h } = sizeRef.current

        // The light is pointer-only: it stays at its resting position
        // (lightX, lightY) until the pointer is first seen, then follows it.

        const k = Math.max(1, Math.min(100, p.followEase)) / 100
        const L = lightRef.current
        L.x += (targetRef.current.x - L.x) * k
        L.y += (targetRef.current.y - L.y) * k

        const tc = parseColor(p.textColor, [1, 1, 1])
        const bc = parseColor(p.backgroundColor, [0, 0, 0])
        const sc = parseColor(p.shadowColor, [0, 0, 0])
        // The light only lights up once the cursor has actually entered.
        const lightActive = pointerSeenRef.current ? 1 : 0

        gl.useProgram(prog)
        const u = (name: string) => gl.getUniformLocation(prog, name)
        gl.uniform2f(u("resolution"), canvas.width, canvas.height)
        // The shader works in backing-store pixels, so scale the light with
        // the same factor the canvas was scaled by.
        const sx = canvas.width / Math.max(1, w)
        const sy = canvas.height / Math.max(1, h)
        gl.uniform2f(u("mouse"), L.x * sx, L.y * sy)
        gl.uniform3f(u("textColor"), tc[0], tc[1], tc[2])
        gl.uniform3f(u("bgColor"), bc[0], bc[1], bc[2])
        gl.uniform3f(u("shadowColor"), sc[0], sc[1], sc[2])
        gl.uniform1f(u("lightActive"), lightActive)
        gl.uniform1f(u("lightSize"), Math.max(0.001, p.lightSize / 100))
        gl.uniform1f(u("lightFalloff"), Math.max(0.01, p.lightFalloff / 100))
        gl.uniform1f(u("shadowStrength"), p.shadowStrength / 100)
        gl.uniform1f(u("rainbow"), p.rainbow / 100)
        gl.uniform1f(u("dither"), p.dither / 100)
        gl.uniform1i(u("src"), 0)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texRef.current)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }, [])

    // --- Setup ---------------------------------------------------------------
    useLayoutEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const gl =
            (canvas.getContext("webgl", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: true,
            }) as WebGLRenderingContext | null) ||
            (canvas.getContext(
                "experimental-webgl"
            ) as WebGLRenderingContext | null)
        if (!gl) return
        glRef.current = gl

        const prog = buildProgram(gl, Math.max(4, Math.min(160, Math.round(samples))))
        if (!prog) return
        progRef.current = prog

        // One full-screen triangle — cheaper than a quad and no seam.
        const buf = gl.createBuffer()
        bufRef.current = buf
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        const loc = gl.getAttribLocation(prog, "position")
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

        const tex = gl.createTexture()
        texRef.current = tex
        gl.bindTexture(gl.TEXTURE_2D, tex)
        // Non-power-of-two texture: clamp, linear, no mipmaps.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        return () => {
            if (progRef.current) gl.deleteProgram(progRef.current)
            if (bufRef.current) gl.deleteBuffer(bufRef.current)
            if (texRef.current) gl.deleteTexture(texRef.current)
            progRef.current = null
            bufRef.current = null
            texRef.current = null
            glRef.current = null
        }
    }, [samples])

    // Size to the frame, and follow it. Every resize re-wraps and re-fits, so
    // the copy reflows as the frame narrows rather than just scaling down.
    useLayoutEffect(() => {
        resize()
        const root = rootRef.current
        if (!root || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(() => resize())
        ro.observe(root)
        return () => ro.disconnect()
    }, [resize])

    // Redraw the mask when anything about the type changes.
    useEffect(() => {
        drawMask()
    }, [text, font, fitToWidth, fitPadding, align, drawMask])

    // Webfonts land after first paint and change every measurement, so the
    // block has to be re-wrapped once they do.
    useEffect(() => {
        const fonts = (document as any).fonts
        if (!fonts?.ready) return
        let cancelled = false
        fonts.ready.then(() => {
            if (!cancelled) drawMask()
        })
        return () => {
            cancelled = true
        }
    }, [drawMask])

    // Pointer tracking. The first move activates the light.
    useEffect(() => {
        if (isStatic) return
        const root = rootRef.current
        if (!root) return
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            pointerSeenRef.current = true
            targetRef.current = {
                x: e.clientX - r.left,
                // Flip to match gl_FragCoord's bottom-up origin.
                y: r.height - (e.clientY - r.top),
            }
        }
        const onLeave = () => {
            pointerSeenRef.current = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        return () => {
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
        }
    }, [isStatic])

    // Only run while on screen.
    useEffect(() => {
        if (isStatic || typeof IntersectionObserver === "undefined") return
        const root = rootRef.current
        if (!root) return
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) visibleRef.current = e.isIntersecting
            },
            { threshold: 0 }
        )
        io.observe(root)
        return () => io.disconnect()
    }, [isStatic])

    // The loop.
    useEffect(() => {
        // Seed the light at its resting place so the first frame doesn't sweep
        // in from the corner.
        const { w, h } = sizeRef.current
        lightRef.current = {
            x: (lightX / 100) * w,
            y: (1 - lightY / 100) * h,
        }
        targetRef.current = { ...lightRef.current }

        if (isStatic) {
            render(performance.now())
            return
        }
        let alive = true
        const tick = (now: number) => {
            if (!alive) return
            if (visibleRef.current) render(now)
            rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
        return () => {
            alive = false
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStatic, render, samples])

    return (
        <div
            ref={rootRef}
            style={{
                ...(style || {}),
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 80,
                minHeight: 60,
                overflow: "hidden",
                background: backgroundColor,
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
            {/* The type lives in the shader, so give assistive tech and search
                engines a real copy of it. */}
            <span
                style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    margin: -1,
                    padding: 0,
                    overflow: "hidden",
                    clip: "rect(0 0 0 0)",
                    whiteSpace: "nowrap",
                    border: 0,
                }}
            >
                {text}
            </span>
        </div>
    )
}

const __presetProps = {
  "text": "SHADOW PLAY",
  "font": {
    "variant": "Regular",
    "fontSize": "44px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 900,
    "lineHeight": 1,
    "letterSpacing": "-0.03em"
  },
  "textColor": "#ffffff",
  "backgroundColor": "#000000",
  "shadowColor": "#000000",
  "align": "center",
  "fitToWidth": false,
  "fitPadding": 0,
  "lightX": 50,
  "lightY": 30,
  "followEase": 100,
  "lightSize": 60,
  "lightFalloff": 2,
  "shadowStrength": 300,
  "rainbow": 600,
  "dither": 10,
  "samples": 64,
  "quality": 100
};

export default function VolumetricText(props: Record<string, unknown>) {
  return <__BaseImpl_VolumetricText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
