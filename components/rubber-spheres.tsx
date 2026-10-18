// Rubber Spheres

"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { addPropertyControls, ControlType } from "framer"

const CAM_Z = 30
const CAM_FOV = 45
const EXPOSURE = 1.15
const LOGO_DEPTH = 0.15
const SIZE_RANDOM = 0.25
const DAMPING = 0.92
const ATTRACTION = 0.005
const MOUSE_RADIUS = 8
const MOUSE_SCALE = 0.005
const MAX_SPEED = 4
const RELAX_ITERS = 3
const PRESETTLE_STEPS = 150
const FIXED_DT = 1 / 60
const MAX_STEPS_PER_FRAME = 6
const SPHERE_SEGMENTS = 48
const SHADOW_MAP = 2048

const AWAY = -9999

export type LightingPreset =
    | "Soft Studio"
    | "Bright Professional"
    | "Neutral Flat"
    | "Cinematic Drama"
    | "Neon Cyberpunk"
    | "Sunset Warmth"

export type GravityAnchor = "Center" | "Bottom" | "Top"

type FieldGroup = {
    spreadX?: number
    spreadY?: number
}

type MaterialGroup = {
    roughness?: number
    gloss?: number
    transparency?: number
}

type MotionGroup = {
    gravityAnchor?: GravityAnchor
    bounciness?: number
    mouseForce?: number
    parallax?: number
}

type LogoGroup = {
    svgLogos?: string[]
    useOriginalSvgColors?: boolean
}

export type ImageFit = "Cover" | "Contain"

type ImageItem = {
    image?: string | { src?: string }
    fit?: ImageFit
    offsetX?: number
    offsetY?: number
}

export interface RubberSpheresProps {
    style?: React.CSSProperties
    background?: string
    baseColor?: string
    accentColor?: string
    colorMode?: "Single" | "Multi"
    balloonColor?: string
    balloonColors?: string[]
    density?: number
    dotSize?: number
    lighting?: LightingPreset
    field?: FieldGroup
    material?: MaterialGroup
    motion?: MotionGroup
    sourceMode?: "Images" | "Colors"
    logo?: LogoGroup
    images?: ImageItem[]
}

const DEFAULT_FIELD: Required<FieldGroup> = { spreadX: 150, spreadY: 100 }
const DEFAULT_MATERIAL: Required<MaterialGroup> = {
    roughness: 100,
    gloss: 100,
    transparency: 0,
}
const DEFAULT_MOTION: Required<MotionGroup> = {
    gravityAnchor: "Center",
    bounciness: 100,
    mouseForce: 100,
    parallax: 200,
}
const DEFAULT_LOGO: Required<LogoGroup> = {
    svgLogos: [],
    useOriginalSvgColors: false,
}

const DEFAULT_IMAGES: ImageItem[] = [
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/idAnDTFapY/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/idW5s392j1/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/id6O2oGzv-/w/200/h/200/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/idf5VaJxyT/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/apple.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/google.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/microsoft.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/amazon.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/meta.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/nvidia.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/samsung.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/netflix.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/spotify.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
    { fit: "Cover", image: { src: "https://cdn.brandfetch.io/tesla.com/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" }, offsetX: 0, offsetY: 0 },
]

interface Body {
    root: THREE.Object3D
    meshes: THREE.Mesh[]

    srcColors: (THREE.Color | null)[]
    pos: THREE.Vector3
    vel: THREE.Vector3
    quat: THREE.Quaternion
    axis: THREE.Vector3
    spin: number

    jitter: number
    radius: number

    colorRoll: number

    baseSpin: number
}

interface Template {
    root: THREE.Object3D
    geometries: THREE.BufferGeometry[]
}

interface Decal {
    texture: THREE.Texture

    aspect: number
    fit: ImageFit
    offsetX: number
    offsetY: number
}

interface DecalUniforms {
    uDecalMap: { value: THREE.Texture | null }
    uDecalHalf: { value: THREE.Vector2 }
    uDecalOffset: { value: THREE.Vector2 }
}

function decalHalfExtents(aspect: number, fit: ImageFit): [number, number] {
    if (fit === "Contain") {
        const d = Math.sqrt(1 + aspect * aspect) || 1
        return [aspect / d, 1 / d]
    }
    return aspect >= 1 ? [aspect, 1] : [1, 1 / aspect]
}

function imageSrc(v: ImageItem["image"]): string {
    if (!v) return ""
    return typeof v === "string" ? v : (v.src ?? "")
}

const DECAL_VERT_DECL = "varying vec3 vDecalPos;"
const DECAL_FRAG_DECL = `uniform sampler2D uDecalMap;
uniform vec2 uDecalHalf;
uniform vec2 uDecalOffset;
varying vec3 vDecalPos;`
const DECAL_FRAG_BODY = `#include <map_fragment>
{
    vec3 dn = normalize(vDecalPos);
    // The projection smears as the surface turns tangent to the camera, so the
    // decal fades out before the silhouette instead of ending in a hard ring.
    float face = smoothstep(0.0, 0.35, dn.z);
    vec2 dUv = (vDecalPos.xy - uDecalOffset) / uDecalHalf;
    float inside = step(abs(dUv.x), 1.0) * step(abs(dUv.y), 1.0);
    vec4 slide = texture2D(uDecalMap, dUv * 0.5 + 0.5);
    diffuseColor.rgb = mix(diffuseColor.rgb, slide.rgb, face * inside * slide.a);
}`

function attachDecal(mat: THREE.MeshPhysicalMaterial, uniforms: DecalUniforms) {
    mat.userData.decal = uniforms
    mat.onBeforeCompile = (shader: any) => {
        const u = mat.userData.decal as DecalUniforms
        shader.uniforms.uDecalMap = u.uDecalMap
        shader.uniforms.uDecalHalf = u.uDecalHalf
        shader.uniforms.uDecalOffset = u.uDecalOffset
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\n" + DECAL_VERT_DECL)
            .replace(
                "#include <begin_vertex>",
                "#include <begin_vertex>\nvDecalPos = position;"
            )
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\n" + DECAL_FRAG_DECL)
            .replace("#include <map_fragment>", DECAL_FRAG_BODY)
    }

    ;(mat as any).customProgramCacheKey = () => "rubber-decal"
    mat.needsUpdate = true
}

function detachDecal(mat: THREE.MeshPhysicalMaterial) {
    if (!mat.userData.decal) return
    mat.userData.decal = null
    mat.onBeforeCompile = () => {}
    ;(mat as any).customProgramCacheKey = () => "rubber-plain"
    mat.needsUpdate = true
}

interface Live {
    baseColor: string
    accentColor: string
    colorMode: "Single" | "Multi"
    balloonColor: string
    balloonColors: string[]
    dotSize: number
    spreadX: number
    spreadY: number
    roughness: number
    gloss: number
    transparency: number
    gravityAnchor: GravityAnchor
    bounciness: number
    mouseForce: number
    parallax: number
    lighting: LightingPreset
    useOriginalSvgColors: boolean
}

interface GL {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    hemi: THREE.HemisphereLight
    key: THREE.DirectionalLight
    fill: THREE.DirectionalLight
    rim: THREE.DirectionalLight
}

function disposeTemplates(list: Template[]) {
    for (const t of list) for (const g of t.geometries) g.dispose()
}

function disposeBodies(scene: THREE.Scene, bodies: Body[]) {
    for (const b of bodies) {
        scene.remove(b.root)
        for (const m of b.meshes) {
            const mat = m.material as THREE.Material | THREE.Material[]
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
            else mat.dispose()
        }
    }
}

type Mat2D = readonly [number, number, number, number, number, number]
const IDENTITY: Mat2D = [1, 0, 0, 1, 0, 0]

function matMul(m: Mat2D, n: Mat2D): Mat2D {
    return [
        m[0] * n[0] + m[2] * n[1],
        m[1] * n[0] + m[3] * n[1],
        m[0] * n[2] + m[2] * n[3],
        m[1] * n[2] + m[3] * n[3],
        m[0] * n[4] + m[2] * n[5] + m[4],
        m[1] * n[4] + m[3] * n[5] + m[5],
    ]
}

function parseTransform(attr: string | null): Mat2D {
    if (!attr) return IDENTITY
    let m = IDENTITY
    const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g
    let hit: RegExpExecArray | null
    while ((hit = re.exec(attr))) {
        const a = (hit[2].match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []).map(Number)
        const rad = (d: number) => (d * Math.PI) / 180
        let t: Mat2D = IDENTITY
        switch (hit[1]) {
            case "matrix":
                if (a.length >= 6) t = [a[0], a[1], a[2], a[3], a[4], a[5]]
                break
            case "translate":
                t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]
                break
            case "scale":
                t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]
                break
            case "rotate": {
                const c = Math.cos(rad(a[0] ?? 0)), s = Math.sin(rad(a[0] ?? 0))
                const rot: Mat2D = [c, s, -s, c, 0, 0]
                t = a.length >= 3
                    ? matMul(matMul([1, 0, 0, 1, a[1], a[2]], rot), [1, 0, 0, 1, -a[1], -a[2]])
                    : rot
                break
            }
            case "skewX":
                t = [1, 0, Math.tan(rad(a[0] ?? 0)), 1, 0, 0]
                break
            case "skewY":
                t = [1, Math.tan(rad(a[0] ?? 0)), 0, 1, 0, 0]
                break
        }
        m = matMul(m, t)
    }
    return m
}

type Contour = number[]
interface SvgSubPath {
    contours: Contour[]

    fill: string | null
    evenOdd: boolean
}

class ContourSink {
    readonly contours: Contour[] = []
    private cur: Contour = []
    constructor(private readonly m: Mat2D) {}
    add(x: number, y: number) {
        const tx = this.m[0] * x + this.m[2] * y + this.m[4]
        const ty = this.m[1] * x + this.m[3] * y + this.m[5]
        const n = this.cur.length

        if (n >= 2 && Math.abs(this.cur[n - 2] - tx) < 1e-9 && Math.abs(this.cur[n - 1] - ty) < 1e-9) return
        this.cur.push(tx, ty)
    }
    break() {
        if (this.cur.length >= 6) this.contours.push(this.cur)
        this.cur = []
    }
}

function sampleCubic(s: ContourSink, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
    const N = 24
    for (let i = 1; i <= N; i++) {
        const t = i / N, u = 1 - t
        s.add(
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
        )
    }
}

function sampleQuad(s: ContourSink, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
    const N = 16
    for (let i = 1; i <= N; i++) {
        const t = i / N, u = 1 - t
        s.add(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2)
    }
}

function sampleArc(s: ContourSink, x1: number, y1: number, rxIn: number, ryIn: number, phiDeg: number, fa: number, fs: number, x2: number, y2: number) {
    let rx = Math.abs(rxIn), ry = Math.abs(ryIn)
    if (rx < 1e-12 || ry < 1e-12) { s.add(x2, y2); return }
    const phi = (phiDeg * Math.PI) / 180
    const cp = Math.cos(phi), sp = Math.sin(phi)
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
    const x1p = cp * dx + sp * dy
    const y1p = -sp * dx + cp * dy
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if (lam > 1) { const k = Math.sqrt(lam); rx *= k; ry *= k }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    const co = (fa !== fs ? 1 : -1) * Math.sqrt(Math.max(0, num / (den || 1e-12)))
    const cxp = (co * rx * y1p) / ry
    const cyp = (-co * ry * x1p) / rx
    const cx = cp * cxp - sp * cyp + (x1 + x2) / 2
    const cy = sp * cxp + cp * cyp + (y1 + y2) / 2
    const ang = (ux: number, uy: number, vx: number, vy: number) => {
        const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1e-12
        let a = Math.acos(Math.min(1, Math.max(-1, (ux * vx + uy * vy) / len)))
        if (ux * vy - uy * vx < 0) a = -a
        return a
    }
    const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry
    const vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry
    const theta = ang(1, 0, ux, uy)
    let sweep = ang(ux, uy, vx, vy)
    if (!fs && sweep > 0) sweep -= 2 * Math.PI
    if (fs && sweep < 0) sweep += 2 * Math.PI
    const N = Math.max(4, Math.ceil(Math.abs(sweep) / (Math.PI / 24)))
    for (let i = 1; i <= N; i++) {
        const t = theta + (sweep * i) / N
        const ct = Math.cos(t), st = Math.sin(t)
        s.add(cx + rx * ct * cp - ry * st * sp, cy + rx * ct * sp + ry * st * cp)
    }
}

class PathScanner {
    private i = 0
    constructor(private readonly d: string) {}
    private skip() { while (this.i < this.d.length && (this.d[this.i] === " " || this.d[this.i] === "," || this.d[this.i] === "\n" || this.d[this.i] === "\r" || this.d[this.i] === "\t")) this.i++ }
    done() { this.skip(); return this.i >= this.d.length }
    command(): string | null {
        this.skip()
        const c = this.d[this.i]
        if (c && /[a-zA-Z]/.test(c)) { this.i++; return c }
        return null
    }
    num(): number {
        this.skip()
        const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(this.d.slice(this.i))
        if (!m) { this.i = this.d.length; return NaN }
        this.i += m[0].length
        return parseFloat(m[0])
    }
    flag(): number {
        this.skip()
        const c = this.d[this.i]
        if (c === "0" || c === "1") { this.i++; return c === "1" ? 1 : 0 }
        return this.num() ? 1 : 0
    }
}

function pathToContours(d: string, m: Mat2D): Contour[] {
    const s = new ContourSink(m)
    const sc = new PathScanner(d)
    let cx = 0, cy = 0, startX = 0, startY = 0
    let lastCubicX = 0, lastCubicY = 0, lastQuadX = 0, lastQuadY = 0
    let cmd = ""
    while (!sc.done()) {
        const next = sc.command()
        if (next) cmd = next
        else if (!cmd) break

        else if (cmd === "M") cmd = "L"
        else if (cmd === "m") cmd = "l"
        const rel = cmd === cmd.toLowerCase()
        const ox = rel ? cx : 0, oy = rel ? cy : 0
        switch (cmd.toUpperCase()) {
            case "M": {
                const x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                s.break(); s.add(x, y)
                cx = startX = x; cy = startY = y
                break
            }
            case "L": {
                const x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                s.add(x, y); cx = x; cy = y
                break
            }
            case "H": { const x = sc.num() + ox; if (isNaN(x)) return s.break(), s.contours; s.add(x, cy); cx = x; break }
            case "V": { const y = sc.num() + oy; if (isNaN(y)) return s.break(), s.contours; s.add(cx, y); cy = y; break }
            case "C": {
                const x1 = sc.num() + ox, y1 = sc.num() + oy, x2 = sc.num() + ox, y2 = sc.num() + oy, x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                sampleCubic(s, cx, cy, x1, y1, x2, y2, x, y)
                lastCubicX = x2; lastCubicY = y2; cx = x; cy = y
                break
            }
            case "S": {
                const x2 = sc.num() + ox, y2 = sc.num() + oy, x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                const x1 = 2 * cx - lastCubicX, y1 = 2 * cy - lastCubicY
                sampleCubic(s, cx, cy, x1, y1, x2, y2, x, y)
                lastCubicX = x2; lastCubicY = y2; cx = x; cy = y
                break
            }
            case "Q": {
                const x1 = sc.num() + ox, y1 = sc.num() + oy, x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                sampleQuad(s, cx, cy, x1, y1, x, y)
                lastQuadX = x1; lastQuadY = y1; cx = x; cy = y
                break
            }
            case "T": {
                const x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                const x1 = 2 * cx - lastQuadX, y1 = 2 * cy - lastQuadY
                sampleQuad(s, cx, cy, x1, y1, x, y)
                lastQuadX = x1; lastQuadY = y1; cx = x; cy = y
                break
            }
            case "A": {
                const rx = sc.num(), ry = sc.num(), rot = sc.num()
                const fa = sc.flag(), fs = sc.flag()
                const x = sc.num() + ox, y = sc.num() + oy
                if (isNaN(x) || isNaN(y)) return s.break(), s.contours
                sampleArc(s, cx, cy, rx, ry, rot, fa, fs, x, y)
                cx = x; cy = y
                break
            }
            case "Z":
                s.break()
                cx = startX; cy = startY
                break
            default:
                return s.break(), s.contours
        }
        if (cmd.toUpperCase() !== "C" && cmd.toUpperCase() !== "S") { lastCubicX = cx; lastCubicY = cy }
        if (cmd.toUpperCase() !== "Q" && cmd.toUpperCase() !== "T") { lastQuadX = cx; lastQuadY = cy }
    }
    s.break()
    return s.contours
}

function ellipseContour(m: Mat2D, cx: number, cy: number, rx: number, ry: number): Contour[] {
    if (rx <= 0 || ry <= 0) return []
    const s = new ContourSink(m)
    const N = 96
    for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2
        s.add(cx + rx * Math.cos(t), cy + ry * Math.sin(t))
    }
    s.break()
    return s.contours
}

function styleValue(el: Element, prop: string): string | null {
    const inline = el.getAttribute("style")
    if (inline) {
        const hit = new RegExp("(?:^|;)\\s*" + prop + "\\s*:\\s*([^;]+)").exec(inline)
        if (hit) return hit[1].trim()
    }
    return el.getAttribute(prop)
}

function parseSvgShapes(text: string): SvgSubPath[] {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml")
    if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("invalid SVG")
    const out: SvgSubPath[] = []
    const num = (el: Element, name: string, dflt = 0) => {
        const v = parseFloat(el.getAttribute(name) ?? "")
        return isNaN(v) ? dflt : v
    }

    const walk = (el: Element, parentM: Mat2D, fillIn: string | null, ruleIn: string | null) => {
        if (styleValue(el, "display") === "none") return
        const m = matMul(parentM, parseTransform(el.getAttribute("transform")))
        const fill = styleValue(el, "fill") ?? fillIn
        const rule = styleValue(el, "fill-rule") ?? ruleIn
        const tag = el.tagName.toLowerCase().replace(/^.*:/, "")

        let contours: Contour[] = []
        switch (tag) {
            case "path":
                contours = pathToContours(el.getAttribute("d") ?? "", m)
                break
            case "rect": {
                const x = num(el, "x"), y = num(el, "y")
                const w = num(el, "width"), h = num(el, "height")
                if (w > 0 && h > 0) {
                    const s = new ContourSink(m)
                    s.add(x, y); s.add(x + w, y); s.add(x + w, y + h); s.add(x, y + h)
                    s.break()
                    contours = s.contours
                }
                break
            }
            case "circle":
                contours = ellipseContour(m, num(el, "cx"), num(el, "cy"), num(el, "r"), num(el, "r"))
                break
            case "ellipse":
                contours = ellipseContour(m, num(el, "cx"), num(el, "cy"), num(el, "rx"), num(el, "ry"))
                break
            case "polygon":
            case "polyline": {
                const nums = (el.getAttribute("points") ?? "").match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)
                if (nums && nums.length >= 6) {
                    const s = new ContourSink(m)
                    for (let i = 0; i + 1 < nums.length; i += 2) s.add(parseFloat(nums[i]), parseFloat(nums[i + 1]))
                    s.break()
                    contours = s.contours
                }
                break
            }
            default:
                for (let i = 0; i < el.children.length; i++) walk(el.children[i], m, fill, rule)
                return
        }
        if (contours.length > 0) {
            out.push({
                contours,
                fill: fill && fill !== "none" && fill !== "currentColor" ? fill : null,
                evenOdd: rule === "evenodd",
            })
        }
    }

    const root = doc.documentElement
    if (root) walk(root, IDENTITY, null, null)
    return out
}

function signedArea(c: Contour): number {
    let a = 0
    for (let i = 0, n = c.length; i < n; i += 2) {
        const j = (i + 2) % n
        a += c[i] * c[j + 1] - c[j] * c[i + 1]
    }
    return a / 2
}

function contains(ring: Contour, px: number, py: number): boolean {
    let inside = false
    for (let i = 0, n = ring.length, j = n - 2; i < n; j = i, i += 2) {
        const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1]
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

function toVec2(c: Contour): THREE.Vector2[] {
    const out: THREE.Vector2[] = []
    for (let i = 0; i < c.length; i += 2) out.push(new THREE.Vector2(c[i], c[i + 1]))
    return out
}

function contoursToShapes(sub: SvgSubPath): THREE.Shape[] {
    const rings = sub.contours.filter((c) => Math.abs(signedArea(c)) > 1e-9)
    if (rings.length === 0) return []
    const areas = rings.map(signedArea)
    const depth = rings.map((c, i) =>
        rings.reduce((d, o, j) => (j !== i && contains(o, c[0], c[1]) ? d + 1 : d), 0)
    )

    const shapes: THREE.Shape[] = []
    const shapeOf = new Map<number, number>()
    for (let i = 0; i < rings.length; i++) {
        if (depth[i] % 2 !== 0) continue
        shapeOf.set(i, shapes.length)
        shapes.push(new THREE.Shape(toVec2(rings[i])))
    }
    for (let i = 0; i < rings.length; i++) {
        if (depth[i] % 2 === 0) continue
        let parent = -1
        for (let j = 0; j < rings.length; j++) {
            if (j === i || !contains(rings[j], rings[i][0], rings[i][1])) continue
            if (parent === -1 || depth[j] > depth[parent]) parent = j
        }
        if (parent === -1) continue
        if (!sub.evenOdd && Math.sign(areas[i]) === Math.sign(areas[parent])) {
            shapes.push(new THREE.Shape(toVec2(rings[i])))
            continue
        }
        const si = shapeOf.get(parent)
        if (si !== undefined) shapes[si].holes.push(new THREE.Path(toVec2(rings[i])))
    }
    return shapes
}

async function loadSVGTemplate(url: string): Promise<Template | null> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`SVG ${res.status} for ${url}`)
    const built = parseSvgShapes(await res.text())
        .map((sub) => ({ fill: sub.fill, shapes: contoursToShapes(sub) }))
        .filter((b) => b.shapes.length > 0)
    if (built.length === 0) return null

    const all = built.flatMap((b) => b.shapes)

    const probe = new THREE.ShapeGeometry(all)
    probe.computeBoundingBox()
    const size = new THREE.Vector3()
    probe.boundingBox!.getSize(size)
    const maxDim = Math.max(size.x, size.y) || 1
    probe.dispose()

    const extrude = { depth: maxDim * LOGO_DEPTH, bevelEnabled: false, steps: 1 }

    const root = new THREE.Group()
    const geometries: THREE.BufferGeometry[] = []
    const meshes: THREE.Mesh[] = []

    for (let i = 0; i < built.length; i++) {
        const geo = new THREE.ExtrudeGeometry(built[i].shapes, extrude)

        geo.translate(0, 0, i * maxDim * 0.001)
        const mesh = new THREE.Mesh(geo)

        if (built[i].fill) mesh.userData.srcColor = built[i].fill
        geometries.push(geo)
        meshes.push(mesh)
        root.add(mesh)
    }
    if (meshes.length === 0) return null

    let minX = Infinity,
        minY = Infinity,
        minZ = Infinity,
        maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity
    for (const m of meshes) {
        m.geometry.computeBoundingBox()
        const b = m.geometry.boundingBox!
        minX = Math.min(minX, b.min.x)
        minY = Math.min(minY, b.min.y)
        minZ = Math.min(minZ, b.min.z)
        maxX = Math.max(maxX, b.max.x)
        maxY = Math.max(maxY, b.max.y)
        maxZ = Math.max(maxZ, b.max.z)
    }
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const cz = (minZ + maxZ) / 2
    for (const m of meshes) m.geometry.translate(-cx, -cy, -cz)

    let maxRSq = 0
    for (const m of meshes) {
        const pos = m.geometry.attributes.position
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i),
                y = pos.getY(i),
                z = pos.getZ(i)
            const d = x * x + y * y + z * z
            if (d > maxRSq) maxRSq = d
        }
    }
    const r = Math.sqrt(maxRSq) || 1

    for (const m of meshes) m.geometry.scale(1 / r, -1 / r, 1 / r)

    return { root, geometries }
}

function __BaseImpl_RubberSpheres(props: RubberSpheresProps) {
    const {
        style,
        background = "#000000",
        baseColor = "#FFFFFF",
        accentColor = "#FFD1DC",
        colorMode = "Single",
        balloonColor = "#FFFFFF",
        balloonColors = ["#FFFFFF", "#FFD1DC", "#BDE0FE", "#CDEB8B"],
        density = 85,
        dotSize = 120,
        lighting = "Soft Studio",
        field,
        material,
        motion,
        sourceMode = "Images",
        logo,
        images,
    } = props

    // Framer may pass an explicitly empty array for an Array control. In that
    // case a destructuring default does not apply, so fall back to the shipped
    // default images explicitly.
    const resolvedImages =
        sourceMode === "Images"
            ? images && images.length > 0
                ? images
                : DEFAULT_IMAGES
            : []

    const fieldGroup = { ...DEFAULT_FIELD, ...(field ?? {}) }
    const materialGroup = { ...DEFAULT_MATERIAL, ...(material ?? {}) }
    const motionGroup = { ...DEFAULT_MOTION, ...(motion ?? {}) }
    const logoGroup = {
        ...DEFAULT_LOGO,
        ...(logo ?? {}),
        svgLogos: [],
    }

    const hostRef = useRef<HTMLDivElement>(null)
    const glRef = useRef<GL | null>(null)
    const bodiesRef = useRef<Body[]>([])

    const stepRef = useRef<(() => void) | null>(null)
    const templatesRef = useRef<Template[]>([])
    const [templateVersion, setTemplateVersion] = useState(0)

    const sphereModeRef = useRef(true)
    const texturesRef = useRef<Map<string, THREE.Texture>>(new Map())
    const decalsRef = useRef<Decal[]>([])
    const [textureVersion, setTextureVersion] = useState(0)

    const live = useRef<Live>({} as Live)
    live.current = {
        baseColor,
        accentColor,
        colorMode,
        balloonColor,
        balloonColors,
        dotSize,
        spreadX: fieldGroup.spreadX,
        spreadY: fieldGroup.spreadY,
        roughness: materialGroup.roughness,
        gloss: materialGroup.gloss,
        transparency: materialGroup.transparency,
        gravityAnchor: motionGroup.gravityAnchor,
        bounciness: motionGroup.bounciness,
        mouseForce: motionGroup.mouseForce,
        parallax: motionGroup.parallax,
        lighting,
        useOriginalSvgColors: logoGroup.useOriginalSvgColors,
    }

    const applyMaterials = React.useCallback(() => {
        const l = live.current
        const base = new THREE.Color(l.baseColor)
        const palette =
            l.colorMode === "Multi" && l.balloonColors.length > 0
                ? l.balloonColors.map((c) => new THREE.Color(c))
                : [new THREE.Color(l.balloonColor)]
        const rough = l.roughness / 100
        const gloss = l.gloss / 100
        const trans = l.transparency / 100
        const size = l.dotSize / 100

        for (const b of bodiesRef.current) {
            for (let i = 0; i < b.meshes.length; i++) {
                const mat = b.meshes[i]
                    .material as THREE.MeshPhysicalMaterial
                const col =
                    l.colorMode === "Multi"
                        ? palette[Math.min(
                              palette.length - 1,
                              Math.floor(b.colorRoll * palette.length)
                          )]
                        : palette[0]
                mat.color.copy(col)
                mat.roughness = rough

                mat.metalness = 0.02 + gloss * 0.08
                mat.clearcoat = gloss
                mat.clearcoatRoughness = Math.max(0.15, 0.4 - gloss * 0.25)
                mat.sheen = 0.5 + gloss * 0.5
                mat.sheenColor.copy(col)
                mat.sheenRoughness = Math.max(0.2, 0.5 - gloss * 0.3)
                mat.reflectivity = 0.1 + gloss * 0.4
                mat.ior = 1.45 + gloss * 0.05
                mat.transparent = trans > 0
                mat.opacity = 1 - trans * 0.6
                mat.transmission = trans * 0.95
                mat.thickness = size * 1.5

                mat.needsUpdate = true
            }
        }
    }, [])

    const applyDecals = React.useCallback(() => {
        const decals = decalsRef.current
        const bodies = bodiesRef.current
        const active = sphereModeRef.current && decals.length > 0

        for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i]
            const d = active ? decals[i % decals.length] : null

            for (const mesh of b.meshes) {
                const mat = mesh.material as THREE.MeshPhysicalMaterial
                if (!d) {
                    detachDecal(mat)
                    continue
                }
                const [hx, hy] = decalHalfExtents(d.aspect, d.fit)

                const pan = d.fit === "Cover"
                const ox = pan ? (d.offsetX / 100) * hx : 0
                const oy = pan ? (d.offsetY / 100) * hy : 0
                const u = mat.userData.decal as DecalUniforms | null | undefined
                if (u) {
                    u.uDecalMap.value = d.texture
                    u.uDecalHalf.value.set(hx, hy)
                    u.uDecalOffset.value.set(ox, oy)
                } else {
                    attachDecal(mat, {
                        uDecalMap: { value: d.texture },
                        uDecalHalf: { value: new THREE.Vector2(hx, hy) },
                        uDecalOffset: { value: new THREE.Vector2(ox, oy) },
                    })
                }
            }

            if (d) {
                if (b.spin !== 0) {
                    b.spin = 0
                    b.quat.identity()
                }
            } else if (b.spin === 0) {
                b.spin = b.baseSpin
            }
        }
    }, [])

    useEffect(() => {
        const host = hostRef.current
        if (!host) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 1000)
        camera.position.set(0, 0, CAM_Z)

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

        renderer.setClearColor(0x000000, 0)
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = EXPOSURE
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.domElement.style.display = "block"
        host.appendChild(renderer.domElement)

        const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.2)
        scene.add(hemi)
        const key = new THREE.DirectionalLight(0xffffff, 1.4)
        key.castShadow = true
        key.shadow.mapSize.width = SHADOW_MAP
        key.shadow.mapSize.height = SHADOW_MAP
        key.shadow.camera.near = 0.5
        key.shadow.camera.far = 150
        key.shadow.bias = -0.0005
        key.shadow.normalBias = 0.05
        key.shadow.radius = 4
        scene.add(key)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
        scene.add(fillLight)
        const rim = new THREE.DirectionalLight(0xffffff, 0.6)
        scene.add(rim)

        const gl: GL = { scene, camera, renderer, hemi, key, fill: fillLight, rim }
        glRef.current = gl

        let visible = true
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) visible = e.isIntersecting
            },
            { threshold: 0 }
        )
        io.observe(host)

        const resize = () => {
            const w = host.clientWidth || host.offsetWidth
            const h = host.clientHeight || host.offsetHeight
            if (!w || !h) return
            camera.aspect = w / h
            camera.updateProjectionMatrix()

            renderer.setSize(w, h)
        }
        const ro = new ResizeObserver(resize)
        ro.observe(host)
        resize()

        const ndc = new THREE.Vector2()
        const mousePos = new THREE.Vector3(0, 0, AWAY)
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
        const ray = new THREE.Raycaster()

        const onPointerMove = (e: PointerEvent) => {
            const r = host.getBoundingClientRect()
            if (!r.width || !r.height) return

            // Only drive the interaction while the pointer is actually over this
            // component. Using window-level coordinates here could leave the last
            // hover position active when the pointer moved through another element,
            // which made the interaction feel intermittent.
            if (
                e.clientX < r.left ||
                e.clientX > r.right ||
                e.clientY < r.top ||
                e.clientY > r.bottom
            ) {
                mousePos.set(0, 0, AWAY)
                return
            }

            ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
            ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
            ray.setFromCamera(ndc, camera)
            if (!ray.ray.intersectPlane(plane, mousePos))
                mousePos.set(0, 0, AWAY)
        }
        const clearPointer = () => mousePos.set(0, 0, AWAY)
        const onPointerLeave = () => clearPointer()

        host.addEventListener("pointermove", onPointerMove, { passive: true })
        host.addEventListener("pointerleave", onPointerLeave)
        window.addEventListener("blur", clearPointer)

        let targetCamY = 0
        const onScroll = () => {
            const r = host.getBoundingClientRect()
            const centre = r.top + host.offsetHeight / 2
            const offset =
                (centre - window.innerHeight / 2) *
                0.015 *
                (live.current.parallax / 100)
            targetCamY = -offset
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        onScroll()

        const anchor = new THREE.Vector3()
        const toCentre = new THREE.Vector3()
        const away = new THREE.Vector3()
        const delta = new THREE.Vector3()
        const relVel = new THREE.Vector3()
        const spinStep = new THREE.Quaternion()
        let shadowExtent = 0

        const step = () => {
            const l = live.current
            const bodies = bodiesRef.current
            const n = bodies.length
            const size = l.dotSize / 100
            const sx = Math.max(0.01, l.spreadX / 100)
            const sy = Math.max(0.01, l.spreadY / 100)
            const force = (l.mouseForce / 100) * 10 * MOUSE_SCALE
            const restitution = 0.3 + (l.bounciness / 100) * 0.7

            anchor.set(
                0,
                l.gravityAnchor === "Bottom"
                    ? -15
                    : l.gravityAnchor === "Top"
                      ? 15
                      : 0,
                0
            )

            const extent = Math.round(20 + 15 * Math.max(sx, sy))
            if (extent !== shadowExtent) {
                shadowExtent = extent
                const c = key.shadow.camera
                c.left = -extent
                c.right = extent
                c.top = extent
                c.bottom = -extent
                c.updateProjectionMatrix()
            }

            for (let i = 0; i < n; i++) {
                const b = bodies[i]
                b.radius = size * b.jitter

                toCentre.copy(anchor).sub(b.pos)
                toCentre.x /= sx
                toCentre.y /= sy
                b.vel.addScaledVector(toCentre, ATTRACTION)

                if (mousePos.z !== AWAY) {
                    const d = b.pos.distanceTo(mousePos)
                    if (d < MOUSE_RADIUS) {
                        away.copy(b.pos).sub(mousePos)
                        if (away.lengthSq() < 1e-8) away.set(0, 1, 0)
                        away.normalize()
                        b.vel.addScaledVector(away, (MOUSE_RADIUS - d) * force)
                    }
                }

                if (b.vel.length() > MAX_SPEED) b.vel.setLength(MAX_SPEED)
                b.vel.multiplyScalar(DAMPING)
                b.pos.add(b.vel)

                spinStep.setFromAxisAngle(b.axis, b.spin)
                b.quat.multiply(spinStep)
            }

            for (let iter = 0; iter < RELAX_ITERS; iter++) {
                for (let i = 0; i < n; i++) {
                    const a = bodies[i]
                    for (let j = i + 1; j < n; j++) {
                        const c = bodies[j]
                        const minDist = a.radius + c.radius
                        if (
                            Math.abs(a.pos.x - c.pos.x) > minDist ||
                            Math.abs(a.pos.y - c.pos.y) > minDist ||
                            Math.abs(a.pos.z - c.pos.z) > minDist
                        )
                            continue
                        const dist = a.pos.distanceTo(c.pos)
                        if (dist >= minDist) continue
                        delta.copy(a.pos).sub(c.pos)
                        if (delta.lengthSq() < 1e-8) delta.set(1, 0, 0)
                        delta.normalize()
                        const push = (minDist - dist) * 0.5
                        a.pos.addScaledVector(delta, push)
                        c.pos.addScaledVector(delta, -push)
                        relVel.copy(a.vel).sub(c.vel)
                        const approach = relVel.dot(delta)
                        if (approach < 0) {
                            a.vel.addScaledVector(delta, -approach * restitution)
                            c.vel.addScaledVector(delta, approach * restitution)
                        }
                    }
                }
            }

            camera.position.y += (targetCamY - camera.position.y) * 0.05
        }
        stepRef.current = step

        let raf = 0
        let last =
            typeof performance !== "undefined" ? performance.now() : Date.now()
        let acc = 0
        const tick = () => {
            raf = requestAnimationFrame(tick)
            const now =
                typeof performance !== "undefined"
                    ? performance.now()
                    : Date.now()
            let dt = (now - last) / 1000
            last = now
            if (!visible) return
            if (dt > 0.25) dt = 0.25
            acc += dt
            let steps = 0
            while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
                step()
                acc -= FIXED_DT
                steps++
            }
            if (acc >= FIXED_DT) acc = 0
            for (const b of bodiesRef.current) {
                b.root.position.copy(b.pos)
                b.root.quaternion.copy(b.quat)
                b.root.scale.setScalar(b.radius)
            }
            renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            io.disconnect()
            ro.disconnect()
            host.removeEventListener("pointermove", onPointerMove)
            host.removeEventListener("pointerleave", onPointerLeave)
            window.removeEventListener("blur", clearPointer)
            window.removeEventListener("scroll", onScroll)
            stepRef.current = null
            disposeBodies(scene, bodiesRef.current)
            bodiesRef.current = []
            disposeTemplates(templatesRef.current)
            templatesRef.current = []
            scene.clear()

            renderer.dispose()
            if (renderer.domElement.parentNode === host)
                host.removeChild(renderer.domElement)
            glRef.current = null
        }
    }, [])

    const logosKey = JSON.stringify(logoGroup.svgLogos ?? [])
    useEffect(() => {
        let cancelled = false
        const urls: string[] = JSON.parse(logosKey)
        const run = async () => {
            let next: Template[] = []
            if (urls.length > 0) {
                const loaded = await Promise.all(
                    urls.map((u) => loadSVGTemplate(u).catch(() => null))
                )
                next = loaded.filter((t): t is Template => t !== null)
            }
            const fellBackToSphere = next.length === 0
            if (fellBackToSphere) {
                const geo = new THREE.SphereGeometry(
                    1,
                    SPHERE_SEGMENTS,
                    SPHERE_SEGMENTS
                )
                next = [{ root: new THREE.Mesh(geo), geometries: [geo] }]
            }
            if (cancelled) {
                disposeTemplates(next)
                return
            }
            disposeTemplates(templatesRef.current)
            templatesRef.current = next
            sphereModeRef.current = fellBackToSphere
            setTemplateVersion((v) => v + 1)
        }
        run()
        return () => {
            cancelled = true
        }
    }, [logosKey, sourceMode])

    const srcList =
        sourceMode === "Images"
            ? resolvedImages.map((it) => imageSrc(it.image)).filter(Boolean)
            : []
    const srcKey = JSON.stringify(srcList)

    useEffect(() => {
        const srcs: string[] = JSON.parse(srcKey)
        const cache = texturesRef.current

        const wanted = new Set(srcs)
        for (const [url, tex] of Array.from(cache.entries())) {
            if (!wanted.has(url)) {
                tex.dispose()
                cache.delete(url)
            }
        }

        const missing = srcs.filter((u) => !cache.has(u))
        if (missing.length === 0) {
            setTextureVersion((v) => v + 1)
            return
        }

        let cancelled = false
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        const maxAniso =
            glRef.current?.renderer.capabilities.getMaxAnisotropy?.() ?? 1

        Promise.all(
            missing.map(
                (url) =>
                    new Promise<[string, THREE.Texture | null]>((resolve) => {
                        loader.load(
                            url,
                            (t: THREE.Texture) => resolve([url, t]),
                            undefined,
                            () => resolve([url, null])
                        )
                    })
            )
        ).then((loaded) => {
            if (cancelled) {
                for (const [, t] of loaded) t?.dispose()
                return
            }
            for (const [url, t] of loaded) {
                if (!t) continue
                t.colorSpace = THREE.SRGBColorSpace

                t.wrapS = THREE.ClampToEdgeWrapping
                t.wrapT = THREE.ClampToEdgeWrapping
                t.anisotropy = Math.min(8, maxAniso)
                t.needsUpdate = true
                cache.set(url, t)
            }
            setTextureVersion((v) => v + 1)
        })

        return () => {
            cancelled = true
        }
    }, [srcKey, sourceMode])

    const framingKey = JSON.stringify(
        (sourceMode === "Images" ? resolvedImages : [])
            .filter((it) => imageSrc(it.image))
            .map((it) => [
                imageSrc(it.image),
                it.fit === "Contain" ? "Contain" : "Cover",
                Math.round(it.offsetX ?? 0),
                Math.round(it.offsetY ?? 0),
            ])
    )

    useEffect(() => {
        const spec: [string, ImageFit, number, number][] = JSON.parse(framingKey)
        const cache = texturesRef.current
        const next: Decal[] = []
        for (const [url, fit, offsetX, offsetY] of spec) {
            const texture = cache.get(url)
            if (!texture) continue
            const img = texture.image as { width?: number; height?: number } | null
            next.push({
                texture,
                aspect: (img?.width || 1) / (img?.height || 1),
                fit,
                offsetX,
                offsetY,
            })
        }
        decalsRef.current = next
        applyDecals()
    }, [framingKey, textureVersion, templateVersion, applyDecals, sourceMode])

    useEffect(() => {
        const cache = texturesRef.current
        return () => {
            for (const t of cache.values()) t.dispose()
            cache.clear()
            decalsRef.current = []
        }
    }, [])

    useEffect(() => {
        const gl = glRef.current
        const templates = templatesRef.current
        if (!gl || templates.length === 0) return

        const count = Math.max(1, Math.round(density))
        const bodies: Body[] = []
        for (let i = 0; i < count; i++) {
            const t = templates[Math.floor(Math.random() * templates.length)]
            const root = t.root.clone(true)
            const meshes: THREE.Mesh[] = []
            const srcColors: (THREE.Color | null)[] = []
            root.traverse((child: THREE.Object3D) => {
                const m = child as THREE.Mesh
                if (!(m as any).isMesh) return
                m.castShadow = true
                m.receiveShadow = true
                m.material = new THREE.MeshPhysicalMaterial({
                    side: THREE.DoubleSide,
                })
                meshes.push(m)
                const hex = m.userData?.srcColor
                srcColors.push(
                    typeof hex === "string" ? new THREE.Color(hex) : null
                )
            })

            const jitter = 1 + (Math.random() - 0.5) * SIZE_RANDOM
            const spin = (Math.random() - 0.5) * 0.01
            bodies.push({
                root,
                meshes,
                srcColors,
                pos: new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 10
                ),
                vel: new THREE.Vector3(),
                quat: new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    )
                ),
                axis: new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5
                ).normalize(),
                spin,
                baseSpin: spin,
                jitter,
                radius: (live.current.dotSize / 100) * jitter,
                colorRoll: Math.random(),
            })
            gl.scene.add(root)
        }

        disposeBodies(gl.scene, bodiesRef.current)
        bodiesRef.current = bodies
        applyMaterials()
        applyDecals()

        const step = stepRef.current
        if (step) for (let i = 0; i < PRESETTLE_STEPS; i++) step()

        return () => {
            const g = glRef.current
            if (g) disposeBodies(g.scene, bodies)
            if (bodiesRef.current === bodies) bodiesRef.current = []
        }
    }, [density, templateVersion, applyMaterials, applyDecals])

    useEffect(() => {
        const gl = glRef.current
        if (!gl) return
        const { hemi, key, fill, rim } = gl

        const hsl = { h: 0, s: 0, l: 0 }
        new THREE.Color(baseColor).getHSL(hsl)
        const ambient = new THREE.Color().setHSL(
            hsl.h,
            1,
            Math.max(0.5, hsl.l * 0.8)
        )
        hemi.color.copy(ambient)
        hemi.groundColor.copy(ambient).multiplyScalar(0.7)

        key.color.setHex(0xffffff)
        fill.color.setHex(0xffffff)
        rim.color.setHex(0xffffff)

        switch (lighting) {
            case "Bright Professional":
                hemi.intensity = 1.2
                key.intensity = 1.5
                key.position.set(10, 30, 20)
                fill.intensity = 0.5
                fill.position.set(-15, 0, 15)
                rim.intensity = 0.4
                rim.position.set(0, -10, -20)
                break
            case "Neutral Flat":
                hemi.intensity = 1.5
                key.intensity = 0.8
                key.position.set(0, 0, 10)
                fill.intensity = 0.3
                fill.position.set(0, 0, -10)
                rim.intensity = 0
                rim.position.set(0, 20, -20)
                break
            case "Cinematic Drama":
                hemi.intensity = 0.8
                key.intensity = 2
                key.position.set(-20, 20, 10)
                fill.intensity = 0.3
                fill.position.set(20, -10, 10)
                rim.intensity = 1.2
                rim.color.setHex(0xaaaaff)
                rim.position.set(0, 10, -30)
                break
            case "Neon Cyberpunk":
                hemi.intensity = 0.8
                hemi.color.setHex(0x0022ff)
                key.intensity = 1.8
                key.color.setHex(0xff0055)
                key.position.set(15, 10, 10)
                fill.intensity = 0.6
                fill.color.setHex(0x00ddee)
                fill.position.set(-15, -10, 15)
                rim.intensity = 1.5
                rim.color.setHex(0xaa00ff)
                rim.position.set(0, 20, -20)
                break
            case "Sunset Warmth":
                hemi.intensity = 1
                hemi.color.setHex(0xffaa55)
                key.intensity = 1.8
                key.color.setHex(0xffddaa)
                key.position.set(20, 5, 20)
                fill.intensity = 0.4
                fill.color.setHex(0x552255)
                fill.position.set(-20, 10, -10)
                rim.intensity = 0.8
                rim.color.setHex(0xff5522)
                rim.position.set(0, 15, -20)
                break
            case "Soft Studio":
            default:
                hemi.intensity = 1.2
                key.intensity = 1.3
                key.color.setHex(0xfff9f5)
                key.position.set(15, 20, 20)
                fill.intensity = 0.4
                fill.color.setHex(0xf0f7ff)
                fill.position.set(-15, -10, 15)
                rim.intensity = 0.6
                rim.position.set(0, 20, -20)
                break
        }
    }, [lighting, baseColor])

    useEffect(() => {
        applyMaterials()
    }, [
        applyMaterials,
        baseColor,
        accentColor,
        colorMode,
        balloonColor,
        balloonColors,
        dotSize,
        materialGroup.roughness,
        materialGroup.gloss,
        materialGroup.transparency,
        logoGroup.useOriginalSvgColors,
    ])

    return (
        <div
            ref={hostRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                backgroundColor: background,
                ...style,
            }}
        />
    )
}

addPropertyControls(RubberSpheres, {
    sourceMode: {
        type: ControlType.Enum,
        title: "Content",
        options: ["Images", "Colors"],
        optionTitles: ["Images", "Colors"],
        defaultValue: "Images",
    },

    images: {
        type: ControlType.Array,
        title: "Images",
        hidden: (props) => props.sourceMode !== "Images",
        control: {
            type: ControlType.Object,
            controls: {
                image: {
                    type: ControlType.Image,
                    title: "Image",
                },
                fit: {
                    type: ControlType.Enum,
                    title: "Fit",
                    options: ["Cover", "Contain"],
                    optionTitles: ["Cover", "Contain"],
                    defaultValue: "Cover",
                },
                offsetX: {
                    type: ControlType.Number,
                    title: "X Offset",
                    min: -100,
                    max: 100,
                    step: 1,
                    unit: "%",
                    defaultValue: 0,
                },
                offsetY: {
                    type: ControlType.Number,
                    title: "Y Offset",
                    min: -100,
                    max: 100,
                    step: 1,
                    unit: "%",
                    defaultValue: 0,
                },
            },
        },
        defaultValue: DEFAULT_IMAGES,
        maxCount: 20,
    },

    colorMode: {
        type: ControlType.Enum,
        title: "Color Mode",
        options: ["Single", "Multi"],
        optionTitles: ["Single", "Multi"],
        defaultValue: "Single",
        hidden: (props) => props.sourceMode !== "Colors",
    },

    balloonColor: {
        type: ControlType.Color,
        title: "Balloon Color",
        defaultValue: "#FFFFFF",
        hidden: (props) =>
            props.sourceMode !== "Colors" || props.colorMode !== "Single",
    },

    balloonColors: {
        type: ControlType.Array,
        title: "Balloon Colors",
        hidden: (props) =>
            props.sourceMode !== "Colors" || props.colorMode !== "Multi",
        control: {
            type: ControlType.Color,
        },
        defaultValue: ["#FFFFFF", "#FFD1DC", "#BDE0FE", "#CDEB8B"],
        maxCount: 12,
    },

    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
    },

    baseColor: {
        type: ControlType.Color,
        title: "Base Color",
        defaultValue: "#FFFFFF",
        hidden: (props) => props.sourceMode !== "Colors",
    },

    density: {
        type: ControlType.Number,
        title: "Density",
        min: 1,
        max: 150,
        step: 1,
        defaultValue: 85,
    },

    dotSize: {
        type: ControlType.Number,
        title: "Dot Size",
        min: 10,
        max: 300,
        step: 1,
        unit: "%",
        defaultValue: 120,
    },

    lighting: {
        type: ControlType.Enum,
        title: "Lighting",
        options: [
            "Soft Studio",
            "Bright Professional",
            "Neutral Flat",
            "Cinematic Drama",
            "Neon Cyberpunk",
            "Sunset Warmth",
        ],
        optionTitles: [
            "Soft Studio",
            "Bright Professional",
            "Neutral Flat",
            "Cinematic Drama",
            "Neon Cyberpunk",
            "Sunset Warmth",
        ],
        defaultValue: "Soft Studio",
    },

    field: {
        type: ControlType.Object,
        title: "Field",
        controls: {
            spreadX: {
                type: ControlType.Number,
                title: "Spread X",
                min: 10,
                max: 300,
                step: 1,
                defaultValue: 150,
            },
            spreadY: {
                type: ControlType.Number,
                title: "Spread Y",
                min: 10,
                max: 300,
                step: 1,
                defaultValue: 100,
            },
        },
    },

    material: {
        type: ControlType.Object,
        title: "Material",
        controls: {
            roughness: {
                type: ControlType.Number,
                title: "Roughness",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 100,
            },
            gloss: {
                type: ControlType.Number,
                title: "Gloss",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 100,
            },
            transparency: {
                type: ControlType.Number,
                title: "Transparency",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 0,
            },
        },
    },

    motion: {
        type: ControlType.Object,
        title: "Motion",
        controls: {
            gravityAnchor: {
                type: ControlType.Enum,
                title: "Gravity Anchor",
                options: ["Center", "Bottom", "Top"],
                optionTitles: ["Center", "Bottom", "Top"],
                defaultValue: "Center",
            },
            bounciness: {
                type: ControlType.Number,
                title: "Bounciness",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 100,
            },
            mouseForce: {
                type: ControlType.Number,
                title: "Mouse Force",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 100,
            },
            parallax: {
                type: ControlType.Number,
                title: "Parallax",
                min: 0,
                max: 200,
                step: 1,
                unit: "%",
                defaultValue: 200,
            },
        },
    },
})

const __presetProps = {
  "sourceMode": "Images",
  "images": [],
  "colorMode": "Multi",
  "balloonColor": "#FFFFFF",
  "balloonColors": [
    "#FFFFFF",
    "#FFD1DC",
    "#BDE0FE",
    "#CDEB8B"
  ],
  "background": "#000000",
  "baseColor": "#FFFFFF",
  "density": 85,
  "dotSize": 120,
  "lighting": "Soft Studio",
  "field": {
    "spreadX": 150,
    "spreadY": 100
  },
  "material": {
    "gloss": 100,
    "roughness": 100,
    "transparency": 0
  },
  "motion": {
    "parallax": 200,
    "bounciness": 100,
    "mouseForce": 100,
    "gravityAnchor": "Center"
  }
};

export default function RubberSpheres(props: Record<string, unknown>) {
  return <__BaseImpl_RubberSpheres {...(__presetProps as Record<string, unknown>)} {...props} />;
}
