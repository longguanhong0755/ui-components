"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Metal Flower — a bloom cast in polished metal, tumbling and draggable.
 *
 * A petal is a parametric sheet rather than a modelled one: a grid of points
 * where the width follows a sine along the length, the sheet bends back as the
 * square of it, and the cross-section is cupped. Three lines, and every petal in
 * the flower comes off the same grid with a different matrix. Modelling one and
 * copying it would fix the shape into the file; this way Curl and Cup are
 * controls rather than a re-export.
 *
 * The rows are offset by half a step against each other. Stacked in line, the
 * petals of one row sit directly behind the last and the flower reads as a
 * single ragged ring; offset, each row shows through the gaps of the one before
 * it, which is what makes a bloom look deep.
 *
 * The metal is the same matcap the solid elements use, so the finish matches
 * across the set. A matcap is a lit metal sphere photographed once: look up a
 * surface normal in it and you get the whole room back, already correct, and the
 * scene needs no lights at all.
 *
 * Normals are computed from the built geometry rather than flat-shaded. A petal
 * is a smooth curved sheet, and faceting it would break every highlight into
 * steps exactly where the metal is supposed to sweep.
 */

/*
 * A matcap is a lit sphere baked into an image, sampled by the view-space
 * normal — the same texture the solid elements use, which is what makes the
 * finishes match across the set.
 */
const POLISHED_METAL_MATCAP =
    "https://framerusercontent.com/images/Wkm2ineJ1Md7Xb1oyjF6dqbAw.png"

/*
 * Shared across the elements, so a flower and a solid placed side by side have
 * the same perspective.
 */
const PERSPECTIVE = 0.15

/** How many points a petal is built from. Enough for a smooth silhouette. */
const PETAL_SEGMENTS_LENGTH = 14
const PETAL_SEGMENTS_WIDTH = 7

/** The loop bound for rows. The panel maximum must not exceed it. */
const MAX_ROWS = 5

/** Pixels the drag moves the flower, per pixel of pointer travel. */
const DRAG_SENSITIVITY = 0.008

/*
 * How far the flower may turn from square on, either way. A bloom only reads
 * from the front: taken past this it presents the backs of its petals and the
 * stem swings across the face of it.
 */
const MAX_TURN = Math.PI / 3

const DEFAULTS = {
    tint: "#FFFFFF",
    petals: 16,
    rows: 3,
    length: 20,
    width: 1,
    curl: 0,
    cup: 5,
    open: 0,
    core: 20,
    stem: 20,
    stemWidth: 20,
    spin: 4,
    sizePercent: 200,
}

type Config = {
    tint: string
    petals: number
    rows: number
    length: number
    width: number
    curl: number
    cup: number
    open: number
    core: number
    stem: number
    stemWidth: number
    spin: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/*
 * Where a row stands, as a share of the way from the first row to the last.
 * Written once and read by both the placement and the stalk's clearance — worked
 * out separately in the two places they drift apart the moment either is
 * touched, and the stalk goes back through the petals.
 *
 * The first row is the one in front, and every row after it goes *behind*: a
 * little deeper, a little larger, and a little flatter. Larger matters — a row
 * set behind one the same size is simply hidden by it, and adding rows would
 * change nothing at all. Flatter is what splays them outward past the front row
 * rather than stacking them into a column, and the half-step of twist between
 * rows sends each one through the gaps of the one in front.
 */
const rowLift = (open: number, t: number) => open * (1 - 0.45 * t)
const rowShrink = (t: number) => 1 + t * 0.35
const rowRise = (length: number, t: number) => -t * length * 0.16

/** Panel values are whole numbers; the geometry wants the real ones. */
function settingsFor(cfg: Config) {
    const length = 0.45 + clamp(cfg.length, 1, 20, DEFAULTS.length) * 0.055
    const curl = length * clamp(cfg.curl, 0, 20, DEFAULTS.curl) * 0.055
    const open = clamp(cfg.open, 0, 20, DEFAULTS.open) * 0.06
    const stemWidth =
        length * (0.008 + clamp(cfg.stemWidth, 1, 20, DEFAULTS.stemWidth) * 0.0035)

    const core = length * (0.08 + clamp(cfg.core, 0, 20, DEFAULTS.core) * 0.012)
    const rows = Math.round(clamp(cfg.rows, 1, MAX_ROWS, DEFAULTS.rows))
    const petals = Math.round(clamp(cfg.petals, 3, 16, DEFAULTS.petals))
    const sway = clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.0175

    /*
     * The stalk runs from inside the core down and back, and how far back is set
     * by the petals it has to stay behind.
     *
     * Depth along a petal is the curl times the square of how far out it is, less
     * the lift times how far out — so if the stalk goes back as the square of how
     * far down it has come, and its coefficient is at least the petal's, it is
     * behind the petal at every point on both at once. That is one comparison
     * covering the whole length rather than a crossing to find and start below,
     * and it is what lets the stalk reach the core instead of hanging under it
     * with a knuckle on top.
     *
     * Both are taken at the lowest lift the sway can reach, because a petal
     * swinging down has a smaller lift and so reaches deeper than it does at
     * rest — measured where the flower is merely *set*, the stalk is right until
     * the first breath of sway puts a petal through it.
     */
    let curlBack = 0
    let petalDrop = 0
    let rowsBack = 0
    for (let r = 0; r < rows; r++) {
        const t = rows > 1 ? r / (rows - 1) : 0
        const lift = Math.max(0, rowLift(open, t) - sway)
        curlBack = Math.max(curlBack, rowShrink(t) * curl * Math.cos(lift))
        petalDrop = Math.max(petalDrop, rowShrink(t) * length * Math.cos(lift))
        // The rows themselves now sit behind the first one, and that head start
        // is a flat offset the squared curve above cannot answer for: at the top
        // the curve is at nothing and a back row's petals already are not.
        rowsBack = Math.max(rowsBack, -rowRise(length, t))
    }

    /*
     * So the stalk starts already behind the furthest row rather than at the
     * plane of the front one. Held under the core, which is what hides its open
     * top — past that it would come out from behind the flower.
     */
    const stemStart = Math.min(rowsBack, core * 0.7)
    const stemBack = stemStart + curlBack + stemWidth * 1.6

    return {
        petals,
        // The loop bound below is this same constant; raising the panel maximum
        // without raising it there is a silent cap.
        rows,
        length,
        /*
         * A share of the length, so a petal keeps its proportion as it grows.
         * Stopped at five: past it a petal is wider than the room its own share
         * of the ring has, and the flower closes into a disc with a rim.
         */
        width: length * (0.16 + clamp(cfg.width, 1, 5, DEFAULTS.width) * 0.026),
        // How far the tip bends back over the flower, as a share of the length.
        curl,
        // How deeply the cross-section is dished, which is what catches a
        // highlight along the middle of every petal.
        cup: clamp(cfg.cup, 0, 20, DEFAULTS.cup) * 0.022,
        /*
         * Radians the whole petal is tipped up from the plane. A quarter turn
         * stands them straight up and the flower closes into a bud, which is
         * why the range stops short of it.
         */
        open,
        // A share of the petal length.
        core,
        // A multiple of the petal length, so a stem stays in proportion to the
        // head it is carrying.
        stem: length * clamp(cfg.stem, 0, 20, DEFAULTS.stem) * 0.16,
        // A share of the petal length too, so the stalk does not go spindly as
        // the head grows or stubby as it shrinks.
        stemWidth,
        stemBack,
        stemStart,
        // How far down the petals reach, which is where the stalk's lean stops
        // deepening and it carries on straight.
        stemDrop: petalDrop,
        /*
         * Radians a petal lifts and drops as it sways. About twenty degrees at
         * the top, which is as far as a petal moves on a real flower before the
         * whole head would have to move with it.
         */
        sway,
        /*
         * And how far it rolls about its own reach as it lifts, which is what
         * keeps the sway from reading as a row of flaps hinging. Held under a
         * third of the gap to the next petal, so two neighbours rolling opposite
         * ways can never scissor through each other.
         */
        rollSway: Math.min(sway * 0.35, ((Math.PI * 2) / petals) * 0.28),
        sizePercent: clamp(cfg.sizePercent, 20, 200, DEFAULTS.sizePercent),
    }
}

/** The matcap is loaded once per document — several elements share the texture. */
let matcapTexture: THREE.Texture | null = null
let matcapPending: Promise<THREE.Texture | null> | null = null

function loadMatcap(): Promise<THREE.Texture | null> {
    if (matcapTexture) return Promise.resolve(matcapTexture)
    if (matcapPending) return matcapPending
    matcapPending = new Promise((resolve) => {
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")
        loader.load(
            POLISHED_METAL_MATCAP,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                matcapTexture = texture
                resolve(texture)
            },
            undefined,
            // Resolve rather than throw: a flower with no matcap is plain metal
            // rather than a component that took the frame down with it.
            () => resolve(null)
        )
    })
    return matcapPending
}

/**
 * The stalk: a tube swept down a curve that leans backward as the square of how
 * far it has come, flattening off once it is past the petals.
 *
 * The square is the whole point. A petal's own depth goes as the square of how
 * far out it is, so a stalk on the same curve with a coefficient at least as
 * large is behind every petal at every height — which is what lets it run all
 * the way up into the core rather than starting below the flower.
 *
 * The rings are cut in the plane rather than square to the curve. The lean is
 * gentle enough that the difference is a fraction of the stalk's own width, and
 * sweeping a proper frame along it would cost a tangent, a normal and a binormal
 * per ring to hide a thing nobody can see.
 */
function buildStem(
    length: number,
    radius: number,
    start: number,
    back: number,
    drop: number
): THREE.BufferGeometry {
    const rings = 24
    const sides = 12
    const positions: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= rings; i++) {
        const f = i / rings
        const y = -f * length
        // Squared while it is among the petals, then held: past their reach
        // there is nothing left to stay behind. It leaves the core already set
        // back by the rows behind the front one, which the squared curve alone
        // could never cover — at the top a curve is at nothing, and those rows
        // are not.
        const k = Math.min(1, (f * length) / Math.max(drop, 0.0001))
        const z = -(start + (back - start) * k * k)
        // Tapered toward the foot. A parallel tube reads as wire.
        const r = radius * (1 - 0.38 * f)

        for (let j = 0; j <= sides; j++) {
            const a = (j / sides) * Math.PI * 2
            positions.push(Math.cos(a) * r, y, z + Math.sin(a) * r)
        }
    }

    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < sides; j++) {
            const a = i * (sides + 1) + j
            const b = a + sides + 1
            indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
}

/**
 * One petal, as a parametric sheet. Length runs along Y, width across X, and
 * the sheet lifts and cups in Z.
 */
function buildPetal(
    length: number,
    width: number,
    curl: number,
    cup: number
): THREE.BufferGeometry {
    const nu = PETAL_SEGMENTS_LENGTH
    const nv = PETAL_SEGMENTS_WIDTH
    const positions: number[] = []
    const indices: number[] = []

    for (let iu = 0; iu <= nu; iu++) {
        const u = iu / nu
        /*
         * Widest a little past the middle and closed at both ends. Raised to
         * less than one so the tip comes to a point rather than a rounded stub,
         * which is most of what separates a petal from a leaf.
         */
        const halfWidth = width * Math.pow(Math.sin(Math.PI * u), 0.72)
        // Bending as the square keeps the base flat against the core and puts
        // all of the curve out at the tip, where a real petal has it.
        const bend = -curl * u * u

        for (let iv = 0; iv <= nv; iv++) {
            const v = (iv / nv) * 2 - 1
            positions.push(
                v * halfWidth,
                u * length,
                bend + cup * v * v * length
            )
        }
    }

    for (let iu = 0; iu < nu; iu++) {
        for (let iv = 0; iv < nv; iv++) {
            const a = iu * (nv + 1) + iv
            const b = a + nv + 1
            indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    // Smooth, not flat: a petal is a curved sheet, and faceting it breaks every
    // highlight into steps exactly where the metal should sweep.
    geo.computeVertexNormals()
    return geo
}

class FlowerScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000)
    private group = new THREE.Group()

    private material: THREE.MeshMatcapMaterial
    private petalGeometry: THREE.BufferGeometry | null = null
    private coreGeometry: THREE.SphereGeometry | null = null
    private petalMesh: THREE.InstancedMesh | null = null
    private coreMesh: THREE.Mesh | null = null
    private stemGeometry: THREE.BufferGeometry | null = null
    private stemMesh: THREE.Mesh | null = null

    /*
     * Scratch, held rather than made. The placement below runs every frame over
     * every petal, and allocating a quaternion inside that loop hands the
     * collector a few thousand objects a second for no reason at all.
     */
    private matrix = new THREE.Matrix4()
    private quat = new THREE.Quaternion()
    private spinQuat = new THREE.Quaternion()
    private euler = new THREE.Euler()
    private scaleVec = new THREE.Vector3()
    private posVec = new THREE.Vector3()
    private zAxis = new THREE.Vector3(0, 0, 1)

    private swayTime = 0
    private dragX = 0
    private dragY = 0
    private velX = 0
    private velY = 0
    private isDragging = false
    private lastX = 0
    private lastY = 0

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.cursor = "grab"
        el.style.touchAction = "none"
        container.appendChild(el)

        this.material = new THREE.MeshMatcapMaterial({
            color: new THREE.Color(cfg.tint || DEFAULTS.tint),
            // Both faces: a petal is a sheet with no thickness, and its back is
            // in view for most of the tumble.
            side: THREE.DoubleSide,
        })

        this.scene.add(this.group)
        this.build()

        loadMatcap().then((t) => {
            if (this.disposed || !t) return
            this.material.matcap = t
            this.material.needsUpdate = true
        })

        el.addEventListener("pointerdown", this.onPointerDown)
        window.addEventListener("pointermove", this.onPointerMove)
        window.addEventListener("pointerup", this.onPointerUp)
        window.addEventListener("pointercancel", this.onPointerUp)
    }

    /** Everything that owns a buffer. Called only when a shape control moves. */
    private build() {
        const S = settingsFor(this.cfg)

        this.petalMesh?.dispose()
        if (this.petalMesh) this.group.remove(this.petalMesh)
        this.petalGeometry?.dispose()
        this.coreGeometry?.dispose()
        if (this.coreMesh) this.group.remove(this.coreMesh)
        this.stemGeometry?.dispose()
        if (this.stemMesh) this.group.remove(this.stemMesh)

        this.petalGeometry = buildPetal(S.length, S.width, S.curl, S.cup)

        const count = S.petals * S.rows
        const mesh = new THREE.InstancedMesh(this.petalGeometry, this.material, count)
        // The matrices below place every one of them, so three cannot work out
        // where this mesh is by looking at its geometry.
        mesh.frustumCulled = false

        this.petalMesh = mesh
        this.placePetals()
        this.group.add(mesh)

        /*
         * Dead centre, where every petal's base already meets. Pushed toward
         * the viewer even slightly, it stands proud of the petals that are
         * meant to be covering it — square on that goes unnoticed, and the
         * moment the flower is tilted the core swings out through their faces.
         */
        this.coreGeometry = new THREE.SphereGeometry(S.core, 24, 16)
        this.coreMesh = new THREE.Mesh(this.coreGeometry, this.material)
        this.coreMesh.position.set(0, 0, 0)
        this.group.add(this.coreMesh)

        if (S.stem > 0.001) {
            /*
             * Starting at the middle of the flower, where the core is. The tube
             * is open at its top — capped it would show a flat disc — and it
             * begins well inside the core, which covers it. That is why the
             * stalk needs no knuckle of its own: it has the core.
             */
            this.stemGeometry = buildStem(
                S.stem,
                S.stemWidth,
                S.stemStart,
                S.stemBack,
                S.stemDrop
            )
            this.stemMesh = new THREE.Mesh(this.stemGeometry, this.material)
            this.group.add(this.stemMesh)
        }
    }

    /**
     * Where every petal stands this frame. Written each frame rather than once
     * at build, because the sway is a thing the petals do and not a thing the
     * flower does — turning the whole group would move the bloom off its own
     * centre, which is what it was doing before.
     */
    private placePetals() {
        const mesh = this.petalMesh
        if (!mesh) return
        const S = settingsFor(this.cfg)

        let i = 0
        for (let row = 0; row < S.rows; row++) {
            const t = S.rows > 1 ? row / (S.rows - 1) : 0
            // Inner rows are smaller and stand more upright, which is how a
            // bloom actually opens: from the outside in.
            const shrink = rowShrink(t)
            const lift = rowLift(S.open, t)
            /*
             * Half a step of offset per row. In line, each row hides behind the
             * last and the flower reads as one ragged ring; offset, every row
             * shows through the gaps of the one before it.
             */
            const twist = (row * Math.PI) / S.petals

            for (let p = 0; p < S.petals; p++) {
                const around = (p / S.petals) * Math.PI * 2 + twist

                /*
                 * The phase comes from where the petal stands and from nothing
                 * else — not from which row it is in. Every row at a given side
                 * of the flower therefore lifts by the same amount at the same
                 * moment, so the gap between one row's lift and the next is a
                 * constant the sway cannot touch and the rows can never cross,
                 * whatever the amplitude. Given the row a phase of its own, they
                 * swing against each other and pass straight through.
                 *
                 * It still reads as a ripple, because the phase runs round the
                 * flower — a gust bends one side of a bloom, not one layer of it.
                 */
                const wobble = Math.sin(this.swayTime + around)

                this.euler.set(lift + wobble * S.sway, 0, 0)
                this.quat.setFromEuler(this.euler)
                // A little roll about the petal's own reach as well, so it
                // twists as it lifts instead of hinging like a flap.
                this.spinQuat.setFromAxisAngle(
                    this.zAxis,
                    around + wobble * S.rollSway
                )
                this.quat.premultiply(this.spinQuat)

                this.scaleVec.setScalar(shrink)
                // Lifted a little per row, so the inner rows sit above the outer
                // ones rather than intersecting them.
                this.posVec.set(0, 0, rowRise(S.length, t))

                this.matrix.compose(this.posVec, this.quat, this.scaleVec)
                mesh.setMatrixAt(i, this.matrix)
                i++
            }
        }
        mesh.instanceMatrix.needsUpdate = true
    }

    private onPointerDown = (e: PointerEvent) => {
        this.isDragging = true
        this.lastX = e.clientX
        this.lastY = e.clientY
        this.renderer.domElement.style.cursor = "grabbing"
    }

    private onPointerMove = (e: PointerEvent) => {
        if (!this.isDragging) return
        const dx = e.clientX - this.lastX
        const dy = e.clientY - this.lastY
        this.lastX = e.clientX
        this.lastY = e.clientY
        this.dragY += dx * DRAG_SENSITIVITY
        this.dragX += dy * DRAG_SENSITIVITY
        // Kept, so the flower carries on turning after the pointer lets go.
        this.velY = dx * DRAG_SENSITIVITY
        this.velX = dy * DRAG_SENSITIVITY
    }

    private onPointerUp = () => {
        if (!this.isDragging) return
        this.isDragging = false
        this.renderer.domElement.style.cursor = "grab"
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
        this.width = width
        this.height = height
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)
        const distance = 1 / PERSPECTIVE
        const S = settingsFor(this.cfg)
        /*
         * Framed on the whole plant, head and stem together, and on whichever of
         * the two reaches further. The stem hangs from one side only, so the
         * flower sits above the middle of what has to fit.
         */
        const reach = Math.max(
            // The furthest row is the largest one, and it is the last.
            S.length * rowShrink(1) + S.core,
            (S.length + S.stem) * 0.62,
            // The stalk leans off behind the flower, and a tilt swings that
            // offset into the frame as width.
            S.length + S.stemBack
        )
        const span = reach * 2.7 * (100 / S.sizePercent)
        const visibleHeight = aspect < 1 ? span / aspect : span

        this.camera.aspect = aspect
        this.camera.position.set(0, 0, distance)
        this.camera.lookAt(0, 0, 0)
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = Math.max(0.1, distance - 20)
        this.camera.far = distance + 20
        this.camera.updateProjectionMatrix()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        const prev = this.cfg
        this.cfg = cfg
        this.material.color.set(cfg.tint || DEFAULTS.tint)

        // Only the controls that own the geometry rebuild it. Dragging the tint
        // must never reallocate a hundred petals.
        const shapeChanged =
            cfg.petals !== prev.petals ||
            cfg.rows !== prev.rows ||
            cfg.length !== prev.length ||
            cfg.width !== prev.width ||
            cfg.curl !== prev.curl ||
            cfg.cup !== prev.cup ||
            cfg.open !== prev.open ||
            cfg.core !== prev.core ||
            cfg.stem !== prev.stem ||
            cfg.stemWidth !== prev.stemWidth ||
            /*
             * The sway too, even though it moves nothing at build time. How far
             * back the stalk stands and how far down it starts are both worked
             * out from the lowest lift the sway can reach — so turning the sway
             * up without rebuilding leaves the stalk placed for a flower that
             * no longer sways that far, and the petals go through it again.
             */
            cfg.spin !== prev.spin
        if (shapeChanged) this.build()
        this.updateCamera()
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab must not spin the flower through a dozen turns.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.dragY += this.velY
            this.dragX += this.velX
            this.velX *= decay
            this.velY *= decay
        }

        if (S.sway > 0.0001) {
            this.swayTime += dt * 1.1
            // Only when there is a sway to write. Still, this rewrites nothing
            // and the matrices already on the card are the right ones.
            this.placePetals()
        }

        /*
         * The flower is turned by the drag alone, and never past sixty degrees
         * either way: a bloom only reads from the front, and past that it shows
         * the backs of its petals with the stem swinging across them.
         */
        this.group.rotation.y = clamp(this.dragY, -MAX_TURN, MAX_TURN, 0)
        this.group.rotation.x = clamp(this.dragX * 0.5, -MAX_TURN, MAX_TURN, 0)

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        const el = this.renderer.domElement
        el.removeEventListener("pointerdown", this.onPointerDown)
        window.removeEventListener("pointermove", this.onPointerMove)
        window.removeEventListener("pointerup", this.onPointerUp)
        window.removeEventListener("pointercancel", this.onPointerUp)
        this.petalMesh?.dispose()
        this.petalGeometry?.dispose()
        this.coreGeometry?.dispose()
        this.stemGeometry?.dispose()
        this.material.dispose()
        this.renderer.dispose()
        // The matcap is shared across every element on the page, so it stays.
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface MetalFlowerProps {
    tint?: string
    petals?: number
    rows?: number
    length?: number
    width?: number
    curl?: number
    cup?: number
    open?: number
    core?: number
    stem?: number
    stemWidth?: number
    spin?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function MetalFlower(props: MetalFlowerProps) {
    const {
        tint = DEFAULTS.tint,
        petals = DEFAULTS.petals,
        rows = DEFAULTS.rows,
        length = DEFAULTS.length,
        width = DEFAULTS.width,
        curl = DEFAULTS.curl,
        cup = DEFAULTS.cup,
        open = DEFAULTS.open,
        core = DEFAULTS.core,
        stem = DEFAULTS.stem,
        stemWidth = DEFAULTS.stemWidth,
        spin = DEFAULTS.spin,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<FlowerScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        tint,
        petals,
        rows,
        length,
        width,
        curl,
        cup,
        open,
        core,
        stem,
        stemWidth,
        spin,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: FlowerScene
        try {
            scene = new FlowerScene(container, cfgRef.current)
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
        tint,
        petals,
        rows,
        length,
        width,
        curl,
        cup,
        open,
        core,
        stem,
        stemWidth,
        spin,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A flower cast in polished metal, turning and draggable"
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

MetalFlower.displayName = "Metal Flower"
