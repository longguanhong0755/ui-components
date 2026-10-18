// Delivered · stack: nextjs
"use client";

const RenderTarget = {
  current: () => "preview",
  hasRestrictions: () => false,
  canvas: "canvas",
  export: "export",
  preview: "preview",
  thumbnail: "thumbnail",
};

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"
// Framer resolves HTTPS ESM imports at build; these packages are not installed
// locally. Typed via app/New-components/cdn-modules.d.ts.
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector4,
    Texture,
    DoubleSide,
    LinearFilter,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"
import { gsap } from "https://esm.sh/gsap@3.12.5"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Oversize the canvas so the rolled edge can extend past the layer bounds.
const CANVAS_OVERSIZE = 1.6
// Mesh occupies the true (un-oversized) layer size.
const MESH_SCALE = 1
const CAMERA_DISTANCE = 400
const CAMERA_NEAR = 100
const CAMERA_FAR = 1000
const PLANE_SEGMENTS = 80

// Rolled-cylinder vertex shader: rolls the plane into a spiral then unrolls it
// as `progress` goes 0 → 1, honoring the tilt `angle` and roll count.
const vertexShader = `
uniform float time;
uniform float angle;
uniform float progress;
uniform float rolls;
uniform float rollRadius;
uniform vec4 resolution;
varying vec2 vUv;
varying float vFrontShadow;

const float pi = 3.14159265359;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
        0.0,                                0.0,                                0.0,                                1.0
    );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
}

void main() {
    // Fold the full 0-360 angle into a 0-90 base (which the roll math handles
    // well) plus horizontal / vertical mirrors, so higher angles are just the
    // reverse: 91-180 mirror 89-0, 181-270 mirror 1-90, 271-360 mirror 179-91.
    float deg = mod(degrees(angle), 360.0);
    float base = deg;
    float fx = 1.0;
    float fy = 1.0;
    if (deg > 270.0) {
        base = 360.0 - deg;
        fy = -1.0;
    } else if (deg > 180.0) {
        base = deg - 180.0;
        fx = -1.0;
        fy = -1.0;
    } else if (deg > 90.0) {
        base = 180.0 - deg;
        fx = -1.0;
    }
    float finalAngle = radians(base);

    // Flip only the texture coords so the still image stays upright. The roll is
    // computed on the original position; the OUTPUT geometry is mirrored at the
    // end to reverse the on-screen sweep direction.
    vUv = uv;
    if (fx < 0.0) vUv.x = 1.0 - vUv.x;
    if (fy < 0.0) vUv.y = 1.0 - vUv.y;

    vec3 newposition = position;

    float rad = rollRadius;
    float rollCount = rolls;

    // Rotate to apply angle
    newposition = rotate(newposition - vec3(-0.5, 0.5, 0.0), vec3(0.0, 0.0, 1.0), -finalAngle) + vec3(-0.5, 0.5, 0.0);

    // Offset along the roll direction
    float offs = (newposition.x + 0.5) / (sin(finalAngle) + cos(finalAngle));
    float tProgress = clamp((progress - offs * 0.99) / 0.01, 0.0, 1.0);

    // Shading for depth
    vFrontShadow = clamp((progress - offs * 0.95) / 0.05, 0.7, 1.0);

    // Build the spiral roll
    newposition.z = rad + rad * (1.0 - offs / 2.0) * sin(-offs * rollCount * pi - 0.5 * pi);
    newposition.x = -0.5 + rad * (1.0 - offs / 2.0) * cos(-offs * rollCount * pi + 0.5 * pi);

    // Rotate back
    newposition = rotate(newposition - vec3(-0.5, 0.5, 0.0), vec3(0.0, 0.0, 1.0), finalAngle) + vec3(-0.5, 0.5, 0.0);

    // Unroll
    newposition = rotate(newposition - vec3(-0.5, 0.5, rad), vec3(sin(finalAngle), cos(finalAngle), 0.0), -pi * progress * rollCount);
    newposition += vec3(
        -0.5 + progress * cos(finalAngle) * (sin(finalAngle) + cos(finalAngle)),
        0.5 - progress * sin(finalAngle) * (sin(finalAngle) + cos(finalAngle)),
        rad * (1.0 - progress / 2.0)
    );

    // Mix between rolled and flat as the wavefront passes
    vec3 finalposition = mix(newposition, position, tProgress);

    // Mirror the finished geometry to reverse the sweep for angles > 90.
    if (fx < 0.0) finalposition.x = -finalposition.x;
    if (fy < 0.0) finalposition.y = -finalposition.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalposition, 1.0);
}
`

// Samples the image with object-fit: cover mapping and applies the roll shading.
const fragmentShader = `
uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 resolution;

varying vec2 vUv;
varying float vFrontShadow;

vec2 get_img_uv() {
    vec2 uv = vUv - 0.5;
    // resolution.z / .w carry the cover aspect corrections
    uv *= resolution.zw;
    return uv + 0.5;
}

void main() {
    vec2 img_uv = get_img_uv();

    vec4 color = texture2D(texture1, img_uv);

    // 3D depth shading
    color.rgb *= vFrontShadow;

    // Fade in as the unroll begins; unrolling edges stay visible
    color.a = clamp(progress * 5.0, 0.0, 1.0);

    gl_FragColor = color;
}
`

// Resolve a ResponsiveImage control (object or string) to a URL
function resolveImageSrc(image: any): string | undefined {
    if (!image) return undefined
    if (typeof image === "string") return image.trim() || undefined
    return image.src || undefined
}

// UI roll radius (1..10) → shader roll radius (0.01..0.13)
function mapRollRadius(value: number): number {
    if (value <= 1) return 0.01
    if (value >= 10) return 0.13
    return 0.01 + ((value - 1) / 9) * 0.12
}

// Vertical FOV that fits a width×height plane at the given camera distance
function computeFov(width: number, height: number, distance: number): number {
    const aspect = width / height
    return 2 * Math.atan(width / aspect / (2 * distance)) * (180 / Math.PI)
}

type Mode = "default" | "enter"
type StartAlign = "top" | "center" | "bottom"

interface Props {
    image?: any
    angle?: number
    rolls?: number
    rollRadius?: number
    mode?: Mode
    startAlign?: StartAlign
    replay?: boolean
    duration?: number
    style?: CSSProperties
}

/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 600
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
function __BaseImpl_ImageScroll(props: Props) {
    const {
        image,
        angle = 175,
        rolls = 14,
        rollRadius = 4,
        mode = "enter",
        startAlign = "center",
        replay = false,
        duration = 2,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const meshRef = useRef<any>(null)
    // Tiny probe used to read Framer's canvas zoom without a resize event
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const sizeStateRef = useRef({
        width: 0,
        height: 0,
        zoom: 0,
        aspect: 0,
        ts: 0,
    })
    const rafIdRef = useRef<number | null>(null)
    const modeRef = useRef(mode)
    const isRenderingRef = useRef(false)
    const scrollTweenRef = useRef<any>(null)

    const [inView, setInView] = useState(false)
    const [scrolledAbove, setScrolledAbove] = useState(false)
    const [appeared, setAppeared] = useState(false)
    const [textureReady, setTextureReady] = useState(false)

    // Fall back to the default image when none is provided (the control's
    // defaultValue only applies on the Framer canvas, not the live preview).
    const resolvedImage =
        resolveImageSrc(image) ||
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/be854dd1-37aa-4fc7-f569-fdb948109300/w=800"
    // Only Framer's canvas renders statically; the Next preview animates.
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const hasImage = !!resolvedImage

    // Size the camera / renderer / mesh / cover-mapping to a given layer size
    const resize = useCallback((width: number, height: number) => {
        if (
            !cameraRef.current ||
            !rendererRef.current ||
            !meshRef.current ||
            !canvasRef.current
        )
            return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const canvasW = width * CANVAS_OVERSIZE
        const canvasH = height * CANVAS_OVERSIZE
        const meshW = width * MESH_SCALE
        const meshH = height * MESH_SCALE

        cameraRef.current.aspect = canvasW / canvasH
        cameraRef.current.fov = computeFov(canvasW, canvasH, CAMERA_DISTANCE)
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(
            Math.round(canvasW * dpr),
            Math.round(canvasH * dpr),
            false
        )
        canvasRef.current.style.width = `${canvasW}px`
        canvasRef.current.style.height = `${canvasH}px`
        meshRef.current.scale.set(meshW, meshH, meshW / 2)

        const material = meshRef.current.material
        if (material?.uniforms?.resolution) {
            const tex = material.uniforms.texture1?.value
            if (tex?.image) {
                const layerAspect = meshW / meshH
                const imgAspect = tex.image.width / tex.image.height
                let a1, a2
                if (layerAspect > imgAspect) {
                    a1 = 1
                    a2 = imgAspect / layerAspect
                } else {
                    a1 = layerAspect / imgAspect
                    a2 = 1
                }
                material.uniforms.resolution.value.set(meshW, meshH, a1, a2)
            } else {
                material.uniforms.resolution.value.set(meshW, meshH, 1, 1)
            }
        }
    }, [])

    const renderOnce = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
            return
        rendererRef.current.render(sceneRef.current, cameraRef.current)
    }, [])

    // Continuous render loop, active only while an animation is running
    const renderLoop = useCallback(() => {
        renderOnce()
        rafIdRef.current = isRenderingRef.current
            ? requestAnimationFrame(renderLoop)
            : null
    }, [renderOnce])

    const startLoop = useCallback(() => {
        isRenderingRef.current = true
        if (rafIdRef.current == null)
            rafIdRef.current = requestAnimationFrame(renderLoop)
    }, [renderLoop])

    const stopLoop = useCallback(() => {
        isRenderingRef.current = false
        if (rafIdRef.current != null) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
        }
    }, [])

    // Build the three.js scene/camera/renderer/mesh
    const initThree = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return null
        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const canvasW = width * CANVAS_OVERSIZE
        const canvasH = height * CANVAS_OVERSIZE

        const scene = new Scene()
        sceneRef.current = scene

        const camera = new PerspectiveCamera(
            computeFov(canvasW, canvasH, CAMERA_DISTANCE),
            canvasW / canvasH,
            CAMERA_NEAR,
            CAMERA_FAR
        )
        camera.position.set(0, 0, CAMERA_DISTANCE)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        })
        renderer.setSize(
            Math.round(canvasW * dpr),
            Math.round(canvasH * dpr),
            false
        )
        renderer.setPixelRatio(1)
        renderer.sortObjects = false
        rendererRef.current = renderer
        canvasRef.current.style.width = `${canvasW}px`
        canvasRef.current.style.height = `${canvasH}px`

        const geometry = new PlaneGeometry(1, 1, PLANE_SEGMENTS, PLANE_SEGMENTS)
        const meshW = width * MESH_SCALE
        const meshH = height * MESH_SCALE
        const material = new ShaderMaterial({
            side: DoubleSide,
            uniforms: {
                time: { value: 0 },
                progress: { value: 0 },
                angle: { value: (angle * Math.PI) / 180 },
                rolls: { value: rolls },
                rollRadius: { value: mapRollRadius(rollRadius) },
                texture1: { value: null },
                resolution: { value: new Vector4(meshW, meshH, 1, 1) },
            },
            transparent: true,
            vertexShader,
            fragmentShader,
        })
        const mesh = new Mesh(geometry, material)
        mesh.scale.set(meshW, meshH, meshW / 2)
        mesh.position.set(0, 0, 0)
        meshRef.current = mesh
        scene.add(mesh)

        return { scene, camera, renderer, mesh }
    }, [angle, rolls, rollRadius])

    // Load the image into a texture and set the cover mapping
    const loadTexture = useCallback(() => {
        if (!resolvedImage || !meshRef.current) {
            setTextureReady(false)
            return
        }
        setTextureReady(false)
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            if (!meshRef.current?.material) return
            const texture = new Texture(img)
            texture.needsUpdate = true
            texture.minFilter = LinearFilter
            const material = meshRef.current.material
            const container = containerRef.current
            if (!container) return
            const meshW = (container.clientWidth || 1) * MESH_SCALE
            const meshH = (container.clientHeight || 1) * MESH_SCALE
            const layerAspect = meshW / meshH
            const imgAspect = img.width / img.height
            let a1, a2
            if (layerAspect > imgAspect) {
                a1 = 1
                a2 = imgAspect / layerAspect
            } else {
                a1 = layerAspect / imgAspect
                a2 = 1
            }
            material.uniforms.resolution.value.set(meshW, meshH, a1, a2)
            material.uniforms.texture1.value = texture
            setTextureReady(true)
            if (rendererRef.current && sceneRef.current && cameraRef.current)
                rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
        img.onerror = () => {
            console.error("Texture loading error")
            setTextureReady(false)
        }
        img.src = resolvedImage
    }, [resolvedImage])

    // Keep the trigger mode ref current for scroll handlers
    useEffect(() => {
        modeRef.current = mode
    }, [mode])

    // Reset transient state on mount
    useEffect(() => {
        setAppeared(false)
        setTextureReady(false)
    }, [])

    // Reset progress when image / trigger / canvas mode changes
    useEffect(() => {
        if (!hasImage) {
            setAppeared(false)
            setTextureReady(false)
            return
        }
        setAppeared(false)
        setTextureReady(false)
        if (meshRef.current?.material)
            meshRef.current.material.uniforms.progress.value = isCanvas ? 1 : 0
    }, [hasImage, mode, isCanvas])

    // Create / tear down the three.js pipeline
    useEffect(() => {
        if (!hasImage) {
            stopLoop()
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
            meshRef.current = null
            return
        }
        initThree()
        if (rendererRef.current && sceneRef.current && cameraRef.current)
            renderOnce()
        const t = setTimeout(() => loadTexture(), 0)
        if (isCanvas && meshRef.current?.material)
            meshRef.current.material.uniforms.progress.value = 1
        return () => {
            clearTimeout(t)
            stopLoop()
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasImage, isCanvas, initThree, loadTexture, stopLoop, renderOnce])

    // Track layer size. On Framer canvas, poll the probe for zoom changes.
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const measure = () => {
            const w = container.clientWidth || container.offsetWidth || 1
            const h = container.clientHeight || container.offsetHeight || 1
            const s = sizeStateRef.current
            if (Math.abs(w - s.width) > 1 || Math.abs(h - s.height) > 1) {
                s.width = w
                s.height = h
                resize(w, h)
                renderOnce()
            }
        }
        measure()

        if (isCanvas) {
            let id = 0
            const poll = (ts?: number) => {
                if (!container) return
                const probe = zoomProbeRef.current
                if (!probe) {
                    id = requestAnimationFrame(poll)
                    return
                }
                const w = container.clientWidth || container.offsetWidth || 1
                const h = container.clientHeight || container.offsetHeight || 1
                const aspect = w / h
                const zoom = probe.getBoundingClientRect().width / 20
                const state = sizeStateRef.current
                const throttled =
                    !state.ts || (ts || performance.now()) - state.ts >= 250
                const aspectChanged = Math.abs(aspect - state.aspect) > 0.001
                const sizeChanged =
                    Math.abs(w - state.width) > 1 ||
                    Math.abs(h - state.height) > 1
                if (throttled && (aspectChanged || sizeChanged)) {
                    sizeStateRef.current = {
                        width: w,
                        height: h,
                        aspect,
                        zoom,
                        ts: ts || performance.now(),
                    }
                    resize(w, h)
                    renderOnce()
                }
                id = requestAnimationFrame(poll)
            }
            id = requestAnimationFrame(poll)
            return () => cancelAnimationFrame(id)
        }

        const observer = new ResizeObserver(measure)
        observer.observe(container)
        window.addEventListener("resize", measure)
        return () => {
            observer.disconnect()
            window.removeEventListener("resize", measure)
        }
    }, [resize, renderOnce, isCanvas])

    // Live-update the roll uniforms
    useEffect(() => {
        if (!meshRef.current?.material) return
        const u = meshRef.current.material.uniforms
        u.angle.value = (angle * Math.PI) / 180
        u.rolls.value = rolls
        u.rollRadius.value = mapRollRadius(rollRadius)
        renderOnce()
    }, [angle, rolls, rollRadius, renderOnce])

    // Scroll trigger: flag in-view / scrolled-above from the layer's rect
    useEffect(() => {
        if (mode !== "enter" || isCanvas) return
        let raf: number | null = null
        const check = () => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const vh = window.innerHeight || 0
            let edge: number
            edge =
                startAlign === "top"
                    ? rect.top
                    : startAlign === "center"
                      ? rect.top + rect.height / 2
                      : rect.bottom
            setInView(edge <= vh && rect.bottom >= 0)
            setScrolledAbove(rect.top > vh)
        }
        const onScroll = () => {
            if (raf) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(check)
        }
        check()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", check)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", check)
        }
    }, [mode, startAlign, isCanvas])

    // Appear trigger: flip `appeared` shortly after mount
    useEffect(() => {
        if (
            hasImage &&
            !isCanvas &&
            textureReady &&
            mode === "default" &&
            !appeared
        ) {
            const t = setTimeout(() => setAppeared(true), 10)
            return () => clearTimeout(t)
        }
    }, [mode, appeared, hasImage, isCanvas, textureReady])

    // Appear animation: tween progress 0 → 1
    useEffect(() => {
        if (
            isCanvas ||
            mode !== "default" ||
            !appeared ||
            !textureReady ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.texture1.value
        )
            return
        const material = meshRef.current.material
        startLoop()
        const tween = gsap.to(material.uniforms.progress, {
            value: 1,
            duration: duration,
            ease: "power2.out",
            onUpdate: renderOnce,
            onComplete: () => {
                renderOnce()
                stopLoop()
            },
        })
        return () => {
            tween.kill()
            stopLoop()
        }
    }, [
        appeared,
        textureReady,
        duration,
        mode,
        isCanvas,
        renderOnce,
        startLoop,
        stopLoop,
    ])

    // Scroll animation: tween to 1 when in view, reset when scrolled above (replay)
    useEffect(() => {
        if (
            isCanvas ||
            mode !== "enter" ||
            !textureReady ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.texture1.value
        )
            return
        const material = meshRef.current.material
        const progress = material.uniforms.progress.value
        if (scrollTweenRef.current) {
            scrollTweenRef.current.kill()
            scrollTweenRef.current = null
            stopLoop()
        }
        if (scrolledAbove) {
            if (replay && progress > 0.01) {
                material.uniforms.progress.value = 0
                renderOnce()
            }
            return
        }
        if (inView && progress < 0.99) {
            startLoop()
            scrollTweenRef.current = gsap.to(material.uniforms.progress, {
                value: 1,
                duration: duration,
                ease: "power2.out",
                onUpdate: renderOnce,
                onComplete: () => {
                    renderOnce()
                    stopLoop()
                    scrollTweenRef.current = null
                },
            })
        }
        return () => {
            if (scrollTweenRef.current) {
                scrollTweenRef.current.kill()
                scrollTweenRef.current = null
            }
            stopLoop()
        }
    }, [
        inView,
        scrolledAbove,
        replay,
        textureReady,
        duration,
        mode,
        isCanvas,
        renderOnce,
        startLoop,
        stopLoop,
    ])

    // Framer canvas: always play the unroll preview once.
    useEffect(() => {
        if (!isCanvas || !meshRef.current?.material) return
        const u = meshRef.current.material.uniforms
        u.progress.value = 0
        startLoop()
        const tween = gsap.to(u.progress, {
            value: 1,
            duration: duration,
            ease: "power2.out",
            onUpdate: renderOnce,
            onComplete: () => {
                renderOnce()
                stopLoop()
            },
        })
        return () => {
            tween?.kill()
            stopLoop()
        }
    }, [
        isCanvas,
        duration,
        renderOnce,
        startLoop,
        stopLoop,
        angle,
        rolls,
        rollRadius,
    ])

    if (!hasImage) {
        return (
            <ComponentMessage
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                    ...style,
                }}
                title="Unrolling Image"
                subtitle="Add an image to see the unroll effect"
            />
        )
    }

    // Center the oversized canvas over the layer
    const offset = ((CANVAS_OVERSIZE - 1) / 2) * 100

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                // Clip to the layer so the oversized canvas can't enlarge the
                // component (keeps the code preview at the layer size).
                overflow: "hidden",
                display: "block",
                margin: 0,
                padding: 0,
            }}
        >
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: `-${offset}%`,
                    left: `-${offset}%`,
                    display: "block",
                }}
            />
        </div>
    )
}

addPropertyControls(ImageScroll, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
        // Framer supports defaultValue on ResponsiveImage at runtime; the type
        // doesn't include it, so cast.
        defaultValue: {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/be854dd1-37aa-4fc7-f569-fdb948109300/w=800",
        },
    } as any,
    angle: {
        type: ControlType.Number,
        title: "Angle",
        min: 0,
        max: 360,
        step: 1,
        defaultValue: 175,
        unit: "°",
    },
    rolls: {
        type: ControlType.Number,
        title: "Rolls",
        min: 1,
        max: 20,
        step: 1,
        defaultValue: 14,
    },
    rollRadius: {
        type: ControlType.Number,
        title: "Roll Radius",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 4,
    },
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["default", "enter"],
        optionTitles: ["Default", "Enter"],
        defaultValue: "enter",
        displaySegmentedControl: true,
    },
    startAlign: {
        type: ControlType.Enum,
        title: "Start At",
        options: ["top", "center", "bottom"],
        optionTitles: ["Top", "Center", "Bottom"],
        defaultValue: "center",
        displaySegmentedControl: true,
        segmentedControlDirection: "horizontal",
        hidden: (p: any) => p.mode !== "enter",
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay",
        defaultValue: false,
        hidden: (p: any) => p.mode !== "enter",
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: 2,
        unit: "s",
    },
})

ImageScroll.displayName = "Unrolling Image"

const __presetProps = {
  "mode": "enter",
  "angle": 0,
  "image": {
    "src": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "rolls": 6,
  "replay": false,
  "duration": 2.5,
  "rollRadius": 3,
  "startAlign": "top"
};

export default function ImageScroll(props: Record<string, unknown>) {
  return <__BaseImpl_ImageScroll {...(__presetProps as Record<string, unknown>)} {...props} />;
}
