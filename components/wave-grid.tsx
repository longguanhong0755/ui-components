"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Wave Grid — a field of standing blocks that ripples where you touch it.
 *
 * Adapted from franky-adl/3d-wave-grid. The mechanism is his; the framing,
 * controls and the click ripple are not.
 *
 * The grid is one InstancedMesh of tall boxes, and nothing about the wave is
 * ever computed on the CPU. Every live disturbance is a point in world space
 * with an age, and the whole set is uploaded each frame as a 128x1 RGBA float
 * texture — one texel per point, packing (worldX, worldZ, age, strength). The
 * vertex shader then asks, for each block top, what all those points add up to
 * where it stands.
 *
 * Each point contributes an expanding ring rather than a decaying bump: the
 * wavefront sits at `speed * age`, and a window riding along with it means the
 * crest travels outward while the middle goes flat behind it. A bump that
 * merely rises and falls in place reads as a poke; only a travelling front
 * reads as a wave. The window is lopsided — steep on the leading side, long on
 * the trailing one — so the water ahead of the front is still undisturbed.
 *
 * The contributions are then averaged by weight, not summed. That one division
 * is what makes a fast drag survive as a legible wake instead of a boiling mess
 * — overlapping rings from twenty trail points would otherwise stack into noise
 * several times taller than any single ring, and the clamp would flatten the
 * whole field into a plateau.
 *
 * Clicks go into the same array with a much larger strength. Because the weight
 * saturates the average, a click both hits full amplitude immediately and stays
 * above the fade threshold far longer than a trail point — one number buys a
 * ripple that is bigger and longer-lived, with no second system to maintain.
 *
 * The same vertex displacement is spliced into a custom depth material, so the
 * shadow pass deforms identically. Without that the blocks cast the shadows of
 * a flat grid while visibly standing in a wave, which is the single most
 * obvious way to break the illusion.
 */

const DEFAULTS = {
    base: "#FFFFFF",
    crest: "#00FFFF",
    grid: 20,
    gap: 2,
    amplitude: 20,
    waveSpeed: 6,
    trail: 9,
    tilt: 4,
    shadows: true,
    sizePercent: 200,
}

// Must match MAX_TRAIL in the shader and the divisor in the texel lookup. The
// loop bound has to be a compile-time constant, so this is a define rather than
// a uniform, and the live count only ever shortens it.
const MAX_TRAIL = 128

// The blocks are far taller than the wave ever lifts them, so their sides fill
// the gaps at a glancing angle and the field reads as solid rather than as a
// scatter of tiles. Neither was worth a control.
const CUBE_WIDTH = 0.8
const CUBE_HEIGHT = 3

/*
 * The panel used to own all of these. They are pinned at the values the field
 * was shipped looking like: every one of them was a slider whose whole useful
 * range was a few steps either side of this number, which is a constant with
 * extra work attached rather than a control.
 */
const WAVE_FREQ = 1.2
const WAVE_WIDTH = 3.12
const JITTER = 0.2
const RIPPLE_STRENGTH = 3.04
const PARALLAX = 0.048

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

type Config = {
    base: string
    crest: string
    grid: number
    gap: number
    amplitude: number
    waveSpeed: number
    trail: number
    tilt: number
    shadows: boolean
    sizePercent: number
}

/** Panel values are whole numbers; the scene wants the real ones. */
function settingsFor(cfg: Config) {
    /*
     * 23 to 61 blocks a side, with the middle of the slider near the 40 the
     * original used.
     *
     * Odd, and that is the fix for the cross of dark seams that ran through the
     * middle of the frame. An even grid puts a seam on the centre line, and the
     * centre line is the one place the camera looks straight down a seam — so
     * you saw its full depth, unlit, all the way to the floor, while every other
     * seam was hidden behind the side of a block. Making the count odd puts a
     * block top on the centre instead, and the gap reads the same everywhere.
     *
     * The top of this range is deliberately modest. Every moving vertex walks
     * the trail texture, so the cost is instances times live disturbances, and
     * it climbs as the square of this number: 61 a side is already 3,721
     * instances doing up to 128 texture fetches each.
     */
    const grid = 2 * Math.round(11 + clamp(cfg.grid, 1, 20, DEFAULTS.grid)) - 1
    const gap = clamp(cfg.gap, 0, 20, DEFAULTS.gap) * 0.025
    return {
        grid,
        gap,
        // Centre-to-centre span of the whole field, which everything that has to
        // frame or contain the grid is measured against.
        bounds: grid * (CUBE_WIDTH + gap),
        // World units the crest travels per second.
        waveSpeed: 1.0 + clamp(cfg.waveSpeed, 1, 20, DEFAULTS.waveSpeed) * 0.85,
        // Radians of oscillation per world unit — how many ridges are packed
        // into the ring behind the front.
        frequency: WAVE_FREQ,
        // Gaussian half-width of the ring. Wide is a swell, narrow is a shock.
        waveWidth: WAVE_WIDTH,
        amplitude: clamp(cfg.amplitude, 0, 20, DEFAULTS.amplitude) * 0.075,
        /*
         * The clamp on displacement, which is deliberately NOT tied to
         * amplitude. Amplitude sets how hard the field responds; this sets how
         * far it is allowed to go, so pushing amplitude past the ceiling flattens
         * the crests into a mesa instead of making them taller. That is the
         * intended top end of the control, not a bug in it.
         */
        maxHeight: 0.15 + clamp(cfg.amplitude, 0, 20, DEFAULTS.amplitude) * 0.055,
        // Per-block offset applied to where it samples the wave, so the ridges
        // are not perfectly straight lines of blocks.
        jitter: JITTER,
        // Seconds for a disturbance to fall to about a third of its strength.
        fadeTime: 0.3 + clamp(cfg.trail, 1, 20, DEFAULTS.trail) * 0.22,
        // Minimum world distance between trail points. Below this a slow drag
        // dumps dozens of points on one spot and the average washes them out.
        trailSpacing: 0.14,
        // Strength written into the texel's alpha for a click. Saturating the
        // weighted average is what makes a click read as a different event from
        // a drag rather than as a slightly firmer one.
        rippleStrength: RIPPLE_STRENGTH,
        // Radians the camera is tipped off straight-down. Small: the blocks are
        // read from above, and past a shallow angle the far rows occlude the
        // near ones and the wave disappears behind its own field.
        tilt: clamp(cfg.tilt, 0, 20, DEFAULTS.tilt) * 0.035,
        parallax: PARALLAX,
        // Larger Size is a closer camera, so the visible span shrinks. The grid
        // is meant to bleed off every edge — it is a field, not an object, and
        // framing it whole puts a hard border of empty page around it.
        span: 0.5 * (100 / clamp(cfg.sizePercent, 20, 200, 100)),
    }
}

/**
 * Splices the wave displacement into one of three's own vertex shaders.
 *
 * Written as a patch rather than a whole ShaderMaterial because the blocks need
 * three's lighting and shadow chunks, and because the identical displacement has
 * to go into the depth shader as well — a second hand-written shader is a second
 * thing to keep in step, and the frame it falls out of step on is the frame the
 * shadows stop matching the geometry.
 */
function overrideVertex(vertexShader: string): string {
    return vertexShader
        .replace(
            "#include <common>",
            /* glsl */ `#include <common>
            #define MAX_TRAIL ${MAX_TRAIL}
            varying float vHeight;
            attribute vec2 aOffset;
            uniform sampler2D uTrailTexture;
            uniform int   uTrailCount;
            uniform float uWaveSpeed;
            uniform float uWaveFreq;
            uniform float uWaveWidth;
            uniform float uFadeTime;
            uniform float uAmplitude;
            uniform float uJitter;
            uniform float uMaxHeight;

            // Depends only on the block's own world position, so it is stable
            // across frames. Anything seeded from gl_VertexID or from time would
            // make each block shiver on the spot.
            vec2 hash2(vec2 p) {
                p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
                return fract(sin(p) * 43758.5453123) - 0.5;
            }`
        )
        .replace(
            "#include <begin_vertex>",
            /* glsl */ `#include <begin_vertex>

            vHeight = 0.0;

            // Only the upper half of each box moves. Lifting the whole block
            // would pull its base out of the field and leave gaps underneath;
            // this stretches the block instead, so the bottoms stay planted.
            if (position.y > 0.0) {
                vec2 worldXZ = aOffset + hash2(aOffset) * uJitter;
                float waveHeight = 0.0;
                float totalWeight = 0.0;

                for (int i = 0; i < MAX_TRAIL; i++) {
                    // The live count only shortens the loop; the bound itself
                    // stays constant, which GLSL ES requires and which keeps the
                    // cost proportional to the disturbances actually alive.
                    if (i >= uTrailCount) break;

                    // texel: (worldX, worldZ, age, strength)
                    vec4 td = texture2D(
                        uTrailTexture,
                        vec2((float(i) + 0.5) / float(MAX_TRAIL), 0.5)
                    );

                    float dist = length(worldXZ - td.rg);
                    // Signed distance from the expanding front. Negative means
                    // the crest has already passed this block.
                    float relDist = dist - uWaveSpeed * td.b;

                    /*
                     * A window that rides outward with the front, rather than a
                     * falloff anchored at the origin: this is what makes the
                     * disturbance travel instead of merely pulsing in place.
                     *
                     * Asymmetric, and that is what fixed the three-ring click.
                     * A Gaussian centred on the front is symmetric in relDist,
                     * so the cosine's next crest — a full period out at
                     * 2*PI/uWaveFreq — got picked up on BOTH sides of it: one
                     * ring behind the front, and one AHEAD of it, out in water
                     * the wave had not reached yet. The middle of the three was
                     * the front, so the middle was the tallest and darkest.
                     * Squeezing the leading half of the window kills the ring
                     * ahead, leaving the front outermost and highest with its
                     * wake trailing inside it, which is the way round a real
                     * ripple runs.
                     */
                    float lead = uWaveWidth * (relDist > 0.0 ? 0.3 : 1.0);
                    float window = exp(-(relDist * relDist) / (lead * lead));
                    float fade = exp(-td.b / uFadeTime);
                    float atten = 1.0 / (1.0 + dist * 0.1);
                    float weight = fade * window * atten * td.a;

                    // Raised cosine, so a disturbance can only ever lift a
                    // block. A plain cos swings negative behind the front and
                    // pushes blocks BELOW their neighbours, where they lose
                    // their top light and drop into the shadow the risen blocks
                    // cast — which is why passing the pointer over the field
                    // made some blocks flash darker than rest and others
                    // lighter. Every block the wave touches now brightens.
                    waveHeight += weight * (0.5 + 0.5 * cos(uWaveFreq * relDist));
                    totalWeight += weight;
                }

                /*
                 * Averaged, not summed — and the max() is the whole subtlety.
                 * Dividing by the raw total would normalise a lone weak ripple
                 * up to full height; flooring the divisor at one leaves a single
                 * light touch light, while still collapsing the pile-up when
                 * many disturbances overlap.
                 */
                waveHeight /= max(totalWeight, 1.0);

                // Floored at zero to match: nothing sinks, so the tint ramp
                // below always runs the same way and the field has one resting
                // brightness rather than two.
                float displacement = clamp(waveHeight * uAmplitude, 0.0, uMaxHeight);
                transformed.y += displacement;
                vHeight = displacement;
            }`
        )
}

class WaveGridScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

    private material: THREE.MeshPhongMaterial
    private depthMaterial: THREE.MeshDepthMaterial
    private geometry: THREE.BoxGeometry | null = null
    private offsets: THREE.InstancedBufferAttribute | null = null
    private mesh: THREE.InstancedMesh | null = null

    private keyLight: THREE.DirectionalLight
    private fillLight: THREE.DirectionalLight
    private ambient: THREE.AmbientLight

    /*
     * One set of uniform objects, assigned BY REFERENCE into both the lit
     * shader and the depth shader. Writing a value here therefore reaches both
     * passes at once; keeping two copies is how the shadow eventually ends up
     * a frame or a setting behind the thing casting it.
     */
    private waveUniforms = {
        uTrailTexture: { value: null as THREE.DataTexture | null },
        uTrailCount: { value: 0 },
        uFadeTime: { value: 2 },
        uWaveSpeed: { value: 6 },
        uWaveFreq: { value: 1.2 },
        uWaveWidth: { value: 3 },
        uAmplitude: { value: 0.4 },
        uJitter: { value: 0.2 },
        uMaxHeight: { value: 0.4 },
    }
    private colorUniforms = {
        uColorBase: { value: new THREE.Color(DEFAULTS.base) },
        uColorHigh: { value: new THREE.Color(DEFAULTS.crest) },
    }

    // Disturbances: world position, seconds since birth, and the strength that
    // separates a click from a drag.
    private trail: { x: number; z: number; age: number; strength: number }[] = []
    private trailData = new Float32Array(MAX_TRAIL * 4)
    private trailTexture: THREE.DataTexture
    private lastPoint: { x: number; z: number } | null = null

    private raycaster = new THREE.Raycaster()
    private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    private ndc = new THREE.Vector2()
    private hit = new THREE.Vector3()

    private pointer = new THREE.Vector2()
    private easedPointer = new THREE.Vector2()

    // What the grid buffers were last built for. Only these two own geometry;
    // everything else on the panel is a uniform write.
    private builtGrid = 0
    private builtGap = -1

    private width = 0
    private height = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        // Mesh work rather than heavy fragment work, so the full ratio is worth
        // paying for — the block edges are the whole look and they alias badly.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        // Transparent, and no scene.background: a Framer frame supplies its own
        // fill, and the field composites over whatever is behind it.
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.shadowMap.enabled = cfg.shadows !== false
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        el.style.cursor = "crosshair"
        container.appendChild(el)

        /*
         * NearestFilter, and not by preference: linear filtering of a float
         * texture needs an extension that is not universally present, and the
         * shader reads exact texel centres anyway. Left on the default it can
         * silently sample nothing on the machines that lack it.
         */
        this.trailTexture = new THREE.DataTexture(
            this.trailData,
            MAX_TRAIL,
            1,
            THREE.RGBAFormat,
            THREE.FloatType
        )
        this.trailTexture.minFilter = THREE.NearestFilter
        this.trailTexture.magFilter = THREE.NearestFilter
        this.trailTexture.needsUpdate = true
        this.waveUniforms.uTrailTexture.value = this.trailTexture

        this.ambient = new THREE.AmbientLight(0xffffff, 0.5)
        this.scene.add(this.ambient)

        this.keyLight = new THREE.DirectionalLight(0xffffff, 4.0)
        this.keyLight.position.set(-20, 10, 6)
        this.keyLight.castShadow = true
        this.keyLight.shadow.mapSize.set(1024, 1024)
        this.keyLight.shadow.radius = 6
        this.keyLight.shadow.camera.near = 0.1
        this.keyLight.shadow.camera.far = 80
        // normalBias, not bias: the blocks are flat-topped boxes lit at a
        // glancing angle, so the depth comparison lands on the wrong side of
        // the surface across whole tops and speckles them with self-shadow that
        // crawls as the wave moves. Pushing the lookup along the normal fixes
        // it where a depth offset alone only trades it for a detached shadow.
        this.keyLight.shadow.bias = 0
        this.keyLight.shadow.normalBias = 0.04
        this.scene.add(this.keyLight)

        // No shadow on the fill: a second shadow map costs as much as the first
        // and its shadows land inside the key's, where nothing can see them.
        this.fillLight = new THREE.DirectionalLight(0xffffff, 1.0)
        this.fillLight.position.set(10, 5, -3)
        this.scene.add(this.fillLight)

        this.material = new THREE.MeshPhongMaterial({ color: 0xffffff })
        this.material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.waveUniforms, this.colorUniforms)
            shader.vertexShader = overrideVertex(shader.vertexShader)
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    "#include <common>",
                    /* glsl */ `#include <common>
                    varying float vHeight;
                    uniform vec3 uColorBase;
                    uniform vec3 uColorHigh;
                    uniform float uMaxHeight;`
                )
                .replace(
                    "#include <color_fragment>",
                    /* glsl */ `#include <color_fragment>
                    // Tinted by how far this block was lifted, so the crest
                    // colour tracks the wave rather than being painted onto a
                    // fixed part of the field.
                    float lift = clamp(vHeight / uMaxHeight, 0.0, 1.0);
                    diffuseColor.rgb = mix(uColorBase, uColorHigh, lift);`
                )
        }
        this.material.needsUpdate = true

        /*
         * RGBADepthPacking is required for a custom depth material used as a
         * shadow caster — three's shadow pass reads the depth back out of four
         * 8-bit channels, and a material packing it any other way produces
         * shadows that are subtly and inexplicably wrong.
         */
        this.depthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
        })
        this.depthMaterial.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, this.waveUniforms)
            shader.vertexShader = overrideVertex(shader.vertexShader)
        }
        this.depthMaterial.needsUpdate = true

        this.buildGrid()
        this.pushUniforms(S)
        this.bindEvents()
    }

    // ── Grid ────────────────────────────────────────────────────────────────

    /** Allocates the geometry and the mesh. Only a change of grid size needs this. */
    private buildGrid() {
        const S = settingsFor(this.cfg)
        const count = S.grid * S.grid

        this.geometry = new THREE.BoxGeometry(CUBE_WIDTH, CUBE_HEIGHT, CUBE_WIDTH)
        this.offsets = new THREE.InstancedBufferAttribute(
            new Float32Array(count * 2),
            2
        )
        this.geometry.setAttribute("aOffset", this.offsets)

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count)
        this.mesh.customDepthMaterial = this.depthMaterial
        this.mesh.castShadow = true
        this.mesh.receiveShadow = true
        // The vertex shader moves the tops, so three cannot know the real
        // bounds and would cull the mesh the moment its flat box left the view.
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        this.builtGrid = S.grid
        this.builtGap = -1
        this.layoutGrid()
    }

    /** Writes the matrices and world offsets. A change of gap needs only this. */
    private layoutGrid() {
        if (!this.mesh || !this.offsets) return
        const S = settingsFor(this.cfg)
        const spacing = CUBE_WIDTH + S.gap
        const origin = ((S.grid - 1) * spacing) / 2
        const dummy = new THREE.Object3D()

        for (let i = 0; i < S.grid; i++) {
            for (let j = 0; j < S.grid; j++) {
                const index = i * S.grid + j
                const x = i * spacing - origin
                const z = j * spacing - origin
                dummy.position.set(x, 0, z)
                dummy.updateMatrix()
                this.mesh.setMatrixAt(index, dummy.matrix)
                // The shader needs the world position as an attribute: the
                // instance matrix is not readable from the vertex stage in a
                // form that survives the displacement being applied to it.
                this.offsets.setXY(index, x, z)
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true
        this.offsets.needsUpdate = true

        // The shadow frustum has to cover the field, and the field just changed.
        const reach = S.bounds * 0.7
        const sc = this.keyLight.shadow.camera
        sc.left = -reach
        sc.right = reach
        sc.top = reach
        sc.bottom = -reach
        sc.updateProjectionMatrix()

        this.builtGap = S.gap
        this.updateCamera()
    }

    private destroyGrid() {
        if (this.mesh) {
            this.scene.remove(this.mesh)
            this.mesh.dispose()
            this.mesh = null
        }
        if (this.geometry) {
            this.geometry.dispose()
            this.geometry = null
        }
        this.offsets = null
    }

    // ── Camera ──────────────────────────────────────────────────────────────

    /**
     * Looks down the world Y axis with `up` along -Z, which is what puts the
     * grid square to the frame. Position is solved from two angles rather than
     * orbited with a control, so the field never rolls.
     */
    private updateCamera() {
        if (this.disposed) return
        const S = settingsFor(this.cfg)
        const aspect = Math.max(1, this.width) / Math.max(1, this.height)

        // Far enough out that the tilt does not push the near rows through the
        // camera, and fixed so that Size changes the field of view instead —
        // moving the camera would change the perspective as well as the framing.
        const distance = 14

        const alpha = S.tilt + this.easedPointer.y * S.parallax * 4.0
        const beta = this.easedPointer.x * S.parallax * 6.0

        this.camera.position.set(
            -distance * Math.cos(alpha) * Math.sin(beta),
            distance * Math.cos(alpha) * Math.cos(beta),
            distance * Math.sin(alpha)
        )
        this.camera.up.set(0, 0, -1)
        this.camera.lookAt(0, 0, 0)

        // Framed on a fraction of the field so it bleeds off every edge.
        // Portrait needs a wider field or the grid pinches in at the sides.
        const span = S.bounds * S.span
        const visibleHeight = aspect < 1 ? span / aspect : span
        this.camera.aspect = aspect
        this.camera.fov =
            2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI)
        this.camera.near = 0.1
        this.camera.far = distance + S.bounds * 2 + 20
        this.camera.updateProjectionMatrix()
    }

    // ── Disturbances ────────────────────────────────────────────────────────

    /** Where a pointer event lands on the y = 0 plane, or null if it misses. */
    private groundAt(e: PointerEvent): THREE.Vector3 | null {
        /*
         * Read live rather than cached on resize. A cached rect goes stale the
         * moment the page scrolls, and the symptom — ripples appearing at a
         * constant offset from the cursor — looks like a projection bug rather
         * than a stale measurement. This is a read of an already-clean layout.
         */
        const rect = this.renderer.domElement.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return null
        this.ndc.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        )
        this.raycaster.setFromCamera(this.ndc, this.camera)
        // Intersecting the plane directly rather than raycasting an invisible
        // mesh: no geometry, no material, nothing extra to dispose, and it
        // cannot be missed by a ray that passes outside a finite quad.
        return this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)
    }

    private addPoint(x: number, z: number, strength: number) {
        // Oldest out first. The texture is a fixed window, so something has to
        // go, and the oldest is the one already closest to invisible.
        if (this.trail.length >= MAX_TRAIL) this.trail.shift()
        this.trail.push({ x, z, age: 0, strength })
    }

    private bindEvents() {
        const el = this.renderer.domElement

        const onMove = (e: PointerEvent) => {
            if (this.disposed) return
            const rect = el.getBoundingClientRect()
            // Parallax follows the pointer across the whole element, whether or
            // not the ray lands on the field.
            if (rect.width > 0 && rect.height > 0) {
                this.pointer.set(
                    ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    -((e.clientY - rect.top) / rect.height) * 2 + 1
                )
            }

            const p = this.groundAt(e)
            if (!p) return
            const S = settingsFor(this.cfg)

            /*
             * A new point only once the pointer has travelled far enough, and
             * the distance travelled becomes the point's strength. A slow,
             * careful drag therefore disturbs the field gently and a fast swipe
             * throws a real wake — the wake is a property of the gesture rather
             * than of how many events the browser happened to deliver.
             */
            let strength = 0.35
            if (this.lastPoint) {
                const dx = p.x - this.lastPoint.x
                const dz = p.z - this.lastPoint.z
                const moved = Math.sqrt(dx * dx + dz * dz)
                if (moved < S.trailSpacing) return
                strength = Math.min(moved, 1.2)
            }

            this.addPoint(p.x, p.z, strength)
            this.lastPoint = { x: p.x, z: p.z }
        }

        const onDown = (e: PointerEvent) => {
            if (this.disposed) return
            const S = settingsFor(this.cfg)
            const p = this.groundAt(e)
            if (!p) return

            /*
             * One seed, not three. An earlier version scattered two weaker
             * points a fraction of a block off the click to rough up the front;
             * at the size the front actually reads it just put two more rings
             * a hair inside and outside the real one, which is half of why a
             * click looked like several waves at once.
             */
            this.addPoint(p.x, p.z, S.rippleStrength)
            // A click is also a fresh start for the drag spacing, so the wake
            // does not carry on from wherever the pointer last was.
            this.lastPoint = { x: p.x, z: p.z }
        }

        const onLeave = () => {
            this.pointer.set(0, 0)
            this.lastPoint = null
        }

        el.addEventListener("pointermove", onMove)
        el.addEventListener("pointerdown", onDown)
        // enter/leave rather than over/out: the latter pair also fire crossing
        // between children, and the parallax would twitch on an unrelated
        // DOM change.
        el.addEventListener("pointerleave", onLeave)
        el.addEventListener("pointercancel", onLeave)

        this.unbind = () => {
            el.removeEventListener("pointermove", onMove)
            el.removeEventListener("pointerdown", onDown)
            el.removeEventListener("pointerleave", onLeave)
            el.removeEventListener("pointercancel", onLeave)
        }
    }

    private unbind = () => {}

    // ── Frame ───────────────────────────────────────────────────────────────

    private pushUniforms(S: ReturnType<typeof settingsFor>) {
        const u = this.waveUniforms
        u.uFadeTime.value = S.fadeTime
        u.uWaveSpeed.value = S.waveSpeed
        u.uWaveFreq.value = S.frequency
        u.uWaveWidth.value = S.waveWidth
        u.uAmplitude.value = S.amplitude
        u.uJitter.value = S.jitter
        u.uMaxHeight.value = S.maxHeight
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
        this.width = width
        this.height = height
        this.renderer.setSize(width, height, false)
        this.updateCamera()
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)

        // Only these two own buffers. Dragging a colour or a wave slider must
        // never reallocate 2000 instance matrices.
        if (S.grid !== this.builtGrid) {
            this.destroyGrid()
            this.buildGrid()
        } else if (S.gap !== this.builtGap) {
            this.layoutGrid()
        }

        this.colorUniforms.uColorBase.value.set(cfg.base || DEFAULTS.base)
        this.colorUniforms.uColorHigh.value.set(cfg.crest || DEFAULTS.crest)
        this.pushUniforms(S)

        const shadows = cfg.shadows !== false
        if (this.renderer.shadowMap.enabled !== shadows) {
            // Turning shadows off changes three's shader defines, so both
            // materials have to be told to recompile — without this the toggle
            // appears to do nothing until something else forces a rebuild.
            this.renderer.shadowMap.enabled = shadows
            this.keyLight.castShadow = shadows
            this.material.needsUpdate = true
            this.depthMaterial.needsUpdate = true
        }

        this.updateCamera()
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A tab returning after a minute would otherwise age every disturbance
        // by a minute in one frame and the field would snap flat.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)

        // Points live until the fade has taken them to about two per cent, past
        // which they are occupying a texel for nothing.
        const expiry = S.fadeTime * 4
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].age += dt
            if (this.trail[i].age > expiry) this.trail.splice(i, 1)
        }

        const count = Math.min(this.trail.length, MAX_TRAIL)
        if (count > 0 || this.waveUniforms.uTrailCount.value > 0) {
            for (let i = 0; i < count; i++) {
                const t = this.trail[i]
                const o = i * 4
                this.trailData[o] = t.x
                this.trailData[o + 1] = t.z
                this.trailData[o + 2] = t.age
                this.trailData[o + 3] = t.strength
            }
            this.trailTexture.needsUpdate = true
            this.waveUniforms.uTrailCount.value = count
        }

        // Eased toward the pointer rather than snapped to it, so the camera has
        // some weight. Per second, so it settles in the same time at any refresh.
        const k = 1 - Math.exp(-dt * 2.4)
        this.easedPointer.x += (this.pointer.x - this.easedPointer.x) * k
        this.easedPointer.y += (this.pointer.y - this.easedPointer.y) * k
        this.updateCamera()

        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.destroyGrid()
        this.material.dispose()
        this.depthMaterial.dispose()
        this.trailTexture.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface WaveGridProps {
    base?: string
    crest?: string
    grid?: number
    gap?: number
    amplitude?: number
    waveSpeed?: number
    trail?: number
    tilt?: number
    shadows?: boolean
    sizePercent?: number
    style?: React.CSSProperties
}

export default function WaveGrid(props: WaveGridProps) {
    const {
        base = DEFAULTS.base,
        crest = DEFAULTS.crest,
        grid = DEFAULTS.grid,
        gap = DEFAULTS.gap,
        amplitude = DEFAULTS.amplitude,
        waveSpeed = DEFAULTS.waveSpeed,
        trail = DEFAULTS.trail,
        tilt = DEFAULTS.tilt,
        shadows = DEFAULTS.shadows,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<WaveGridScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        base,
        crest,
        grid,
        gap,
        amplitude,
        waveSpeed,
        trail,
        tilt,
        shadows,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: WaveGridScene
        try {
            scene = new WaveGridScene(container, cfgRef.current)
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
        base,
        crest,
        grid,
        gap,
        amplitude,
        waveSpeed,
        trail,
        tilt,
        shadows,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="A grid of blocks rippling under the pointer"
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

WaveGrid.displayName = "Wave Grid"
