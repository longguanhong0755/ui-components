"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * Scan Effect — a light sweeping through a photograph in depth.
 *
 * Port of d3adrabbit/ScanningEffectWithDepthMap (MIT). The whole thing rests
 * on one idea: a depth map turns a flat photo into a scene with a near and a
 * far, and once you have that, a single scalar can name a *slice* of it.
 *
 *   flow = 1 - smoothstep(0, band, abs(depth - progress))
 *
 * That is the effect. Sweep `progress` from 0 to 1 and the lit band walks from
 * the nearest surface to the furthest, hugging whatever geometry it crosses,
 * because it is following the depth values rather than a screen-space line.
 * A narrow `band` makes a sharp contour; a wide one makes a soft wash.
 *
 * Three things dress it:
 *   - A pattern inside the band — dots or crosses — so the slice reads as a
 *     scan rather than a smear of colour.
 *   - Parallax: the image is sampled at `uv + depth * pointer * strength`, so
 *     near pixels shift further than far ones as the cursor moves and the
 *     photo appears to have volume.
 *   - Bloom. The mask is multiplied well past 1.0 on purpose; the scene is
 *     rendered to a float target so those values survive, and the bright pass
 *     picks them up. Without it the band is just clipped colour with no light
 *     coming off it, which is most of what makes the original look expensive.
 *
 * Everything is done on one fullscreen quad in raw WebGL2 — there is no
 * geometry here, so there is no scene graph either.
 */

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const QUAD_VERT = /* glsl */ `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
    // One oversized triangle: no vertex buffer, no index buffer, and the
    // diagonal seam a two-triangle quad has does not exist to begin with.
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

const SCENE_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform sampler2D uDepth;

uniform vec2  uCover;        // uv scale that makes the image cover the frame
uniform vec2  uPointer;      // -1..1, from the cursor
uniform float uImageAspect;
uniform float uProgress;
uniform float uParallax;
uniform float uTiling;
uniform float uBand;
uniform vec3  uScanColor;    // linear, already scaled by intensity
uniform int   uPattern;      // 0 dots, 1 crosses
uniform float uInvertDepth;

vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }

// MaterialX cell noise: one random value per integer cell, which is what gives
// the dot field its uneven twinkle instead of a flat grid of identical dots.
float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float cellNoise(vec2 p) { return hash21(floor(p)); }

float sdCross(vec2 p, vec2 b, float r) {
    p = abs(p);
    p = (p.y > p.x) ? p.yx : p.xy;
    vec2 q = p - b;
    float k = max(q.y, q.x);
    vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
    float d = length(max(w, 0.0));
    return ((k > 0.0) ? d : -d) + r;
}

vec3 blendScreen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }

void main() {
    vec2 uv = (vUv - 0.5) * uCover + 0.5;

    float depth = texture(uDepth, uv).r;
    depth = mix(depth, 1.0 - depth, uInvertDepth);

    // Near pixels shift further than far ones. The depth map is read at the
    // unshifted uv, or the offset would feed back into itself.
    vec3 base = srgbToLinear(texture(uImage, uv + depth * uPointer * uParallax).rgb);

    // Pattern space is the image's own, stretched by its aspect so the cells
    // stay square rather than following the frame.
    vec2 tUv = vec2(uv.x * uImageAspect, uv.y);
    vec2 tiled = mod(tUv * uTiling, 2.0) - 1.0;

    float pattern;
    if (uPattern == 0) {
        pattern = smoothstep(0.5, 0.49, length(tiled)) * cellNoise(tUv * uTiling * 0.5);
    } else {
        pattern = 1.0 - smoothstep(0.0, 0.02, sdCross(tiled, vec2(0.3, 0.02), 0.0));
    }

    // The slice: everything whose depth is within uBand of the sweep.
    float flow = 1.0 - smoothstep(0.0, uBand, abs(depth - uProgress));

    vec3 mask = vec3(pattern * flow) * uScanColor;

    // Deliberately unclamped — values above 1 are what the bloom pass eats.
    fragColor = vec4(blendScreen(base, mask), 1.0);
}
`

const BRIGHT_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform float uThreshold;
void main() {
    vec3 c = texture(uScene, vUv).rgb;
    float b = max(max(c.r, c.g), c.b);
    fragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.5, b), 1.0);
}
`

const BLUR_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uDirection;   // texel-sized step, horizontal or vertical
void main() {
    // Nine-tap gaussian, run separably. Weights sum to 1.
    float w[5] = float[](0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);
    vec3 sum = texture(uTex, vUv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
        vec2 o = uDirection * float(i);
        sum += texture(uTex, vUv + o).rgb * w[i];
        sum += texture(uTex, vUv - o).rgb * w[i];
    }
    fragColor = vec4(sum, 1.0);
}
`

const COMPOSITE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uStrength;
vec3 linearToSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }
void main() {
    vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uStrength;
    fragColor = vec4(linearToSrgb(clamp(c, 0.0, 1.0)), 1.0);
}
`

// ---------------------------------------------------------------------------
// Easing — the Transition control is sampled by hand.
// ---------------------------------------------------------------------------

const NAMED_EASES: Record<string, number[]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
    circIn: [0.55, 0, 1, 0.45],
    circOut: [0, 0.55, 0.45, 1],
    circInOut: [0.85, 0, 0.15, 1],
    backIn: [0.36, 0, 0.66, -0.56],
    backOut: [0.34, 1.56, 0.64, 1],
    backInOut: [0.68, -0.6, 0.32, 1.6],
    anticipate: [0.36, 0, 0.66, -0.56],
}

type Transition = { duration?: number; ease?: string | number[] }

function makeEaseFn(transition?: Transition) {
    let pts: number[] = NAMED_EASES.easeOut
    const ease = transition?.ease
    if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite))
        pts = ease as number[]
    else if (typeof ease === "string" && NAMED_EASES[ease])
        pts = NAMED_EASES[ease]

    const [x1, y1, x2, y2] = pts
    if (x1 === y1 && x2 === y2) return (t: number) => t

    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
    }
    return (t: number) => {
        const x = Math.max(0, Math.min(1, t))
        let s = x
        for (let i = 0; i < 8; i++) {
            const cx = bez(x1, x2, s) - x
            const u = 1 - s
            const dx =
                3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2)
            if (Math.abs(dx) < 1e-6) break
            s -= cx / dx
            s = Math.max(0, Math.min(1, s))
        }
        return bez(y1, y2, s)
    }
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const colorCache = new Map<string, [number, number, number]>()

/** Any CSS colour, resolved through a 1x1 canvas and returned in linear space. */
function parseLinearColor(css: string): [number, number, number] {
    const cached = colorCache.get(css)
    if (cached) return cached

    let rgb: [number, number, number] = [1, 0, 0]
    try {
        const probe = document.createElement("canvas")
        probe.width = probe.height = 1
        const g = probe.getContext("2d", { willReadFrequently: true })!
        g.fillStyle = "#000000"
        g.fillStyle = css
        g.fillRect(0, 0, 1, 1)
        const d = g.getImageData(0, 0, 1, 1).data
        rgb = [
            Math.pow(d[0] / 255, 2.2),
            Math.pow(d[1] / 255, 2.2),
            Math.pow(d[2] / 255, 2.2),
        ]
    } catch {
        // Keep red if the document is unavailable.
    }
    colorCache.set(css, rgb)
    return rgb
}

/** ControlType.Image gives a URL string in most Framer versions, `{src}` in others. */
function imageUrl(value: unknown): string {
    if (typeof value === "string") return value
    if (value && typeof value === "object" && "src" in (value as any))
        return String((value as any).src ?? "")
    return ""
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

type Config = {
    image: string
    depthMap: string
    pattern: "dots" | "crosses"
    scanColor: string
    intensity: number
    tiling: number
    band: number
    parallax: number
    glow: number
    invertDepth: boolean
    transition: Transition
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh)
        gl.deleteShader(sh)
        throw new Error(`shader: ${log}`)
    }
    return sh
}

function program(gl: WebGL2RenderingContext, frag: string) {
    const p = gl.createProgram()!
    const vs = compile(gl, gl.VERTEX_SHADER, QUAD_VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, frag)
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    gl.linkProgram(p)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(p)
        gl.deleteProgram(p)
        throw new Error(`program: ${log}`)
    }
    return p
}

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

class ScanScene {
    private canvas: HTMLCanvasElement
    private gl: WebGL2RenderingContext
    private vao: WebGLVertexArrayObject

    private sceneProg: WebGLProgram
    private brightProg: WebGLProgram
    private blurProg: WebGLProgram
    private compositeProg: WebGLProgram

    private sceneRT!: Target
    private bloomA!: Target
    private bloomB!: Target

    private hdr: boolean
    private imageTex: WebGLTexture
    private depthTex: WebGLTexture

    private imageAspect = 16 / 9
    private hasImage = false
    private hasDepth = false
    private loadedUrls = { image: "", depthMap: "" }

    private pointer = { x: 0, y: 0 }
    private elapsed = 0
    private lastTime = 0
    private raf = 0
    private width = 1
    private height = 1
    private dpr = 1

    private cfg: Config
    private ease: (t: number) => number
    private disposed = false

    constructor(private container: HTMLElement, cfg: Config) {
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.transition)

        this.canvas = document.createElement("canvas")
        Object.assign(this.canvas.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            display: "block",
        })
        container.appendChild(this.canvas)

        const gl = this.canvas.getContext("webgl2", {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
        })
        if (!gl) throw new Error("WebGL2 unavailable")
        this.gl = gl

        // Float targets are what let the mask carry values above 1 into the
        // bright pass. Without the extension everything clamps at 1, so the
        // threshold has to drop below it or bloom would find nothing at all.
        this.hdr = !!gl.getExtension("EXT_color_buffer_float")
        gl.getExtension("OES_texture_float_linear")

        this.sceneProg = program(gl, SCENE_FRAG)
        this.brightProg = program(gl, BRIGHT_FRAG)
        this.blurProg = program(gl, BLUR_FRAG)
        this.compositeProg = program(gl, COMPOSITE_FRAG)

        this.vao = gl.createVertexArray()!

        this.imageTex = this.makeTexture()
        this.depthTex = this.makeTexture()

        this.loadTextures()
        this.bindPointer()
    }

    private makeTexture() {
        const gl = this.gl
        const t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255])
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        return t
    }

    private makeTarget(w: number, h: number): Target {
        const gl = this.gl
        const tex = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, tex)
        if (this.hdr) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        const fbo = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return { fbo, tex, w, h }
    }

    private freeTarget(t?: Target) {
        if (!t) return
        this.gl.deleteFramebuffer(t.fbo)
        this.gl.deleteTexture(t.tex)
    }

    private loadTextures() {
        const load = (
            url: string,
            tex: WebGLTexture,
            onDone: (img: HTMLImageElement) => void
        ) => {
            if (!url) return
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                if (this.disposed) return
                const gl = this.gl
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
                onDone(img)
            }
            img.src = url
        }

        const { image, depthMap } = this.cfg
        if (image !== this.loadedUrls.image) {
            this.loadedUrls.image = image
            this.hasImage = false
            load(image, this.imageTex, (img) => {
                this.imageAspect = img.naturalWidth / img.naturalHeight
                this.hasImage = true
            })
        }
        if (depthMap !== this.loadedUrls.depthMap) {
            this.loadedUrls.depthMap = depthMap
            this.hasDepth = false
            load(depthMap, this.depthTex, () => {
                this.hasDepth = true
            })
        }
    }

    private onPointerMove = (e: PointerEvent) => {
        const r = this.canvas.getBoundingClientRect()
        if (!r.width || !r.height) return
        this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
        this.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    }
    private bindPointer() {
        // No pointerleave handler on purpose: the parallax holds wherever the
        // cursor left it rather than springing back to centre.
        this.container.addEventListener("pointermove", this.onPointerMove)
    }

    updateConfig(cfg: Config) {
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.transition)
        this.loadTextures()
    }

    setSize(width: number, height: number) {
        const w = Math.max(1, Math.floor(width))
        const h = Math.max(1, Math.floor(height))
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.width = Math.max(1, Math.floor(w * this.dpr))
        this.height = Math.max(1, Math.floor(h * this.dpr))
        this.canvas.width = this.width
        this.canvas.height = this.height

        this.freeTarget(this.sceneRT)
        this.freeTarget(this.bloomA)
        this.freeTarget(this.bloomB)
        this.sceneRT = this.makeTarget(this.width, this.height)
        // Half res for the blur: the bloom is a wide soft glow, and the extra
        // resolution buys nothing but fill rate.
        const bw = Math.max(1, this.width >> 1)
        const bh = Math.max(1, this.height >> 1)
        this.bloomA = this.makeTarget(bw, bh)
        this.bloomB = this.makeTarget(bw, bh)
    }

    private draw(target: Target | null, prog: WebGLProgram) {
        const gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null)
        gl.viewport(0, 0, target ? target.w : this.width, target ? target.h : this.height)
        gl.useProgram(prog)
        gl.bindVertexArray(this.vao)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    private bindTex(prog: WebGLProgram, name: string, tex: WebGLTexture, unit: number) {
        const gl = this.gl
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.uniform1i(gl.getUniformLocation(prog, name), unit)
    }

    private renderFrame = (now: number) => {
        if (this.disposed) return
        this.raf = requestAnimationFrame(this.renderFrame)

        const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.1) : 0
        this.lastTime = now

        const gl = this.gl
        const c = this.cfg

        if (!this.hasImage || !this.hasDepth) return

        const duration = Math.max(0.1, c.transition?.duration ?? 3)
        this.elapsed = (this.elapsed + dt) % duration
        const progress = this.ease(this.elapsed / duration)

        // Cover fit: shrink the sampled range on whichever axis has slack.
        const canvasAspect = this.width / this.height
        const cover =
            canvasAspect > this.imageAspect
                ? [1, this.imageAspect / canvasAspect]
                : [canvasAspect / this.imageAspect, 1]

        const patternIndex = c.pattern === "crosses" ? 1 : 0

        const [r, g, b] = parseLinearColor(c.scanColor)

        // --- scene ---
        const p = this.sceneProg
        gl.useProgram(p)
        this.bindTex(p, "uImage", this.imageTex, 0)
        this.bindTex(p, "uDepth", this.depthTex, 1)
        gl.uniform2f(gl.getUniformLocation(p, "uCover"), cover[0], cover[1])
        gl.uniform2f(gl.getUniformLocation(p, "uPointer"), this.pointer.x, this.pointer.y)
        gl.uniform1f(gl.getUniformLocation(p, "uImageAspect"), this.imageAspect)
        gl.uniform1f(gl.getUniformLocation(p, "uProgress"), progress)
        gl.uniform1f(gl.getUniformLocation(p, "uParallax"), c.parallax)
        gl.uniform1f(gl.getUniformLocation(p, "uTiling"), c.tiling)
        gl.uniform1f(gl.getUniformLocation(p, "uBand"), c.band)
        gl.uniform3f(
            gl.getUniformLocation(p, "uScanColor"),
            r * c.intensity,
            g * c.intensity,
            b * c.intensity
        )
        gl.uniform1i(gl.getUniformLocation(p, "uPattern"), patternIndex)
        gl.uniform1f(gl.getUniformLocation(p, "uInvertDepth"), c.invertDepth ? 1 : 0)
        this.draw(this.sceneRT, p)

        // --- bright pass ---
        const bp = this.brightProg
        gl.useProgram(bp)
        this.bindTex(bp, "uScene", this.sceneRT.tex, 0)
        gl.uniform1f(gl.getUniformLocation(bp, "uThreshold"), this.hdr ? 1.0 : 0.75)
        this.draw(this.bloomA, bp)

        // --- separable blur, twice ---
        const blur = this.blurProg
        gl.useProgram(blur)
        for (let i = 0; i < 2; i++) {
            this.bindTex(blur, "uTex", this.bloomA.tex, 0)
            gl.uniform2f(gl.getUniformLocation(blur, "uDirection"), 1.5 / this.bloomA.w, 0)
            this.draw(this.bloomB, blur)

            this.bindTex(blur, "uTex", this.bloomB.tex, 0)
            gl.uniform2f(gl.getUniformLocation(blur, "uDirection"), 0, 1.5 / this.bloomA.h)
            this.draw(this.bloomA, blur)
        }

        // --- composite ---
        const cp = this.compositeProg
        gl.useProgram(cp)
        this.bindTex(cp, "uScene", this.sceneRT.tex, 0)
        this.bindTex(cp, "uBloom", this.bloomA.tex, 1)
        gl.uniform1f(gl.getUniformLocation(cp, "uStrength"), c.glow)
        this.draw(null, cp)
    }

    start() {
        if (this.raf) return
        this.lastTime = 0
        this.raf = requestAnimationFrame(this.renderFrame)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.raf)
        this.container.removeEventListener("pointermove", this.onPointerMove)
        const gl = this.gl
        this.freeTarget(this.sceneRT)
        this.freeTarget(this.bloomA)
        this.freeTarget(this.bloomB)
        ;[this.imageTex, this.depthTex].forEach((t) =>
            gl.deleteTexture(t)
        )
        ;[this.sceneProg, this.brightProg, this.blurProg, this.compositeProg].forEach(
            (p) => gl.deleteProgram(p)
        )
        gl.deleteVertexArray(this.vao)
        gl.getExtension("WEBGL_lose_context")?.loseContext()
        this.canvas.remove()
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SAMPLE =
    "https://raw.githubusercontent.com/d3adrabbit/ScanningEffectWithDepthMap/main/assets"

// One source of truth for every default. Sliders are whole numbers and are
// mapped to their effective values below.
const DEFAULTS = {
    image: "https://images.unsplash.com/photo-1755467155696-ac0e80b28b75?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    depthMap: "https://raw.githubusercontent.com/d3adrabbit/ScanningEffectWithDepthMap/main/assets/depth-1.png",
    pattern: "crosses" as Pattern,
    scanColor: "#FF0000",
    intensity: 20,
    tiling: 120,
    band: 20,
    parallax: 20,
    glow: 10,
    invertDepth: false,
    transition: {
        type: "tween",
        stiffness: 800,
        damping: 60,
        mass: 1,
        duration: 3,
        ease: "easeOut",
    } as Transition,
}

type Pattern = "dots" | "crosses"

interface ScanEffectProps {
    image: string
    depthMap: string
    pattern: Pattern
    scanColor: string
    intensity: number
    tiling: number
    band: number
    parallax: number
    glow: number
    invertDepth: boolean
    transition: Transition
    style?: React.CSSProperties
}

export default function ScanEffect(props: Partial<ScanEffectProps>) {
    const {
        image = DEFAULTS.image,
        depthMap = DEFAULTS.depthMap,
        pattern = DEFAULTS.pattern,
        scanColor = DEFAULTS.scanColor,
        intensity = DEFAULTS.intensity,
        tiling = DEFAULTS.tiling,
        band = DEFAULTS.band,
        parallax = DEFAULTS.parallax,
        glow = DEFAULTS.glow,
        invertDepth = DEFAULTS.invertDepth,
        transition = DEFAULTS.transition,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<ScanScene | null>(null)

    const cfgRef = useRef<Config>(null as unknown as Config)
    cfgRef.current = {
        image: imageUrl(image),
        depthMap: imageUrl(depthMap),
        pattern,
        scanColor,
        intensity,
        tiling,
        band: band / 1000,
        parallax: parallax / 1000,
        glow: glow / 10,
        invertDepth,
        transition,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: ScanScene
        try {
            scene = new ScanScene(container, cfgRef.current)
        } catch {
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
        image,
        depthMap,
        pattern,
        scanColor,
        intensity,
        tiling,
        band,
        parallax,
        glow,
        invertDepth,
        transition,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Photograph with a light sweeping through it in depth"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                ...style,
            }}
        />
    )
}
