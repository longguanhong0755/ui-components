"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Ocean Swell — open sea from a metre above it, with the horizon in frame.
 *
 * The surface is a sum of travelling waves, but not of sines. A sine has a
 * crest exactly as round as its trough, and an ocean does not: water piles up
 * into a narrow ridge and lies flat and wide between ridges. The shape that
 * does this in one cheap term is exp(sin(x) - 1) — bounded, smooth, and
 * strongly biased toward its low value, so most of the surface is trough and
 * the crests are the exception. Each octave also drags the sample point back
 * along its own direction by cos(x), which leans the leading face over; that
 * lean is the difference between a swell and a corrugated roof.
 *
 * There is no mesh. A displaced plane would need its vertices densest exactly
 * where the camera is lowest — at the horizon, where a single pixel spans
 * kilometres — and no practical tessellation survives that. Instead the
 * surface is intersected by marching down the ray comparing height against the
 * field, stepping by the signed gap so the walk slows only as it closes on
 * water, then finishing with one secant step between the last two samples.
 * That last step matters: without it the intersection lands on a step boundary
 * and the whole sea shows the marching cadence as banding.
 *
 * Shading is Schlick fresnel between a sky that is actually evaluated (so the
 * reflection carries the real clouds and the real sun) and a deep transmitted
 * colour, plus the two things that read as water and nothing else does:
 * subsurface glow where a crest is thin and backlit, and foam that appears on
 * steepness rather than on height, so it rides the faces and not the tops.
 */

// Steps down the ray before the sea is called a miss. The step length grows
// with distance, so this reaches the horizon rather than a fixed range.
const TRACE_STEPS = 68

// Octaves used while tracing. Fewer than the shading pass on purpose: the extra
// detail changes the intersection by less than a pixel and costs a third of the
// whole frame.
const TRACE_WAVES = 4

// Octaves used for the normal at the hit. This is where the surface texture
// comes from, so it gets the full stack.
const DETAIL_WAVES = 7

const DEFAULTS = {
    deep: "#04222E",
    shallow: "#1E7F86",
    scatter: "#CCCFCE",
    foam: "#F2FAFF",
    zenith: "#2C5C8E",
    horizon: "#FAF5B4",
    swell: 1,
    choppy: 20,
    detail: 20,
    glitter: 20,
    subsurface: 20,
    foamAmount: 20,
    cloud: 20,
    haze: 0,
    speed: 5,
    drag: 20,
    sizePercent: 200,
}

type Config = {
    deep: string
    shallow: string
    scatter: string
    foam: string
    zenith: string
    horizon: string
    swell: number
    choppy: number
    detail: number
    glitter: number
    subsurface: number
    foamAmount: number
    cloud: number
    haze: number
    speed: number
    drag: number
    sizePercent: number
}

// Radians. The camera sits low; letting it tip further finds only empty sky one
// way and its own reflection the other.
const MAX_PITCH = 0.5

/*
 * The panel used to own this. Sunlight is not really a free colour here: it
 * drives the disc, the glare lobe and the glitter track at once, and anything
 * far off warm white stops reading as a sun and starts reading as a coloured
 * lamp pointed at the water. Zenith and Horizon are still exposed, and between
 * them they set the mood the sun sits inside.
 */
const SUN_COLOR = "#FFF0D2"

/*
 * The panel used to own this. Sun elevation, in radians.
 *
 * It is not a free parameter on open water: the height sets where the glitter
 * track lands, and anything much higher puts the sun overhead, where the track
 * collapses to a patch under the camera and the sea loses the one feature that
 * gives it distance. Low enough to lay a track to the horizon, high enough to
 * stay clear of it.
 */
const SUN_HEIGHT = 0.315

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    const swell = clamp(cfg.swell, 1, 20, DEFAULTS.swell)
    return {
        // Metres of amplitude in the first octave. The camera height below is
        // tied to this, so a bigger sea also means a higher deck — otherwise
        // the swell simply swallows the viewpoint.
        swell: 0.25 + swell * 0.13,
        // How far each octave drags its own sample point. Above about 1.0 the
        // displacement folds the surface back through itself and the crests
        // develop a hard crease that reads as a polygon edge.
        choppy: clamp(cfg.choppy, 0, 20, DEFAULTS.choppy) * 0.045,
        // Base spatial frequency. Small is a long ocean swell, large is chop in
        // a harbour.
        detail: 0.06 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.028,
        sunHeight: SUN_HEIGHT,
        // Specular exponent, reversed: a low panel number is a broad hazy sheen
        // and a high one is a field of separate sparks.
        glitter: 40.0 + clamp(cfg.glitter, 1, 20, DEFAULTS.glitter) * 90.0,
        subsurface: clamp(cfg.subsurface, 0, 20, DEFAULTS.subsurface) * 0.09,
        foamAmount: clamp(cfg.foamAmount, 0, 20, DEFAULTS.foamAmount) * 0.055,
        cloud: clamp(cfg.cloud, 0, 20, DEFAULTS.cloud) * 0.05,
        // Reciprocal of the distance at which water has become sky.
        haze: 0.0006 + clamp(cfg.haze, 0, 20, DEFAULTS.haze) * 0.0011,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.14,
        drag: clamp(cfg.drag, 0, 20, DEFAULTS.drag) * 0.0006,
        focal: 1.35 * (100 / clamp(cfg.sizePercent, 40, 200, 100)),
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

const OCEAN_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uScatter;
uniform vec3 uFoam;
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform float uSwell;
uniform float uChoppy;
uniform float uDetail;
uniform float uSunHeight;
uniform float uGlitter;
uniform float uSubsurface;
uniform float uFoamAmount;
uniform float uCloud;
uniform float uHaze;
uniform float uFocal;
uniform float uYaw;
uniform float uPitch;
uniform float uCamY;

#define TRACE_STEPS ${TRACE_STEPS}
#define TRACE_WAVES ${TRACE_WAVES}
#define DETAIL_WAVES ${DETAIL_WAVES}

// The far plane. Water past this is fully hazed at every usable setting, so
// tracing further only burns steps.
const float FAR = 900.0;

// Golden angle. Each octave turns its travel direction by this, which is the
// one rotation that never brings two octaves back into alignment — a plain
// 90-degree turn leaves the sea visibly square.
const float TURN = 2.39996323;

float hash21(vec2 p) {
    p = fract(p * vec2(127.31, 311.7));
    p += dot(p, p + 42.17);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

/*
 * Surface height above mean sea level. waveCount lets the tracer run a cheap
 * version of exactly the same field the shading pass uses at full detail — two
 * different functions would put the normal on a surface the ray never hit.
 */
float seaHeight(vec2 p, int waveCount) {
    float amp = uSwell;
    float freq = uDetail;
    float ang = 0.6;
    float total = 0.0;
    float norm = 0.0;

    for (int i = 0; i < DETAIL_WAVES; i++) {
        if (i >= waveCount) break;
        vec2 dir = vec2(cos(ang), sin(ang));
        // Deep-water dispersion: longer waves travel faster. Giving every
        // octave the same speed makes the whole sea slide as one sheet.
        float x = dot(dir, p) * freq + uTime * (2.4 / sqrt(freq * 8.0 + 1.0));
        // Sharp crest, flat trough. A sine here gives a corrugated roof.
        float w = exp(sin(x) - 1.0);
        total += w * amp;
        norm += amp;
        // Drag the sample point back along the wave, leaning the leading face.
        p -= dir * cos(x) * amp * uChoppy;
        amp *= 0.57;
        freq *= 1.93;
        ang += TURN;
    }
    // exp(sin(x)-1) averages 0.4658 over a period; subtracting that puts mean
    // sea level at y = 0, which the camera height and the tracer both assume.
    return total - norm * 0.4658;
}

vec3 sunDir() {
    return normalize(vec3(0.62, sin(uSunHeight), -0.78));
}

vec3 sky(vec3 rd) {
    float up = clamp(rd.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.42));

    if (uCloud > 0.0 && rd.y > 0.005) {
        // Flat cloud deck, projected. Dividing by rd.y is what stretches the
        // cells toward the horizon; a cloud sampled on rd alone stays the same
        // size everywhere and reads as a painted dome.
        vec2 cp = rd.xz / rd.y * 0.55 + vec2(uTime * 0.03, 0.0);
        float n = vnoise(cp) * 0.55 + vnoise(cp * 2.3 + 4.1) * 0.3 + vnoise(cp * 5.1) * 0.15;
        float deck = smoothstep(0.48, 0.78, n) * smoothstep(0.0, 0.22, rd.y);
        col = mix(col, mix(uHorizon, vec3(1.0), 0.55), deck * uCloud * 4.0);
    }

    vec3 sd = sunDir();
    float d = max(dot(rd, sd), 0.0);
    // Disc plus a wide forward-scatter lobe. One term cannot be both a sun and
    // the glare around it.
    col += uSun * pow(d, 1400.0) * 9.0;
    col += uSun * pow(d, 8.0) * 0.22;
    return col;
}

/*
 * March down the ray comparing height to the field. The step is the signed gap
 * scaled below one, so the walk closes on the surface without ever crossing it
 * blind, plus a floor proportional to t so the far field does not take a
 * thousand millimetre steps to reach the horizon.
 */
bool traceSea(vec3 ro, vec3 rd, out float tHit) {
    float crest = uSwell * 2.4;
    tHit = 0.0;
    if (rd.y >= 0.0 && ro.y > crest) return false;

    float t = 0.0;
    // Skip straight to the top of the wave slab; everything above it is empty.
    if (ro.y > crest && rd.y < 0.0) t = (crest - ro.y) / rd.y;

    float lastT = t;
    float lastGap = ro.y + rd.y * t - seaHeight((ro + rd * t).xz, TRACE_WAVES);

    for (int i = 0; i < TRACE_STEPS; i++) {
        vec3 p = ro + rd * t;
        float gap = p.y - seaHeight(p.xz, TRACE_WAVES);
        if (gap < 0.0) {
            // One secant step between the last two samples. Without it the hit
            // snaps to the marching cadence and the sea shows visible bands.
            tHit = lastT + (t - lastT) * lastGap / max(lastGap - gap, 1e-4);
            return true;
        }
        lastGap = gap;
        lastT = t;
        t += max(gap * 0.62, t * 0.014 + 0.05);
        if (t > FAR) return false;
    }
    return false;
}

/*
 * Central differences, with the offset scaled by distance. A fixed epsilon
 * gives a correct normal underfoot and pure aliasing at the horizon, where one
 * pixel already spans many wavelengths — the far sea then boils.
 */
vec3 seaNormal(vec3 p, float t) {
    float e = max(0.012, t * 0.0035);
    float h = seaHeight(p.xz, DETAIL_WAVES);
    float hx = seaHeight(p.xz + vec2(e, 0.0), DETAIL_WAVES);
    float hz = seaHeight(p.xz + vec2(0.0, e), DETAIL_WAVES);
    return normalize(vec3(h - hx, e, h - hz));
}

void main() {
    vec2 frag = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;

    // The boat drifts forward for ever and yaws slightly, so the same wave train
    // is never crossed twice at the same angle.
    vec3 origin = vec3(sin(uTime * 0.11) * 12.0, uCamY, uTime * 4.0);

    float cy = cos(uYaw), sy = sin(uYaw);
    float cp = cos(uPitch), sp = sin(uPitch);
    vec3 fwd = normalize(vec3(sy * cp, sp, cy * cp));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(frag.x * right + frag.y * up + uFocal * fwd);

    vec3 col;
    float t;

    if (traceSea(origin, rd, t)) {
        vec3 p = origin + rd * t;
        vec3 nrm = seaNormal(p, t);
        // Flatten the normal with distance. Beyond a few hundred metres the
        // real surface is below the sample rate, and an honest normal there is
        // just noise; a flattened one becomes the horizon sheen it should be.
        nrm = normalize(mix(nrm, vec3(0.0, 1.0, 0.0), clamp(t * 0.004, 0.0, 0.92)));

        vec3 sd = sunDir();
        vec3 refl = reflect(rd, nrm);
        // Reflected rays that would point into the water are folded back up;
        // otherwise the troughs sample the ground half of the sky and go black.
        refl.y = abs(refl.y);

        float facing = max(dot(-rd, nrm), 0.0);
        float fres = 0.02 + 0.98 * pow(1.0 - facing, 5.0);

        float height = clamp(p.y / max(uSwell, 0.001) * 0.5 + 0.5, 0.0, 1.0);
        vec3 body = mix(uDeep, uShallow, height * 0.7);

        // Subsurface. Light comes through the thin part of a crest, so this is
        // keyed to height and to how edge-on the crest is seen — the same term
        // applied flat just tints the whole sea.
        float thin = pow(clamp(p.y / max(uSwell, 0.001), 0.0, 1.0), 2.0);
        body += uScatter * thin * uSubsurface * (0.3 + 0.7 * pow(1.0 - facing, 2.0));

        vec3 spec = uSun * pow(max(dot(refl, sd), 0.0), uGlitter) * 5.0;

        col = mix(body, sky(refl), fres) + spec;

        // Foam on steepness, not on height. Height alone caps every wave with a
        // white lid; steepness puts it on the face that is about to break.
        if (uFoamAmount > 0.0) {
            float steep = 1.0 - nrm.y;
            float churn = vnoise(p.xz * 1.7 + uTime * 0.6) * 0.6
                        + vnoise(p.xz * 5.3 - uTime * 0.9) * 0.4;
            float f = smoothstep(0.16, 0.42, steep * 2.4 * uFoamAmount * 2.0 + churn * 0.35 - 0.25);
            // Foam is not glass: kill the specular under it or it reads as wet
            // paint rather than as aerated water.
            col = mix(col, uFoam * (0.72 + churn * 0.35), f * clamp(uFoamAmount * 2.4, 0.0, 1.0));
        }

        float f = 1.0 - exp(-pow(t * uHaze, 1.6));
        col = mix(col, sky(rd), clamp(f, 0.0, 1.0));
    } else {
        col = sky(rd);
    }

    // Filmic shoulder. Straight clamping turns the sun track into a flat white
    // plate with a hard edge where the glitter stops.
    col = col / (col + vec3(0.9)) * 1.45;
    col = pow(max(col, 0.0), vec3(0.92));

    gl_FragColor = vec4(col, 1.0);
}
`

class OceanSwellScene {
    private container: HTMLElement
    private cfg: Config
    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private time = 0
    private yaw = 0
    private pitch = -0.05
    private velYaw = 0
    private velPitch = 0
    private isDragging = false
    private lastX = 0
    private lastY = 0

    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
        // Sixty-odd trace steps, each summing four wave octaves, then seven more
        // for the normal. Heavy fragment work, so the ratio is capped at 1.25.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 1)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        el.style.touchAction = "none"
        el.style.cursor = S.drag > 0 ? "grab" : "default"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: OCEAN_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uTime: { value: 0 },
                uDeep: { value: new THREE.Color(cfg.deep) },
                uShallow: { value: new THREE.Color(cfg.shallow) },
                uScatter: { value: new THREE.Color(cfg.scatter) },
                uFoam: { value: new THREE.Color(cfg.foam) },
                // Pinned to a module constant, so the shader wiring is untouched
                // and this uniform is written once and never again.
                uSun: { value: new THREE.Color(SUN_COLOR) },
                uZenith: { value: new THREE.Color(cfg.zenith) },
                uHorizon: { value: new THREE.Color(cfg.horizon) },
                uSwell: { value: S.swell },
                uChoppy: { value: S.choppy },
                uDetail: { value: S.detail },
                uSunHeight: { value: S.sunHeight },
                uGlitter: { value: S.glitter },
                uSubsurface: { value: S.subsurface },
                uFoamAmount: { value: S.foamAmount },
                uCloud: { value: S.cloud },
                uHaze: { value: S.haze },
                uFocal: { value: S.focal },
                uYaw: { value: 0 },
                uPitch: { value: this.pitch },
                // Deck height. Tied to the swell so a bigger sea does not simply
                // close over the viewpoint.
                uCamY: { value: 1.8 + S.swell * 2.6 },
            },
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
        this.bindEvents()
    }

    private bindEvents() {
        const el = this.renderer.domElement

        const down = (e: PointerEvent) => {
            if (settingsFor(this.cfg).drag <= 0) return
            this.isDragging = true
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.velYaw = 0
            this.velPitch = 0
            el.style.cursor = "grabbing"
        }
        const move = (e: PointerEvent) => {
            if (!this.isDragging) return
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY
            this.lastX = e.clientX
            this.lastY = e.clientY
            const s = settingsFor(this.cfg).drag
            this.yaw -= dx * s
            this.pitch += dy * s
            // Kept so the view keeps swinging after the pointer lets go.
            this.velYaw = -dx * s
            this.velPitch = dy * s
        }
        const up = () => {
            if (!this.isDragging) return
            this.isDragging = false
            el.style.cursor = settingsFor(this.cfg).drag > 0 ? "grab" : "default"
        }

        el.addEventListener("pointerdown", down)
        // On window: a drag leaving the element still turns the view, and a
        // release outside it still ends the drag.
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        window.addEventListener("pointercancel", up)

        this.unbind = () => {
            el.removeEventListener("pointerdown", down)
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
            window.removeEventListener("pointercancel", up)
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
        // The quad owns no buffer, so every control is a uniform write.
        u.uDeep.value.set(cfg.deep || DEFAULTS.deep)
        u.uShallow.value.set(cfg.shallow || DEFAULTS.shallow)
        u.uScatter.value.set(cfg.scatter || DEFAULTS.scatter)
        u.uFoam.value.set(cfg.foam || DEFAULTS.foam)
        u.uZenith.value.set(cfg.zenith || DEFAULTS.zenith)
        u.uHorizon.value.set(cfg.horizon || DEFAULTS.horizon)
        u.uSwell.value = S.swell
        u.uChoppy.value = S.choppy
        u.uDetail.value = S.detail
        u.uSunHeight.value = S.sunHeight
        u.uGlitter.value = S.glitter
        u.uSubsurface.value = S.subsurface
        u.uFoamAmount.value = S.foamAmount
        u.uCloud.value = S.cloud
        u.uHaze.value = S.haze
        u.uFocal.value = S.focal
        u.uCamY.value = 1.8 + S.swell * 2.6
        if (!this.isDragging) {
            this.renderer.domElement.style.cursor = S.drag > 0 ? "grab" : "default"
        }
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        // A returning tab would otherwise advance the sea by a minute in one
        // frame and cut to a completely different swell.
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed

        if (!this.isDragging) {
            const decay = Math.exp(-dt * 3)
            this.yaw += this.velYaw
            this.pitch += this.velPitch
            this.velYaw *= decay
            this.velPitch *= decay
        }
        this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uYaw.value = this.yaw
        u.uPitch.value = this.pitch
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

export interface OceanSwellProps {
    deep?: string
    shallow?: string
    scatter?: string
    foam?: string
    zenith?: string
    horizon?: string
    swell?: number
    choppy?: number
    detail?: number
    glitter?: number
    subsurface?: number
    foamAmount?: number
    cloud?: number
    haze?: number
    speed?: number
    drag?: number
    sizePercent?: number
    style?: React.CSSProperties
}

export default function OceanSwell(props: OceanSwellProps) {
    const {
        deep = DEFAULTS.deep,
        shallow = DEFAULTS.shallow,
        scatter = DEFAULTS.scatter,
        foam = DEFAULTS.foam,
        zenith = DEFAULTS.zenith,
        horizon = DEFAULTS.horizon,
        swell = DEFAULTS.swell,
        choppy = DEFAULTS.choppy,
        detail = DEFAULTS.detail,
        glitter = DEFAULTS.glitter,
        subsurface = DEFAULTS.subsurface,
        foamAmount = DEFAULTS.foamAmount,
        cloud = DEFAULTS.cloud,
        haze = DEFAULTS.haze,
        speed = DEFAULTS.speed,
        drag = DEFAULTS.drag,
        sizePercent = DEFAULTS.sizePercent,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<OceanSwellScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
    cfgRef.current = {
        deep,
        shallow,
        scatter,
        foam,
        zenith,
        horizon,
        swell,
        choppy,
        detail,
        glitter,
        subsurface,
        foamAmount,
        cloud,
        haze,
        speed,
        drag,
        sizePercent,
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: OceanSwellScene
        try {
            scene = new OceanSwellScene(container, cfgRef.current)
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
        deep,
        shallow,
        scatter,
        foam,
        zenith,
        horizon,
        swell,
        choppy,
        detail,
        glitter,
        subsurface,
        foamAmount,
        cloud,
        haze,
        speed,
        drag,
        sizePercent,
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Open ocean swell seen from just above the water"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 160,
                minHeight: 120,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

OceanSwell.displayName = "Ocean Swell"
