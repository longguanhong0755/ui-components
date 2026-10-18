"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Pixel Distortion — a photograph smeared by the pointer, as if the pixels were
 * a shallow tray of liquid the cursor drags a finger through.
 *
 * Port of akella/DistortedPixels (Codrops, MIT), kept mechanism-for-mechanism.
 *
 * The trick is that nothing about the image moves. A second, tiny texture — a
 * coarse grid, one texel per cell — holds a velocity field: red is horizontal
 * push, green is vertical. Each frame the CPU multiplies the whole field by a
 * relaxation factor just under 1, then adds the pointer's own frame-to-frame
 * velocity into every cell within a radius, weighted by 1/distance. The fragment
 * shader does one thing with it: reads its cell and offsets the image lookup by
 * it. Because the grid is sampled with NearestFilter the offset is constant
 * across a whole cell, so the image tears into hard rectangular blocks rather
 * than warping smoothly — that blockiness is the entire look, and a LinearFilter
 * here gives an ordinary heat-haze ripple instead.
 *
 * The field is seeded with noise rather than zeros, so an instance opens
 * scrambled and relaxes into the photograph over the first second. That is the
 * original's load-in, not a bug.
 *
 * Two departures from the source, both forced by living outside a full-page
 * demo: pointer coordinates are taken relative to the picture's own box (the
 * original divides raw clientX by the canvas width, which only lines up
 * fullscreen), and every per-frame factor is raised to the power of dt*60
 * instead of applied once per frame, so a 120Hz display smears the same distance
 * as a 60Hz one rather than twice as far.
 */

/**
 * How far a full-strength cell drags the image lookup, in uv. The original pins
 * it in the shader and lets Strength scale the field feeding it; kept that way,
 * because the two multiply and a panel carrying both is two controls for one
 * number.
 */
const DISPLACE = 0.02

/** Above this the per-frame pass over the field costs more than the look gains. */
const MAX_GRID = 620

/** How far the picture may slide inside its own box, in px. */
const OFFSET_RANGE = 250

/** The Image row. Kept as one constant so the signature and the panel's
 * `defaultValue` can never drift apart. */
const DEFAULT_IMAGE = {
    image: {"image":{"src":"https://images.unsplash.com/photo-1732055351144-2a4d5b452f69?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDQ5fHx8ZW58MHx8fHx8"},"offsetY":55},
    offsetY: 0,
}

const DEFAULTS = {
    image: {"image":{"src":"https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800"},"offsetY":26},
    imageWidth: 600,
    imageHeight: 400,
    fit: "cover",
    grid: 20,
    cursorRadius: 160,
    strength: 5,
    settle: 9,
}

type ResponsiveImage = { src?: string; srcSet?: string; alt?: string } | string

/** One Image row: the picture, and where it sits inside its own box. A bare
 * responsive image is what an older instance holds — and what
 * `ControlType.ResponsiveImage`'s own string/object shapes are — so both still
 * resolve. */
type ImageEntry =
    | { image?: ResponsiveImage; offsetY?: number }
    | ResponsiveImage

type Config = {
    image: ImageEntry
    imageWidth: number
    imageHeight: number
    fit: "cover" | "contain"
    grid: number
    cursorRadius: number
    strength: number
    settle: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

function srcOf(image: ResponsiveImage): string {
    if (typeof image === "string") return image
    return image?.src ?? ""
}

function altOf(image: ResponsiveImage): string {
    if (typeof image === "string") return ""
    return image?.alt ?? ""
}

/** Unwrap an entry that may be a full row or a bare image. */
function imageOf(entry: ImageEntry): ResponsiveImage {
    if (entry && typeof entry === "object" && "image" in entry) {
        return (entry.image ?? "") as ResponsiveImage
    }
    return entry as ResponsiveImage
}

function offsetOf(entry: ImageEntry): number {
    if (entry && typeof entry === "object" && "offsetY" in entry) {
        const n = entry.offsetY
        return typeof n === "number" && isFinite(n) ? n : 0
    }
    return 0
}

/** Panel values are whole numbers; the field wants the real ones. */
function settingsFor(cfg: Config) {
    const grid = clamp(cfg.grid, 1, 20, DEFAULTS.grid)
    const settle = clamp(cfg.settle, 1, 20, DEFAULTS.settle)
    return {
        // Squared, because cell size is what the eye reads and it shrinks fast:
        // 1 is a handful of huge slabs, 20 is close to per-pixel and the smear
        // reads as liquid again. Linear would spend most of the slider fine.
        grid: Math.min(MAX_GRID, Math.round(5 + grid * grid * 1.5)),
        // Straight through: the wake is measured in the picture's own pixels,
        // so the number in the panel is the number on screen and it does not
        // shift when Width, Height or Grid change. The source expressed it as a
        // fraction of the grid, which meant every one of those moved it.
        radiusPx: clamp(cfg.cursorRadius, 40, 400, DEFAULTS.cursorRadius),
        strength: clamp(cfg.strength, 0, 20, DEFAULTS.strength) * 0.03,
        // Reversed here, never in the loop: the field survives by being
        // multiplied by a number just under 1, so a high panel value has to mean
        // a *smaller* factor. 12 lands on the original's 0.9.
        relaxation: 0.99 - settle * 0.0075,
        cardW: clamp(cfg.imageWidth, 40, 4000, DEFAULTS.imageWidth),
        cardH: clamp(cfg.imageHeight, 40, 4000, DEFAULTS.imageHeight),
        // Straight through, in the picture's own CSS pixels. The shader is the
        // one place the bottom-up uv axis is dealt with, so the number here is
        // still "px down the screen".
        offsetY: clamp(offsetOf(cfg.image), -OFFSET_RANGE, OFFSET_RANGE, 0),
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

const DISTORT_FRAGMENT = /* glsl */ `
uniform sampler2D uTexture;
uniform sampler2D uDataTexture;
uniform vec2 uFrame;      // the Framer frame, in CSS px
uniform vec2 uCard;       // the picture's own box inside it, in CSS px
uniform vec2 uImageRes;   // the photograph's own pixel size
uniform float uOffsetY;   // px the picture slides inside its own box
uniform float uContain;

varying vec2 vUv;

void main() {
    // Frame uv -> the card's own 0..1, so Width and Height carve a box out of
    // the middle of the frame and everything outside it stays empty. The field
    // is read in this space too, so the blocks stay square to the picture rather
    // than to the frame around it.
    vec2 cardUv = (vUv * uFrame - (uFrame - uCard) * 0.5) / uCard;
    vec2 edge = step(vec2(0.0), cardUv) * step(cardUv, vec2(1.0));
    float card = edge.x * edge.y;

    float ri = uImageRes.x / max(uImageRes.y, 1.0);
    vec2 heightMatched = vec2(uCard.y * ri, uCard.y);
    vec2 widthMatched = vec2(uCard.x, uCard.x / ri);
    bool imageIsWider = (uCard.x / max(uCard.y, 1.0)) < ri;
    // Cover takes whichever box overflows the card; contain takes the other one.
    // Same pair of candidates, picked the opposite way round.
    vec2 box = uContain > 0.5
        ? (imageIsWider ? widthMatched : heightMatched)
        : (imageIsWider ? heightMatched : widthMatched);
    // Y Offset slides the picture inside its own box, and nothing else: the box
    // itself, the frame around it and the field sampled over it all stay put,
    // so dragging the slider re-frames the photograph rather than moving the
    // card. Written as "centred, then nudged", so 0 is the crop the box would
    // have had anyway — the same reading as objectPosition: 50% calc(50% +
    // Npx) on the DOM components here. Cover slides along its crop overflow;
    // contain slides in its letterbox slack and is clipped at the box edge.
    // Screen uv runs bottom-up, so pushing the sample point up the texture is
    // what moves the picture down: positive is down, as everywhere else.
    vec2 anchored = cardUv * uCard + (box - uCard) * 0.5 + vec2(0.0, uOffsetY);
    vec2 imageUv = anchored / box;

    vec4 offset = texture2D(uDataTexture, cardUv);
    vec2 smeared = imageUv - ${DISPLACE.toFixed(3)} * offset.rg;
    vec4 color = texture2D(uTexture, smeared);

    if (uContain > 0.5) {
        // Contain has real picture edges, and dragging one past its border
        // should leave nothing behind. Cover has none — its lookup sits inside
        // the crop until the smear pushes it out, and clamping there is what
        // stretches the border pixels the way the original does.
        vec2 inside = step(vec2(0.0), smeared) * step(smeared, vec2(1.0));
        color.a *= inside.x * inside.y;
    }

    gl_FragColor = vec4(color.rgb, color.a * card);
}
`

/** One texture per URL per document, shared by every instance on the page. */
const textureCache = new Map<string, THREE.Texture>()
const texturePending = new Map<string, Promise<THREE.Texture | null>>()

function loadTexture(url: string): Promise<THREE.Texture | null> {
    const cached = textureCache.get(url)
    if (cached) return Promise.resolve(cached)
    const pending = texturePending.get(url)
    if (pending) return pending
    const p = new Promise<THREE.Texture | null>((resolve) => {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        loader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                // A strong smear drags the lookup well outside 0..1; clamping is
                // what turns that into stretched edge pixels instead of the
                // image tiling back in on itself.
                texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
                texture.minFilter = THREE.LinearFilter
                textureCache.set(url, texture)
                resolve(texture)
            },
            undefined,
            () => resolve(null)
        )
    })
    texturePending.set(url, p)
    return p
}

class PixelDistortionScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry: THREE.PlaneGeometry
    private material: THREE.ShaderMaterial
    private data!: THREE.DataTexture
    private size = 0
    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false
    private loadToken = 0

    /**
     * Normalised to the picture's box, plus the frame-to-frame delta that feeds
     * the field. `seen` suppresses the first move: prev starts at the centre, so
     * without it the opening event reads as one huge flick from mid-frame.
     */
    private mouse = {
        x: 0.5,
        y: 0.5,
        prevX: 0.5,
        prevY: 0.5,
        vX: 0,
        vY: 0,
        seen: false,
    }

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        const canvas = this.renderer.domElement
        canvas.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;display:block"
        container.appendChild(canvas)

        this.buildField()

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: null },
                uDataTexture: { value: this.data },
                uFrame: { value: new THREE.Vector2(1, 1) },
                uCard: { value: new THREE.Vector2(1, 1) },
                uImageRes: { value: new THREE.Vector2(1, 1) },
                uOffsetY: { value: 0 },
                uContain: { value: 0 },
            },
            vertexShader: QUAD_VERTEX,
            fragmentShader: DISTORT_FRAGMENT,
            // The picture is a box inside the frame, so everything around it has
            // to let the Framer fill behind show through.
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
        quad.frustumCulled = false
        this.geometry = quad.geometry as THREE.PlaneGeometry
        this.scene.add(quad)

        this.applyLayout()
        this.loadImage()
        window.addEventListener("pointermove", this.onPointerMove, {
            passive: true,
        })
    }

    /**
     * The velocity field. Seeded with noise on the same scale the pointer writes
     * at, so the first second plays as the image un-scrambling — the original's
     * load-in. Zeros would open on a clean photograph and give nothing away
     * about what the component does until a pointer arrives.
     */
    private buildField() {
        const S = settingsFor(this.cfg)
        this.size = S.grid
        const count = this.size * this.size
        // RGBA, not RGB: three removed RGBFormat, and a three-component float
        // texture is no longer a valid upload. Only rg is ever read.
        const data = new Float32Array(4 * count)
        for (let i = 0; i < count; i++) {
            const stride = i * 4
            data[stride] = Math.random() * 255 - 125
            data[stride + 1] = Math.random() * 255 - 125
            data[stride + 3] = 1
        }
        const texture = new THREE.DataTexture(
            data,
            this.size,
            this.size,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        // The whole effect. Linear interpolates neighbouring cells and the hard
        // blocks dissolve into an ordinary smooth ripple.
        texture.magFilter = texture.minFilter = THREE.NearestFilter
        texture.needsUpdate = true

        this.data?.dispose()
        this.data = texture
        if (this.material) this.material.uniforms.uDataTexture.value = texture
    }

    private loadImage() {
        const url = srcOf(imageOf(this.cfg.image))
        const token = ++this.loadToken
        if (!url) {
            this.material.uniforms.uTexture.value = null
            return
        }
        loadTexture(url).then((texture) => {
            if (this.disposed || token !== this.loadToken || !texture) return
            this.material.uniforms.uTexture.value = texture
            const image: any = texture.image
            // Fill and Y Offset are solved against this, so a picture whose
            // dimensions arrive late has to re-run the layout.
            ;(this.material.uniforms.uImageRes.value as THREE.Vector2).set(
                image?.width || 1,
                image?.height || 1
            )
            this.applyLayout()
        })
    }

    /**
     * Everything the framing controls own, written as uniforms. The picture is a
     * box of CSS pixels centred in the frame — the same arrangement as the other
     * image components here, where the frame is the placement and Width and
     * Height are the picture sitting inside it.
     */
    private applyLayout() {
        const S = settingsFor(this.cfg)
        ;(this.material.uniforms.uFrame.value as THREE.Vector2).set(
            this.width,
            this.height
        )
        ;(this.material.uniforms.uCard.value as THREE.Vector2).set(
            S.cardW,
            S.cardH
        )
        this.material.uniforms.uOffsetY.value = S.offsetY
        this.material.uniforms.uContain.value =
            this.cfg.fit === "contain" ? 1 : 0
    }

    private onPointerMove = (e: PointerEvent) => {
        if (this.disposed) return
        const rect = this.container.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        const S = settingsFor(this.cfg)
        const m = this.mouse
        // Picture space, not frame space: the field is sampled in the picture's
        // own uv, so a pointer measured against the frame would push cells the
        // picture never shows and miss the ones it does.
        m.x = (e.clientX - rect.left - (rect.width - S.cardW) / 2) / S.cardW
        m.y = (e.clientY - rect.top - (rect.height - S.cardH) / 2) / S.cardH
        if (m.seen) {
            m.vX = m.x - m.prevX
            m.vY = m.y - m.prevY
        }
        m.seen = true
        m.prevX = m.x
        m.prevY = m.y
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        this.applyLayout()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        // Only the grid owns a buffer. Everything else is a uniform write or is
        // read out of cfg by the field pass every frame. The original rebuilt on
        // every resize, which re-seeded the noise and re-scrambled the picture
        // each time a window edge moved.
        if (cfg.grid !== prev.grid) this.buildField()
        if (srcOf(imageOf(cfg.image)) !== srcOf(imageOf(prev.image)))
            this.loadImage()
        this.applyLayout()
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
        // A returning tab must not deposit a second of accumulated push at once.
        if (dt > 0.05) dt = 0.05

        this.updateField(dt)
        this.renderer.render(this.scene, this.camera)
    }

    /**
     * One pass of the simulation. Every factor here is written per 60Hz frame
     * and then raised to `k`, because the source applies each of them exactly
     * once per frame — on a 120Hz display that decays twice as fast and pushes
     * twice as hard, and the smear comes out a different length.
     */
    private updateField(dt: number) {
        const S = settingsFor(this.cfg)
        const k = dt * 60
        const data = this.data.image.data as Float32Array
        const size = this.size

        const relax = Math.pow(S.relaxation, k)
        for (let i = 0; i < data.length; i += 4) {
            data[i] *= relax
            data[i + 1] *= relax
        }

        const m = this.mouse
        const gridMouseX = size * m.x
        const gridMouseY = size * (1 - m.y)
        const radius = S.radiusPx
        const radiusSq = radius * radius
        // How much of the picture one cell covers. Distances are converted
        // through these into picture pixels, so the wake is a true circle on a
        // box of any aspect. The source measured in grid units with the x term
        // divided by the aspect, which stretched the wake wider than tall on
        // anything but a square.
        const pxPerCellX = S.cardW / size
        const pxPerCellY = S.cardH / size
        const push = S.strength * 100 * k

        // The source walks the whole grid and distance-tests every cell. Only
        // cells within the radius can ever be written — identical output, and at
        // the top of the Grid slider it is the difference between touching 380k
        // cells a frame and a few thousand.
        const spanI = Math.ceil(radius / pxPerCellX)
        const spanJ = Math.ceil(radius / pxPerCellY)
        const i0 = Math.max(0, Math.floor(gridMouseX - spanI))
        const i1 = Math.min(size - 1, Math.ceil(gridMouseX + spanI))
        const j0 = Math.max(0, Math.floor(gridMouseY - spanJ))
        const j1 = Math.min(size - 1, Math.ceil(gridMouseY + spanJ))

        for (let i = i0; i <= i1; i++) {
            const dx = (gridMouseX - i) * pxPerCellX
            const xTerm = dx * dx
            for (let j = j0; j <= j1; j++) {
                const dy = (gridMouseY - j) * pxPerCellY
                const distance = xTerm + dy * dy
                if (distance >= radiusSq) continue

                // 1/distance, not a smooth falloff: it is what makes the cell
                // under the cursor lurch while its neighbours only lean. Capped
                // at 10 because the centre cell divides by zero — written as
                // `!(power < 10)` so the Infinity there is caught too.
                let power = radius / Math.sqrt(distance)
                if (!(power < 10)) power = 10

                const index = 4 * (i + size * j)
                data[index] += push * m.vX * power
                data[index + 1] -= push * m.vY * power
            }
        }

        // Pointer velocity decays as well, so a flick keeps writing for a few
        // frames after the pointer stops and the smear tapers into a tail
        // instead of ending on a hard edge.
        const vDecay = Math.pow(0.9, k)
        m.vX *= vDecay
        m.vY *= vDecay
        this.data.needsUpdate = true
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        window.removeEventListener("pointermove", this.onPointerMove)
        this.geometry.dispose()
        this.material.dispose()
        this.data.dispose()
        this.renderer.dispose()
        const canvas = this.renderer.domElement
        canvas.parentNode?.removeChild(canvas)
    }
}

interface PixelDistortionProps {
    image?: ImageEntry
    imageWidth?: number
    imageHeight?: number
    fit?: "cover" | "contain"
    grid?: number
    cursorRadius?: number
    strength?: number
    settle?: number
    style?: React.CSSProperties
}

export default function PixelDistortion(props: PixelDistortionProps) {
    const {
        image = DEFAULTS.image,
        imageWidth = DEFAULTS.imageWidth,
        imageHeight = DEFAULTS.imageHeight,
        fit = DEFAULTS.fit as "cover" | "contain",
        grid = DEFAULTS.grid,
        cursorRadius = DEFAULTS.cursorRadius,
        strength = DEFAULTS.strength,
        settle = DEFAULTS.settle,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<PixelDistortionScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        // Partial-safe: an instance that set only a picture still gets an
        // offset, and one saved before this row existed is a bare image and
        // resolves with no offset at all.
        image:
            image && typeof image === "object" && "image" in image
                ? { ...DEFAULT_IMAGE, ...image }
                : image,
        imageWidth,
        imageHeight,
        fit,
        grid,
        cursorRadius,
        strength,
        settle,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: PixelDistortionScene
        try {
            scene = new PixelDistortionScene(container, cfgRef.current)
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
        srcOf(imageOf(image)),
        offsetOf(image),
        imageWidth,
        imageHeight,
        fit,
        grid,
        cursorRadius,
        strength,
        settle,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label={
                altOf(imageOf(image)) ||
                "Photograph that tears into blocks under the pointer"
            }
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

PixelDistortion.displayName = "Pixel Distortion"
