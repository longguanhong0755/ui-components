"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"

/**
 * Magic Marble — swirling pigment suspended inside a polished glass ball.
 *
 * A port of Matt Rossman's magic-marble-tutorial (MIT). The shader is his, line
 * for line: a MeshStandardMaterial patched through onBeforeCompile so the marble
 * keeps three's own lighting and tone mapping, with only `diffuseColor` swapped
 * for a volume march.
 *
 * The march is the whole trick. Each fragment starts at the point of the sphere
 * it landed on and steps inward along the view ray. At every step the point is
 * displaced by two counter-scrolling reads of a 3D noise map — one upright, one
 * flipped and scrolled the other way, summed so the pair drifts against itself
 * instead of sliding as one sheet — and a height map is read from the direction
 * of the displaced point. That height is then sliced at a cutoff that falls with
 * depth, so each shell of the marble keeps a different band of the map, and the
 * slices accumulate into a volume. Mixed between two colours, that reads as
 * pigment with thickness rather than a pattern painted on the shell.
 *
 * Two things are load-bearing and each one left out on its own kills it.
 *
 * The environment. There are no lights in this scene at all — the marble is lit
 * entirely by an HDRI, the same warehouse the original pulls in through drei's
 * `<Environment preset="warehouse" />`. Without it a roughness-0.1 standard
 * material has nothing to reflect and the ball renders as flat matte pigment.
 *
 * `equirectUv`, which the shader calls to turn a direction into a lookup, is
 * three's own function out of the `common` chunk. That is why the marching code
 * is spliced in *above* `void main()` in the fragment shader rather than
 * prepended to the file — prepended, it sits above the chunk that defines
 * equirectUv and the shader fails to compile, which shows as a blank canvas.
 *
 * Drag turns that same orbit, with the throw carrying on after the pointer
 * lets go and the auto-spin adding underneath it.
 *
 * The camera orbits rather than the marble spinning, as the original's
 * `<OrbitControls autoRotate enableRotate={false} />` does, and here that is not
 * a preference but the only thing that works. The march reads `cameraPosition`
 * against an object-space `position`, so turning the mesh changes nothing the
 * fragment shader looks at: the pigment would sit dead still while only the
 * highlight moved. Every bit of the rotation has to come from the camera.
 */

/** The original's sphere: unit radius, 64×32. The march assumes radius 1. */
const SPHERE_R = 1
const SPHERE_SEGMENTS: [number, number] = [64, 32]

/*
 * The frame is solved for the ball rather than copied from the original, which
 * sat at [0, 0, 2] behind r3f's default 50° lens: 1.865 units of visible height
 * against a 2-unit ball, so at 100% the marble was cropped top and bottom and
 * read as off-centre instead of as a sphere sitting in the frame. Span is the
 * sphere's own diameter with a margin around it, so the whole marble is
 * visible and centred at every size.
 */
const CAMERA_DIST = 2
const FIT_MARGIN = 1.18
const BASE_SPAN = SPHERE_R * 2 * FIT_MARGIN

/*
 * How far above the equator the orbit runs, in radians.
 *
 * The original holds the camera dead level, and at that height a turning marble
 * barely reads as turning: the swirl is mapped from a direction, so an orbit in
 * the equatorial plane slides the pattern sideways and little else. Lifted a
 * little the poles come into view, the veins visibly wheel around an axis, and
 * the ball reads as a solid object being turned rather than as a texture being
 * scrolled.
 */
const CAMERA_TILT = 0.22

/** drei's "warehouse" preset, from the pmndrs asset repo it resolves to. */
const HDRI_URL =
    "https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/hdri/empty_warehouse_01_1k.hdr"

/** The tutorial's own noise maps: 2D height, 3D displacement. */
const HEIGHT_MAP_URL =
    "https://cdn.jsdelivr.net/gh/mattrossman/magic-marble-tutorial@master/public/noise.jpg"
const DISPLACEMENT_MAP_URL =
    "https://cdn.jsdelivr.net/gh/mattrossman/magic-marble-tutorial@master/public/noise3D.jpg"

/**
 * The press. The original springs the marble to 0.95 while the pointer is held
 * down *and* over it; a fixed value, so it stays one here rather than becoming a
 * slider nobody would move.
 */
const PRESS_SCALE = 0.95
/** Per-second rate of the press ease — the original's friction 15 / tension 300. */
const PRESS_RATE = 14

/**
 * Per-second rate of the colour and fast-forward eases, standing in for the
 * original's `config: { tension: 50 }` spring. Slow on purpose: the point of the
 * fast-forward is that the pigment visibly churns on its way to the new colour.
 */
const STEP_RATE = 2

/** How far the march is fast-forwarded per click, from the original's step * 0.2. */
const STEP_ADVANCE = 0.2

/** Travel that still counts as a click rather than a drag off the target. */
const DRAG_SLOP = 5
/** Per-second decay of the turn the pointer leaves behind when it lets go. */
const DRAG_DECAY = 3
/**
 * How far the orbit can be carried above or below the equator, in radians —
 * counted from level, so the resting tilt spends part of the budget. Past about
 * here the view is looking down the pole, where the swirl reads as concentric
 * rings rather than as veins running through a ball.
 */
const PITCH_LIMIT = 1.0

const DEFAULTS = {
    // The original's five HSL stops, as hex.
    palette: ["#FF0000", "#FFFF00", "#00FF80", "#5252E0", "#CCCCCC"],
    core: "#000000",
    depth: 12,
    grain: 5,
    softness: 4,
    detail: 12,
    polish: 10,
    speed: 8,
    spin: 8,
    direction: "right",
    drag: 8,
    sizePercent: 64,
}

type Config = {
    palette: string[]
    core: string
    depth: number
    grain: number
    softness: number
    detail: number
    polish: number
    speed: number
    spin: number
    direction: "right" | "left"
    drag: number
    sizePercent: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/**
 * Panel values are whole numbers; the shader wants the real ones.
 *
 * Every default below lands exactly on the original's own uniform — Depth 12 is
 * 0.6, Grain 5 is displacement 0.1, Softness 4 is smoothing 0.2, Detail 12 is 48
 * iterations, Speed 8 is 0.05. Polish and Spin are the two that deliberately do
 * not: the original's roughness 0.1 sat in a stretch of the scale this one no
 * longer carries, and its orbit rate was too slow to read as rotation.
 */
function settingsFor(cfg: Config) {
    return {
        // How far into the ball the march reaches. Past about 15 the far slices
        // stop clearing their cutoff and the extra steps buy nothing.
        depth: clamp(cfg.depth, 1, 20, DEFAULTS.depth) * 0.05,
        // How hard the two counter-scrolling noise reads shove the sample point.
        // 0 is a still marbled shell; the top of the slider is a rolling boil.
        displacement: clamp(cfg.grain, 0, 20, DEFAULTS.grain) * 0.02,
        // The width of the smoothstep that cuts each shell out of the height
        // map. Narrow gives hard-edged veins, wide gives a smoky bleed.
        smoothing: clamp(cfg.softness, 1, 20, DEFAULTS.softness) * 0.05,
        /*
         * Steps through the volume, and the whole cost of the frame — every one
         * is two 3D noise reads plus a height read. Left as a uniform rather
         * than a #define, as the original has it, so dragging the slider does
         * not recompile the material mid-drag.
         */
        iterations: clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 4,
        /*
         * Reversed here rather than in the material, so every panel→real mapping
         * stays in this one function: a high Polish is a low roughness, which is
         * the tighter reflection the eye reads as glass.
         *
         * Ten steps covering roughness 0.94 down to 0.40. The old twenty-step
         * slider ran all the way to a mirror at 0, and the top few steps of it
         * were unusable: below about 0.3 the environment reflects sharply enough
         * to read as a chrome ball with something painted inside, rather than as
         * glass with pigment suspended in it. The range now stops at the satin
         * end and spends all ten steps where the differences are visible.
         */
        roughness: 1 - clamp(cfg.polish, 1, 10, DEFAULTS.polish) * 0.06,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.00625,
        /*
         * Radians of camera orbit per second.
         *
         * Well above drei's default autoRotateSpeed, which the first version
         * matched exactly: that is a full turn every thirty seconds, and against
         * a pattern that is already drifting under Speed it read as more drift
         * rather than as rotation. At the default this is a turn every thirteen
         * seconds, slow enough to watch and fast enough to be a rotation.
         */
        spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.06,
        heading: cfg.direction === "left" ? -1 : 1,
        // Radians of orbit per pixel dragged.
        drag: clamp(cfg.drag, 0, 20, DEFAULTS.drag) * 0.0025,
        zoom: 100 / clamp(cfg.sizePercent, 20, 100, DEFAULTS.sizePercent),
    }
}

/*
 * One shared copy of each remote asset for the whole page. The HDRI alone is
 * 1.7 MB and every texture here is read-only once loaded, so the pending promise
 * is cached too — four marbles mounting together make one request between them.
 */
const textureCache = new Map<string, THREE.Texture>()
const texturePending = new Map<string, Promise<THREE.Texture | null>>()

function loadTexture(
    url: string,
    loader: THREE.Loader<any> = new THREE.TextureLoader()
): Promise<THREE.Texture | null> {
    const cached = textureCache.get(url)
    if (cached) return Promise.resolve(cached)

    const pending = texturePending.get(url)
    if (pending) return pending

    const request = new Promise<THREE.Texture | null>((resolve) => {
        loader.setCrossOrigin("anonymous")
        loader.load(
            url,
            (texture: THREE.Texture) => {
                textureCache.set(url, texture)
                resolve(texture)
            },
            undefined,
            // Offline or blocked: the marble still renders, just unlit or unmarbled,
            // rather than throwing out of an async callback nothing can catch.
            () => resolve(null)
        )
    })
    texturePending.set(url, request)
    return request
}

/**
 * The tutorial's onBeforeCompile patch, verbatim.
 *
 * Every insertion is a splice into three's own shader rather than a replacement
 * of it, so the material keeps its lighting, its environment sampling and its
 * colour management — only the diffuse term is ours.
 */
function patchMarbleShader(
    shader: { vertexShader: string; fragmentShader: string; uniforms: any },
    uniforms: Record<string, THREE.IUniform>
) {
    // Wire up local uniform references
    shader.uniforms = { ...shader.uniforms, ...uniforms }

    // Add to top of vertex shader
    shader.vertexShader =
        /* glsl */ `
      varying vec3 v_pos;
      varying vec3 v_dir;
    ` + shader.vertexShader

    // Assign values to varyings inside of main()
    shader.vertexShader = shader.vertexShader.replace(
        /void main\(\) {/,
        (match) =>
            match +
            /* glsl */ `
        v_dir = position - cameraPosition; // Points from camera to vertex
        v_pos = position;
        `
    )

    // Add to top of fragment shader
    shader.fragmentShader =
        /* glsl */ `
      #define FLIP vec2(1., -1.)

      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform sampler2D heightMap;
      uniform sampler2D displacementMap;
      uniform int iterations;
      uniform float depth;
      uniform float smoothing;
      uniform float displacement;
      uniform float time;

      varying vec3 v_pos;
      varying vec3 v_dir;
    ` + shader.fragmentShader

    // Add above fragment shader main() so we can access common.glsl.js
    shader.fragmentShader = shader.fragmentShader.replace(
        /void main\(\) {/,
        (match) =>
            /* glsl */ `
        /**
         * @param p - Point to displace
         * @param strength - How much the map can displace the point
         * @returns Point with scrolling displacement applied
         */
        vec3 displacePoint(vec3 p, float strength) {
          vec2 uv = equirectUv(normalize(p));
          vec2 scroll = vec2(time, 0.);
          vec3 displacementA = texture(displacementMap, uv + scroll).rgb; // Upright
          vec3 displacementB = texture(displacementMap, uv * FLIP - scroll).rgb; // Upside down

          // Center the range to [-0.5, 0.5], note the range of their sum is [-1, 1]
          displacementA -= 0.5;
          displacementB -= 0.5;

          return p + strength * (displacementA + displacementB);
        }

        /**
          * @param rayOrigin - Point on sphere
          * @param rayDir - Normalized ray direction
          * @returns Diffuse RGB color
          */
        vec3 marchMarble(vec3 rayOrigin, vec3 rayDir) {
          float perIteration = 1. / float(iterations);
          vec3 deltaRay = rayDir * perIteration * depth;

          // Start at point of intersection and accumulate volume
          vec3 p = rayOrigin;
          float totalVolume = 0.;

          for (int i=0; i<iterations; ++i) {
            // Read heightmap from spherical direction of displaced ray position
            vec3 displaced = displacePoint(p, displacement);
            vec2 uv = equirectUv(normalize(displaced));
            float heightMapVal = texture(heightMap, uv).r;

            // Take a slice of the heightmap
            float height = length(p); // 1 at surface, 0 at core, assuming radius = 1
            float cutoff = 1. - float(i) * perIteration;
            float slice = smoothstep(cutoff, cutoff + smoothing, heightMapVal);

            // Accumulate the volume and advance the ray forward one step
            totalVolume += slice * perIteration;
            p += deltaRay;
          }
          return mix(colorA, colorB, totalVolume);
        }
      ` + match
    )

    shader.fragmentShader = shader.fragmentShader.replace(
        /vec4 diffuseColor.*;/,
        /* glsl */ `
      vec3 rayDir = normalize(v_dir);
      vec3 rayOrigin = v_pos;

      vec3 rgb = marchMarble(rayOrigin, rayDir);
      vec4 diffuseColor = vec4(rgb, 1.);
      `
    )
}

class MagicMarbleScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    private group = new THREE.Group()
    private geometry: THREE.SphereGeometry
    private material: THREE.MeshStandardMaterial
    private pmrem: THREE.PMREMGenerator | null = null
    private envTarget: THREE.WebGLRenderTarget | null = null

    private width = 1
    private height = 1
    private frameId = 0
    private lastT = 0
    private disposed = false

    /** Clock time for the pigment, plus the click-driven fast-forward on top. */
    private flow = 0
    private timeOffset = 0
    private targetOffset = 0

    /**
     * Where the orbit sits: the auto-spin and whatever the pointer has added.
     * Elevation is measured from the resting tilt, not from level.
     */
    private azimuth = 0
    private elevation = 0
    private velAz = 0
    private velEl = 0

    private step = 0
    private hovering = false
    private pressed = false
    private dragging = false
    private scale = 1
    private downX = 0
    private downY = 0
    private lastX = 0
    private lastY = 0

    private raycaster = new THREE.Raycaster()
    private pointer = new THREE.Vector2()
    private targetColor = new THREE.Color()

    private uniforms: Record<string, THREE.IUniform> = {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0, 0, 0) },
        colorB: { value: new THREE.Color(1, 0, 0) },
        heightMap: { value: null },
        displacementMap: { value: null },
        iterations: { value: 48 },
        depth: { value: 0.6 },
        smoothing: { value: 0.2 },
        displacement: { value: 0.1 },
    }

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        /*
         * A volume march of up to 80 steps, each doing three texture reads, is
         * the most expensive thing in the frame by a wide margin — so this one
         * is capped below the usual 2.
         */
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))

        const canvas = this.renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.cursor = "grab"
        container.appendChild(canvas)

        this.geometry = new THREE.SphereGeometry(
            SPHERE_R,
            SPHERE_SEGMENTS[0],
            SPHERE_SEGMENTS[1]
        )
        this.material = new THREE.MeshStandardMaterial({ roughness: 0.1 })
        this.material.onBeforeCompile = (shader) =>
            patchMarbleShader(shader as any, this.uniforms)
        // Without a stable cache key three reuses a program compiled for another
        // material and the patch silently never runs.
        this.material.customProgramCacheKey = () => "magic-marble"

        const mesh = new THREE.Mesh(this.geometry, this.material)
        this.group.add(mesh)
        this.scene.add(this.group)

        this.applyPalette(true)
        this.loadAssets()

        canvas.addEventListener("pointerdown", this.onPointerDown)
        canvas.addEventListener("pointerleave", this.onPointerLeave)
        // On the window, not the canvas: a drag that leaves the frame has to
        // keep turning the marble, and has to end wherever the button comes up.
        window.addEventListener("pointermove", this.onPointerMove)
        window.addEventListener("pointerup", this.onPointerUp)
    }

    private loadAssets() {
        loadTexture(HEIGHT_MAP_URL).then((tex) => {
            if (this.disposed || !tex) return
            tex.minFilter = THREE.NearestFilter
            this.uniforms.heightMap.value = tex
        })
        loadTexture(DISPLACEMENT_MAP_URL).then((tex) => {
            if (this.disposed || !tex) return
            tex.minFilter = THREE.NearestFilter
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            this.uniforms.displacementMap.value = tex
        })
        loadTexture(HDRI_URL, new RGBELoader()).then((tex) => {
            if (this.disposed || !tex) return
            tex.mapping = THREE.EquirectangularReflectionMapping
            // Prefiltered once, because a raw equirect map read as an
            // environment gives a hard mirror instead of a roughness-aware one.
            this.pmrem = new THREE.PMREMGenerator(this.renderer)
            this.envTarget = this.pmrem.fromEquirectangular(tex)
            this.scene.environment = this.envTarget.texture
        })
    }

    /** The colour of the current step, eased in HSL as the original springs it. */
    private applyPalette(immediate: boolean) {
        const palette =
            Array.isArray(this.cfg.palette) && this.cfg.palette.length
                ? this.cfg.palette
                : DEFAULTS.palette
        const next = palette[this.step % palette.length] || DEFAULTS.palette[0]
        try {
            this.targetColor.set(next)
        } catch {
            this.targetColor.set(DEFAULTS.palette[0])
        }
        try {
            ;(this.uniforms.colorA.value as THREE.Color).set(
                this.cfg.core || DEFAULTS.core
            )
        } catch {
            ;(this.uniforms.colorA.value as THREE.Color).set(DEFAULTS.core)
        }
        if (immediate) (this.uniforms.colorB.value as THREE.Color).copy(this.targetColor)
    }

    /** Was the pointer over the marble itself, rather than the frame around it? */
    private hitsMarble(e: PointerEvent): boolean {
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (!rect.width || !rect.height) return false
        this.pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        )
        this.raycaster.setFromCamera(this.pointer, this.camera)
        return this.raycaster.intersectObject(this.group, true).length > 0
    }

    /** Elevation is clamped against the resting tilt, not against zero. */
    private clampElevation(v: number): number {
        return Math.max(
            -PITCH_LIMIT - CAMERA_TILT,
            Math.min(PITCH_LIMIT - CAMERA_TILT, v)
        )
    }

    private onPointerMove = (e: PointerEvent) => {
        if (this.disposed) return
        if (!this.dragging) {
            this.hovering = this.hitsMarble(e)
            return
        }
        const dx = e.clientX - this.lastX
        const dy = e.clientY - this.lastY
        this.lastX = e.clientX
        this.lastY = e.clientY

        const s = settingsFor(this.cfg).drag
        this.azimuth -= dx * s
        this.elevation = this.clampElevation(this.elevation + dy * s)
        // Kept so the marble carries on turning after the pointer lets go.
        this.velAz = -dx * s
        this.velEl = dy * s
    }

    private onPointerLeave = () => {
        if (this.dragging) return
        this.hovering = false
        this.pressed = false
    }

    private onPointerDown = (e: PointerEvent) => {
        if (this.disposed) return
        this.hovering = this.hitsMarble(e)
        this.pressed = this.hovering
        this.dragging = true
        this.downX = this.lastX = e.clientX
        this.downY = this.lastY = e.clientY
        // The throw from an earlier flick would otherwise keep running under the
        // held pointer, and the marble would squirm out from under it.
        this.velAz = 0
        this.velEl = 0
        this.renderer.domElement.style.cursor = "grabbing"
    }

    private onPointerUp = (e: PointerEvent) => {
        if (this.disposed) return
        const wasPressed = this.pressed
        this.dragging = false
        this.pressed = false
        this.renderer.domElement.style.cursor = "grab"
        if (!wasPressed) return
        // A few pixels of travel is still a click, not a drag off the target.
        const travel = Math.hypot(e.clientX - this.downX, e.clientY - this.downY)
        if (travel > DRAG_SLOP || !this.hitsMarble(e)) return

        this.step += 1
        this.targetOffset = this.step * STEP_ADVANCE
        this.applyPalette(false)
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            if (this.disposed) return
            this.frameId = requestAnimationFrame(loop)
            this.tick()
        }
        this.frameId = requestAnimationFrame(loop)
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
        this.cfg = cfg
        this.applyPalette(false)
        this.updateCamera()
    }

    private updateCamera() {
        const aspect = this.width / this.height
        const S = settingsFor(this.cfg)
        // Portrait needs a taller field or the marble is cropped to a band.
        const span = (aspect < 1 ? BASE_SPAN / aspect : BASE_SPAN) * S.zoom

        this.camera.aspect = aspect
        this.camera.fov =
            2 * Math.atan(span / 2 / CAMERA_DIST) * (180 / Math.PI)
        this.camera.updateProjectionMatrix()
    }

    private tick() {
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab left in the background must not fast-forward the marble on return.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)

        this.flow += dt * S.speed
        this.timeOffset +=
            (this.targetOffset - this.timeOffset) * (1 - Math.exp(-dt * STEP_RATE))
        this.uniforms.time.value = this.timeOffset + this.flow

        // HSL rather than RGB, so red reaching for green travels through yellow
        // the way the original's sprung hue does, not through mud.
        const colorB = this.uniforms.colorB.value as THREE.Color
        colorB.lerpHSL(this.targetColor, 1 - Math.exp(-dt * STEP_RATE))

        this.uniforms.depth.value = S.depth
        this.uniforms.smoothing.value = S.smoothing
        this.uniforms.displacement.value = S.displacement
        this.uniforms.iterations.value = S.iterations
        this.material.roughness = S.roughness

        const targetScale = this.pressed && this.hovering ? PRESS_SCALE : 1
        this.scale += (targetScale - this.scale) * (1 - Math.exp(-dt * PRESS_RATE))
        this.group.scale.setScalar(this.scale)

        if (!this.dragging) {
            // The throw the pointer left behind, and the auto-spin under it. The
            // two add, so a flick reads as a shove to something already turning
            // rather than as a separate motion that takes over.
            const decay = Math.exp(-dt * DRAG_DECAY)
            this.azimuth += this.velAz
            this.elevation = this.clampElevation(this.elevation + this.velEl)
            this.velAz *= decay
            this.velEl *= decay
            this.azimuth += dt * S.spin * S.heading
        }

        // The tilt is baked into the ring the camera walks: a smaller circle,
        // lifted, so the distance to the marble — and with it the framing the
        // field of view was solved for — is unchanged at any pitch.
        const pitch = CAMERA_TILT + this.elevation
        const ringR = Math.cos(pitch) * CAMERA_DIST
        this.camera.position.set(
            Math.sin(this.azimuth) * ringR,
            Math.sin(pitch) * CAMERA_DIST,
            Math.cos(this.azimuth) * ringR
        )
        this.camera.lookAt(0, 0, 0)

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)

        const canvas = this.renderer.domElement
        canvas.removeEventListener("pointerdown", this.onPointerDown)
        canvas.removeEventListener("pointerleave", this.onPointerLeave)
        window.removeEventListener("pointermove", this.onPointerMove)
        window.removeEventListener("pointerup", this.onPointerUp)

        this.geometry.dispose()
        this.material.dispose()
        this.envTarget?.dispose()
        this.pmrem?.dispose()
        this.scene.environment = null
        this.renderer.dispose()
        if (canvas.parentNode === this.container) this.container.removeChild(canvas)
    }
}

export interface MagicMarbleProps {
    palette?: string[]
    core?: string
    depth?: number
    grain?: number
    softness?: number
    detail?: number
    polish?: number
    speed?: number
    spin?: number
    direction?: "right" | "left"
    drag?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function MagicMarble(props: MagicMarbleProps) {
    const {
        palette = ["#FF0000","#FFFF00","#00FF80","#5252E0","#CCCCCC"],
        core = DEFAULTS.core,
        depth = DEFAULTS.depth,
        grain = DEFAULTS.grain,
        softness = DEFAULTS.softness,
        detail = DEFAULTS.detail,
        polish = DEFAULTS.polish,
        speed = DEFAULTS.speed,
        spin = DEFAULTS.spin,
        direction = DEFAULTS.direction,
        drag = DEFAULTS.drag,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<MagicMarbleScene | null>(null)
    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        palette,
        core,
        depth,
        grain,
        softness,
        detail,
        polish,
        speed,
        spin,
        direction,
        drag,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: MagicMarbleScene
        try {
            scene = new MagicMarbleScene(container, cfgRef.current)
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
        palette?.join?.(","),
        core,
        depth,
        grain,
        softness,
        detail,
        polish,
        speed,
        spin,
        direction,
        drag,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A glass marble with swirling pigment inside, draggable, changing colour when clicked"
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

MagicMarble.displayName = "Magic Marble"
MagicMarble.defaultProps = { ...DEFAULTS }
