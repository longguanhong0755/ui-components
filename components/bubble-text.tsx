"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Bubble Type — the word you type, blown as soap film that keeps filling,
 * popping and refilling, and lifting off the word under the pointer.
 *
 * Adapted from the MIT-licensed Codrops tutorial "Typing Effects with Three.js"
 * by Ksenia Kondrashova (github.com/uuuulala/WebGL-typing-tutorial), demo 2.
 *
 * The mechanism: a hidden contenteditable holds the real string, so the browser
 * keeps caret, selection and wrapping for free. The string is drawn once into an
 * offscreen 2D canvas and every lit pixel of the glyph mask becomes one instance
 * of a small sphere. On each keystroke the mask is re-sampled and diffed —
 * surviving coordinates keep the bubble already inflating there, vanished ones
 * are flagged and shrink away — so the word never resets mid-sentence.
 *
 * What makes it read as soap rather than as beads is the opacity: it is a
 * Fresnel term, so the middle of each sphere is genuinely clear and only the rim
 * carries weight. A flat translucent material gives frosted marbles instead.
 *
 * One deliberate change from the tutorial: there, a popped bubble pushed its own
 * growth rate up by a half every frame, so within a second or two every bubble
 * had overshot its size on the frame it was born and the word quietly emptied
 * itself. Here a pop rolls a fresh size and starts filling again, which is the
 * behaviour the demo reads as, and it is what makes Speed worth a control.
 */

/** Text mask pixels beyond this are dropped — a pasted paragraph must not lock the tab. */
const MAX_PARTICLES = 30000

/**
 * World units per CSS pixel of type — the reciprocal of about 16.7px per unit,
 * which is what the bubble sizes below were tuned against.
 *
 * World space is pinned to the frame's own pixels at this scale, so a font size
 * of 70 draws letters 70px tall and the Font control is the only thing with a
 * say in how large the word reads. An earlier version fitted the camera to the
 * string box instead, which cancelled the font size out completely: every size
 * framed itself and the type came out identical at 20 and at 200.
 */
const SCALE_FACTOR = 0.06

/** Where the camera sits. Only the fov is solved, so this fixes the perspective. */
const CAM_DISTANCE = 20

/** Subdivisions of the bubble sphere. Below 3 the silhouette reads as a gem. */
const SPHERE_DETAIL = 3

/**
 * How hard the Fresnel rim is drawn. The panel used to own this; it is pinned
 * here instead, so the uniform wiring and the shader stay untouched.
 */
const EDGE_GLOW = 2.0

const DEFAULTS = {
    text: "BUBBLES",
    tint: "#FFFFFF",
    opacity: 4,
    bubbleSize: 20,
    density: 18,
    speed: 8,
    scatter: 10,
    hoverOn: true,
    hover: { radius: 9, lift: 8 },
}

const DEFAULT_FONT: FontValue = {
    fontFamily: "Inter",
    fontSize: 70,
    fontWeight: 100,
    lineHeight: 1,
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
    tint: string
    opacity: number
    bubbleSize: number
    density: number
    speed: number
    scatter: number
    hoverOn: boolean
    hover: HoverOptions
}

type HoverOptions = { radius?: number; lift?: number }

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * The Font control used to hand back CSS strings — "70px", "-0.03em" —
 * wherever the panel showed a length. Arithmetic on those yields NaN, which
 * propagates into the canvas metrics and blanks the whole component.
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
    const font = cfg.font ?? {}
    const fontSize = Math.max(8, toPx(font.fontSize, 70, 16))
    return {
        family: font.fontFamily || "system-ui, sans-serif",
        fontSize,
        weight: font.fontWeight ?? 100,
        fontStyle: font.fontStyle ?? "normal",
        tracking: toPx(font.letterSpacing, 0, fontSize),
        lineRatio: toRatio(font.lineHeight, fontSize, 1),
        // The flat floor under the Fresnel — how much of the body of the bubble
        // is visible at all. 1 leaves only the rims, drawn as outlines.
        opacity: clamp(cfg.opacity, 1, 20, DEFAULTS.opacity) * 0.05,
        bubble: clamp(cfg.bubbleSize, 1, 20, DEFAULTS.bubbleSize) / 10,
        /*
         * Sampling stride over the glyph mask, in pixels. 20 takes every lit
         * pixel, which is what the tutorial did and what the letterforms read
         * sharpest at; lower steps over them and thins the foam out.
         *
         * A stride rather than a random cull, so the bubbles that survive keep
         * an even spacing — dropping them at random leaves clumps and holes that
         * read as damage to the letter rather than as fewer bubbles.
         */
        step: Math.max(1, Math.round(1 + (20 - clamp(cfg.density, 1, 20, DEFAULTS.density)) * 0.35)),
        // Squared: at the slow end one step reads clearly, at the fast end it
        // takes a large jump to see any difference in the churn.
        growth: 0.002 + Math.pow(clamp(cfg.speed, 1, 20, DEFAULTS.speed), 2) * 0.00035,
        scatter: clamp(cfg.scatter, 0, 20, DEFAULTS.scatter) * 0.05,
        // A radius in scene units around the pointer. Read with a fallback: an
        // instance placed before the group existed has no object on it.
        hoverRadius: clamp(cfg.hover?.radius as number, 1, 20, 9) * 0.9,
        // How far a bubble directly under the cursor climbs, in scene units.
        hoverLift: clamp(cfg.hover?.lift as number, 1, 20, 8) * 0.5,
    }
}

/*
 * The normal is scrambled per instance so neighbouring bubbles take different
 * iridescent tints — an unscrambled normal paints the same rainbow on every one
 * and the foam reads as a single moulded object.
 */
const BUBBLE_VERTEX = /* glsl */ `
    varying vec3 vNormal;
    varying float vFresnel;

    float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        vNormal = normal * rand(instanceMatrix[3].xz);

        vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position + vec3(0.0, 0.3, 0.0), 1.0);
        vec3 toEye = normalize(worldPosition.xyz - cameraPosition - vec3(1.0, 2.0, 0.0));
        vFresnel = pow(1.0 + dot(toEye, normal), 3.0);

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`

const BUBBLE_FRAGMENT = /* glsl */ `
    uniform vec3 uTint;
    uniform float uEdge;
    uniform float uBody;

    varying vec3 vNormal;
    varying float vFresnel;

    void main() {
        // Pulled three quarters of the way to white: a raw normal used as colour
        // is a garish RGB cube, and soap is pale with a hint of oil slick.
        vec3 colored = mix(vNormal, vec3(1.0), 0.75) * uTint;
        gl_FragColor = vec4(colored, uBody + uEdge * vFresnel);
    }
`

type Particle = {
    x: number
    y: number
    z: number
    scale: number
    maxScale: number
    deltaScale: number
    /** How far this one has floated above its glyph pixel, in scene units. */
    lift: number
    /** Eased proximity to the pointer, 0 to 1. */
    hover: number
    /** Scales the climb, so a lifted patch is a drifting cluster and not a wall. */
    riseJitter: number
    toDelete: boolean
}

function makeBubble(x: number, y: number, S: ReturnType<typeof settingsFor>): Particle {
    return {
        x: x + S.scatter * (Math.random() - 0.5),
        y: y + S.scatter * (Math.random() - 0.5),
        z: 0,
        scale: 0.1 * Math.random(),
        // Cubed, so most bubbles are small and the occasional one is fat. An even
        // spread of sizes reads as packed ball bearings.
        maxScale: Math.pow(Math.random(), 3) * S.bubble,
        deltaScale: S.growth * (0.4 + Math.random()),
        lift: 0,
        hover: 0,
        riseJitter: 0.4 + 0.8 * Math.random(),
        toDelete: false,
    }
}

type Coord = { x: number; y: number; old: boolean; toDelete: boolean }

class BubbleTypeScene {
    private container: HTMLElement
    private cfg: Config
    private prev: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    /** Holds the instanced mesh so it can be added and cleared as one. */
    private group = new THREE.Group()

    private input: HTMLDivElement
    private textCanvas: HTMLCanvasElement
    private textCtx: CanvasRenderingContext2D

    private geometry = new THREE.IcosahedronGeometry(0.2, SPHERE_DETAIL)
    private material: THREE.ShaderMaterial
    private mesh: THREE.InstancedMesh | null = null

    private dummy = new THREE.Object3D()
    private coords: Coord[] = []
    private particles: Particle[] = []
    private stringBox = { wTexture: 0, wScene: 0, hTexture: 0, hScene: 0 }
    private text = ""

    /** The pointer in scene units, and whether it is over the frame at all. */
    private pointer = new THREE.Vector2()
    private pointerOver = false

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        this.prev = { ...cfg }

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const canvas = this.renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        container.appendChild(canvas)
        this.scene.add(this.group)

        this.textCanvas = document.createElement("canvas")
        this.textCanvas.width = this.textCanvas.height = 0
        this.textCtx = this.textCanvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D

        // Invisible and unclickable: it exists only to hold the string and to
        // let the browser do the editing. What is drawn is the mask, not this.
        this.input = document.createElement("div")
        this.input.contentEditable = "true"
        this.input.spellcheck = false
        this.input.setAttribute("aria-label", "Type to reshape the text")
        Object.assign(this.input.style, {
            position: "absolute",
            top: "0",
            left: "0",
            opacity: "0",
            whiteSpace: "pre",
            pointerEvents: "none",
            outline: "none",
        } as CSSStyleDeclaration)
        container.appendChild(this.input)

        const S = settingsFor(cfg)
        this.material = new THREE.ShaderMaterial({
            vertexShader: BUBBLE_VERTEX,
            fragmentShader: BUBBLE_FRAGMENT,
            uniforms: {
                uTint: { value: new THREE.Color(cfg.tint || DEFAULTS.tint) },
                uEdge: { value: EDGE_GLOW },
                uBody: { value: S.opacity },
            },
            // Off, because sorting a thousand transparent spheres by depth would
            // flicker as the word turns; they are meant to layer instead.
            depthTest: false,
            transparent: true,
        })

        this.applyInputStyle()
        this.setText(cfg.text)
        this.bindEvents()
    }

    // -----------------------------------------------------------

    private applyInputStyle() {
        const S = settingsFor(this.cfg)
        this.input.style.fontFamily = S.family
        this.input.style.fontSize = S.fontSize + "px"
        this.input.style.fontWeight = String(S.weight)
        this.input.style.fontStyle = S.fontStyle
        this.input.style.letterSpacing = S.tracking + "px"
        this.input.style.lineHeight = S.lineRatio * S.fontSize + "px"
    }

    private setText(text: string) {
        const value = typeof text === "string" ? text : ""
        this.input.innerHTML = value.replace(/\n/g, "<div><br></div>")
        this.text = value
        this.handleInput()
        this.refreshText()
    }

    private bindEvents() {
        this.input.addEventListener("keyup", this.onEdit)
        this.input.addEventListener("input", this.onEdit)
        this.container.addEventListener("pointerdown", this.onPointerDown)
        this.container.addEventListener("pointermove", this.onPointerMove)
        // enter/leave rather than over/out, which also fire crossing between
        // children — here the canvas and the hidden input.
        this.container.addEventListener("pointerleave", this.onPointerLeave)
        this.container.addEventListener("pointercancel", this.onPointerLeave)
    }

    private onEdit = () => {
        if (this.disposed) return
        this.handleInput()
        this.refreshText()
    }

    private onPointerDown = () => {
        if (this.disposed) return
        this.focusInput()
    }

    /**
     * The pointer is carried in scene units, not pixels, so the reach is the
     * same distance whatever size the frame is. World space is already pinned to
     * the frame's pixels, so this is one multiply rather than an unprojection.
     */
    private onPointerMove = (e: PointerEvent) => {
        if (this.disposed) return
        const rect = this.container.getBoundingClientRect()
        this.pointer.set(
            (e.clientX - rect.left - rect.width / 2) * SCALE_FACTOR,
            // The page counts down and the scene counts up.
            -(e.clientY - rect.top - rect.height / 2) * SCALE_FACTOR
        )
        this.pointerOver = true
    }

    private onPointerLeave = () => {
        if (this.disposed) return
        // The lifted bubbles then sink back into the word rather than hanging
        // wherever the pointer happened to leave them.
        this.pointerOver = false
    }

    private focusInput() {
        this.input.style.pointerEvents = "auto"
        this.input.focus({ preventScroll: true })
        this.input.style.pointerEvents = "none"
        const selection = window.getSelection()
        if (!selection) return
        const range = document.createRange()
        range.selectNodeContents(this.input)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
    }

    /**
     * Turn whatever the browser left in the contenteditable into a plain string
     * and measure it. The empty-div checks are the tutorial's workaround for
     * Chrome inserting a bare div and break on the first Enter.
     */
    private handleInput() {
        const isNewLine = (el: ChildNode | null) => {
            const node = el as HTMLElement | null
            if (!node || !node.tagName) return false
            const tag = node.tagName.toUpperCase()
            if (tag !== "DIV" && tag !== "P") return false
            return node.innerHTML === "<br>" || node.innerHTML === "</br>"
        }

        if (isNewLine(this.input.firstChild)) this.input.firstChild?.remove()
        if (isNewLine(this.input.lastChild) && isNewLine(this.input.lastChild?.previousSibling ?? null)) {
            this.input.lastChild?.remove()
        }

        this.text = this.input.innerHTML
            .replaceAll("<p>", "\n")
            .replaceAll("</p>", "")
            .replaceAll("<div>", "\n")
            .replaceAll("</div>", "")
            .replaceAll("<br>", "")
            .replaceAll("<br/>", "")
            .replaceAll("&nbsp;", " ")

        this.stringBox.wTexture = this.input.clientWidth
        this.stringBox.wScene = this.stringBox.wTexture * SCALE_FACTOR
        this.stringBox.hTexture = this.input.clientHeight
        this.stringBox.hScene = this.stringBox.hTexture * SCALE_FACTOR
    }

    // -----------------------------------------------------------

    private refreshText() {
        this.sampleCoordinates()
        const S = settingsFor(this.cfg)

        this.particles = this.coords.map((c, i) => {
            const x = c.x * SCALE_FACTOR
            const y = c.y * SCALE_FACTOR
            // Reuse: a coordinate that survived this keystroke keeps the exact
            // bubble already inflating there. Respawning it would flatten the
            // whole word to nothing on every letter typed.
            const p = c.old && this.particles[i] ? this.particles[i] : makeBubble(x, y, S)
            if (c.toDelete) p.toDelete = true
            return p
        })

        this.recreateMesh()
    }

    /**
     * Draw the string, then walk the glyph mask a pixel at a time. Coordinates
     * carry `old` and `toDelete` flags, so the diff between two keystrokes is
     * what drives the fill and the collapse — the mask itself has no memory.
     */
    private sampleCoordinates() {
        const S = settingsFor(this.cfg)
        const lines = this.text.split("\n")
        const lineCount = Math.max(1, lines.length)

        this.textCanvas.width = this.stringBox.wTexture
        this.textCanvas.height = this.stringBox.hTexture
        if (!(this.stringBox.wTexture > 0 && this.stringBox.hTexture > 0)) {
            this.coords = []
            return
        }

        this.textCtx.font = `${S.fontStyle} ${S.weight} ${S.fontSize}px ${S.family}`
        // Chrome and Safari only; elsewhere the mask simply ignores tracking,
        // which is also what the measuring div would have done.
        if ("letterSpacing" in this.textCtx) (this.textCtx as any).letterSpacing = `${S.tracking}px`
        this.textCtx.fillStyle = "#ffffff"
        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height)
        for (let i = 0; i < lineCount; i++) {
            this.textCtx.fillText(lines[i], 0, ((i + 0.8) * this.stringBox.hTexture) / lineCount)
        }

        const w = this.textCanvas.width
        const h = this.textCanvas.height
        const data = this.textCtx.getImageData(0, 0, w, h).data
        const mask: boolean[][] = Array.from(Array(h), () => new Array(w))
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) mask[i][j] = data[(j + i * w) * 4] > 0
        }

        if (this.coords.length !== 0) {
            // Drop what finished collapsing last keystroke first, keeping
            // coordinate and particle indices in step — the reuse depends on it.
            const keptCoords: Coord[] = []
            const keptParticles: Particle[] = []
            this.coords.forEach((c, i) => {
                if (c.toDelete) return
                keptCoords.push(c)
                if (this.particles[i]) keptParticles.push(this.particles[i])
            })
            this.coords = keptCoords
            this.particles = keptParticles

            this.coords.forEach((c) => {
                if (mask[c.y] && mask[c.y][c.x]) {
                    c.old = true
                    if (!c.toDelete) mask[c.y][c.x] = false
                } else {
                    c.toDelete = true
                }
            })
        }

        for (let i = 0; i < h; i += S.step) {
            for (let j = 0; j < w; j += S.step) {
                if (mask[i][j] && this.coords.length < MAX_PARTICLES) {
                    this.coords.push({ x: j, y: i, old: false, toDelete: false })
                }
            }
        }
    }

    private recreateMesh() {
        if (this.mesh) {
            this.group.remove(this.mesh)
            this.mesh.dispose()
        }
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.particles.length)
        // The instance buffer starts zero-filled and a zero matrix collapses
        // every instance, so the first frame after a keystroke would be empty.
        const identity = new THREE.Matrix4()
        for (let i = 0; i < this.particles.length; i++) this.mesh.setMatrixAt(i, identity)
        this.mesh.instanceMatrix.needsUpdate = true
        this.mesh.frustumCulled = false
        this.mesh.position.x = -0.5 * this.stringBox.wScene
        this.mesh.position.y = -0.6 * this.stringBox.hScene
        this.group.add(this.mesh)
    }

    /**
     * `k` is elapsed frames at 60Hz, not seconds: the fill curve came from a
     * per-frame simulation, and normalising by it is what keeps a 144Hz display
     * from churning the foam two and a half times too fast.
     */
    private updateMatrices(dt: number) {
        if (!this.mesh) return
        const k = dt * 60
        const S = settingsFor(this.cfg)
        const hoverOn = this.cfg.hoverOn !== false

        // The mesh is offset by half the string box, so the pointer is moved into
        // that same space once here rather than per bubble.
        const localX = this.pointer.x + 0.5 * this.stringBox.wScene
        const localY = this.pointer.y + 0.6 * this.stringBox.hScene
        const radius = Math.max(0.001, S.hoverRadius)

        this.particles.forEach((p, i) => {
            if (p.toDelete) {
                // A deleted letter deflates rather than popping, so the word
                // reads as being wiped instead of exploding.
                p.scale -= S.growth * 6 * k
                if (p.scale < 0) p.scale = 0
            } else {
                p.scale += p.deltaScale * k
                if (p.scale >= p.maxScale) {
                    // Popped: rolls a new size and starts filling again.
                    p.scale = 0
                    p.maxScale = Math.pow(Math.random(), 3) * S.bubble
                    p.deltaScale = S.growth * (0.4 + Math.random())
                }
            }

            const y = this.stringBox.hScene - p.y

            let target = 0
            if (hoverOn && this.pointerOver) {
                const dx = p.x - localX
                // Measured from where the bubble sits at rest, not from where it
                // has floated to: chasing its own lifted position would make it
                // climb out of the cursor's reach and stall halfway.
                const dy = y - localY
                const d = Math.sqrt(dx * dx + dy * dy)
                // Squared falloff rather than linear: a linear one has a visible
                // straight edge at the rim of the reach.
                const near = Math.max(0, 1 - d / radius)
                target = near * near
            }
            // Eased, never switched, so the foam lifts and settles instead of
            // jumping as the pointer crosses it.
            p.hover += (target - p.hover) * (1 - Math.exp(-dt * 5))
            p.lift = p.hover * S.hoverLift * p.riseJitter

            this.dummy.quaternion.identity()
            this.dummy.position.set(p.x, y + p.lift, p.z)
            this.dummy.scale.setScalar(Math.max(0, p.scale))
            this.dummy.updateMatrix()
            this.mesh!.setMatrixAt(i, this.dummy.matrix)
        })
        this.mesh.instanceMatrix.needsUpdate = true
    }

    // -----------------------------------------------------------

    /**
     * The frustum is the frame, converted straight into world units. It knows
     * nothing about the string, which is the whole point: a camera fitted to the
     * word would cancel the font size out and leave the type reading one size at
     * every setting.
     */
    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const spanH = this.height * SCALE_FACTOR

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, CAM_DISTANCE)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov = 2 * Math.atan(spanH / 2 / CAM_DISTANCE) * (180 / Math.PI)
        this.camera.near = 0.1
        this.camera.far = CAM_DISTANCE + 100
        this.camera.updateProjectionMatrix()
    }

    start() {
        this.lastT = performance.now()
        // A text cursor, because clicking it starts an edit — there is nothing
        // left to drag.
        this.renderer.domElement.style.cursor = "text"
        const loop = () => {
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
        // A tab that was backgrounded for a minute must not teleport the foam.
        if (dt > 0.05) dt = 0.05

        this.updateMatrices(dt)
        this.renderer.render(this.scene, this.camera)
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.updateCamera()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.prev
        this.cfg = cfg
        this.prev = { ...cfg }

        const fontChanged = JSON.stringify(cfg.font) !== JSON.stringify(prev.font)

        // Only the controls baked into each bubble at spawn force a re-seed; a
        // colour or an edge-glow drag must never restart the fill.
        // Density moves which mask pixels are sampled at all, so the whole
        // field has to be laid out again rather than nudged.
        const reseed = cfg.scatter !== prev.scatter || cfg.density !== prev.density

        if (fontChanged || reseed) {
            if (fontChanged) this.applyInputStyle()
            if (reseed) {
                this.coords = []
                this.particles = []
            }
            this.handleInput()
            this.refreshText()
        } else if (cfg.text !== prev.text) {
            this.setText(cfg.text)
        }

        const S = settingsFor(cfg)
        this.material.uniforms.uTint.value.set(cfg.tint || DEFAULTS.tint)
        this.material.uniforms.uBody.value = S.opacity
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)

        this.input.removeEventListener("keyup", this.onEdit)
        this.input.removeEventListener("input", this.onEdit)
        this.container.removeEventListener("pointerdown", this.onPointerDown)
        this.container.removeEventListener("pointermove", this.onPointerMove)
        this.container.removeEventListener("pointerleave", this.onPointerLeave)
        this.container.removeEventListener("pointercancel", this.onPointerLeave)

        if (this.mesh) {
            this.group.remove(this.mesh)
            this.mesh.dispose()
            this.mesh = null
        }
        this.geometry.dispose()
        this.material.dispose()
        this.scene.clear()
        this.renderer.dispose()
        this.renderer.domElement.remove()
        this.input.remove()
    }
}

// ---------------------------------------------------------------

export interface BubbleTypeProps {
    text?: string
    font?: FontValue
    tint?: string
    opacity?: number
    bubbleSize?: number
    density?: number
    speed?: number
    scatter?: number
    hoverOn?: boolean
    hover?: HoverOptions
    style?: React.CSSProperties
}

function __BaseImpl_BubbleType(props: BubbleTypeProps) {
    const {
        text = DEFAULTS.text,
        font = DEFAULT_FONT,
        tint = DEFAULTS.tint,
        opacity = DEFAULTS.opacity,
        bubbleSize = DEFAULTS.bubbleSize,
        density = DEFAULTS.density,
        speed = DEFAULTS.speed,
        scatter = DEFAULTS.scatter,
        hoverOn = DEFAULTS.hoverOn,
        hover = DEFAULTS.hover,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<BubbleTypeScene | null>(null)
    const cfgRef = useRef<Config>(null as any)

    cfgRef.current = {
        text,
        font: font ?? {},
        tint,
        opacity,
        bubbleSize,
        density,
        speed,
        scatter,
        hoverOn,
        // An instance placed before the group existed has no object on it.
        hover: hover ?? DEFAULTS.hover,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: BubbleTypeScene
        try {
            scene = new BubbleTypeScene(container, cfgRef.current)
        } catch {
            // No WebGL — leave an empty frame rather than throwing on the canvas.
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
        // The font object is a new identity on every render, so depend on content.
    }, [
        text,
        JSON.stringify(font),
        tint,
        opacity,
        bubbleSize,
        density,
        speed,
        scatter,
        hoverOn,
        JSON.stringify(hover),
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Typed text blown as soap bubbles. Click it and type; move across it to float them up."
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

BubbleType.displayName = "Bubble Type"

const __presetProps = {
  "text": "BUBBLES",
  "tint": "#FFFFFF",
  "opacity": 12,
  "bubbleSize": 20,
  "density": 18,
  "speed": 8,
  "scatter": 10,
  "hoverOn": true
};

export default function BubbleType(props: Record<string, unknown>) {
  return <__BaseImpl_BubbleType {...(__presetProps as Record<string, unknown>)} {...props} />;
}
