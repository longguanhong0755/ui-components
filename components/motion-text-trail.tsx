"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Text Trail — a word smeared into a slow motion trail, the way a long camera
 * exposure keeps every position a moving light passed through.
 *
 * Port of the MIT-licensed Codrops tutorial "Creating Typography Motion Trail
 * Effects with WebGL" by Georgi Nikoloff (github.com/gnikoloff/text-trail-effect).
 *
 * The mechanism is a framebuffer feedback loop. Two render targets ping-pong:
 * each frame the previous target is sampled back into the current one, its uv
 * displaced by two channels of simplex noise and by the pointer's offset, and
 * its colour and alpha multiplied down by a persistence factor just under one.
 * The word is then drawn on top at full strength. Everything on screen is
 * therefore the word plus every slightly dimmer, slightly dragged copy of
 * itself from the frames before — the trail is never stored as a path or as
 * particles, it is only what has not faded yet.
 *
 * The obvious alternative — N ghost copies of the text at N past pointer
 * positions — fails on both counts: the trail is quantised into visible
 * duplicates instead of a continuous smear, and it cannot curl, because a copy
 * has no way to inherit the warping the copies before it went through.
 *
 * One deliberate change from the original: there, the persistence pass wrote a
 * constant alpha, which is invisible against the demo's own solid #111 page but
 * would paint a Framer frame with a near-opaque black haze. Here alpha decays
 * with the colour, so empty space stays genuinely transparent and the component
 * composites over whatever fill the frame carries.
 */

/**
 * Longest side of the canvas the word is drawn into, capped by the GPU; the
 * other side follows the frame's aspect ratio. The original's 2048 is kept —
 * the mask is redrawn only on a text, font, size or resize change, so the cost
 * is a one-off and the glyph edges stay sharp when the frame is wide.
 */
const IDEAL_TEXTURE_SIZE = 2048

/**
 * How fast the smeared pointer offset chases the real one, per second. The
 * original's dt * 5: fast enough to feel attached, slow enough that a flick
 * across the frame bends the trail instead of teleporting it.
 */
const POINTER_FOLLOW = 5

/**
 * Share of the way each feedback step pulls the surviving colour toward the
 * trail colour. Applied per step, not per second, on purpose: the same step that
 * dims the trail also ages it, so the tint arrives further back along the trail
 * the longer a pixel has been travelling — which is the whole point. A one-shot
 * tint of the whole buffer would just recolour the word.
 *
 * The panel used to own this. It is pinned here instead: below about 0.03 the
 * ink survives so far down the trail that the two colours read as one, and above
 * about 0.12 the word itself picks up a coloured fringe.
 */
const TRAIL_TINT = 0.066

const DEFAULTS = {
    text: "MOTION TEXT",
    color: "#FFFFFF",
    trailColor: "#4FFF00",
    trail: 15,
    drift: 20,
    warp: 6,
    speed: 20,
    push: 6,
}

type FontValue = {
    fontFamily?: string
    fontSize?: number | string
    fontWeight?: number | string
    fontStyle?: string
    letterSpacing?: number | string
    lineHeight?: number | string
}

type Config = {
    text: string
    font: FontValue
    color: string
    trailColor: string
    trail: number
    drift: number
    warp: number
    speed: number
    push: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * ControlType.Font hands back CSS strings — "120px", "-0.03em" — wherever the
 * panel shows a length. Arithmetic on those yields NaN, which propagates into
 * the canvas metrics and blanks the whole component.
 */
function toPx(v: unknown, fallback: number, emBasis: number): number {
    if (typeof v === "number" && isFinite(v)) return v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (!isFinite(n)) return fallback
        if (v.indexOf("em") >= 0) return n * emBasis
        if (v.indexOf("%") >= 0) return (n / 100) * emBasis
        return n
    }
    return fallback
}

/** Line height arrives unitless, in px, or as a percentage. Normalise to a ratio. */
function toRatio(v: unknown, size: number, fallback: number): number {
    if (typeof v === "number" && isFinite(v)) return v > 4 ? v / size : v
    if (typeof v === "string") {
        const n = parseFloat(v)
        if (!isFinite(n)) return fallback
        if (v.indexOf("%") >= 0) return n / 100
        if (v.indexOf("px") >= 0) return n / Math.max(1, size)
        return n > 4 ? n / Math.max(1, size) : n
    }
    return fallback
}

/** Panel values are whole numbers; the feedback loop wants the real ones. */
function settingsFor(cfg: Config) {
    /**
     * How much of the previous frame survives into this one. The useful window
     * is narrow and entirely at the top: 0.87 is a short blur behind the word,
     * 0.99 is a trail that crosses the whole frame before it dies. Colour and
     * alpha decay together — the target holds premultiplied values, and letting
     * the two drift apart turns the far end of the trail into grey fog.
     */
    const persist = 0.86 + clamp(cfg.trail, 1, 20, DEFAULTS.trail) * 0.0065

    const drift = clamp(cfg.drift, 1, 20, DEFAULTS.drift)

    return {
        persist,
        tint: TRAIL_TINT,
        /**
         * Squared: the difference between one swirl and two reads strongly, the
         * difference between forty and forty-two does not.
         */
        noiseFactor: 0.2 + drift * drift * 0.12,
        /** How far a pixel may walk per frame, in uv. */
        noiseScale: clamp(cfg.warp, 1, 20, DEFAULTS.warp) * 0.0006,
        noiseSpeed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.02,
        push: clamp(cfg.push, 0, 20, DEFAULTS.push) * 0.0012,
    }
}

/** Both fullscreen passes and the word sit on the z = 0 plane of an NDC camera. */
const BASE_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

/**
 * Ashima Arts simplex noise (MIT). Inlined because the original pulled it in
 * through a glslify pragma, and a Framer component is a single file with no
 * build step to resolve one.
 */
const SIMPLEX_3D = /* glsl */ `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 xp = floor(j * ns.z);
        vec4 yp = floor(j - 7.0 * xp);

        vec4 x = xp * ns.x + ns.yyyy;
        vec4 y = yp * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
`

/**
 * The feedback pass: read the previous frame at a displaced coordinate, dim it,
 * write it back. Two independent noise samples — the second offset far along the
 * third axis so it is not a copy of the first — give x and y of the
 * displacement, which is what curls the trail rather than shearing it.
 */
const PERSISTENCE_FRAGMENT = /* glsl */ `
    uniform sampler2D uSampler;
    uniform float uTime;
    uniform vec2 uPointer;
    uniform float uNoiseFactor;
    uniform float uNoiseScale;
    uniform float uPersist;
    uniform float uPush;
    uniform vec3 uTrailColor;
    uniform float uTint;

    varying vec2 vUv;

    ${SIMPLEX_3D}

    void main() {
        float a = snoise(vec3(vUv * uNoiseFactor, uTime)) * uNoiseScale;
        float b = snoise(vec3(vUv * uNoiseFactor, uTime + 100.0)) * uNoiseScale;
        vec4 t0 = texture2D(uSampler, vUv + vec2(a, b) + uPointer * uPush);

        // The buffer is premultiplied, so the target has to be premultiplied
        // too — mixing toward the raw trail colour would brighten the faint tail
        // back up to full strength and the trail would never end.
        vec3 aged = mix(t0.rgb, uTrailColor * t0.a, uTint);

        gl_FragColor = vec4(aged, t0.a) * uPersist;
    }
`

/**
 * The word. A hard alpha cut rather than a blend: the mask is drawn several
 * times larger than it lands on screen, so the cut edge is already sub-pixel,
 * and blending instead would feed half-lit fringe pixels into the loop, where
 * the persistence factor smears them into a permanent grey halo.
 */
const TEXT_FRAGMENT = /* glsl */ `
    uniform sampler2D uSampler;
    uniform vec3 uColor;

    varying vec2 vUv;

    void main() {
        vec4 texColor = texture2D(uSampler, vUv);
        if (texColor.a < 0.9) discard;
        gl_FragColor = vec4(uColor, 1.0);
    }
`

/** Straight blit of the accumulated target to the screen. */
const DISPLAY_FRAGMENT = /* glsl */ `
    uniform sampler2D uSampler;
    varying vec2 vUv;
    void main() {
        gl_FragColor = texture2D(uSampler, vUv);
    }
`

class TextTrailScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)

    private fadeScene = new THREE.Scene()
    private textScene = new THREE.Scene()
    private outScene = new THREE.Scene()

    private fadeMaterial: THREE.ShaderMaterial
    private textMaterial: THREE.ShaderMaterial
    private outMaterial: THREE.ShaderMaterial
    private quadGeometry = new THREE.PlaneGeometry(2, 2)
    private labelMesh: THREE.Mesh

    private targetA: THREE.WebGLRenderTarget
    private targetB: THREE.WebGLRenderTarget

    private maskCanvas = document.createElement("canvas")
    private maskTexture: THREE.CanvasTexture | null = null

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private time = 0
    private disposed = false

    /** Smeared and raw pointer, both in -1..1 with y up, as the original had them. */
    private pointer = new THREE.Vector2(0, 0)
    private targetPointer = new THREE.Vector2(0, 0)

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        // Two fullscreen passes plus a blit every frame; a 2x target buys
        // nothing here, because by the time the trail is visible it is a blur.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        const canvas = this.renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        container.appendChild(canvas)

        this.camera.position.set(0, 0, 1)
        this.camera.lookAt(0, 0, 0)

        const targetOptions = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false,
        }
        this.targetA = new THREE.WebGLRenderTarget(1, 1, targetOptions)
        this.targetB = new THREE.WebGLRenderTarget(1, 1, targetOptions)

        const S = settingsFor(cfg)

        this.fadeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uSampler: { value: null },
                uTime: { value: 0 },
                uPointer: { value: new THREE.Vector2(0, 0) },
                uNoiseFactor: { value: S.noiseFactor },
                uNoiseScale: { value: S.noiseScale },
                uPersist: { value: S.persist },
                uPush: { value: S.push },
                uTrailColor: {
                    value: new THREE.Color(
                        cfg.trailColor || DEFAULTS.trailColor
                    ),
                },
                uTint: { value: S.tint },
            },
            vertexShader: BASE_VERTEX,
            fragmentShader: PERSISTENCE_FRAGMENT,
            // A straight overwrite of a cleared target. Blending here would
            // multiply the colour down a second time and the trail would die
            // roughly twice as fast as the panel says it should.
            blending: THREE.NoBlending,
            depthTest: false,
            depthWrite: false,
        })
        const fadeQuad = new THREE.Mesh(this.quadGeometry, this.fadeMaterial)
        fadeQuad.frustumCulled = false
        this.fadeScene.add(fadeQuad)

        this.textMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uSampler: { value: null },
                uColor: { value: new THREE.Vector3(1, 1, 1) },
            },
            vertexShader: BASE_VERTEX,
            fragmentShader: TEXT_FRAGMENT,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })
        this.labelMesh = new THREE.Mesh(this.quadGeometry, this.textMaterial)
        this.labelMesh.frustumCulled = false
        this.textScene.add(this.labelMesh)

        this.outMaterial = new THREE.ShaderMaterial({
            uniforms: { uSampler: { value: null } },
            vertexShader: BASE_VERTEX,
            fragmentShader: DISPLAY_FRAGMENT,
            transparent: true,
            // The target holds premultiplied colour — the word is written at
            // alpha 1 and both channels then decay together — so it composites
            // over the frame's own fill with a source factor of one.
            blending: THREE.CustomBlending,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            depthTest: false,
            depthWrite: false,
        })
        const outQuad = new THREE.Mesh(this.quadGeometry, this.outMaterial)
        outQuad.frustumCulled = false
        this.outScene.add(outQuad)

        this.setInkColor(cfg)

        container.addEventListener("pointermove", this.onPointerMove)
        container.addEventListener("pointerleave", this.onPointerLeave)

        // The Font control loads its family into the document asynchronously, so
        // a mask drawn on the first frame can be a fallback face. Redraw once
        // the document says the fonts are in.
        const fonts = typeof document !== "undefined" ? (document as any).fonts : null
        if (fonts?.ready) {
            fonts.ready.then(() => {
                if (!this.disposed) this.drawText()
            })
        }
    }

    /**
     * The panel hands the ink over as a CSS string; three converts it into the
     * renderer's working space. Doing that once per config change rather than
     * per frame is the whole reason this is not in step().
     */
    private setInkColor(cfg: Config) {
        const ink = new THREE.Color(cfg.color || DEFAULTS.color)
        this.textMaterial.uniforms.uColor.value.set(ink.r, ink.g, ink.b)
    }

    private onPointerMove = (e: PointerEvent) => {
        const rect = this.container.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        this.targetPointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (1 - (e.clientY - rect.top) / rect.height) * 2 - 1
        )
    }

    // The original left the offset wherever the pointer last was, which on a
    // page nobody is touching holds the trail permanently skewed to one side.
    private onPointerLeave = () => {
        this.targetPointer.set(0, 0)
    }

    /**
     * Redraw the glyph mask. The mask is cut to the frame's own aspect ratio and
     * stretched over the whole plane, so one mask pixel is a fixed number of
     * screen pixels on both axes: a font size of 120 is drawn at 120 * texH /
     * height and lands on screen at 120 — which is why this runs on resize as
     * well as on a text or font change. Nothing is fitted to the frame: the
     * shrink-to-fit pass this replaced drew at limit / measured width, which
     * cancels the requested size straight out, so every size wide enough to
     * trip it framed identically.
     */
    private drawText() {
        if (this.disposed) return
        const ctx = this.maskCanvas.getContext("2d")
        if (!ctx) return

        // Longest side gets the full texture budget; the short one follows the
        // frame's aspect so the mask is never stretched non-uniformly on screen.
        const maxSide = Math.min(
            this.renderer.capabilities.maxTextureSize,
            IDEAL_TEXTURE_SIZE
        )
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const texW = Math.max(
            1,
            aspect >= 1 ? maxSide : Math.round(maxSide * aspect)
        )
        const texH = Math.max(
            1,
            aspect >= 1 ? Math.round(maxSide / aspect) : maxSide
        )
        this.maskCanvas.width = texW
        this.maskCanvas.height = texH

        const font = this.cfg.font || {}
        const basePx = toPx(font.fontSize, 120, 120)
        const scale = texH / Math.max(1, this.height)

        const family = font.fontFamily ? `"${font.fontFamily}"` : "sans-serif"
        const weight = font.fontWeight ?? 400
        const style = font.fontStyle || "normal"
        const lineRatio = toRatio(font.lineHeight, basePx, 1.1)

        const lines = String(this.cfg.text ?? "").split("\n")
        const fontPx = basePx * scale

        const applyFont = () => {
            ctx.font = `${style} ${weight} ${fontPx}px ${family}, sans-serif`
            try {
                const tracking = toPx(font.letterSpacing, 0, basePx) * scale
                ;(ctx as any).letterSpacing = `${tracking}px`
            } catch {
                // Chrome-only property; unspaced type is a fine fallback.
            }
        }

        ctx.clearRect(0, 0, texW, texH)
        ctx.fillStyle = "#fff"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        applyFont()

        // Nothing shrinks the word to fit: the size control is the size, and a
        // word set wider than the frame runs off the edges like any text layer.
        const step = fontPx * lineRatio
        const top = texH / 2 - ((lines.length - 1) * step) / 2
        lines.forEach((line, i) => {
            ctx.fillText(line, texW / 2, top + i * step)
        })

        this.maskTexture?.dispose()
        this.maskTexture = new THREE.CanvasTexture(this.maskCanvas)
        this.maskTexture.colorSpace = THREE.SRGBColorSpace
        this.textMaterial.uniforms.uSampler.value = this.maskTexture
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        const w = Math.max(1, Math.floor(width))
        const h = Math.max(1, Math.floor(height))
        this.width = w
        this.height = h

        this.renderer.setSize(w, h, false)
        const dpr = this.renderer.getPixelRatio()
        this.targetA.setSize(Math.floor(w * dpr), Math.floor(h * dpr))
        this.targetB.setSize(Math.floor(w * dpr), Math.floor(h * dpr))

        // The mask is cut to this aspect ratio, so the plane covers the frame
        // whole; squaring it here would rescale the type behind the size control.
        this.drawText()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)

        const u = this.fadeMaterial.uniforms
        u.uNoiseFactor.value = S.noiseFactor
        u.uNoiseScale.value = S.noiseScale
        u.uPersist.value = S.persist
        u.uPush.value = S.push
        u.uTint.value = S.tint
        u.uTrailColor.value.set(cfg.trailColor || DEFAULTS.trailColor)
        this.setInkColor(cfg)

        // Only the mask costs anything to remake; a colour or trail change must
        // not touch it.
        if (
            cfg.text !== prev.text ||
            cfg.font?.fontFamily !== prev.font?.fontFamily ||
            cfg.font?.fontSize !== prev.font?.fontSize ||
            cfg.font?.fontWeight !== prev.font?.fontWeight ||
            cfg.font?.fontStyle !== prev.font?.fontStyle ||
            cfg.font?.letterSpacing !== prev.font?.letterSpacing ||
            cfg.font?.lineHeight !== prev.font?.lineHeight
        ) {
            this.drawText()
        }
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

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.noiseSpeed

        this.pointer.lerp(this.targetPointer, 1 - Math.exp(-dt * POINTER_FOLLOW))

        const u = this.fadeMaterial.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.pointer)
        u.uSampler.value = this.targetB.texture

        this.renderer.autoClear = false

        this.renderer.setRenderTarget(this.targetA)
        this.renderer.clear()
        this.renderer.render(this.fadeScene, this.camera)
        this.renderer.render(this.textScene, this.camera)

        this.renderer.setRenderTarget(null)
        this.renderer.clear()
        this.outMaterial.uniforms.uSampler.value = this.targetA.texture
        this.renderer.render(this.outScene, this.camera)

        const swap = this.targetA
        this.targetA = this.targetB
        this.targetB = swap
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.container.removeEventListener("pointermove", this.onPointerMove)
        this.container.removeEventListener("pointerleave", this.onPointerLeave)
        this.quadGeometry.dispose()
        this.fadeMaterial.dispose()
        this.textMaterial.dispose()
        this.outMaterial.dispose()
        this.maskTexture?.dispose()
        this.targetA.dispose()
        this.targetB.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        if (canvas.parentNode === this.container) this.container.removeChild(canvas)
    }
}

export interface TextTrailProps {
    text?: string
    font?: FontValue
    color?: string
    trailColor?: string
    trail?: number
    drift?: number
    warp?: number
    speed?: number
    push?: number
    style?: React.CSSProperties
}

function __BaseImpl_TextTrail(props: TextTrailProps) {
    const {
        text = DEFAULTS.text,
        font,
        color = DEFAULTS.color,
        trailColor = DEFAULTS.trailColor,
        trail = DEFAULTS.trail,
        drift = DEFAULTS.drift,
        warp = DEFAULTS.warp,
        speed = DEFAULTS.speed,
        push = DEFAULTS.push,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<TextTrailScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        text,
        font: font || {},
        color,
        trailColor,
        trail,
        drift,
        warp,
        speed,
        push,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: TextTrailScene
        try {
            scene = new TextTrailScene(container, cfgRef.current)
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
        text,
        font?.fontFamily,
        font?.fontSize,
        font?.fontWeight,
        font?.fontStyle,
        font?.letterSpacing,
        font?.lineHeight,
        color,
        trailColor,
        trail,
        drift,
        warp,
        speed,
        push,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={`The word ${text} drawn as a motion trail`}
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

TextTrail.displayName = "Text Trail"
TextTrail.defaultProps = {
    ...DEFAULTS,
    font: {
        variant: "Regular",
        fontSize: "117px",
        textAlign: "left",
        fontFamily: "Verdana",
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: "0em",
    },
}

const __presetProps = {
  "text": "MOTION TEXT",
  "color": "#FFFFFF",
  "trailColor": "#4FFF00",
  "trail": 15,
  "drift": 20,
  "warp": 6,
  "speed": 20,
  "push": 6
};

export default function TextTrail(props: Record<string, unknown>) {
  return <__BaseImpl_TextTrail {...(__presetProps as Record<string, unknown>)} {...props} />;
}
