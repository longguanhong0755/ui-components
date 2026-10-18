"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    PlaneGeometry,
    Mesh,
    ShaderMaterial,
    Vector2,
    TextureLoader,
} from "three";
import { gsap } from "gsap";

const CAMERA_FOV = 35;
const PLANE_SEGMENTS = 128;

const vertexShader = `
varying vec2 vUv;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;
    gl_Position = clipPosition;
    vUv = uv;
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float uProgress;      // Animation progress [0..1]
uniform vec2 uSize;           // Container size in pixels
uniform vec2 uImageSize;      // Image dimensions for aspect ratio
uniform sampler2D uTexture;   // The image texture
uniform int uBlobCount;
uniform float uFitCover;      // 1 = cover (fill+crop), 0 = contain (fit+letterbox)
#define PI 3.1415926538
#define TWO_PI 6.28318530718

// Creates wavy noise based on angle - adds organic feel to blob edges
float noise(vec2 point) {
    float frequency = 1.0;
    float angle = atan(point.y, point.x) + uProgress * PI;

    // Combine multiple wave frequencies for complex pattern
    float w0 = (cos(angle * frequency) + 1.0) / 2.0;
    float w1 = (sin(2.0 * angle * frequency) + 1.0) / 2.0;
    float w2 = (cos(3.0 * angle * frequency) + 1.0) / 2.0;
    return (w0 + w1 + w2) / 3.0;
}

// Smooth maximum function for organic blending
float softMax(float a, float b, float k) {
    return log(exp(k * a) + exp(k * b)) / k;
}

// Smooth minimum function - blends shapes together smoothly
float softMin(float a, float b, float k) {
    return -softMax(-a, -b, k);
}

// Signed distance field for a circle with noise
float circleSDF(vec2 pos, float rad) {
    float a = sin(uProgress * 0.2) * 0.25;
    float amt = 0.5 + a;
    float circle = length(pos);
    circle += noise(pos) * rad * amt;
    return circle;
}

// Creates circles arranged radially around the center
float radialCircles(vec2 p, float offset, float count) {
    float angle = (2.0 * PI) / count;
    float s = round(atan(p.y, p.x) / angle);
    float an = angle * s;
    vec2 q = vec2(offset * cos(an), offset * sin(an));
    vec2 pos = p - q;
    return circleSDF(pos, 15.0);
}

void main() {
    vec4 bg = vec4(0.0, 0.0, 0.0, 0.0);

    // UV for cover (fill + crop) or contain (fit + letterbox), vs plane aspect.
    vec2 coverUV = vUv;
    if (uSize.x > 0.0 && uSize.y > 0.0 && uImageSize.x > 0.0 && uImageSize.y > 0.0) {
        float containerAspect = uSize.x / uSize.y;
        float imageAspect = uImageSize.x / uImageSize.y;

        vec2 scale = vec2(1.0);
        if (uFitCover > 0.5) {
            // Cover: shrink UV on the long axis so the image fills, cropping.
            if (containerAspect > imageAspect) scale.y = imageAspect / containerAspect;
            else scale.x = containerAspect / imageAspect;
        } else {
            // Contain: expand UV so the whole image fits; rest is letterbox.
            if (containerAspect > imageAspect) scale.x = containerAspect / imageAspect;
            else scale.y = imageAspect / containerAspect;
        }

        coverUV = (vUv - 0.5) * scale + 0.5;
    }

    vec4 texture = texture2D(uTexture, coverUV);
    // Contain: anything sampled outside [0,1] is letterbox → transparent.
    if (uFitCover < 0.5 &&
        (coverUV.x < 0.0 || coverUV.x > 1.0 || coverUV.y < 0.0 || coverUV.y > 1.0)) {
        texture = vec4(0.0);
    }
    vec2 coords = vUv * uSize;
    vec2 center = vec2(0.5) * uSize;

    // Apply easing to progress for natural animation curve
    float t = pow(uProgress, 2.5);
    // Use diagonal to ensure full coverage - need at least half diagonal to cover rectangle
    // Add extra margin to account for noise distortion
    float maxDim = sqrt(uSize.x * uSize.x + uSize.y * uSize.y);
    float rad = t * maxDim * 1.0;

    // Create main center circle (always present)
    float c1 = circleSDF(coords - center, rad);
    float k = 50.0 / max(uSize.x, uSize.y);
    float circle = c1;

    // Add extra blobs only if blobCount > 1
    int extraBlobs = uBlobCount - 1;
    for (int i = 0; i < 20; i++) {
        if (i >= extraBlobs) break;

        float idx = float(i);
        float total = float(extraBlobs);

        // Distribute evenly around the center with pseudo-random offset
        float baseAngle = idx * TWO_PI / max(total, 1.0);
        float jitter = fract(sin(idx * 127.1 + 311.7) * 43758.5453) * 0.5 - 0.25;
        float angle = baseAngle + jitter;

        // Position at varying distances from center
        float distRatio = 0.25 + 0.2 * fract(sin(idx * 43.3) * 12345.6);
        vec2 offset = vec2(cos(angle), sin(angle)) * distRatio * min(uSize.x, uSize.y);

        // Each extra blob is a simple circle
        float blobDist = length(coords - center - offset);
        float blobNoise = noise(coords - center - offset) * rad * 0.4;
        float blob = blobDist + blobNoise;

        circle = softMin(circle, blob, k);
    }

    // Create sharp edge at the blob boundary
    circle = step(circle, rad);

    // Mix background (transparent) with texture based on blob mask
    gl_FragColor = mix(bg, texture, circle);
}
`;

// Distance a perspective camera must sit from a `height`-px plane to fit it
function cameraDistance(height: number, fov: number): number {
    const h = Math.max(height, 1);
    const r = (fov * Math.PI) / 360;
    return h / 2 / Math.tan(r) || 1;
}

// Fit the camera to a width×height (px) plane centered at origin
function fitCamera(camera: PerspectiveCamera, width: number, height: number) {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    camera.aspect = w / h;
    camera.fov = CAMERA_FOV;
    camera.position.set(0, 0, cameraDistance(h, camera.fov));
    camera.updateProjectionMatrix();
}

// Resolve an image prop (object or string) to a URL
function resolveImageSrc(image: unknown): string | undefined {
    if (!image) return undefined;
    if (typeof image === "string") return image.trim() || undefined;
    return (image as { src?: string }).src || undefined;
}

const NAMED_EASES: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
};

function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (p: number) => {
        let t = p;
        for (let i = 0; i < 8; i++) {
            const x = sampleX(t) - p;
            const d = dX(t);
            if (Math.abs(x) < 1e-4 || Math.abs(d) < 1e-6) break;
            t -= x / d;
        }
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return sampleY(t);
    };
}

function easeToGsap(ease: unknown) {
    if (Array.isArray(ease) && ease.length === 4)
        return cubicBezierEase(ease[0], ease[1], ease[2], ease[3]);
    const b =
        (typeof ease === "string" && NAMED_EASES[ease]) || NAMED_EASES.easeOut;
    return cubicBezierEase(b[0], b[1], b[2], b[3]);
}

type StartAlign = "top" | "center" | "bottom";
type Fit = "cover" | "contain";

interface BlobRevealTransition {
    duration?: number;
    ease?: string | [number, number, number, number];
}

interface BlobRevealImage {
    src: string;
}

interface BlobRevealProps {
    image?: BlobRevealImage | string;
    fit?: Fit;
    blobCount?: number;
    startAlign?: StartAlign;
    replay?: boolean;
    transition?: BlobRevealTransition;
    style?: CSSProperties;
}

function __BaseImpl_BlobReveal({
    image = {
        src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/041b1d75-2371-44dc-4b15-972ecd7b2400/w=800",
    },
    fit = "cover",
    blobCount = 20,
    startAlign = "bottom",
    replay = true,
    transition = { type: "tween", duration: 2, ease: "easeOut" } as unknown as BlobRevealTransition,
    style,
}: BlobRevealProps) {
    const trDuration =
        typeof transition?.duration === "number" ? transition.duration : 2;
    const easeKey = JSON.stringify(transition?.ease ?? null);
    const ease = useMemo(
        () => easeToGsap(transition?.ease),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [easeKey]
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<Scene | null>(null);
    const rendererRef = useRef<WebGLRenderer | null>(null);
    const cameraRef = useRef<PerspectiveCamera | null>(null);
    const meshRef = useRef<Mesh<PlaneGeometry, ShaderMaterial> | null>(null);
    const zoomProbeRef = useRef<HTMLDivElement>(null);
    const sizeStateRef = useRef({ width: 0, height: 0, zoom: 0 });
    const rafIdRef = useRef<number | null>(null);
    const isRenderingRef = useRef(false);
    const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

    const [inView, setInView] = useState(false);
    const [offScreen, setOffScreen] = useState(false);
    const [appeared, setAppeared] = useState(false);
    const [textureReady, setTextureReady] = useState(false);

    const resolvedImage = resolveImageSrc(image);
    const hasImage = !!resolvedImage;

    const initThree = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return null;
        const container = containerRef.current;
        const width = container.clientWidth || container.offsetWidth || 1;
        const height = container.clientHeight || container.offsetHeight || 1;

        const scene = new Scene();
        sceneRef.current = scene;

        const camera = new PerspectiveCamera(
            CAMERA_FOV,
            width / height,
            0.1,
            2000
        );
        fitCamera(camera, width, height);
        cameraRef.current = camera;

        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        });
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        rendererRef.current = renderer;

        const iw = Math.max(1, width);
        const ih = Math.max(1, height);
        const geometry = new PlaneGeometry(
            iw,
            ih,
            PLANE_SEGMENTS,
            PLANE_SEGMENTS
        );
        const material = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            uniforms: {
                uProgress: { value: 0 },
                uSize: { value: new Vector2(iw, ih) },
                uImageSize: { value: new Vector2(1, 1) },
                uTexture: { value: null },
                uBlobCount: {
                    value: Math.min(20, Math.max(1, Math.round(blobCount))),
                },
                uFitCover: { value: fit === "contain" ? 0 : 1 },
            },
        });
        const mesh = new Mesh(geometry, material);
        meshRef.current = mesh;
        scene.add(mesh);

        return { scene, camera, renderer, mesh };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blobCount]);

    const loadTexture = useCallback(() => {
        if (!resolvedImage || !meshRef.current) {
            setTextureReady(false);
            return;
        }
        setTextureReady(false);
        new TextureLoader().load(
            resolvedImage,
            (texture) => {
                if (!meshRef.current?.material) return;
                const material = meshRef.current.material;
                if (texture.image) {
                    const w = texture.image.width || 1;
                    const h = texture.image.height || 1;
                    material.uniforms.uImageSize.value.set(w, h);
                }
                material.uniforms.uTexture.value = texture;
                setTextureReady(true);
                if (
                    rendererRef.current &&
                    sceneRef.current &&
                    cameraRef.current
                )
                    rendererRef.current.render(
                        sceneRef.current,
                        cameraRef.current
                    );
            },
            undefined,
            (err) => {
                console.error("Texture loading error:", err);
                setTextureReady(false);
            }
        );
    }, [resolvedImage]);

    const resize = useCallback((width: number, height: number) => {
        if (!cameraRef.current || !rendererRef.current) return;
        fitCamera(cameraRef.current, width, height);
        rendererRef.current.setSize(width, height, false);
        rendererRef.current.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 2)
        );
        const mesh = meshRef.current;
        if (mesh) {
            const iw = Math.max(1, width);
            const ih = Math.max(1, height);
            if (mesh.geometry) mesh.geometry.dispose();
            mesh.geometry = new PlaneGeometry(
                iw,
                ih,
                PLANE_SEGMENTS,
                PLANE_SEGMENTS
            );
            if (mesh.material?.uniforms?.uSize)
                mesh.material.uniforms.uSize.value.set(iw, ih);
        }
    }, []);

    const renderOnce = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
            return;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
    }, []);

    const renderLoop = useCallback(() => {
        renderOnce();
        rafIdRef.current = isRenderingRef.current
            ? requestAnimationFrame(renderLoop)
            : null;
    }, [renderOnce]);

    const startLoop = useCallback(() => {
        isRenderingRef.current = true;
        if (rafIdRef.current == null)
            rafIdRef.current = requestAnimationFrame(renderLoop);
    }, [renderLoop]);

    const stopLoop = useCallback(() => {
        isRenderingRef.current = false;
        if (rafIdRef.current != null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    }, []);

    useEffect(() => {
        setAppeared(false);
        setTextureReady(false);
    }, []);

    useEffect(() => {
        if (!hasImage) {
            setAppeared(false);
            setTextureReady(false);
            return;
        }
        setAppeared(false);
        setTextureReady(false);
        if (meshRef.current?.material)
            meshRef.current.material.uniforms.uProgress.value = 0;
    }, [hasImage, resolvedImage]);

    useEffect(() => {
        if (!hasImage) {
            stopLoop();
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            if (sceneRef.current) {
                sceneRef.current.clear();
                sceneRef.current = null;
            }
            meshRef.current = null;
            return;
        }
        initThree();
        if (rendererRef.current && sceneRef.current && cameraRef.current)
            renderOnce();
        const t = setTimeout(() => loadTexture(), 0);
        return () => {
            clearTimeout(t);
            stopLoop();
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            if (sceneRef.current) {
                sceneRef.current.clear();
                sceneRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasImage, initThree, loadTexture, stopLoop, renderOnce]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const measure = () => {
            const w = container.clientWidth || container.offsetWidth || 1;
            const h = container.clientHeight || container.offsetHeight || 1;
            const s = sizeStateRef.current;
            if (Math.abs(w - s.width) > 1 || Math.abs(h - s.height) > 1) {
                s.width = w;
                s.height = h;
                resize(w, h);
                renderOnce();
            }
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        const zoomTimer = setInterval(() => {
            const probeW =
                zoomProbeRef.current?.getBoundingClientRect().width ?? 20;
            const s = sizeStateRef.current;
            if (Math.abs(probeW - s.zoom) > 0.5) {
                s.zoom = probeW;
                measure();
            }
        }, 250);
        return () => {
            observer.disconnect();
            clearInterval(zoomTimer);
        };
    }, [resize, renderOnce]);

    useEffect(() => {
        if (!meshRef.current?.material) return;
        meshRef.current.material.uniforms.uBlobCount.value = Math.min(
            20,
            Math.max(1, Math.round(blobCount))
        );
        renderOnce();
    }, [blobCount, renderOnce]);

    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh?.material?.uniforms?.uFitCover) return;
        mesh.material.uniforms.uFitCover.value = fit === "contain" ? 0 : 1;
        renderOnce();
    }, [fit, renderOnce]);

    useEffect(() => {
        let raf: number | null = null;
        const check = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const vh = window.innerHeight || 0;
            const edge =
                startAlign === "top"
                    ? rect.top
                    : startAlign === "center"
                      ? rect.top + rect.height / 2
                      : rect.bottom;
            setInView(edge <= vh && rect.bottom >= 0);
            setOffScreen(rect.top > vh || rect.bottom < 0);
        };
        const onScroll = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(check);
        };
        check();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", check);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", check);
        };
    }, [startAlign]);

    useEffect(() => {
        if (
            !appeared ||
            !textureReady ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.uTexture.value
        )
            return;
        const material = meshRef.current.material;
        startLoop();
        const tween = gsap.to(material.uniforms.uProgress, {
            value: 1,
            duration: trDuration,
            ease,
            onUpdate: renderOnce,
            onComplete: () => {
                renderOnce();
                stopLoop();
            },
        });
        return () => {
            tween.kill();
            stopLoop();
        };
    }, [
        appeared,
        textureReady,
        trDuration,
        ease,
        renderOnce,
        startLoop,
        stopLoop,
    ]);

    useEffect(() => {
        if (
            !textureReady ||
            !meshRef.current?.material ||
            !meshRef.current.material.uniforms.uTexture.value
        )
            return;
        const material = meshRef.current.material;
        const progress = material.uniforms.uProgress.value;
        if (offScreen) {
            if (scrollTweenRef.current) {
                scrollTweenRef.current.kill();
                scrollTweenRef.current = null;
                stopLoop();
            }
            if (replay && progress > 0.01) {
                material.uniforms.uProgress.value = 0;
                renderOnce();
            }
            return;
        }
        if (inView && progress < 0.99) {
            if (scrollTweenRef.current) return;
            startLoop();
            scrollTweenRef.current = gsap.to(material.uniforms.uProgress, {
                value: 1,
                duration: trDuration,
                ease,
                onUpdate: renderOnce,
                onComplete: () => {
                    renderOnce();
                    stopLoop();
                    scrollTweenRef.current = null;
                },
            });
        }
    }, [
        inView,
        offScreen,
        replay,
        textureReady,
        trDuration,
        ease,
        renderOnce,
        startLoop,
        stopLoop,
    ]);

    useEffect(() => {
        return () => {
            if (scrollTweenRef.current) {
                scrollTweenRef.current.kill();
                scrollTweenRef.current = null;
            }
            stopLoop();
        };
    }, [stopLoop]);

    useEffect(() => {
        if (!hasImage || appeared) return;
        setAppeared(true);
    }, [hasImage, appeared]);

    if (!hasImage) {
        return (
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "#999",
                    fontSize: 14,
                    ...style,
                }}
            >
                Add an image to see the blob reveal effect
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
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
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    );
}

const __presetProps = {
  "fit": "cover",
  "image": {
    "src": "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "replay": true,
  "blobCount": 10,
  "startAlign": "bottom",
  "transition": {
    "ease": "easeOut",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 2,
    "stiffness": 800
  }
};

export default function BlobReveal(props: Record<string, unknown>) {
  return <__BaseImpl_BlobReveal {...(__presetProps as Record<string, unknown>)} {...props} />;
}
