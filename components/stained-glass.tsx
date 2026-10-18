"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Stained Glass — leaded panes with the light coming through them.
 *
 * The panes are a Voronoi diagram, which is the right tool for exactly one
 * reason: its cells tile the plane with no gaps and no overlaps, so the lead
 * between them is a single connected web rather than a set of outlines that
 * happen to touch. Drawing polygons and stroking them cannot give that — the
 * strokes double up along shared edges and the joints never quite meet.
 *
 * The lead is found from the *second* nearest seed, not the first. Distance to
 * the nearest one alone gives blobs around each point; comparing the two says
 * how close a pixel is to the boundary between them, which is where the came
 * actually runs. That second pass is the whole of it.
 *
 * A pane is not a flat fill. Real glass of this kind is rolled, streaked and
 * seeded with bubbles, and it is far from even in thickness — so each cell gets
 * its own texture, rotated and scaled on its own seed, and its own slight
 * variation in how much light it passes. Flat colour reads as paper immediately.
 *
 * The light is behind the glass, not in front of it. Every pane is lit from a
 * source somewhere beyond the panel, so colour is strongest where that light is
 * and the whole thing falls away toward the edges of the frame — which is what
 * separates a window from a printed pattern.
 */

const MAX_COLORS = 8

/**
 * How far the light is led by the pointer: all the way to it. The panel used to
 * own this.
 */
const FOLLOW_POINTER = 1

const DEFAULTS = {
    palette: ["#FF4D0F", "#FFA51F", "#FFE3A3", "#C6D64B", "#2FA8C8", "#A82820"],
    lead: "#000000",
    lightColor: "#FFF3D6",
    cellSize: 15,
    irregularity: 20,
    leadWidth: 1,
    backlight: 5,
    lightRadius: 3,
    speed: 20,
    texture: 0,
    streaks: 6,
    seeds: 0,
    contrast: 20,
}

type Config = {
    palette: string[]
    lead: string
    lightColor: string
    cellSize: number
    irregularity: number
    leadWidth: number
    backlight: number
    lightRadius: number
    speed: number
    texture: number
    streaks: number
    seeds: number
    contrast: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        // Panes across the short side of the frame.
        cellSize: 1.5 + clamp(cfg.cellSize, 1, 20, DEFAULTS.cellSize) * 0.55,
        /*
         * How far each seed is allowed off its lattice position.
         *
         * 0 leaves a grid of rectangles; at the top the cells are properly
         * irregular. Capped at half a cell, which is exactly as far as a seed
         * can stray while a search of the eight neighbouring cells is still
         * guaranteed to find the true nearest one. Past that the winner can be
         * two cells away, the second pass compares against the wrong seed, and
         * the lead breaks apart in patches.
         */
        irregularity: clamp(cfg.irregularity, 0, 20, DEFAULTS.irregularity) * 0.025,
        leadWidth: 0.01 + clamp(cfg.leadWidth, 1, 20, DEFAULTS.leadWidth) * 0.006,
        backlight: 0.2 + clamp(cfg.backlight, 0, 20, DEFAULTS.backlight) * 0.075,
        /*
         * How wide the pool of light behind the panel is, in frame heights.
         *
         * Small is a lamp close behind the glass and a hard falloff; large is
         * daylight, with the whole panel lit almost evenly.
         */
        lightRadius: 0.18 + clamp(cfg.lightRadius, 1, 20, DEFAULTS.lightRadius) * 0.055,
        followPointer: FOLLOW_POINTER,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.06,
        texture: clamp(cfg.texture, 0, 20, DEFAULTS.texture) * 0.045,
        streaks: clamp(cfg.streaks, 0, 20, DEFAULTS.streaks) * 0.05,
        // The little bubbles rolled into the sheet.
        seeds: clamp(cfg.seeds, 0, 20, DEFAULTS.seeds) * 0.035,
        contrast: 0.55 + clamp(cfg.contrast, 1, 20, DEFAULTS.contrast) * 0.055,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const GLASS_FRAGMENT = /* glsl */ `
    precision highp float;

    #define MAX_COLORS ${MAX_COLORS}

    uniform vec2 uResolution;
    uniform vec2 uLight;
    uniform vec3 uPalette[MAX_COLORS];
    uniform float uPaletteCount;
    uniform vec3 uLead;
    uniform vec3 uLightColor;
    uniform float uTime;
    uniform float uCellSize;
    uniform float uIrregularity;
    uniform float uLeadWidth;
    uniform float uTexture;
    uniform float uStreaks;
    uniform float uSeeds;
    uniform float uBacklight;
    uniform float uLightRadius;
    uniform float uContrast;

    varying vec2 vUv;

    vec2 hash2(vec2 p) {
        vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9)));
        return fract(sin(q.xy) * 43758.5453);
    }

    float hash1(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash1(i), hash1(i + vec2(1.0, 0.0)), u.x),
            mix(hash1(i + vec2(0.0, 1.0)), hash1(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
            sum += noise(p) * amp;
            p *= 2.07;
            amp *= 0.5;
        }
        return sum;
    }

    /** Where the seed for a given lattice cell sits. */
    vec2 seedAt(vec2 cell) {
        vec2 h = hash2(cell);
        // Kept still: glass does not rearrange itself, so only the light moves.
        return cell + 0.5 + (h - 0.5) * uIrregularity * 2.0;
    }

    void main() {
        float aspect = uResolution.x / max(1.0, uResolution.y);
        vec2 uv = vec2(vUv.x * aspect, vUv.y);
        vec2 p = uv * uCellSize;

        vec2 base = floor(p);

        /*
         * First pass: which pane is this pixel in.
         */
        vec2 bestCell = base;
        vec2 bestSeed = seedAt(base);
        float bestDist = 1e9;
        for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
                vec2 cell = base + vec2(float(i), float(j));
                vec2 s = seedAt(cell);
                float d = dot(p - s, p - s);
                if (d < bestDist) {
                    bestDist = d;
                    bestCell = cell;
                    bestSeed = s;
                }
            }
        }

        /*
         * Second pass: how close to the boundary.
         *
         * For every other seed, the boundary with the winner is the line halfway
         * between them, and the distance to it is the projection onto the line
         * joining the two. The smallest of those is the distance to the came.
         *
         * Distance to the nearest seed alone would only give a blob around each
         * point — it says nothing about where one pane stops and the next
         * begins, which is precisely what has to be drawn here.
         */
        float edge = 1e9;
        for (int j = -2; j <= 2; j++) {
            for (int i = -2; i <= 2; i++) {
                vec2 cell = base + vec2(float(i), float(j));
                vec2 s = seedAt(cell);
                vec2 toS = s - bestSeed;
                float len = length(toS);
                if (len > 0.0001) {
                    /*
                     * Measured from the pixel *to* the midpoint, not the other
                     * way round.
                     *
                     * The winning seed is by definition the nearest, so the
                     * pixel always sits on its side of every bisector — which
                     * makes the projection the other way round uniformly
                     * negative, and a negative distance is never wider than the
                     * lead. The whole panel comes out as came with no glass in
                     * it at all.
                     */
                    float d = dot(0.5 * (bestSeed + s) - p, toS / len);
                    edge = min(edge, d);
                }
            }
        }

        // Line width measured in pixels, so the lead holds its weight whether
        // the panes are large or small.
        float aa = max(fwidth(edge), 0.0001);
        float glass = smoothstep(uLeadWidth - aa, uLeadWidth + aa, edge);

        /*
         * The pane's own colour, and its own character.
         *
         * Each cell draws from the palette on a hash of its position, and gets
         * its own texture rotation, scale and tint offset from the same seed —
         * so no two panes of the same colour are the same piece of glass.
         */
        float pick = hash1(bestCell + 3.7);
        int index = int(floor(pick * uPaletteCount));
        vec3 tint = uPalette[0];
        for (int i = 0; i < MAX_COLORS; i++) {
            if (i == index) tint = uPalette[i];
        }

        // Local coordinates, so the texture belongs to the pane rather than
        // running straight through the lead into the next one.
        vec2 local = p - bestSeed;
        float ang = hash1(bestCell + 11.3) * 6.28318;
        float ca = cos(ang);
        float sa = sin(ang);
        vec2 rotated = vec2(local.x * ca - local.y * sa, local.x * sa + local.y * ca);

        // Rolled sheet: broad mottling across the pane.
        float mottle = fbm(rotated * (2.5 + hash1(bestCell) * 3.0) + bestCell * 17.0);
        // Streaks: the same noise stretched hard along one axis, which is what
        // drawn glass does as it is pulled.
        float streak = fbm(vec2(rotated.x * 14.0, rotated.y * 1.2) + bestCell * 31.0);
        // Seeds: the small bubbles trapped in the sheet.
        float bubble = pow(noise(rotated * 26.0 + bestCell * 7.0), 6.0);

        float body = 1.0
            + (mottle - 0.5) * uTexture * 4.0
            + (streak - 0.5) * uStreaks * 3.0
            + bubble * uSeeds * 5.0;

        /*
         * The light behind the panel.
         *
         * Every pane is lit from one source beyond the glass, so colour is
         * strongest near it and falls away toward the edges. Without this the
         * panel is evenly bright everywhere, which reads as printed paper rather
         * than as something being shone through.
         */
        /*
         * Both the pixel and the light are already in the same aspect-scaled
         * space, so the distance between them is a true one and the pool of
         * light comes out round on screen. Dividing by the aspect here — the
         * obvious-looking correction — is what stretched it into an ellipse and
         * left the bright spot sitting away from the cursor on a tall frame.
         */
        vec2 toLight = uv - uLight;
        float lamp = exp(-dot(toLight, toLight) / max(0.01, uLightRadius * uLightRadius));
        // Panes vary in how much they pass — old glass is nowhere near even.
        float passes = 0.75 + hash1(bestCell + 23.1) * 0.5;

        vec3 col = tint * body * passes;
        // Colour saturates as the light behind it strengthens, the way a lit
        // pane does, rather than simply getting brighter.
        col *= 0.35 + (uBacklight * lamp) * 2.2;
        col += uLightColor * lamp * lamp * uBacklight * 0.35 * passes;
        col = pow(max(col, 0.0), vec3(uContrast));

        /*
         * The came, with a bevel.
         *
         * The gradient of the edge distance points across the lead, so lighting
         * it against a fixed direction gives one side a catch of light and the
         * other a shadow. Flat black lines read as a drawing; this reads as
         * metal holding the glass.
         */
        vec2 grad = vec2(dFdx(edge), dFdy(edge));
        float bevel = 0.0;
        if (length(grad) > 0.00001) {
            bevel = dot(normalize(grad), normalize(vec2(-0.55, 0.83)));
        }
        vec3 leadCol = uLead * (1.0 + bevel * 0.85) + uLightColor * max(bevel, 0.0) * 0.12;

        col = mix(leadCol, col, glass);

        gl_FragColor = vec4(col, 1.0);
    }
`

class GlassScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    // Where the light behind the panel is, and where it is heading.
    private light = new THREE.Vector2(0.5, 0.6)
    private lightTarget = new THREE.Vector2(0.5, 0.6)
    private pointer = new THREE.Vector2(0.5, 0.6)
    private grip = 0
    private gripTarget = 0

    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
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
            fragmentShader: GLASS_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uLight: { value: new THREE.Vector2(0.5, 0.6) },
                // A fixed-length array: GLSL cannot size one from a uniform, so
                // the unused slots are filled and the count is passed alongside.
                uPalette: { value: this.paletteColors(cfg) },
                uPaletteCount: { value: this.paletteCount(cfg) },
                uLead: { value: new THREE.Color(cfg.lead) },
                uLightColor: { value: new THREE.Color(cfg.lightColor) },
                uTime: { value: 0 },
                uCellSize: { value: S.cellSize },
                uIrregularity: { value: S.irregularity },
                uLeadWidth: { value: S.leadWidth },
                uTexture: { value: S.texture },
                uStreaks: { value: S.streaks },
                uSeeds: { value: S.seeds },
                uBacklight: { value: S.backlight },
                uLightRadius: { value: S.lightRadius },
                uContrast: { value: S.contrast },
            },
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
        this.bindEvents()
    }

    /** Panel colours, padded out to the array the shader declares. */
    private paletteColors(cfg: Config): THREE.Color[] {
        const list = Array.isArray(cfg.palette) ? cfg.palette : DEFAULTS.palette
        const out: THREE.Color[] = []
        for (let i = 0; i < MAX_COLORS; i++) {
            // Repeated rather than left black: an empty slot the count never
            // reaches is harmless, but a stray black pane is not.
            const hex = list[i % Math.max(1, list.length)] || "#ffffff"
            out.push(new THREE.Color(hex))
        }
        return out
    }

    private paletteCount(cfg: Config): number {
        const list = Array.isArray(cfg.palette) ? cfg.palette : DEFAULTS.palette
        return Math.max(1, Math.min(MAX_COLORS, list.length))
    }

    private bindEvents() {
        const el = this.renderer.domElement
        const move = (e: PointerEvent) => {
            const rect = el.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const aspect = rect.width / rect.height
            // Into the same space the shader works in, where x has been scaled
            // by the aspect so the panes stay square.
            this.pointer.set(
                ((e.clientX - rect.left) / rect.width) * aspect,
                1 - (e.clientY - rect.top) / rect.height
            )
            this.gripTarget = 1
        }
        const leave = () => {
            this.gripTarget = 0
        }
        el.addEventListener("pointermove", move)
        el.addEventListener("pointerenter", move)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointermove", move)
            el.removeEventListener("pointerenter", move)
            el.removeEventListener("pointerleave", leave)
            el.removeEventListener("pointercancel", leave)
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
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uPalette.value = this.paletteColors(cfg)
        u.uPaletteCount.value = this.paletteCount(cfg)
        u.uLead.value.set(cfg.lead || "#000000")
        u.uLightColor.value.set(cfg.lightColor || "#ffffff")
        u.uCellSize.value = S.cellSize
        u.uIrregularity.value = S.irregularity
        u.uLeadWidth.value = S.leadWidth
        u.uTexture.value = S.texture
        u.uStreaks.value = S.streaks
        u.uSeeds.value = S.seeds
        u.uBacklight.value = S.backlight
        u.uLightRadius.value = S.lightRadius
        u.uContrast.value = S.contrast
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed

        const el = this.renderer.domElement
        const aspect =
            el.clientWidth > 0 && el.clientHeight > 0
                ? el.clientWidth / el.clientHeight
                : 1

        /*
         * The light wanders on its own, and leans toward the pointer.
         *
         * A sun crossing a window moves slowly and never repeats its path, so
         * two slow sines at rates that do not divide into each other. The
         * pointer pulls that resting position rather than replacing it, so the
         * light still drifts while it is being followed.
         */
        const driftX = 0.5 + Math.sin(this.time * 0.7) * 0.22
        const driftY = 0.55 + Math.sin(this.time * 0.43 + 1.3) * 0.18
        this.grip += (this.gripTarget - this.grip) * (1 - Math.exp(-dt * 4.5))
        const pull = S.followPointer * this.grip

        this.lightTarget.set(
            driftX * aspect * (1 - pull) + this.pointer.x * pull,
            driftY * (1 - pull) + this.pointer.y * pull
        )
        /*
         * Eased toward that, and faster while the pointer is driving it.
         *
         * A drifting sun should have weight behind it, but a light being led by
         * the cursor has to keep up or it reads as broken rather than as heavy.
         * The rate rises with the pull, so it is unhurried at rest and close
         * behind the pointer when there is one.
         */
        this.light.lerp(this.lightTarget, 1 - Math.exp(-dt * (3.0 + pull * 12.0)))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uLight.value.copy(this.light)
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

export interface StainedGlassProps {
    palette?: string[]
    lead?: string
    lightColor?: string
    cellSize?: number
    irregularity?: number
    leadWidth?: number
    backlight?: number
    lightRadius?: number
    speed?: number
    texture?: number
    streaks?: number
    seeds?: number
    contrast?: number
    style?: React.CSSProperties
}

export default function StainedGlass(props: StainedGlassProps) {
    const {
        palette = ["#FF4D0F","#FFA51F","#FFE3A3","#C6D64B","#2FA8C8","#A82820"],
        lead = DEFAULTS.lead,
        lightColor = DEFAULTS.lightColor,
        cellSize = DEFAULTS.cellSize,
        irregularity = DEFAULTS.irregularity,
        leadWidth = DEFAULTS.leadWidth,
        backlight = DEFAULTS.backlight,
        lightRadius = DEFAULTS.lightRadius,
        speed = DEFAULTS.speed,
        texture = DEFAULTS.texture,
        streaks = DEFAULTS.streaks,
        seeds = DEFAULTS.seeds,
        contrast = DEFAULTS.contrast,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<GlassScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        palette,
        lead,
        lightColor,
        cellSize,
        irregularity,
        leadWidth,
        backlight,
        lightRadius,
        speed,
        texture,
        streaks,
        seeds,
        contrast,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: GlassScene
        try {
            scene = new GlassScene(container, cfgRef.current)
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
        // The palette is an array, so its identity changes on every render; its
        // contents are what matter here.
    }, [
        palette?.join?.(","),
        lead,
        lightColor,
        cellSize,
        irregularity,
        leadWidth,
        backlight,
        lightRadius,
        speed,
        texture,
        streaks,
        seeds,
        contrast,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Stained glass panel"
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

StainedGlass.displayName = "Stained Glass"
StainedGlass.defaultProps = { ...DEFAULTS }
