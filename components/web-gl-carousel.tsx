"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * WebGL Carousel — a deck of tall cards dragged sideways, stacked into a pyramid
 * around whichever one is centred, and opened to a larger card on click.
 *
 * The port is supahfunk/webgl-carousel, mechanism intact:
 *
 * Position is derived from one number. `progress` runs 0..100, the active card
 * is `floor(progress / 100 * (n - 1))`, and every card's x is its distance from
 * that active index. Nothing tracks per-card state, so a drag that crosses six
 * cards needs no bookkeeping at all.
 *
 * The pyramid is that same index read a second way: a card's y is its
 * *pyramidal index* — n at the active card, falling by one per step away from it
 * — so the deck sags toward its edges and the centre card sits proudest.
 *
 * Opening is done in the vertex shader, not by moving the camera. `uProgress`
 * scales the plane from its closed size to its open size while a cosine wave
 * rippling from the card's centre (`sin(length(uv - .5) * 15. + uProgress * 12.)`)
 * bows it on the way, and the fragment shader's CoverUV re-crops as the aspect
 * changes so the photograph never stretches through the transition. The original
 * always opened to the whole viewport; here the open size is two panel numbers,
 * which is the same ratio arriving from somewhere else.
 *
 * The original's glassy overlay is drei's MeshTransmissionMaterial, which is a
 * large shader with its own back-buffer. Substituted here: the scene renders to
 * a target and a fullscreen pass splits the channels radially, driven by the
 * same `speed` value the original fed to that material's thickness. It reads as
 * the same smear under a fast drag and costs one extra pass instead of a
 * transmission solve.
 */

// The r3f default camera the original was built against. The world size of
// everything follows from these two numbers, so they are not adjustable.
const FOV = 75
const CAM_Z = 5

type Transition = {
    type?: string
    duration?: number
    ease?: string | number[]
}

const DEFAULTS = {
    images: [
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/93ba867c-59af-4b58-8021-c0c0fbce8300/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6c99279a-d77b-4fe0-a32a-a674adced100/w=800",
            },
            focusY: 50,
        },
        {
            image: {
                src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800",
            },
            focusY: 50,
        },
    ],
    cardWidth: 400,
    cardHeight: 300,
    cardGap: 85,
    openedWidth: 900,
    openedHeight: 560,
    imageFit: "cover",
    imageFocusY: 50,
    deckSag: 10,
    hoverZoom: 10,
    dragSensitivity: 10,
    refraction: 1,
    openTransition: {
        type: "tween",
        duration: 2.5,
        // GSAP's power3.out, which the original sets as a global default.
        ease: [0.165, 0.84, 0.44, 1],
    } as Transition,
}

/**
 * Each entry carries its own Y Position: a set of photographs with the subject
 * at different heights each need their own crop anchor, and one global anchor is
 * wrong for half of them. Plain strings and bare image objects are still read,
 * so an instance placed before the entry became an object keeps working.
 */
type ImageItem =
    | string
    | {
          image?: { src?: string } | string
          src?: string
          focusY?: number
      }
    | null
    | undefined

type Config = {
    images: ImageItem[]
    cardWidth: number
    cardHeight: number
    cardGap: number
    openedWidth: number
    openedHeight: number
    imageFit: "cover" | "contain"
    deckSag: number
    hoverZoom: number
    dragSensitivity: number
    refraction: number
    openTransition: Transition
}

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

/**
 * A raw canvas has no motion runtime, so the panel's Transition is sampled by
 * hand. Springs have no closed form here and fall back to the default curve.
 */
function makeEaseFn(transition?: Transition) {
    let pts: number[] = [0.165, 0.84, 0.44, 1]
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

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    const duration = Math.max(0.05, cfg.openTransition?.duration ?? 2.5)
    return {
        cardWidth: clamp(cfg.cardWidth, 20, 1200, DEFAULTS.cardWidth),
        cardHeight: clamp(cfg.cardHeight, 20, 1600, DEFAULTS.cardHeight),
        cardGap: clamp(cfg.cardGap, 0, 200, DEFAULTS.cardGap),
        openedWidth: clamp(cfg.openedWidth, 40, 3000, DEFAULTS.openedWidth),
        openedHeight: clamp(cfg.openedHeight, 40, 3000, DEFAULTS.openedHeight),
        // The original's 0.1 world units of sag per step away from the centre.
        deckSag: (clamp(cfg.deckSag, 0, 20, DEFAULTS.deckSag) / 10) * 0.1,
        // 10 is the original's 1.1.
        hoverScale: 1 + clamp(cfg.hoverZoom, 0, 20, DEFAULTS.hoverZoom) * 0.01,
        // The original's 0.02 per wheel unit and -0.3 per dragged pixel.
        speedWheel:
            clamp(cfg.dragSensitivity, 1, 20, DEFAULTS.dragSensitivity) * 0.002,
        speedDrag:
            -clamp(cfg.dragSensitivity, 1, 20, DEFAULTS.dragSensitivity) * 0.03,
        // The top of the slider is the reference amount and 1 is a hairline —
        // the whole range now spans "barely there" up to it, rather than past it.
        refraction:
            0.05 +
            ((clamp(cfg.refraction, 1, 10, DEFAULTS.refraction) - 1) / 9) * 0.95,
        duration,
        // The layout is a tween retargeted every frame in the original, which is
        // an exponential follow in all but name. Tied to the same duration so
        // one control still governs the whole feel.
        followRate: 5 / duration,
    }
}

function srcOf(item: ImageItem): string {
    if (typeof item === "string") return item
    const image = item?.image
    if (typeof image === "string") return image
    return image?.src ?? item?.src ?? ""
}

/**
 * Where the crop sits on a photograph taller than the card: 0 pins the top, 50
 * centres it, 100 pins the bottom. The panel reads top-down like the page and uv
 * runs bottom-up, so the axis is flipped exactly once — here.
 */
function focusOf(item: ImageItem): number {
    const value = typeof item === "string" ? undefined : item?.focusY
    const n = clamp(value as number, 0, 100, DEFAULTS.imageFocusY)
    return 1 - n / 100
}

function itemsOf(cfg: Config): ImageItem[] {
    const list = Array.isArray(cfg.images) ? cfg.images : []
    return list.filter((item) => srcOf(item) !== "")
}

/** The identity of the deck: a change here, and only here, rebuilds it. */
function sourcesOf(cfg: Config): string {
    return itemsOf(cfg).map(srcOf).join("|")
}

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
                texture.minFilter = THREE.LinearMipmapLinearFilter
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

const PLANE_VERTEX = /* glsl */ `
varying vec2 vUv;
uniform float uProgress;
uniform vec2 uZoomScale;

void main() {
    vUv = uv;
    vec3 pos = position;

    float angle = uProgress * 3.14159265 / 2.;
    float wave = cos(angle);
    // A ring travelling out from the middle of the card, so the plane bows as it
    // grows instead of simply inflating.
    float c = sin(length(uv - .5) * 15. + uProgress * 12.) * .5 + .5;
    pos.x *= mix(1., uZoomScale.x + wave * c, uProgress);
    pos.y *= mix(1., uZoomScale.y + wave * c, uProgress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const PLANE_FRAGMENT = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uZoomScale;
uniform vec2 uImageRes;
uniform float uFocusY;

varying vec2 vUv;

/*------------------------------
Background Cover UV
u = basic UV, s = card size, i = image size, f = which slice of a vertical crop
to keep (0.5 centres it, as the original did)
------------------------------*/
vec2 CoverUV(vec2 u, vec2 s, vec2 i, float f) {
    float rs = s.x / s.y;
    float ri = i.x / i.y;
    vec2 st = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    // The card is wider than the photograph, so the crop is horizontal and there
    // is no vertical slack for the anchor to slide along — centre it.
    vec2 o = (rs < ri ? vec2((st.x - s.x) * 0.5, 0.0) : vec2(0.0, (st.y - s.y) * f)) / st;
    return u * s / st + o;
}

void main() {
    vec2 uv = CoverUV(vUv, uRes, uImageRes, uFocusY);
    vec3 tex = texture2D(uTex, uv).rgb;
    gl_FragColor = vec4(tex, 1.0);
}
`

const POST_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    // Already in clip space; no camera is involved in this pass.
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const POST_FRAGMENT = /* glsl */ `
uniform sampler2D uScene;
uniform float uThickness;

varying vec2 vUv;

void main() {
    // Radial, not axial: the channels part along the line out from the middle of
    // the frame, which is how a lens of the original's ior 0.9 would break them.
    vec2 dir = vUv - 0.5;
    float k = uThickness;

    vec4 r = texture2D(uScene, vUv + dir * k * 0.06);
    vec4 g = texture2D(uScene, vUv + dir * k * 0.02);
    vec4 b = texture2D(uScene, vUv - dir * k * 0.06);

    // The frame behind is Framer's, so alpha has to survive the split — the
    // widest of the three samples keeps the card edges from fraying.
    gl_FragColor = vec4(r.r, g.g, b.b, max(r.a, max(g.a, b.a)));
}
`

type Card = {
    mesh: THREE.Mesh
    material: THREE.ShaderMaterial
    index: number
    imageAspect: number
    hover: number
    open: number
    openTarget: number
    openT: number
    zDelay: number
}

class CarouselScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 1000)
    private geometry = new THREE.PlaneGeometry(1, 1, 30, 30)
    private cards: Card[] = []

    private target: THREE.WebGLRenderTarget
    private postScene = new THREE.Scene()
    private postCamera = new THREE.Camera()
    private postMaterial: THREE.ShaderMaterial
    private postGeometry = new THREE.PlaneGeometry(2, 2)

    private items: ImageItem[] = []
    private textures: (THREE.Texture | null)[] = []
    private sources: string[] = []

    // The one number the whole layout is derived from.
    private progress = 0
    private oldProgress = 0
    private speed = 0
    private active: number | null = null
    private hovered = -1

    private isDown = false
    private startX = 0
    private downX = 0
    private downY = 0

    private ease = makeEaseFn()
    private raycaster = new THREE.Raycaster()
    private pointer = new THREE.Vector2()

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.openTransition)

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "pan-y"
        container.appendChild(el)

        this.camera.position.z = CAM_Z

        this.target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true })
        this.postMaterial = new THREE.ShaderMaterial({
            vertexShader: POST_VERTEX,
            fragmentShader: POST_FRAGMENT,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uScene: { value: this.target.texture },
                uThickness: { value: 0 },
            },
        })
        const quad = new THREE.Mesh(this.postGeometry, this.postMaterial)
        quad.frustumCulled = false
        this.postScene.add(quad)

        el.addEventListener("wheel", this.onWheel, { passive: false })
        el.addEventListener("pointerdown", this.onPointerDown)
        el.addEventListener("pointermove", this.onPointerMove)
        window.addEventListener("pointerup", this.onPointerUp)
        el.addEventListener("pointerleave", this.onPointerLeave)
        el.addEventListener("pointercancel", this.onPointerUp)

        this.loadAll()
    }

    /** World units per screen pixel — the camera is fixed, so this is too. */
    private get viewportHeight() {
        return 2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z
    }

    private get worldPerPx() {
        return this.viewportHeight / Math.max(1, this.height)
    }

    private setPointer(e: PointerEvent) {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        this.pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -(((e.clientY - rect.top) / rect.height) * 2 - 1)
        )
    }

    private onWheel = (e: WheelEvent) => {
        if (this.active !== null) return
        // Consumed rather than passed through: the deck is the scroller here.
        e.preventDefault()
        const S = settingsFor(this.cfg)
        const vertical = Math.abs(e.deltaY) > Math.abs(e.deltaX)
        this.progress += (vertical ? e.deltaY : e.deltaX) * S.speedWheel
    }

    private onPointerDown = (e: PointerEvent) => {
        this.downX = e.clientX
        this.downY = e.clientY
        if (this.active !== null) return
        this.isDown = true
        this.startX = e.clientX
        this.renderer.domElement.style.cursor = "grabbing"
    }

    private onPointerMove = (e: PointerEvent) => {
        this.setPointer(e)
        if (this.active !== null || !this.isDown) return
        const S = settingsFor(this.cfg)
        this.progress += (e.clientX - this.startX) * S.speedDrag
        this.startX = e.clientX
    }

    private onPointerUp = (e: PointerEvent) => {
        this.isDown = false
        this.renderer.domElement.style.cursor = "grab"
        const travel = Math.hypot(e.clientX - this.downX, e.clientY - this.downY)
        // 5px of travel is still a click — a deck this draggable would otherwise
        // swallow every second tap.
        if (travel > 5) return
        if (this.active !== null) {
            this.setActive(null)
            return
        }
        this.setPointer(e)
        const hit = this.pick()
        if (hit >= 0) this.setActive(hit)
    }

    private onPointerLeave = () => {
        this.isDown = false
        this.hovered = -1
        this.renderer.domElement.style.cursor = "grab"
    }

    /** Topmost card under the pointer, or -1. */
    private pick(): number {
        if (!this.cards.length) return -1
        this.raycaster.setFromCamera(this.pointer, this.camera)
        const hits = this.raycaster.intersectObjects(
            this.cards.map((c) => c.mesh),
            false
        )
        if (!hits.length) return -1
        const mesh = hits[0].object
        return this.cards.findIndex((c) => c.mesh === mesh)
    }

    private setActive(index: number | null) {
        this.active = index
        if (index !== null && this.cards.length > 1) {
            // Snap the deck to the opened card, so closing leaves it centred.
            this.progress = (index / (this.cards.length - 1)) * 100
        }
        for (const card of this.cards) {
            const wanted = card.index === index ? 1 : 0
            if (wanted !== card.openTarget) {
                card.openTarget = wanted
                card.openT = 0
                // The closing card keeps its z until the animation is over, or
                // it drops behind its neighbours while still open.
                card.zDelay = wanted === 1 ? 0 : settingsFor(this.cfg).duration
            }
        }
    }

    private loadAll() {
        this.items = itemsOf(this.cfg)
        this.sources = this.items.map(srcOf)
        this.textures = this.sources.map(() => null)
        this.build()
        this.sources.forEach((src, i) => {
            loadTexture(src).then((tex) => {
                if (this.disposed || this.sources[i] !== src) return
                this.textures[i] = tex
                const card = this.cards[i]
                if (!card || !tex) return
                card.material.uniforms.uTex.value = tex
                const img = tex.image as
                    | { width?: number; height?: number }
                    | undefined
                const iw = img?.width || 1
                const ih = img?.height || 1
                ;(card.material.uniforms.uImageRes.value as THREE.Vector2).set(
                    iw,
                    ih
                )
                // Kept on the card as well, because Contain sizes the mesh from
                // it and that happens every frame, off the CPU.
                card.imageAspect = iw / ih
            })
        })
    }

    private build() {
        this.clearCards()
        for (let i = 0; i < this.sources.length; i++) {
            const material = new THREE.ShaderMaterial({
                vertexShader: PLANE_VERTEX,
                fragmentShader: PLANE_FRAGMENT,
                uniforms: {
                    uProgress: { value: 0 },
                    uZoomScale: { value: new THREE.Vector2(1, 1) },
                    uTex: { value: this.textures[i] ?? null },
                    uRes: { value: new THREE.Vector2(1, 1) },
                    uImageRes: { value: new THREE.Vector2(1, 1) },
                    uFocusY: { value: focusOf(this.items[i]) },
                },
            })
            const mesh = new THREE.Mesh(this.geometry, material)
            mesh.position.set(0, 0, -0.01)
            this.cards.push({
                mesh,
                material,
                index: i,
                imageAspect: 1,
                hover: 1,
                open: 0,
                openTarget: 0,
                openT: 1,
                zDelay: 0,
            })
            this.scene.add(mesh)
        }
    }

    /**
     * The box a card occupies, in world units. Cover hands back the box as
     * given and lets the shader crop into it; Contain shrinks the box onto the
     * photograph's own aspect, so the whole picture shows with no letterbox
     * bars to paint.
     */
    private boxFor(
        card: Card,
        widthPx: number,
        heightPx: number,
        out: THREE.Vector2
    ) {
        const perPx = this.worldPerPx
        const w = widthPx * perPx
        const h = heightPx * perPx
        if (this.cfg.imageFit !== "contain") return out.set(w, h)
        const ia = card.imageAspect > 0 ? card.imageAspect : 1
        const fitted = Math.min(w / ia, h)
        return out.set(fitted * ia, fitted)
    }

    setSize(width: number, height: number) {
        if (this.disposed) return
        this.width = Math.max(1, width)
        this.height = Math.max(1, height)
        this.renderer.setSize(this.width, this.height, false)
        const dpr = this.renderer.getPixelRatio()
        this.target.setSize(this.width * dpr, this.height * dpr)
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        this.ease = makeEaseFn(cfg.openTransition)
        // Only the photographs own cards; every other control is read each
        // frame, so a size or an anchor moves what is already on screen.
        if (sourcesOf(cfg) !== sourcesOf(prev)) {
            this.loadAll()
            return
        }
        this.items = itemsOf(cfg)
        for (const card of this.cards) {
            card.material.uniforms.uFocusY.value = focusOf(this.items[card.index])
        }
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        this.frameId = requestAnimationFrame(loop)
    }

    private closedBox = new THREE.Vector2()
    private openedBox = new THREE.Vector2()

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning from the background must not fling the deck.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const n = this.cards.length
        if (!n) return

        this.progress = Math.max(0, Math.min(100, this.progress))
        const active = Math.floor((this.progress / 100) * Math.max(1, n - 1))

        const perPx = this.worldPerPx
        const step = S.cardWidth * perPx + S.cardGap * perPx
        const follow = 1 - Math.exp(-dt * S.followRate)
        const hoverRate = 1 - Math.exp(-dt * 6)

        if (this.active === null && !this.isDown) {
            this.hovered = this.pick()
        }
        this.renderer.domElement.style.cursor =
            this.active !== null
                ? "zoom-out"
                : this.isDown
                  ? "grabbing"
                  : this.hovered >= 0
                    ? "pointer"
                    : "grab"

        for (const card of this.cards) {
            const i = card.index
            // Pyramidal index: n at the active card, one less per step away, so
            // the deck sags toward both edges.
            const pyramidal = i === active ? n : n - Math.abs(active - i)
            const targetX = (i - active) * step
            const targetY = n * -S.deckSag + pyramidal * S.deckSag

            const mesh = card.mesh
            mesh.position.x += (targetX - mesh.position.x) * follow
            mesh.position.y += (targetY - mesh.position.y) * follow

            const wantHover =
                this.active === null && this.hovered === i ? S.hoverScale : 1
            card.hover += (wantHover - card.hover) * hoverRate

            if (card.openT < 1) {
                card.openT = Math.min(1, card.openT + dt / S.duration)
                const eased = this.ease(card.openT)
                card.open = card.openTarget === 1 ? eased : 1 - eased
            } else {
                card.open = card.openTarget
            }

            this.boxFor(card, S.cardWidth, S.cardHeight, this.closedBox)
            this.boxFor(card, S.openedWidth, S.openedHeight, this.openedBox)
            const t = card.open

            const u = card.material.uniforms
            u.uProgress.value = t
            // The ratio the vertex shader grows through — the open box measured
            // against the closed one, which is what the original computed from
            // the viewport.
            ;(u.uZoomScale.value as THREE.Vector2).set(
                this.openedBox.x / Math.max(1e-5, this.closedBox.x),
                this.openedBox.y / Math.max(1e-5, this.closedBox.y)
            )
            // The crop travels with the opening: a card halfway open is cropped
            // to the box it is halfway through.
            ;(u.uRes.value as THREE.Vector2).set(
                this.closedBox.x + (this.openedBox.x - this.closedBox.x) * t,
                this.closedBox.y + (this.openedBox.y - this.closedBox.y) * t
            )

            mesh.scale.set(
                this.closedBox.x * card.hover,
                this.closedBox.y * card.hover,
                1
            )

            // z is a hair of separation, not depth: the open card must draw over
            // the rest, and only gives that up once it has finished closing.
            if (card.zDelay > 0) card.zDelay -= dt
            mesh.position.z =
                card.openTarget === 1 || card.zDelay > 0 ? 0 : -0.01
            mesh.renderOrder = card.openTarget === 1 ? 1 : 0
        }

        // Speed of the drag, eased, exactly as the original fed the transmission
        // material's thickness.
        const settle = 1 - Math.exp(-dt * 6)
        this.speed +=
            (Math.abs(this.oldProgress - this.progress) - this.speed) * settle
        this.oldProgress += (this.progress - this.oldProgress) * settle
        this.postMaterial.uniforms.uThickness.value =
            Math.min(this.speed, 20) * S.refraction

        this.renderer.setRenderTarget(this.target)
        this.renderer.clear()
        this.renderer.render(this.scene, this.camera)
        this.renderer.setRenderTarget(null)
        this.renderer.render(this.postScene, this.postCamera)
    }

    private clearCards() {
        for (const card of this.cards) {
            this.scene.remove(card.mesh)
            card.material.dispose()
        }
        this.cards = []
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("wheel", this.onWheel)
        el.removeEventListener("pointerdown", this.onPointerDown)
        el.removeEventListener("pointermove", this.onPointerMove)
        window.removeEventListener("pointerup", this.onPointerUp)
        el.removeEventListener("pointerleave", this.onPointerLeave)
        el.removeEventListener("pointercancel", this.onPointerUp)
        this.clearCards()
        this.geometry.dispose()
        this.postGeometry.dispose()
        this.postMaterial.dispose()
        this.target.dispose()
        this.renderer.dispose()
        if (el.parentNode === this.container) this.container.removeChild(el)
        // Textures are shared through the module cache and are deliberately not
        // disposed — another instance on the page may still be drawing them.
    }
}

export interface WebGLCarouselProps {
    images?: ImageItem[]
    cardWidth?: number
    cardHeight?: number
    cardGap?: number
    openedWidth?: number
    openedHeight?: number
    imageFit?: "cover" | "contain"
    deckSag?: number
    hoverZoom?: number
    dragSensitivity?: number
    refraction?: number
    openTransition?: Transition
    style?: React.CSSProperties
}

export default function WebGLCarousel(props: WebGLCarouselProps) {
    const {
        images = DEFAULTS.images,
        cardWidth = DEFAULTS.cardWidth,
        cardHeight = DEFAULTS.cardHeight,
        cardGap = DEFAULTS.cardGap,
        openedWidth = DEFAULTS.openedWidth,
        openedHeight = DEFAULTS.openedHeight,
        imageFit = DEFAULTS.imageFit as "cover" | "contain",
        deckSag = DEFAULTS.deckSag,
        hoverZoom = DEFAULTS.hoverZoom,
        dragSensitivity = DEFAULTS.dragSensitivity,
        refraction = DEFAULTS.refraction,
        openTransition = DEFAULTS.openTransition,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<CarouselScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        images,
        cardWidth,
        cardHeight,
        cardGap,
        openedWidth,
        openedHeight,
        imageFit,
        deckSag,
        hoverZoom,
        dragSensitivity,
        refraction,
        openTransition,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: CarouselScene
        try {
            scene = new CarouselScene(container, cfgRef.current)
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
        // Contents, not identity: a fresh array may arrive every render, and
        // the anchors travel in it alongside the sources.
        Array.isArray(images)
            ? images.map((i) => `${srcOf(i)}@${focusOf(i)}`).join("|")
            : "",
        cardWidth,
        cardHeight,
        cardGap,
        openedWidth,
        openedHeight,
        imageFit,
        deckSag,
        hoverZoom,
        dragSensitivity,
        refraction,
        openTransition?.duration,
        String(openTransition?.ease),
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Draggable carousel of photographs; click one to open it"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 160,
                minHeight: 160,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

WebGLCarousel.displayName = "WebGL Carousel"
