"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Constellation — a drifting cloud of nodes that draws a line between any two
 * that come close enough, and links to the pointer as if it were another node.
 *
 * The links cannot live in a static buffer: which pairs are close changes every
 * frame, so the line geometry is rewritten each tick and the draw range is set
 * to however many links exist. The pairs are found by testing every pair, which
 * is the reason the node count tops out where it does.
 *
 * The links are QUADS, not GL lines. gl.lineWidth clamps to 1 on every desktop
 * driver, so a LineSegments link can only ever be one device pixel and a Width
 * control on it would move nothing. Each link is instead two triangles whose
 * corners are pushed perpendicular to the link in the vertex shader, in
 * drawing-buffer pixels, so the width is the same on screen at any depth.
 *
 * Nodes live in a fixed world box wider than any frame is likely to be, rather
 * than a box fitted to the aspect ratio. Fitting it meant respawning the cloud
 * whenever the frame changed width, and Framer resizes a canvas continuously
 * while it is being dragged — the whole field flickered as it was scaled.
 *
 * ponytail: O(n²) link search, capped at ~430 nodes by the Nodes slider. A
 * uniform grid hash would lift the ceiling if the field ever needs thousands.
 */

/** Half-extents of the box the nodes live in. X covers frames up to 2.4:1. */
const BOX = { x: 2.4, y: 1.15, z: 0.8 }

/** World half-height visible at z = 0. The camera is solved to match. */
const VIEW = 1.1

const DEFAULTS = {
    dot: "#FF0000",
    line: "#B5B5B5",
    dotHover: "#FFBE00",
    lineHover: "#FF0000",
    nodes: 20,
    reach: 20,
    lineWidth: 1,
    lineGlow: 20,
    dotSize: 20,
    drift: 20,
    parallax: 20,
    cursor: 20,
}

type Config = {
    dot: string
    line: string
    dotHover: string
    lineHover: string
    nodes: number
    reach: number
    lineWidth: number
    lineGlow: number
    dotSize: number
    drift: number
    parallax: number
    cursor: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the field wants the real ones. */
function settingsFor(cfg: Config) {
    const nodes = clamp(cfg.nodes, 1, 20, DEFAULTS.nodes)
    return {
        // Squared, and no faster: every extra node costs a whole row of pair
        // tests, so the top of the slider is already the practical ceiling.
        count: Math.round(30 + nodes * nodes),
        reach: 0.1 + clamp(cfg.reach, 1, 20, DEFAULTS.reach) * 0.026,
        // CSS pixels. Scaled to the drawing buffer where it is used, so the
        // width is what the designer asked for on a retina screen too.
        lineWidth: clamp(cfg.lineWidth, 1, 20, DEFAULTS.lineWidth),
        lineGlow: clamp(cfg.lineGlow, 0, 20, DEFAULTS.lineGlow) * 0.05,
        dotSize: 0.002 + clamp(cfg.dotSize, 1, 50, DEFAULTS.dotSize) * 0.0018,
        drift: clamp(cfg.drift, 0, 20, DEFAULTS.drift) * 0.012,
        parallax: clamp(cfg.parallax, 0, 20, DEFAULTS.parallax) * 0.012,
        // The pointer reaches further than a node does, so it always finds
        // something to hold on to even in a thin part of the field.
        cursorReach: clamp(cfg.cursor, 0, 20, DEFAULTS.cursor) * 0.045,
    }
}

const DOT_VERTEX = /* glsl */ `
    attribute float aSeed;
    attribute float aHover;

    uniform float uDotSize;
    uniform float uViewHeight;

    varying float vSeed;
    varying float vHover;

    void main() {
        vSeed = aSeed;
        vHover = aHover;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // A world diameter converted to drawing-buffer pixels, so the dots keep
        // their weight at any frame size or pixel ratio.
        gl_PointSize = max(
            uDotSize * (0.6 + aSeed * 0.9)
                * (uViewHeight * projectionMatrix[1][1]) / (-2.0 * mv.z),
            0.0
        );
        gl_Position = projectionMatrix * mv;
    }
`

const DOT_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uDot;
    uniform vec3 uDotHover;

    varying float vSeed;
    varying float vHover;

    void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        // Core for position, halo for presence. One falloff gives either a hard
        // square-ish dot or a smudge, never both.
        float core = 1.0 - smoothstep(0.0, 0.5, d);
        float halo = exp(-d * d * 3.0);
        float a = (core * 0.85 + halo * 0.3) * (0.45 + vSeed * 0.55);
        if (a < 0.002) discard;
        vec3 color = mix(uDot, uDotHover, vHover);
        gl_FragColor = vec4(color * a, a);
    }
`

const LINE_VERTEX = /* glsl */ `
    // position is this vertex's own endpoint; aOther is the far one. Both are
    // needed because the offset direction is the link's own screen direction,
    // which only exists once both ends have been projected.
    attribute vec3 aOther;
    attribute float aSide;
    attribute float aAlpha;
    attribute float aHover;

    uniform vec2 uResolution;
    uniform float uHalfWidth;

    varying float vAlpha;
    varying float vAcross;
    varying float vHover;

    void main() {
        vAlpha = aAlpha;
        vAcross = aSide;
        vHover = aHover;

        vec4 clipA = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 clipB = projectionMatrix * modelViewMatrix * vec4(aOther, 1.0);

        vec2 hres = uResolution * 0.5;
        vec2 pxA = (clipA.xy / max(clipA.w, 1e-4)) * hres;
        vec2 pxB = (clipB.xy / max(clipB.w, 1e-4)) * hres;

        vec2 delta = pxB - pxA;
        float len = length(delta);
        // Two nodes at the same screen point have no direction to be
        // perpendicular to; normalize would hand back NaN and take the quad
        // with it.
        vec2 dir = len > 1e-4 ? delta / len : vec2(1.0, 0.0);
        vec2 nrm = vec2(-dir.y, dir.x);

        // Widen in pixels, then back into clip space by multiplying through by
        // w, so the width does not shrink with depth.
        vec2 offPx = nrm * aSide * uHalfWidth;
        gl_Position = vec4(
            clipA.xy + (offPx / hres) * clipA.w,
            clipA.z,
            clipA.w
        );
    }
`

const LINE_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec3 uLine;
    uniform vec3 uLineHover;
    uniform float uGlow;
    uniform float uFeather;

    varying float vAlpha;
    varying float vAcross;
    varying float vHover;

    void main() {
        // vAcross runs -1..1 across the width and uFeather is one device pixel
        // measured in those units, so this is the box-filter coverage of the
        // pixel against the edge: exactly 0.5 on the boundary, 1 a pixel
        // inside. A smoothstep here reads as correct and is not — its ramp
        // starts at the centre once the line is two pixels wide, so the default
        // hairline loses half its brightness and the whole field dims.
        float cov = clamp((1.0 - abs(vAcross)) / uFeather + 0.5, 0.0, 1.0);
        float a = vAlpha * uGlow * cov;
        if (a < 0.002) discard;
        vec3 color = mix(uLine, uLineHover, vHover);
        gl_FragColor = vec4(color * a, a);
    }
`

class ConstellationScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    private group = new THREE.Group()

    private dotGeo = new THREE.BufferGeometry()
    private dotMat: THREE.ShaderMaterial
    private dots: THREE.Points

    private lineGeo = new THREE.BufferGeometry()
    private lineMat: THREE.ShaderMaterial
    private lines: THREE.Mesh

    /** Per-node and per-link hover amount, recomputed each frame from distance to the cursor. */
    private dotHoverArr = new Float32Array(0)
    private lineHoverArr = new Float32Array(0)

    private pos = new Float32Array(0)
    private vel = new Float32Array(0)
    private count = 0
    private maxLinks = 0

    /** Link quad buffers, held directly so the hot loop skips the lookups. */
    private linePos = new Float32Array(0)
    private lineOther = new Float32Array(0)
    private lineAlpha = new Float32Array(0)

    /** Pointer in normalised device coords, and how much of it to believe. */
    private aimX = 0
    private aimY = 0
    private grip = 0
    private targetGrip = 0
    private tiltX = 0
    private tiltY = 0

    private width = 0
    private height = 0
    private dpr = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.renderer.setPixelRatio(this.dpr)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        // A background must not swallow clicks meant for the content above it.
        el.style.pointerEvents = "none"
        container.appendChild(el)

        this.dotMat = new THREE.ShaderMaterial({
            vertexShader: DOT_VERTEX,
            fragmentShader: DOT_FRAGMENT,
            uniforms: {
                uDot: { value: new THREE.Color(cfg.dot) },
                uDotHover: { value: new THREE.Color(cfg.dotHover) },
                uDotSize: { value: S.dotSize },
                uViewHeight: { value: 600 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
        })

        const halfWidth = (S.lineWidth * this.dpr) / 2
        this.lineMat = new THREE.ShaderMaterial({
            vertexShader: LINE_VERTEX,
            fragmentShader: LINE_FRAGMENT,
            uniforms: {
                uLine: { value: new THREE.Color(cfg.line) },
                uLineHover: { value: new THREE.Color(cfg.lineHover) },
                uGlow: { value: S.lineGlow },
                uResolution: { value: new THREE.Vector2(1, 1) },
                uHalfWidth: { value: halfWidth },
                uFeather: { value: featherFor(halfWidth) },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            // The quads are wound one way and the camera tilts; a culled back
            // face would drop half the links as the field leans.
            side: THREE.DoubleSide,
        })

        this.dots = new THREE.Points(this.dotGeo, this.dotMat)
        this.dots.frustumCulled = false
        this.lines = new THREE.Mesh(this.lineGeo, this.lineMat)
        this.lines.frustumCulled = false
        this.group.add(this.lines)
        this.group.add(this.dots)
        this.scene.add(this.group)

        this.build(S.count)
        this.bindEvents()
    }

    /** Scatters the cloud and sizes both buffers. Only the count owns them. */
    private build(count: number) {
        this.count = count
        this.pos = new Float32Array(count * 3)
        this.vel = new Float32Array(count * 3)
        const seed = new Float32Array(count)
        for (let i = 0; i < count; i++) {
            this.pos[i * 3] = (Math.random() * 2 - 1) * BOX.x
            this.pos[i * 3 + 1] = (Math.random() * 2 - 1) * BOX.y
            this.pos[i * 3 + 2] = (Math.random() * 2 - 1) * BOX.z
            this.vel[i * 3] = Math.random() * 2 - 1
            this.vel[i * 3 + 1] = Math.random() * 2 - 1
            this.vel[i * 3 + 2] = (Math.random() * 2 - 1) * 0.5
            seed[i] = Math.random()
        }
        this.dotGeo.setAttribute(
            "position",
            new THREE.BufferAttribute(this.pos, 3)
        )
        this.dotGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1))
        this.dotHoverArr = new Float32Array(count)
        this.dotGeo.setAttribute(
            "aHover",
            new THREE.BufferAttribute(this.dotHoverArr, 1)
        )

        // Ten links a node is far past what the reach ever produces; the draw
        // range does the real limiting, so this only has to be generous.
        this.maxLinks = count * 10
        const verts = this.maxLinks * 4
        this.linePos = new Float32Array(verts * 3)
        this.lineOther = new Float32Array(verts * 3)
        this.lineAlpha = new Float32Array(verts)
        this.lineHoverArr = new Float32Array(verts)

        // Which side of the link each corner sits on never changes, so it is
        // written once here and never touched by the frame loop.
        const side = new Float32Array(verts)
        const IndexArray = verts > 65535 ? Uint32Array : Uint16Array
        const index = new IndexArray(this.maxLinks * 6)
        for (let i = 0; i < this.maxLinks; i++) {
            const v = i * 4
            // v0/v1 sit at this link's near end, v2/v3 at the far one. The far
            // pair's sign is flipped because its screen direction is reversed,
            // which is what keeps the quad from twisting into a bowtie.
            side[v] = -1
            side[v + 1] = 1
            side[v + 2] = 1
            side[v + 3] = -1
            const k = i * 6
            index[k] = v
            index[k + 1] = v + 2
            index[k + 2] = v + 3
            index[k + 3] = v
            index[k + 4] = v + 3
            index[k + 5] = v + 1
        }

        this.lineGeo.setAttribute(
            "position",
            new THREE.BufferAttribute(this.linePos, 3)
        )
        this.lineGeo.setAttribute(
            "aOther",
            new THREE.BufferAttribute(this.lineOther, 3)
        )
        this.lineGeo.setAttribute("aSide", new THREE.BufferAttribute(side, 1))
        this.lineGeo.setAttribute(
            "aAlpha",
            new THREE.BufferAttribute(this.lineAlpha, 1)
        )
        this.lineGeo.setAttribute(
            "aHover",
            new THREE.BufferAttribute(this.lineHoverArr, 1)
        )
        this.lineGeo.setIndex(new THREE.BufferAttribute(index, 1))
        this.lineGeo.setDrawRange(0, 0)
    }

    private bindEvents() {
        /*
         * Listening on the window rather than the canvas: the canvas takes no
         * pointer events at all, so that content sitting on top of this
         * background stays clickable, and a canvas that takes no events also
         * receives no pointermove.
         */
        const move = (e: PointerEvent) => {
            const r = this.container.getBoundingClientRect()
            if (!r.width || !r.height) return
            const x = (e.clientX - r.left) / r.width
            const y = (e.clientY - r.top) / r.height
            const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1
            this.targetGrip = inside ? 1 : 0
            if (!inside) return
            this.aimX = x * 2 - 1
            this.aimY = -(y * 2 - 1)
        }
        const leave = () => {
            this.targetGrip = 0
        }
        window.addEventListener("pointermove", move, { passive: true })
        window.addEventListener("pointerleave", leave)
        this.unbind = () => {
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerleave", leave)
        }
    }

    private unbind = () => {}

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
        this.width = width
        this.height = height
        this.renderer.setSize(width, height, false)
        this.dotMat.uniforms.uViewHeight.value = height * this.dpr
        // The link quads are widened in drawing-buffer pixels, so they need the
        // buffer size, not the CSS size.
        this.lineMat.uniforms.uResolution.value.set(
            width * this.dpr,
            height * this.dpr
        )

        const aspect = width / height
        // Solved so exactly VIEW world units of height are visible at z = 0,
        // whatever the frame does.
        const dist = VIEW / Math.tan((40 / 2) * (Math.PI / 180))
        this.camera.aspect = aspect
        this.camera.position.set(0, 0, dist)
        this.camera.lookAt(0, 0, 0)
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.dotMat.uniforms.uDot.value.set(cfg.dot || "#ffffff")
        this.dotMat.uniforms.uDotHover.value.set(
            cfg.dotHover || cfg.dot || "#ffffff"
        )
        this.dotMat.uniforms.uDotSize.value = S.dotSize
        this.lineMat.uniforms.uLine.value.set(cfg.line || "#ffffff")
        this.lineMat.uniforms.uLineHover.value.set(
            cfg.lineHover || cfg.line || "#ffffff"
        )
        this.lineMat.uniforms.uGlow.value = S.lineGlow
        const halfWidth = (S.lineWidth * this.dpr) / 2
        this.lineMat.uniforms.uHalfWidth.value = halfWidth
        this.lineMat.uniforms.uFeather.value = featherFor(halfWidth)

        // Only the count owns the buffers. Dragging a colour must not rescatter
        // the field.
        if (cfg.nodes !== prev.nodes) this.build(S.count)
    }

    /** Writes one link as a quad. Returns nothing; n is the link's slot. */
    private emit(
        n: number,
        ax: number,
        ay: number,
        az: number,
        bx: number,
        by: number,
        bz: number,
        alpha: number,
        hover: number
    ) {
        const lp = this.linePos
        const lo = this.lineOther
        const la = this.lineAlpha
        const lh = this.lineHoverArr
        const k = n * 12
        // Near end twice, far end twice. Each vertex also carries the opposite
        // endpoint, since the shader needs both to find the perpendicular.
        lp[k] = ax
        lp[k + 1] = ay
        lp[k + 2] = az
        lp[k + 3] = ax
        lp[k + 4] = ay
        lp[k + 5] = az
        lp[k + 6] = bx
        lp[k + 7] = by
        lp[k + 8] = bz
        lp[k + 9] = bx
        lp[k + 10] = by
        lp[k + 11] = bz
        lo[k] = bx
        lo[k + 1] = by
        lo[k + 2] = bz
        lo[k + 3] = bx
        lo[k + 4] = by
        lo[k + 5] = bz
        lo[k + 6] = ax
        lo[k + 7] = ay
        lo[k + 8] = az
        lo[k + 9] = ax
        lo[k + 10] = ay
        lo[k + 11] = az
        const a = n * 4
        la[a] = alpha
        la[a + 1] = alpha
        la[a + 2] = alpha
        la[a + 3] = alpha
        lh[a] = hover
        lh[a + 1] = hover
        lh[a + 2] = hover
        lh[a + 3] = hover
    }

    /** Rewrites the link buffer for this frame. Returns the index count. */
    private link(reach: number, cursorReach: number): number {
        const p = this.pos
        const r2 = reach * reach
        let n = 0
        this.dotHoverArr.fill(0)

        for (let i = 0; i < this.count && n < this.maxLinks; i++) {
            const ax = p[i * 3]
            const ay = p[i * 3 + 1]
            const az = p[i * 3 + 2]
            for (let j = i + 1; j < this.count && n < this.maxLinks; j++) {
                const dx = ax - p[j * 3]
                const dy = ay - p[j * 3 + 1]
                const dz = az - p[j * 3 + 2]
                const d2 = dx * dx + dy * dy + dz * dz
                if (d2 > r2) continue
                // Squared falloff: a link fades in slowly and only reaches full
                // strength when the two nodes are genuinely close, which is what
                // keeps the field from looking like a solid net.
                const t = 1 - d2 / r2
                this.emit(
                    n,
                    ax,
                    ay,
                    az,
                    p[j * 3],
                    p[j * 3 + 1],
                    p[j * 3 + 2],
                    t * t,
                    0
                )
                n++
            }
        }

        // The pointer as one more node, on the plane the cloud is centred on.
        // Only the nodes and links actually inside this radius take the hover
        // colour — the rest of the field stays at rest.
        if (this.grip > 0.01 && cursorReach > 0) {
            const halfW =
                VIEW * (Math.max(1, this.width) / Math.max(1, this.height))
            const cx = this.aimX * halfW
            const cy = this.aimY * VIEW
            const cr2 = cursorReach * cursorReach
            for (let i = 0; i < this.count && n < this.maxLinks; i++) {
                const dx = cx - p[i * 3]
                const dy = cy - p[i * 3 + 1]
                const dz = p[i * 3 + 2]
                const d2 = dx * dx + dy * dy + dz * dz
                if (d2 > cr2) continue
                const t = (1 - d2 / cr2) * this.grip
                this.dotHoverArr[i] = t
                // Brighter than a node-to-node link, so the pointer reads as
                // the thing doing the connecting.
                this.emit(
                    n,
                    cx,
                    cy,
                    0,
                    p[i * 3],
                    p[i * 3 + 1],
                    p[i * 3 + 2],
                    t * 2.2,
                    t
                )
                n++
            }
        }

        this.lineGeo.attributes.position.needsUpdate = true
        this.lineGeo.attributes.aOther.needsUpdate = true
        this.lineGeo.attributes.aAlpha.needsUpdate = true
        this.lineGeo.attributes.aHover.needsUpdate = true
        this.dotGeo.attributes.aHover.needsUpdate = true
        return n * 6
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        const p = this.pos
        const v = this.vel

        for (let i = 0; i < this.count; i++) {
            const k = i * 3
            p[k] += v[k] * S.drift * dt
            p[k + 1] += v[k + 1] * S.drift * dt
            p[k + 2] += v[k + 2] * S.drift * dt
            // Turned back at the wall rather than wrapped: a node that teleports
            // across the box takes all of its links with it in one frame, which
            // reads as a glitch.
            if (p[k] < -BOX.x || p[k] > BOX.x) v[k] = -v[k]
            if (p[k + 1] < -BOX.y || p[k + 1] > BOX.y) v[k + 1] = -v[k + 1]
            if (p[k + 2] < -BOX.z || p[k + 2] > BOX.z) v[k + 2] = -v[k + 2]
        }
        this.dotGeo.attributes.position.needsUpdate = true

        this.grip += (this.targetGrip - this.grip) * (1 - Math.exp(-dt * 4))
        this.lineGeo.setDrawRange(0, this.link(S.reach, S.cursorReach))

        // The whole field leans away from the pointer. Eased, not tracked — a
        // cloud that snaps to the cursor reads as a jitter, not as depth.
        const tx = -this.aimY * S.parallax * this.grip
        const ty = this.aimX * S.parallax * this.grip
        const ease = 1 - Math.exp(-dt * 3)
        this.tiltX += (tx - this.tiltX) * ease
        this.tiltY += (ty - this.tiltY) * ease
        this.group.rotation.x = this.tiltX
        this.group.rotation.y = this.tiltY

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.dotGeo.dispose()
        this.lineGeo.dispose()
        this.dotMat.dispose()
        this.lineMat.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

/**
 * One device pixel expressed in the -1..1 coordinate that runs across the link.
 * Below half a device pixel of half-width the coverage never reaches 1 and the
 * link fades instead of thinning, which is the only honest way to draw a line
 * narrower than the pixel it lands on.
 */
function featherFor(halfWidth: number): number {
    return Math.min(4, 1 / Math.max(halfWidth, 0.25))
}

interface ConstellationProps {
    dot?: string
    line?: string
    dotHover?: string
    lineHover?: string
    nodes?: number
    reach?: number
    lineWidth?: number
    lineGlow?: number
    dotSize?: number
    drift?: number
    parallax?: number
    cursor?: number
    style?: React.CSSProperties
}

export default function Constellation(props: ConstellationProps) {
    const {
        dot = DEFAULTS.dot,
        line = DEFAULTS.line,
        dotHover = DEFAULTS.dotHover,
        lineHover = DEFAULTS.lineHover,
        nodes = DEFAULTS.nodes,
        reach = DEFAULTS.reach,
        lineWidth = DEFAULTS.lineWidth,
        lineGlow = DEFAULTS.lineGlow,
        dotSize = DEFAULTS.dotSize,
        drift = DEFAULTS.drift,
        parallax = DEFAULTS.parallax,
        cursor = DEFAULTS.cursor,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<ConstellationScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        dot,
        line,
        dotHover,
        lineHover,
        nodes,
        reach,
        lineWidth,
        lineGlow,
        dotSize,
        drift,
        parallax,
        cursor,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: ConstellationScene
        try {
            scene = new ConstellationScene(container, cfgRef.current)
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
        dot,
        line,
        dotHover,
        lineHover,
        nodes,
        reach,
        lineWidth,
        lineGlow,
        dotSize,
        drift,
        parallax,
        cursor,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Network of drifting nodes joined by lines"
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

Constellation.displayName = "Constellation"
