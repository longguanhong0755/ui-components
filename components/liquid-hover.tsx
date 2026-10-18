"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"
import * as THREE from "three"

/**
 * Liquid Hover — two images, and a hover that pours one into the other through a
 * displacement map.
 *
 * Rebuilt from a Framer codegen bundle that pulled three.js r122, GSAP 2 and the
 * hover-effect UMD package off three separate CDNs at runtime, then reached for
 * them through window globals. None of that is here. The whole effect is one
 * fragment shader over a single quad, the ramp is a timestep and an ease, and
 * three comes from the project's own dependency — so it renders with no network
 * beyond the images themselves and cannot be broken by a CDN or a version bump.
 *
 * The displacement is read as a two-channel offset: red pushes the outgoing
 * image's sample sideways, green pushes it up, and the incoming image is pushed
 * the opposite way by what is left of the ramp. Two samples sliding past each
 * other in opposite directions is what reads as liquid — a plain crossfade of the
 * same two pictures reads as a dissolve.
 */

// Requested defaults, so the component is worth looking at before anything is
// uploaded and in the code preview, which renders with no props at all.
const DEFAULT_IMAGE_1 =
    "https://images.unsplash.com/photo-1612692873247-59cea9baf7f6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTB8fGFlc3RoZXRpYyUyMHBvcnRyYWl0c3xlbnwwfHwwfHx8MA%3D%3D"
const DEFAULT_IMAGE_2 =
    "https://images.unsplash.com/photo-1607332646875-8e29e0515968?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGFlc3RoZXRpYyUyMGNvbG9yZnVsJTIwcG9ydHJhaXRzfGVufDB8fDB8fHww"

// The map the pour is shaped by. Its red and green channels are read as a
// two-channel offset, so any image with broad soft variation works — this one is
// picked because its blotches are large enough to move whole regions of the
// picture rather than dithering it.
const DEFAULT_DISPLACEMENT =
    "https://plus.unsplash.com/premium_photo-1686309673130-36e6a28333a3?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjV8fGJsYWNrJTIwYmd8ZW58MHx8MHx8fDA%3D"

// One DEFAULTS drives both the destructure fallbacks and the control defaults.
// Panel sliders are whole numbers, mapped to effective values inside.
const DEFAULTS = {
    imageWidth: 400,
    imageHeight: 500,
    fit: "cover" as const,
    // Each image travels with its own crop anchor rather than sitting beside a
    // loose slider: two photographs cropped to the same box rarely want their
    // subject held at the same height, and pairing the anchor with the picture it
    // belongs to is what keeps that obvious on the panel.
    image1: {
        defaultValue: {"image":{"alt":"","src":"https://images.unsplash.com/photo-1687679223371-2d63230ef85f?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},"focusY":50}, focusY: 50 },
    image2: {
        defaultValue: {"image":{"alt":"","src":"https://images.unsplash.com/photo-1651412543449-abcd3af540df?q=80&w=1328&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},"focusY":50}, focusY: 50 },
    intensity: 20,
    transition: {
        defaultValue: {"ease":[0.4,0,0.2,1],"type":"tween","delay":0,"duration":0.8},
        type: "tween",
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
    } as Transition,
    rounding: 0,
}

// Seconds the pair takes to fade up once both textures have landed, so a slow
// image never pops in.
const FADE_IN = 0.4

type Transition = {
    type?: string
    duration?: number
    ease?: string | number[]
}

function clamp(v: any, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" ? v : parseFloat(v)
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback
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
 * The Transition control is sampled by hand — its ease becomes a cubic-bezier
 * lookup, solved per frame by Newton's method.
 *
 * The pour is driven by a shader uniform rather than by a CSS transition or a
 * motion value, so there is nothing to hand a timing function to; the curve has
 * to be evaluated here. Springs have no closed form to sample and fall back to
 * easeInOut. The curve is applied to the ramp in BOTH directions, so leaving is
 * as considered as arriving rather than snapping back.
 */
function makeEaseFn(transition?: Transition) {
    let pts: number[] = NAMED_EASES.easeInOut
    const ease = transition?.ease
    if (Array.isArray(ease) && ease.length === 4 && ease.every(Number.isFinite)) {
        pts = ease as number[]
    } else if (typeof ease === "string" && NAMED_EASES[ease]) {
        pts = NAMED_EASES[ease]
    }
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
            const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2)
            if (Math.abs(dx) < 1e-6) break
            s -= cx / dx
            s = Math.max(0, Math.min(1, s))
        }
        return bez(y1, y2, s)
    }
}

/**
 * The ResponsiveImage control hands back { src }, and code may pass a bare string
 * or a bare image object, so all three shapes are unwrapped here.
 */
const urlOf = (entry: any): string => {
    const raw = entry?.image ?? entry
    if (typeof raw === "string") return raw
    return raw?.src ?? ""
}

const VERT = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const FRAG = /* glsl */ `
    precision highp float;

    uniform sampler2D uTex1;
    uniform sampler2D uTex2;
    uniform sampler2D uDisp;
    uniform float uProgress;
    uniform float uIntensity;
    uniform float uReveal;
    // Cover and contain are a scale and an offset on the sample coordinate, so
    // the fit costs nothing but two uniforms per image.
    uniform vec2 uScale1;
    uniform vec2 uOffset1;
    uniform vec2 uScale2;
    uniform vec2 uOffset2;

    varying vec2 vUv;

    /**
     * Sample one image through its own fit transform.
     *
     * Contain can land outside the image, and repeating or clamping there would
     * smear the edge pixel across the letterbox. The alpha is dropped instead, so
     * whatever the frame sits on shows through — which is also why this component
     * has no background of its own to fill.
     */
    vec4 sampleFitted(sampler2D tex, vec2 uv, vec2 scale, vec2 offset) {
        vec2 p = uv * scale + offset;
        if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
            return vec4(0.0);
        }
        return texture2D(tex, p);
    }

    void main() {
        vec4 disp = texture2D(uDisp, vUv);

        // The two images are pushed in opposite directions by what is left of the
        // ramp on each side, so they slide past one another instead of dissolving
        // into one another.
        vec2 uv1 = vUv + disp.rg * uIntensity * uProgress;
        vec2 uv2 = vUv - disp.rg * uIntensity * (1.0 - uProgress);

        vec4 a = sampleFitted(uTex1, uv1, uScale1, uOffset1);
        vec4 b = sampleFitted(uTex2, uv2, uScale2, uOffset2);

        gl_FragColor = mix(a, b, uProgress) * uReveal;
    }
`

/**
 * A generated displacement map, used only when the real one cannot be fetched.
 *
 * The map is normally an image, but a dead URL should not cost the effect. Layered
 * value noise gives the same broad soft blotches, and because red and green are
 * sampled from different seeds the push has a direction that varies across the
 * frame instead of everything sliding the same way.
 */
function makeDisplacementTexture(): THREE.Texture {
    const size = 256
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!
    const data = ctx.createImageData(size, size)

    const hash = (x: number, y: number) => {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
        return s - Math.floor(s)
    }
    // Smooth interpolation between lattice points, tiled so the noise wraps and
    // the map has no seam down its edges.
    const noise = (x: number, y: number, period: number) => {
        const xi = Math.floor(x)
        const yi = Math.floor(y)
        const xf = x - xi
        const yf = y - yi
        const u = xf * xf * (3 - 2 * xf)
        const v = yf * yf * (3 - 2 * yf)
        const w = (i: number, j: number) =>
            hash(((i % period) + period) % period, ((j % period) + period) % period)
        const a = w(xi, yi)
        const b = w(xi + 1, yi)
        const c = w(xi, yi + 1)
        const d = w(xi + 1, yi + 1)
        return (
            a * (1 - u) * (1 - v) +
            b * u * (1 - v) +
            c * (1 - u) * v +
            d * u * v
        )
    }
    const fbm = (x: number, y: number, seed: number) => {
        let sum = 0
        let amp = 0.6
        let period = 4
        for (let o = 0; o < 4; o++) {
            sum += noise(x * period + seed, y * period + seed, period) * amp
            period *= 2
            amp *= 0.5
        }
        return sum
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size
            const v = y / size
            const i = (y * size + x) * 4
            // Red and green are sampled from different seeds, so horizontal and
            // vertical push are independent and the flow swirls.
            data.data[i] = Math.round(fbm(u, v, 0) * 255)
            data.data[i + 1] = Math.round(fbm(u, v, 37.4) * 255)
            data.data[i + 2] = 0
            data.data[i + 3] = 255
        }
    }
    ctx.putImageData(data, 0, 0)

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.minFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    return tex
}

/** One image and the crop anchor that belongs to it. */
type ImageSlot = { image?: any; focusY?: number }

interface LiquidHoverProps {
    image1: ImageSlot
    image2: ImageSlot
    imageWidth: number
    imageHeight: number
    fit: "cover" | "contain"
    displacementImage: any
    intensity: number
    transition: Transition
    rounding: number
    style?: CSSProperties
}

export default function LiquidHover(props: Partial<LiquidHoverProps>) {
    const {
        image1 = DEFAULTS.image1.defaultValue,
        image2 = DEFAULTS.image2.defaultValue,
        imageWidth = DEFAULTS.imageWidth,
        imageHeight = DEFAULTS.imageHeight,
        fit = DEFAULTS.fit,
        displacementImage,
        intensity = DEFAULTS.intensity,
        rounding = DEFAULTS.rounding,
        style,
    } = props

    // The Transition control hands back only the keys it owns, so it is merged
    // over the default rather than read raw.
    const T: Transition = { ...DEFAULTS.transition, ...(props.transition ?? {}) }
    const easeFn = useMemo(() => makeEaseFn(T), [T.ease])

    const frameRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)

    // Falling back on an EMPTY url, not just a missing prop: a cleared Image
    // control hands back "" or an object with no src, and neither is undefined —
    // so a destructuring default would never fire and the quad would come up
    // black.
    const url1 = urlOf(image1) || DEFAULT_IMAGE_1
    const url2 = urlOf(image2) || DEFAULT_IMAGE_2
    // Falls back to the built-in map whenever no image of your own is given —
    // there is no "off": without a map this is a crossfade, which is not what the
    // component is for.
    const dispUrl = urlOf(displacementImage) || DEFAULT_DISPLACEMENT

    const boxW = clamp(imageWidth, 40, 1600, DEFAULTS.imageWidth)
    const boxH = clamp(imageHeight, 40, 1600, DEFAULTS.imageHeight)

    // Live config, read by the render loop, so tweaking these never tears the
    // WebGL context down and rebuilds it.
    const cfgRef = useRef<any>(null)
    cfgRef.current = {
        // Intensity is a fraction of the frame that a sample may be pushed by;
        // past about a third it stops reading as liquid and starts tearing.
        intensity: (clamp(intensity, 0, 20, DEFAULTS.intensity) / 20) * 0.6,
        // Straight out of the Transition, in seconds. Both ramps use it, so the
        // retreat takes as long as the approach.
        duration: Math.max(0.05, clamp(T.duration, 0.05, 10, 0.6)),
        easeFn,
        fit,
        // Read off each slot, so an anchor arrives with the picture it crops.
        focusY1: clamp(image1?.focusY, 0, 100, DEFAULTS.image1.focusY),
        focusY2: clamp(image2?.focusY, 0, 100, DEFAULTS.image2.focusY),
    }

    // The fit uniforms are recomputed whenever the box, the fit or either anchor
    // changes, and the images' own aspects arrive with the textures — so the
    // effect keeps them and the loop writes them.
    const fitKey = `${boxW}|${boxH}|${fit}|${cfgRef.current.focusY1}|${cfgRef.current.focusY2}`

    useEffect(() => {
        const frame = frameRef.current
        const canvas = canvasRef.current
        if (!frame || !canvas) return

        let alive = true

        const scene = new THREE.Scene()
        // Orthographic in all but name: the quad is written straight to clip
        // space by the vertex shader, so the camera only has to exist.
        const camera = new THREE.Camera()

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: false,
                alpha: true,
                premultipliedAlpha: false,
            })
        } catch {
            // No WebGL: the plain <img> underneath is left showing, which is why
            // it is in the markup at all.
            return
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setClearAlpha(0)
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const blank = new THREE.Texture()

        const uniforms = {
            uTex1: { value: blank },
            uTex2: { value: blank },
            uDisp: { value: null as THREE.Texture | null },
            uProgress: { value: 0 },
            uIntensity: { value: 0 },
            uReveal: { value: 0 },
            uScale1: { value: new THREE.Vector2(1, 1) },
            uOffset1: { value: new THREE.Vector2(0, 0) },
            uScale2: { value: new THREE.Vector2(1, 1) },
            uOffset2: { value: new THREE.Vector2(0, 0) },
        }

        const material = new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            uniforms,
            transparent: true,
        })
        const geometry = new THREE.PlaneGeometry(2, 2)
        const quad = new THREE.Mesh(geometry, material)
        quad.frustumCulled = false
        scene.add(quad)

        const dispTexture = makeDisplacementTexture()
        uniforms.uDisp.value = dispTexture

        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin("anonymous")

        // Aspect of each image, once it has landed. Held here because the fit
        // maths needs it and it is not known until the decode finishes.
        const aspects: Array<number | null> = [null, null]
        let loadedCount = 0

        const loadInto = (url: string, slot: 0 | 1) => {
            loader.load(
                url,
                (tex) => {
                    if (!alive) {
                        tex.dispose()
                        return
                    }
                    // LinearFilter skips building a mip chain — the quad is never
                    // smaller than the frame, and generating them is work at
                    // exactly the wrong moment.
                    tex.minFilter = THREE.LinearFilter
                    tex.generateMipmaps = false
                    tex.colorSpace = THREE.SRGBColorSpace
                    // Clamped, because the displacement pushes samples past the
                    // edge and repeating there would wrap the far side of the
                    // picture into view.
                    tex.wrapS = THREE.ClampToEdgeWrapping
                    tex.wrapT = THREE.ClampToEdgeWrapping

                    const iw = tex.image?.width ?? 1
                    const ih = tex.image?.height ?? 1
                    aspects[slot] = iw / Math.max(1, ih)
                    if (slot === 0) uniforms.uTex1.value = tex
                    else uniforms.uTex2.value = tex
                    loadedCount++
                    applyFit()
                },
                undefined,
                () => {
                    // A dead URL should cost one blank layer, not a broken
                    // component — the other image still shows and still hovers.
                }
            )
        }

        /**
         * Turn each image's aspect into a scale and an offset on its sample
         * coordinate.
         *
         * Cover scales the shorter axis to fill the box and crops the other,
         * anchored vertically by Y Position. Contain does the reverse and lets the
         * shader drop alpha outside the picture. Doing this on the UV rather than
         * on the geometry keeps one quad for every combination.
         */
        function applyFit() {
            const cfg = cfgRef.current
            const boxAspect = boxW / boxH

            const set = (
                aspect: number | null,
                scale: THREE.Vector2,
                offset: THREE.Vector2,
                // Each image carries its own anchor: two photographs cropped to
                // the same box rarely want their subject at the same height.
                anchor: number
            ) => {
                if (!aspect) {
                    scale.set(1, 1)
                    offset.set(0, 0)
                    return
                }
                if (cfg.fit === "cover") {
                    if (aspect > boxAspect) {
                        // Wider than the box — crop the sides, centred.
                        const r = boxAspect / aspect
                        scale.set(r, 1)
                        offset.set((1 - r) / 2, 0)
                    } else {
                        // Taller than the box — crop top and bottom, anchored by
                        // Y. 0 keeps the top of the image, 100 the bottom.
                        const r = aspect / boxAspect
                        scale.set(1, r)
                        offset.set(0, (1 - r) * (1 - anchor))
                    }
                } else {
                    // Contain: the whole picture fits and the surplus is
                    // letterboxed, which the shader leaves transparent. The
                    // scale runs the other way — sampling a WIDER range than the
                    // box is what shrinks the image inside it.
                    if (aspect > boxAspect) {
                        const r = aspect / boxAspect
                        scale.set(1, r)
                        offset.set(0, (1 - r) / 2)
                    } else {
                        const r = boxAspect / aspect
                        scale.set(r, 1)
                        offset.set((1 - r) / 2, 0)
                    }
                }
            }

            set(
                aspects[0],
                uniforms.uScale1.value,
                uniforms.uOffset1.value,
                cfg.focusY1 / 100
            )
            set(
                aspects[1],
                uniforms.uScale2.value,
                uniforms.uOffset2.value,
                cfg.focusY2 / 100
            )
        }

        loadInto(url1, 0)
        loadInto(url2, 1)

        /**
         * The map itself — always present, either the built-in one or an override.
         *
         * A failed load leaves the generated noise in place rather than killing
         * the effect: the pour still pours, just with different blotches.
         */
        let customDisp: THREE.Texture | null = null
        if (dispUrl) {
            loader.load(
                dispUrl,
                (tex) => {
                    if (!alive) {
                        tex.dispose()
                        return
                    }
                    tex.minFilter = THREE.LinearFilter
                    tex.generateMipmaps = false
                    // Repeating rather than clamped: the map is only read for its
                    // gradients, and clamping would leave the edges pushing in one
                    // fixed direction.
                    tex.wrapS = THREE.RepeatWrapping
                    tex.wrapT = THREE.RepeatWrapping
                    customDisp = tex
                    uniforms.uDisp.value = tex
                },
                undefined,
                () => {}
            )
        }

        const resize = () => {
            // clientWidth, not a bounding rect: the Framer canvas draws inside a
            // zoom transform, and a rect reports those scaled pixels.
            const w = Math.max(1, frame.clientWidth)
            const h = Math.max(1, frame.clientHeight)
            renderer.setSize(w, h, false)
        }
        const ro = new ResizeObserver(resize)
        ro.observe(frame)
        resize()

        // Hover ramp: `target` is where it is heading, `t` is how far along.
        let target = 0
        let t = 0
        let reveal = 0

        let raf = 0
        let last = 0

        const animate = (now: number) => {
            if (!alive) return
            raf = requestAnimationFrame(animate)
            const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60
            last = now

            const cfg = cfgRef.current

            // Walked at a rate rather than eased by a fraction of the remaining
            // distance, so Transition is a duration you can actually time — a
            // lerp never truly arrives and its speed depends on the frame rate.
            const rate = dt / cfg.duration
            t += target > t ? Math.min(rate, target - t) : -Math.min(rate, t - target)
            t = Math.max(0, Math.min(1, t))

            uniforms.uProgress.value = cfg.easeFn(t)
            uniforms.uIntensity.value = cfg.intensity

            // Held at nothing until both pictures are in, so the first hover
            // cannot displace a half-loaded pair.
            if (loadedCount >= 2) {
                reveal = Math.min(1, reveal + dt / FADE_IN)
            }
            uniforms.uReveal.value = reveal

            /**
             * The fallback image is faded out by exactly what the canvas fades
             * in.
             *
             * Both draw image1, and the two crops are close but not identical —
             * the shader samples on the UV while the element uses object-fit — so
             * leaving the element up behind a semi-transparent canvas shows the
             * same face twice, very slightly apart. Written straight to the style
             * rather than through state, so a fade does not re-render.
             */
            const img = imgRef.current
            if (img) img.style.opacity = String(1 - reveal)

            renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(animate)

        // ── Pointer ──────────────────────────────────────────────────────
        const onEnter = () => {
            target = 1
        }
        const onLeave = () => {
            target = 0
        }
        // On the frame itself: this is a hover on a picture, so the picture's own
        // bounds are exactly the right target.
        frame.addEventListener("pointerenter", onEnter)
        frame.addEventListener("pointerleave", onLeave)
        // A touch reads as a hover for as long as it is held, so the effect is
        // reachable without a mouse.
        frame.addEventListener("pointerdown", onEnter)
        window.addEventListener("pointerup", onLeave)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            frame.removeEventListener("pointerenter", onEnter)
            frame.removeEventListener("pointerleave", onLeave)
            frame.removeEventListener("pointerdown", onEnter)
            window.removeEventListener("pointerup", onLeave)

            // Disposed by name and exactly once.
            geometry.dispose()
            material.dispose()
            dispTexture.dispose()
            customDisp?.dispose()
            const t1 = uniforms.uTex1.value
            const t2 = uniforms.uTex2.value
            if (t1 !== blank) t1?.dispose()
            if (t2 !== blank) t2?.dispose()
            blank.dispose()
            renderer.dispose()
        }
    }, [url1, url2, dispUrl, fitKey])

    const radius = useMemo(
        () =>
            (clamp(rounding, 0, 20, DEFAULTS.rounding) / 20) *
            (Math.min(boxW, boxH) / 2),
        [rounding, boxW, boxH]
    )

    return (
        <div
            ref={frameRef}
            style={{
                position: "relative",
                // The controls are the size, so the box is those pixels — but a
                // style handed down by Framer still wins, which is what lets an
                // instance be resized on the canvas.
                width: boxW,
                height: boxH,
                overflow: "hidden",
                borderRadius: radius,
                ...style,
            }}
        >
            {/*
             * The first image, in plain markup underneath the canvas.
             *
             * It is what shows before the textures land and what is left if WebGL
             * is unavailable, so the component degrades to a still image rather
             * than to a hole. object-position carries the same Y anchor the shader
             * uses, so the fallback is cropped the same way.
             */}
            <img
                ref={imgRef}
                src={url1}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: fit,
                    // The fallback shows image1, so it carries image1's anchor.
                    objectPosition: `50% ${cfgRef.current.focusY1}%`,
                    pointerEvents: "none",
                    userSelect: "none",
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </div>
    )
}

LiquidHover.displayName = "Liquid Hover"
