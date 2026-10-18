"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Ascii Sphere — a globe of typed characters turning under a lamp you carry.
 *
 * A pixel inside the disc is a point on the sphere: the third coordinate is
 * whatever is left of the unit radius, and that one square root is the entire
 * projection. No camera, no geometry, no matrix.
 *
 * The grid is latitude and longitude, and the number of columns in a band comes
 * from the cosine of its latitude, so a character near the pole is about as wide
 * as one at the equator. A fixed column count is the obvious version and it
 * crushes the polar bands into slivers — the same failure as a polar grid drawn
 * with fixed slots.
 *
 * Whatever is typed into the panel is drawn once into an atlas on a canvas and
 * handed over as a texture, one cell per character. An earlier version carried
 * a table of hand-drawn bitmaps, which was a lot of code that could only ever
 * show the ten characters somebody had sat down and drawn — and each of those
 * at whatever resolution had been picked for the table. The atlas is redrawn
 * only when the text changes; every other control is a uniform write.
 *
 * The light sets how brightly a character is drawn and never which character it
 * is. Picking the glyph off a blank-to-solid ramp by brightness is how a
 * terminal draws a gradient, and it is what this did at first: the lit face ran
 * to the top of the ramp and filled in as a patch of solid blocks, so the
 * characters disappeared exactly where the lamp was pointing. Each cell keeps
 * one glyph, hashed from its own coordinates, and turns with the surface.
 *
 * The grid turns with the sphere while the lamp stays where the pointer put it,
 * which is what sells it as a solid: characters travel across a terminator that
 * does not travel with them. Lighting the grid instead of the surface leaves the
 * shading pinned to the mesh and the globe reads as painted.
 *
 * Everything a character needs is read at the middle of its cell, latitude and
 * longitude both. Read at the pixel, the shading contour slices glyphs in half
 * and the surface stops reading as characters.
 */

/*
 * How fast the lamp chases the cursor, per second. It has to lag a little, or
 * the light reads as painted onto the pointer rather than as something the
 * sphere is sitting under.
 */
const CURSOR_FOLLOW = 8.5

/** How many pixels of atlas each character gets. */
const ATLAS_TILE = 64

/*
 * Past this the atlas stops being cheap and the characters stop being
 * distinguishable at the size they are drawn anyway. Anything beyond is
 * dropped, and the panel says so rather than quietly truncating.
 */
const MAX_GLYPHS = 64

/* A stack with kana coverage on every platform, falling back to whatever the
 * machine calls monospace. */
const FONT_STACK =
    '"Hiragino Kaku Gothic ProN", "Yu Gothic", "MS Gothic", "Noto Sans JP", "Apple SD Gothic Neo", monospace'

const DEFAULTS = {
    ink: "#002FFF",
    lit: "#FFFFFF",
    characters: "1234567890",
    charSize: 20,
    gap: 0,
    spin: 8,
    direction: "left",
    tilt: 11,
    contrast: 20,
    scale: 84,
}

type Config = {
    ink: string
    lit: string
    characters: string
    charSize: number
    gap: number
    spin: number
    direction: "left" | "right"
    tilt: number
    contrast: number
    scale: number
}

type Atlas = { texture: THREE.CanvasTexture; count: number; side: number }

/**
 * Draw one cell per character. The grid is square and its side is rounded up to
 * a power of two: mipmaps are what keep the characters from sparkling where the
 * sphere compresses them at the rim, and a texture that is not a power of two
 * cannot be trusted to have them on every context.
 */
function buildAtlas(text: string): Atlas | null {
    const typed = Array.from(text ?? "").filter((ch) => ch.trim().length > 0)
    const list = (typed.length ? typed : Array.from(DEFAULTS.characters)).slice(
        0,
        MAX_GLYPHS
    )

    const need = Math.max(1, Math.ceil(Math.sqrt(list.length)))
    const side = 1 << Math.ceil(Math.log2(need))

    const canvas = document.createElement("canvas")
    canvas.width = side * ATLAS_TILE
    canvas.height = side * ATLAS_TILE
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    /*
     * Drawn at under three quarters of the cell. The quarter left over is what
     * stops a neighbouring character bleeding in through the filtering, which
     * shows up as ghost strokes hanging off every glyph.
     */
    ctx.font = `${Math.round(ATLAS_TILE * 0.7)}px ${FONT_STACK}`

    list.forEach((ch, i) => {
        const x = ((i % side) + 0.5) * ATLAS_TILE
        const y = (Math.floor(i / side) + 0.5) * ATLAS_TILE
        ctx.fillText(ch, x, y)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.generateMipmaps = true
    texture.needsUpdate = true

    return { texture, count: list.length, side }
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    /*
     * Both in radians of latitude, because that is the one thing a sphere fixes
     * for you: pole to pole is half a turn and no control can change it. The
     * character keeps the height it is given and the gap is added after it, so
     * the two of them together decide how many rows fit — the count is the
     * derived value, not the character size.
     *
     * A panel that sets the row count directly is the obvious version and it is
     * what this had at first. With the grid already pinned there is nothing for
     * a gap to open into, so widening it could only shrink the type inside a
     * cell that never moved.
     */
    const charAngle = 0.035 + clamp(cfg.charSize, 1, 20, DEFAULTS.charSize) * 0.0075
    const gapAngle = clamp(cfg.gap, 0, 20, DEFAULTS.gap) * 0.006
    // Whole rows only, so the top and bottom ones land square on the poles.
    const bands = Math.max(4, Math.round(Math.PI / (charAngle + gapAngle)))
    return {
        bands,
        /*
         * Worked back out of the rounded count rather than from the pitch that
         * was asked for, so the rounding lands in the gap and a character comes
         * out exactly the size the panel says.
         */
        fill: Math.min(1, (charAngle * bands) / Math.PI),
        // Turns per second.
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.035,
        heading: cfg.direction === "left" ? -1 : 1,
        // Radians the axis leans back, so the poles show. A quarter turn would
        // lay the globe flat and the bands would read as rings, not as a globe.
        tilt: clamp(cfg.tilt, 0, 20, DEFAULTS.tilt) * 0.035,
        // Reversed: a high panel value is a low exponent, which spreads the lit
        // side further round and leaves less of the globe in the dark.
        gamma: 2.0 - clamp(cfg.contrast, 1, 20, DEFAULTS.contrast) * 0.07,
        scale: clamp(cfg.scale, 20, 200, DEFAULTS.scale) / 100,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera object is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const SPHERE_FRAGMENT = /* glsl */ `
    precision highp float;

    #define PI 3.14159265359
    #define TAU 6.28318530718

    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uHold;
    uniform float uTurn;
    uniform vec3 uInk;
    uniform vec3 uLit;
    uniform float uBands;
    uniform float uFill;
    uniform float uTilt;
    uniform float uGamma;
    uniform float uScale;
    uniform sampler2D uAtlas;
    uniform float uCount;
    uniform float uSide;

    varying vec2 vUv;

    float hash2(vec2 v) {
        return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453123);
    }

    /** The coverage of one character of the atlas, at g across its own cell. */
    float glyphAt(float idx, vec2 g) {
        float col = mod(idx, uSide);
        float row = floor(idx / uSide);
        // The canvas was drawn top down and the texture is read bottom up, so
        // the row is counted from the far end.
        vec2 t = vec2((col + g.x) / uSide, 1.0 - (row + 1.0 - g.y) / uSide);
        return texture2D(uAtlas, t).a;
    }

    void main() {
        vec2 centre = uResolution * 0.5;
        float unit = min(uResolution.x, uResolution.y) * 0.5 * uScale;
        vec2 c = (vUv * uResolution - centre) / unit;

        float r2 = dot(c, c);
        // Outside the disc there is no sphere to be on.
        if (r2 > 1.0) discard;
        // Whatever is left of the unit radius. That square root is the whole
        // projection.
        vec3 v = vec3(c.x, c.y, sqrt(1.0 - r2));

        // Lean the axis back so the poles come into view. Applied to the point
        // rather than to the grid, so the lamp stays put in the frame.
        float ct = cos(uTilt);
        float st = sin(uTilt);
        vec3 s = vec3(v.x, ct * v.y - st * v.z, st * v.y + ct * v.z);

        float lat = asin(clamp(s.y, -1.0, 1.0));
        float ry = (lat / PI + 0.5) * uBands;
        float band = floor(ry);
        // The middle of the band, so every character in it is the same width
        // and the shading is read at one place rather than smeared across it.
        float latMid = ((band + 0.5) / uBands - 0.5) * PI;
        float cosLat = max(cos(latMid), 0.001);

        /*
         * Columns thin out toward the poles by the cosine of the latitude, which
         * is what keeps a polar character as wide as an equatorial one. A fixed
         * count crushes the caps into slivers.
         */
        float cols = max(4.0, floor(uBands * 2.0 * cosLat));

        float lon = atan(s.x, s.z);
        float cx = fract(lon / TAU + 0.5 + uTurn) * cols;
        float col = floor(cx);

        // The character keeps to the middle of its cell, by the same share in
        // both directions, so the gap opens around it and around the columns
        // alike and nothing is squashed out of shape.
        float span = max(uFill, 0.001);
        vec2 g = (vec2(fract(cx), fract(ry)) - (1.0 - span) * 0.5) / span;
        if (g.x < 0.0 || g.x > 1.0 || g.y < 0.0 || g.y > 1.0) discard;

        /*
         * Hashed from the cell's own coordinates, so a character belongs to the
         * surface and rides round with it. Chosen by brightness instead, the lit
         * face runs to the top of a ramp and fills in solid exactly where the
         * lamp is pointing.
         */
        float idx = min(floor(hash2(vec2(band, col)) * uCount), uCount - 1.0);
        float ink = glyphAt(idx, g);
        if (ink < 0.03) discard;

        // Back to a direction on the sphere, at the middle of the cell.
        float lonMid = ((col + 0.5) / cols - 0.5 - uTurn) * TAU;
        vec3 mid = vec3(cosLat * sin(lonMid), sin(latMid), cosLat * cos(lonMid));
        // Undo the lean, so the lamp is measured in the frame it lives in.
        vec3 midW = vec3(mid.x, ct * mid.y + st * mid.z, -st * mid.y + ct * mid.z);

        // The lamp sits where the pointer left it, out in front of the frame.
        vec2 pd = (uPointer - centre) / unit;
        vec3 lampOn = normalize(vec3(pd, 0.85));
        vec3 lampOff = normalize(vec3(-0.45, 0.5, 0.8));
        vec3 lamp = normalize(mix(lampOff, lampOn, uHold));

        float lambert = max(dot(midW, lamp), 0.0);
        // A little ambient, or the dark side is a hard-edged bite out of the
        // disc rather than a globe with a night on it.
        float level = clamp(pow(lambert, uGamma) * 0.94 + 0.06, 0.0, 1.0);

        // Squared, so only the face turned right at the lamp takes the full
        // light and the shoulders keep their colour.
        vec3 colr = mix(uInk, uLit, level * level);
        // The atlas is antialiased, so its coverage carries the edge of every
        // character rather than a hard cut.
        float a = ink * (0.22 + 0.78 * level);

        // Premultiplied, so the frame shows between the characters.
        gl_FragColor = vec4(colr * a, a);
    }
`

class SphereScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh
    private atlas: Atlas | null = null
    private atlasText = ""

    private target = new THREE.Vector2(-1e4, -1e4)
    private eased = new THREE.Vector2(-1e4, -1e4)
    private hold = 0
    private wantHold = 0
    private turn = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: SPHERE_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uPointer: { value: new THREE.Vector2(-1e4, -1e4) },
                uHold: { value: 0 },
                uTurn: { value: 0 },
                uInk: { value: new THREE.Color(cfg.ink) },
                uLit: { value: new THREE.Color(cfg.lit) },
                uBands: { value: S.bands },
                uFill: { value: S.fill },
                uTilt: { value: S.tilt },
                uGamma: { value: S.gamma },
                uScale: { value: S.scale },
                uAtlas: { value: null },
                uCount: { value: 1 },
                uSide: { value: 1 },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.setText(cfg.characters)

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        el.addEventListener("pointermove", this.onPointerMove)
        el.addEventListener("pointerdown", this.onPointerMove)
        el.addEventListener("pointerleave", this.onPointerLeave)
        el.addEventListener("pointercancel", this.onPointerLeave)
    }

    /** Redraw the atlas. The only thing in here that allocates. */
    private setText(text: string) {
        const built = buildAtlas(text ?? DEFAULTS.characters)
        if (!built) return
        // The old texture goes only once the new one is in hand, so a failed
        // build leaves the sphere drawing what it was drawing before.
        this.atlas?.texture.dispose()
        this.atlas = built
        this.atlasText = text
        const u = this.material.uniforms
        u.uAtlas.value = built.texture
        u.uCount.value = built.count
        u.uSide.value = built.side
    }

    private onPointerMove = (e: PointerEvent) => {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        // The shader works in device pixels, so the pointer arrives in them too.
        const x = ((e.clientX - rect.left) / rect.width) * this.width
        const y = (1 - (e.clientY - rect.top) / rect.height) * this.height
        this.target.set(x, y)
        if (this.wantHold === 0) this.eased.copy(this.target)
        this.wantHold = 1
    }

    private onPointerLeave = () => {
        this.wantHold = 0
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        loop()
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.renderer.setSize(width, height, false)
        const dpr = this.renderer.getPixelRatio()
        this.width = width * dpr
        this.height = height * dpr
        this.material.uniforms.uResolution.value.set(this.width, this.height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const u = this.material.uniforms
        u.uInk.value.set(cfg.ink || DEFAULTS.ink)
        u.uLit.value.set(cfg.lit || DEFAULTS.lit)
        // Only the text owns the atlas. Dragging a colour must not redraw it.
        if (cfg.characters !== this.atlasText) this.setText(cfg.characters)
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not spin the globe through a dozen turns.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        // Folded to one turn, so the phase never grows large enough to lose
        // precision over a long session. A whole turn leaves the globe exactly
        // where it was, so the fold is invisible.
        this.turn = (this.turn + dt * S.spin * S.heading) % 1
        this.eased.lerp(this.target, 1 - Math.exp(-dt * CURSOR_FOLLOW))
        this.hold += (this.wantHold - this.hold) * (1 - Math.exp(-dt * 5))

        const u = this.material.uniforms
        u.uTurn.value = this.turn
        u.uPointer.value.copy(this.eased)
        u.uHold.value = this.hold
        // Everything below is a share of the disc, so none of it needs the
        // device pixel ratio applied.
        u.uBands.value = S.bands
        u.uFill.value = S.fill
        u.uTilt.value = S.tilt
        u.uGamma.value = S.gamma
        u.uScale.value = S.scale

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointermove", this.onPointerMove)
        el.removeEventListener("pointerdown", this.onPointerMove)
        el.removeEventListener("pointerleave", this.onPointerLeave)
        el.removeEventListener("pointercancel", this.onPointerLeave)
        this.atlas?.texture.dispose()
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface AsciiSphereProps {
    ink?: string
    lit?: string
    characters?: string
    charSize?: number
    gap?: number
    spin?: number
    direction?: "left" | "right"
    tilt?: number
    contrast?: number
    scale?: number
    style?: React.CSSProperties
}

export default function AsciiSphere(props: AsciiSphereProps) {
    const {
        ink = DEFAULTS.ink,
        lit = DEFAULTS.lit,
        characters = DEFAULTS.characters,
        charSize = DEFAULTS.charSize,
        gap = DEFAULTS.gap,
        spin = DEFAULTS.spin,
        direction = DEFAULTS.direction as "left" | "right",
        tilt = DEFAULTS.tilt,
        contrast = DEFAULTS.contrast,
        scale = DEFAULTS.scale,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<SphereScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        ink,
        lit,
        characters,
        charSize,
        gap,
        spin,
        direction,
        tilt,
        contrast,
        scale,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: SphereScene
        try {
            scene = new SphereScene(container, cfgRef.current)
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
    }, [ink, lit, characters, charSize, gap, spin, direction, tilt, contrast, scale])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A globe of characters turning under a lamp carried by the pointer"
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

AsciiSphere.displayName = "Ascii Sphere"
AsciiSphere.defaultProps = { ...DEFAULTS }
