"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * FlatText — a sheet of type that swells toward the pointer, as if a hand
 * pushed up from beneath the paper.
 *
 * Mechanism: the letters are drawn once into a 2D canvas and used as the alpha
 * of a subdivided plane. A single world-space point drives a cubic-eased bump
 * in the vertex shader, and the *analytic* derivative of that same bump gives
 * the normal, so the sheet catches light along the slope.
 *
 * Why the obvious alternative fails: shading the swell from a screen-space
 * derivative (fwidth of the height) reads as a hard ring at the bump's edge —
 * the height field is smooth but the sampled gradient is not, and the seam is
 * exactly where the eye is looking. The closed-form slope stays smooth to the
 * bump's own boundary, where it falls to zero on its own.
 *
 * The sketch this replaces shipped two 2048px base64 PNGs, one for the type and
 * one for a pre-blurred shadow. The type is now generated from the Font control.
 */

/**
 * CSS pixels per world unit. World space is pinned to the frame's own pixels
 * at this scale, so a font size of 140 draws letters 140px tall and nothing
 * else in the component gets a say in how large the type reads.
 */
const PX_PER_UNIT = 100

/**
 * Texture pixels drawn per CSS pixel. Above the capped device pixel ratio of
 * 2, so the glyph edges stay crisp instead of being resolved at exactly 1:1
 * and softened by the mipmap blend.
 *
 * This is a resolution knob only. It used to leak into the world size of the
 * plane — and because the camera then framed the plane, shrinking the font
 * raised the supersample, widened nothing, and the type came out the same size
 * but blurrier. Layout is now measured at 1x and scaled separately.
 */
const SUPERSAMPLE = 3

/*
 * Values the panel used to own. Pinned here rather than deleted from the code,
 * so the uniform wiring and the shader stay untouched.
 */
const TILT = 20 // near-overhead view
const QUALITY = 20
const FOLLOW = 1
const SHEEN = 9

const ELEVATION = (TILT * 4 * Math.PI) / 180
const SEGMENTS = Math.round(32 + QUALITY ** 2 * 0.9)
/** Per-second ease rate for the swell chasing the pointer. */
const FOLLOW_RATE = 3 + FOLLOW * 0.7
const SHEEN_AMOUNT = SHEEN / 20

const DEFAULTS = {
    text: "FLAT",
    // Note the shape difference: the panel's own default takes a font
    // `variant`, while the value handed back at render time is a CSS-ish
    // object with fontFamily and fontWeight on it.
    font: {
        defaultValue: {"variant":"Bold","fontSize":"140px","textAlign":"center","fontFamily":"Inter","fontWeight":700,"lineHeight":0.95,"letterSpacing":"-0.04em"},
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 800,
        fontSize: 140,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        textAlign: "center" as const,
    },
    ink: "#00FFFF",
    lift: 20,
    reach: 6,
    drift: 20,
}

type FontValue = {
    fontFamily?: string
    fontWeight?: number | string
    fontStyle?: string
    fontSize?: number | string
    letterSpacing?: number | string
    lineHeight?: number | string
    textAlign?: string
}

type Config = {
    text: string
    font: FontValue
    ink: string
    lift: number
    reach: number
    drift: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * ControlType.Font hands back CSS strings — "17px", "-0.03em" — wherever the
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
        if (v.indexOf("px") >= 0) return n / size
        if (v.indexOf("%") >= 0) return n / 100
        return n > 4 ? n / size : n
    }
    return fallback
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Radius of the swell, in world units. The type is a few units across,
        // so the range runs from a dimple under one letter to a rise that takes
        // the whole word with it.
        reach: clamp(cfg.reach, 1, 20, DEFAULTS.reach) * 0.4,
        // Height of the swell. Read against reach, not against the type — this
        // is a displacement in the sheet, never a scale on it.
        lift: clamp(cfg.lift, 0, 20, DEFAULTS.lift) * 0.22,
        drift: clamp(cfg.drift, 0, 20, DEFAULTS.drift) * 0.06,
    }
}

/* ------------------------------------------------------------------------ */

const SHEET_VERTEX = /* glsl */ `
uniform vec2  uPoint;
uniform float uReach;
uniform float uLift;
uniform float uSheen;

varying vec2  vUv;
varying float vShade;

// The key light lives in world space: the sheet only ever swells, it never
// turns, so a fixed direction keeps the sheen where the light is.
const vec3 KEY = vec3(-0.45, 0.3, 0.84);

float easeInOutCubic(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
}

// Derivative of the above. Zero at both ends, which is what keeps the swell
// from creasing where it meets the flat sheet.
float easeInOutCubicD(float x) {
    return x < 0.5 ? 12.0 * x * x : 3.0 * pow(2.0 - 2.0 * x, 2.0);
}

void main() {
    vUv = uv;

    vec3 p = position;
    vec2 world = (modelMatrix * vec4(position, 1.0)).xy;

    float r = length(world - uPoint);
    float u = 1.0 - clamp(r / max(uReach, 0.0001), 0.0, 1.0);
    p.z += uLift * easeInOutCubic(u);

    // Closed-form slope of the height field: dz/dr = -uLift * ease'(u) / uReach.
    // The normal is (-dz/dr * rHat, 1) before normalising.
    vec2 dir = r > 0.0001 ? (world - uPoint) / r : vec2(0.0);
    float slope = uLift * easeInOutCubicD(u) / max(uReach, 0.0001);
    vec3 n = normalize(vec3(slope * dir, 1.0));

    // Divided by the key's own z so a flat sheet lands on exactly 1.0, and the
    // sheen only ever adds relief instead of a global brightness shift.
    vec3 k = normalize(KEY);
    float lam = dot(n, k) / k.z;
    vShade = clamp(mix(1.0, lam, uSheen), 0.15, 2.2);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const SHEET_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uTex;
uniform vec3      uInk;

varying vec2  vUv;
varying float vShade;

void main() {
    float a = texture2D(uTex, vUv).a;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uInk * vShade, a);
}
`

/* ------------------------------------------------------------------------ */

type TypeTexture = {
    texture: THREE.CanvasTexture
    /** Plane size in world units, derived from the rendered metrics. */
    width: number
    height: number
}

/**
 * Draws the type white into a 2D canvas — white, not the ink colour, so that
 * dragging the colour picker stays a uniform write and never rebuilds a
 * texture or the geometry that is sized from it.
 */
function buildTypeTexture(cfg: Config, maxAniso: number): TypeTexture | null {
    const font = cfg.font || DEFAULTS.font
    const size = Math.max(8, toPx(font.fontSize, DEFAULTS.font.fontSize, 16))
    const weight = font.fontWeight ?? DEFAULTS.font.fontWeight
    const style = font.fontStyle ?? "normal"
    const family = font.fontFamily || DEFAULTS.font.fontFamily
    const ratio = toRatio(font.lineHeight, size, DEFAULTS.font.lineHeight)
    const tracking = toPx(font.letterSpacing, 0, size)
    const align =
        font.textAlign === "left" || font.textAlign === "right"
            ? font.textAlign
            : "center"

    const lines = String(cfg.text ?? "").split("\n")
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // `scale` is raster resolution only. Every layout number below is in CSS
    // pixels at 1x, and the plane's world size is taken from those — never
    // from the scaled canvas, or the supersample would cancel the font size.
    const setFont = (scale: number) => {
        ctx.font = `${style} ${weight} ${size * scale}px ${family}`
        // Chrome and Safari only; elsewhere the metrics simply ignore tracking.
        if ("letterSpacing" in ctx)
            (ctx as any).letterSpacing = `${tracking * scale}px`
        ctx.textAlign = align
        ctx.textBaseline = "alphabetic"
    }

    setFont(1)
    let widest = 1
    for (const line of lines) {
        widest = Math.max(widest, ctx.measureText(line).width)
    }

    // Generous padding: the swell needs plane to sit on past the glyphs, and
    // ascenders or descenders of an unknown font can overshoot the em box.
    const pad = size * 0.7
    const lineStep = size * ratio
    const w = widest + pad * 2
    const h = lineStep * lines.length + pad * 2

    // Back the supersample off rather than clipping, if the full-resolution
    // canvas would blow past what the GPU will take as one texture.
    const ss = Math.max(0.25, Math.min(SUPERSAMPLE, 4096 / w, 4096 / h))

    canvas.width = Math.max(1, Math.ceil(w * ss))
    canvas.height = Math.max(1, Math.ceil(h * ss))
    setFont(ss) // resizing a canvas resets every context property
    ctx.fillStyle = "#ffffff"

    const x = align === "left" ? pad : align === "right" ? w - pad : w / 2
    // First baseline one line down from the top pad, nudged so the block sits
    // optically centred rather than resting on its descenders.
    const y0 = pad + lineStep * 0.78
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i] as string, x * ss, (y0 + i * lineStep) * ss)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = maxAniso
    texture.needsUpdate = true

    return {
        texture,
        width: w / PX_PER_UNIT,
        height: h / PX_PER_UNIT,
    }
}

/* ------------------------------------------------------------------------ */

class FlatTextScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)

    private sheet: THREE.Mesh
    private geometry: THREE.PlaneGeometry
    private sheetMat: THREE.ShaderMaterial
    private type: TypeTexture | null = null

    private raycaster = new THREE.Raycaster()
    private floor = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    private ndc = new THREE.Vector2()
    private hitPoint = new THREE.Vector3()

    private point = new THREE.Vector2()
    private target = new THREE.Vector2()
    private amp = 0
    private hovering = false
    private driftT = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        // Mesh work only, so the full cap is affordable.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        container.appendChild(el)

        const S = settingsFor(cfg)
        this.type = buildTypeTexture(
            cfg,
            this.renderer.capabilities.getMaxAnisotropy()
        )

        this.geometry = new THREE.PlaneGeometry(1, 1, 2, 2)

        this.sheetMat = new THREE.ShaderMaterial({
            uniforms: {
                uPoint: { value: this.point },
                uReach: { value: S.reach },
                uLift: { value: 0 },
                uTex: { value: this.type?.texture ?? null },
                uInk: { value: new THREE.Color(cfg.ink) },
                uSheen: { value: SHEEN_AMOUNT },
            },
            vertexShader: SHEET_VERTEX,
            fragmentShader: SHEET_FRAGMENT,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
        })

        this.sheet = new THREE.Mesh(this.geometry, this.sheetMat)
        this.sheet.frustumCulled = false
        this.scene.add(this.sheet)

        this.rebuildGeometry()
        this.camera.up.set(0, 0, 1)

        el.addEventListener("pointerenter", this.onEnter)
        el.addEventListener("pointerleave", this.onLeave)
        el.addEventListener("pointercancel", this.onLeave)
        el.addEventListener("pointermove", this.onMove)

        // Framer webfonts resolve after the first paint; without this the
        // metrics measured against the fallback would be the ones we keep.
        const fonts = (document as any).fonts
        if (fonts?.ready) {
            fonts.ready.then(() => {
                if (!this.disposed) this.rebuildType()
            })
        }
    }

    private onEnter = () => {
        this.hovering = true
    }

    private onLeave = () => {
        this.hovering = false
    }

    private onMove = (e: PointerEvent) => {
        const r = this.renderer.domElement.getBoundingClientRect()
        if (!r.width || !r.height) return
        this.ndc.set(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1
        )
        this.raycaster.setFromCamera(this.ndc, this.camera)
        // The type lies in the z = 0 plane, so one ray-plane hit gives the
        // world point directly — no mesh to intersect against.
        if (this.raycaster.ray.intersectPlane(this.floor, this.hitPoint)) {
            this.target.set(this.hitPoint.x, this.hitPoint.y)
            this.hovering = true
        }
    }

    private rebuildType() {
        if (this.disposed) return
        const next = buildTypeTexture(
            this.cfg,
            this.renderer.capabilities.getMaxAnisotropy()
        )
        if (!next) return
        this.type?.texture.dispose()
        this.type = next
        this.sheetMat.uniforms.uTex.value = next.texture
        this.rebuildGeometry()
    }

    /**
     * Owns a buffer, so it runs only when the sheet's own proportions actually
     * changed — never on a colour, lift or reach drag.
     */
    private rebuildGeometry() {
        const w = this.type?.width ?? 4
        const h = this.type?.height ?? 1.5
        const p = this.geometry.parameters
        if (p.width === w && p.height === h && p.widthSegments === SEGMENTS) {
            return
        }
        this.geometry.dispose()
        this.geometry = new THREE.PlaneGeometry(w, h, SEGMENTS, SEGMENTS)
        this.sheet.geometry = this.geometry
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = this.width / this.height

        // The frustum is the frame, converted straight into world units — it
        // knows nothing about the type, the lift or the reach. That is the
        // whole point: anything that fit the camera to the sheet would cancel
        // out the font size, leaving the letters one size at every setting.
        const spanH = this.height / PX_PER_UNIT

        this.camera.left = (-spanH * aspect) / 2
        this.camera.right = (spanH * aspect) / 2
        this.camera.top = spanH / 2
        this.camera.bottom = -spanH / 2
        // Orthographic, so the distance only has to clear the near plane.
        this.camera.position.set(
            0,
            -Math.cos(ELEVATION) * 100,
            Math.sin(ELEVATION) * 100
        )
        this.camera.lookAt(0, 0, 0)
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)

        if (
            cfg.text !== prev.text ||
            JSON.stringify(cfg.font) !== JSON.stringify(prev.font)
        ) {
            this.rebuildType()
        }

        this.sheetMat.uniforms.uReach.value = S.reach
        ;(this.sheetMat.uniforms.uInk.value as THREE.Color).set(cfg.ink)
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
        // A tab returning to the foreground must not teleport the swell.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const w = this.type?.width ?? 4
        const h = this.type?.height ?? 1.5

        // With no pointer the swell wanders the sheet on two detuned sines, so
        // the component is alive on the Framer canvas, where nothing hovers.
        this.driftT += dt * S.drift
        if (!this.hovering && S.drift > 0) {
            this.target.set(
                Math.sin(this.driftT) * w * 0.32,
                Math.sin(this.driftT * 1.37) * h * 0.32
            )
        }

        const k = 1 - Math.exp(-dt * FOLLOW_RATE)
        this.point.x += (this.target.x - this.point.x) * k
        this.point.y += (this.target.y - this.point.y) * k

        // Flattens out entirely on leave when there is no drift to fall back
        // to, rather than freezing mid-swell wherever the pointer left.
        const wanted = this.hovering || S.drift > 0 ? 1 : 0
        this.amp += (wanted - this.amp) * (1 - Math.exp(-dt * 5))

        this.sheetMat.uniforms.uLift.value = S.lift * this.amp

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointerenter", this.onEnter)
        el.removeEventListener("pointerleave", this.onLeave)
        el.removeEventListener("pointercancel", this.onLeave)
        el.removeEventListener("pointermove", this.onMove)
        this.geometry.dispose()
        this.sheetMat.dispose()
        this.type?.texture.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

/* ------------------------------------------------------------------------ */

interface FlatTextProps {
    text?: string
    font?: FontValue
    ink?: string
    lift?: number
    reach?: number
    drift?: number
    style?: React.CSSProperties
}

export default function FlatText(props: FlatTextProps) {
    const {
        text = DEFAULTS.text,
        font = {"variant":"Bold","fontSize":"140px","textAlign":"center","fontFamily":"Inter","fontWeight":700,"lineHeight":0.95,"letterSpacing":"-0.04em"} as FontValue,
        ink = DEFAULTS.ink,
        lift = DEFAULTS.lift,
        reach = DEFAULTS.reach,
        drift = DEFAULTS.drift,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<FlatTextScene | null>(null)
    const cfgRef = useRef<Config>(null as any)

    cfgRef.current = { text, font, ink, lift, reach, drift }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: FlatTextScene
        try {
            scene = new FlatTextScene(container, cfgRef.current)
        } catch {
            // No WebGL — leave an empty frame rather than throwing.
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

    // The font object is a new identity on every render, so depend on content.
    const fontKey = JSON.stringify(font)

    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current)
    }, [text, fontKey, ink, lift, reach, drift])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={text}
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

FlatText.displayName = "Flat Text"
