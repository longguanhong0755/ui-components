"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";

interface MagicTextRevealProps {
    text?: string;
    color?: string;
    font?: {
        fontFamily?: string;
        fontSize?: string;
        textAlign?: string;
        fontWeight?: number;
        letterSpacing?: string;
    };
    noise?: number;
    transition?: {
        type?: string;
        duration?: number;
        ease?: string | [number, number, number, number];
    };
    density?: number;
    resetOnMouseLeave?: boolean;
    tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div" | "span";
    playMode?: "hover" | "enter";
    startAlign?: "top" | "center" | "bottom";
    replay?: boolean;
}

// Density slider (1..10) → particle sampling multiplier (lower = denser).
const DENSITY_MAP = [6, 5.4, 4.9, 4.3, 3.8, 3.2, 2.7, 2.1, 1.6, 1];

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
            const dd = dX(t);
            if (Math.abs(x) < 1e-4 || Math.abs(dd) < 1e-6) break;
            t -= x / dd;
        }
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return sampleY(t);
    };
}

function easeToFn(ease: any) {
    if (Array.isArray(ease) && ease.length === 4)
        return cubicBezierEase(ease[0], ease[1], ease[2], ease[3]);
    const b =
        (typeof ease === "string" && NAMED_EASES[ease]) || NAMED_EASES.easeInOut;
    return cubicBezierEase(b[0], b[1], b[2], b[3]);
}

// Hand-off points on the form timeline (p). The real text fades in from TEXT_IN
// and is fully opaque by FADE_OUT; the particles only start leaving at FADE_OUT.
const TEXT_IN = 0.7;
const FADE_OUT = 0.85;

const renderCanvas = ({
    canvasRef,
    wrapperRef,
    globalDpr,
    props,
    wrapperSize,
    particlesRef,
    transformedDensity,
    color,
}: any) => {
    if (
        !wrapperRef.current ||
        !canvasRef.current ||
        !wrapperSize.width ||
        !wrapperSize.height
    )
        return;
    const canvas = canvasRef.current;
    const { width, height } = wrapperSize;
    canvas.width = width * globalDpr;
    canvas.height = height * globalDpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const textX = canvas.width / 2;
    const textY = canvas.height / 2;
    const formattedFontFamily = formatFontFamilies(props.font.fontFamily);
    const fontSize = parseInt(props.font.fontSize?.replace("px", "") || "50");
    const font = `${props.font.fontWeight ?? 400} ${fontSize * globalDpr}px ${formattedFontFamily}`;
    const particles = createParticles(
        ctx,
        canvas,
        props.text,
        textX,
        textY,
        font,
        color,
        "center",
        transformedDensity,
        props.font.letterSpacing || "0px"
    );
    particlesRef.current = particles;
    renderParticles(ctx, particles, globalDpr);
};

const createParticles = (
    ctx: any,
    canvas: any,
    text: any,
    textX: any,
    textY: any,
    font: any,
    color: any,
    alignment: any,
    transformedDensity: any,
    letterSpacing: any
) => {
    const particles: any[] = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = alignment;
    ctx.letterSpacing = letterSpacing;
    ctx.textBaseline = "middle";
    ctx.imageSmoothingEnabled = true;
    ctx.fillText(text, textX, textY);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const currentDPR = canvas.width / parseInt(canvas.style.width);
    const baseSampleRate = Math.max(2, Math.round(currentDPR));
    const sampleRate = Math.max(
        1,
        Math.round(baseSampleRate * transformedDensity)
    );
    let minX = canvas.width;
    let maxX = 0;
    let minY = canvas.height;
    let maxY = 0;
    for (let y = 0; y < canvas.height; y += sampleRate) {
        for (let x = 0; x < canvas.width; x += sampleRate) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    const textWidth = maxX - minX;
    const textHeight = maxY - minY;
    const spreadRadius = Math.max(textWidth, textHeight) * 0.1;
    for (let y = 0; y < canvas.height; y += sampleRate) {
        for (let x = 0; x < canvas.width; x += sampleRate) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            if (alpha > 0) {
                const originalAlpha = alpha / 255;
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const initialX = x + Math.cos(angle) * distance;
                const initialY = y + Math.sin(angle) * distance;
                const particle = {
                    x: initialX,
                    y: initialY,
                    originalX: x,
                    originalY: y,
                    color: `rgba(${data[index]}, ${data[index + 1]}, ${data[index + 2]}, ${originalAlpha})`,
                    opacity: originalAlpha * 0.3,
                    sparkleOp: originalAlpha * 0.3,
                    originalAlpha,
                    velocityX: 0,
                    velocityY: 0,
                    angle: Math.random() * Math.PI * 2,
                    speed: 0,
                    floatingOffsetX: 0,
                    floatingOffsetY: 0,
                    floatingSpeed: Math.random() * 2 + 1,
                    floatingAngle: Math.random() * Math.PI * 2,
                    targetOpacity: Math.random() * originalAlpha * 0.5,
                    sparkleSpeed: Math.random() * 2 + 1,
                };
                particles.push(particle);
            }
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return particles;
};

const updateParticles = (
    particles: any,
    deltaTime: any,
    p: any,
    showText: any,
    setShowText: any,
    noise: any,
    speed: any
) => {
    const FLOAT_RADIUS = noise;
    const FLOAT_SPEED = speed;
    const NOISE_SCALE = 0.6;
    const CHAOS_FACTOR = 1.3;
    const time = Date.now() * 0.001;
    const inv = 1 - p;
    particles.forEach((particle: any) => {
        particle.floatingAngle +=
            deltaTime *
            particle.floatingSpeed *
            (1 + Math.random() * CHAOS_FACTOR);
        const uniqueOffset = particle.floatingSpeed * 2e3;
        const noiseX =
            (Math.sin(time * particle.floatingSpeed + particle.floatingAngle) *
                1.2 +
                Math.sin((time + uniqueOffset) * 0.5) * 0.8 +
                (Math.random() - 0.5) * CHAOS_FACTOR) *
            NOISE_SCALE;
        const noiseY =
            (Math.cos(
                time * particle.floatingSpeed + particle.floatingAngle * 1.5
            ) *
                0.6 +
                Math.cos((time + uniqueOffset) * 0.5) * 0.4 +
                (Math.random() - 0.5) * CHAOS_FACTOR) *
            NOISE_SCALE;
        const floatX = particle.originalX + FLOAT_RADIUS * noiseX;
        const floatY = particle.originalY + FLOAT_RADIUS * noiseY;
        const targetX = floatX + (particle.originalX - floatX) * p;
        const targetY = floatY + (particle.originalY - floatY) * p;
        const dx = targetX - particle.x;
        const dy = targetY - particle.y;
        const follow = 6 + p * 10;
        const jitterX = (Math.random() - 0.5) * FLOAT_SPEED * inv;
        const jitterY = (Math.random() - 0.5) * FLOAT_SPEED * inv;
        particle.x += dx * follow * deltaTime + jitterX;
        particle.y += dy * follow * deltaTime + jitterY;
        if (p >= 0.999) {
            particle.x = particle.originalX;
            particle.y = particle.originalY;
        }
        const opacityDiff = particle.targetOpacity - particle.sparkleOp;
        particle.sparkleOp +=
            opacityDiff * particle.sparkleSpeed * deltaTime * 3;
        if (Math.abs(opacityDiff) < 0.01) {
            particle.targetOpacity =
                Math.random() < 0.5
                    ? Math.random() * 0.1 * particle.originalAlpha
                    : particle.originalAlpha * 3;
            particle.sparkleSpeed = Math.random() * 3 + 1;
        }
        const idleOp = Math.max(
            0,
            Math.min(particle.originalAlpha, particle.sparkleOp)
        );
        const formFade =
            p < FADE_OUT ? 1 : Math.max(0, 1 - (p - FADE_OUT) / (1 - FADE_OUT));
        particle.opacity =
            (idleOp + (particle.originalAlpha - idleOp) * p) * formFade;
    });
    const formed = p > TEXT_IN;
    if (formed && !showText) setShowText(true);
    if (!formed && showText) setShowText(false);
};

const renderParticles = (ctx: any, particles: any, globalDpr: any) => {
    ctx.save();
    ctx.scale(globalDpr, globalDpr);
    const particlesByColor = new Map<string, any[]>();
    particles.forEach((particle: any) => {
        if (particle.opacity <= 0) return;
        const color = particle.color.replace(
            /[\d.]+\)$/,
            `${particle.opacity})`
        );
        if (!particlesByColor.has(color)) {
            particlesByColor.set(color, []);
        }
        particlesByColor
            .get(color)!
            .push({ x: particle.x / globalDpr, y: particle.y / globalDpr });
    });
    particlesByColor.forEach((positions, color) => {
        ctx.fillStyle = color;
        positions.forEach(({ x, y }: any) => {
            ctx.fillRect(x, y, 1, 1);
        });
    });
    ctx.restore();
};

const cleanup = ({ canvasRef, particlesRef }: any) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (particlesRef.current) {
        particlesRef.current = [];
    }
};

const useWrapperSize = () => {
    const wrapperRef = useRef<any>(null);
    const [wrapperSize, setWrapperSize] = useState<{
        width: number | null;
        height: number | null;
    }>({ width: null, height: null });
    useEffect(() => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setWrapperSize({ width: rect.width, height: rect.height });
        }
    }, [wrapperRef]);
    return { wrapperSize, setWrapperSize, wrapperRef };
};

const useResizeObserver = ({
    wrapperRef,
    wrapperSize,
    setWrapperSize,
    props,
    canvasRef,
    globalDpr,
    particlesRef,
    transformedDensity,
    color,
}: any) => {
    useEffect(() => {
        const container = wrapperRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setWrapperSize({ width, height });
            }
            renderCanvas({
                canvasRef,
                wrapperRef,
                globalDpr,
                props,
                wrapperSize,
                particlesRef,
                transformedDensity,
                color,
            });
        });
        resizeObserver.observe(container);
        return () => {
            resizeObserver.disconnect();
        };
    }, [wrapperRef]);
};

const parseFramerColor = (color: any): string => {
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (rgbaMatch) {
        const [, r, g, b, a] = rgbaMatch;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    } else if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return `rgba(${r}, ${g}, ${b}, 1)`;
    }
    console.warn("Could not parse color:", color);
    return "rgba(0, 0, 0, 1)";
};

const formatFontFamilies = (fontFamilyString: any = "sans-serif") => {
    return (
        fontFamilyString +
        ", sans-serif"
            .split(",")
            .map((font: string) => font.trim().replace(/['"]/g, ""))
            .join(", ")
    );
};

function transformValue(
    input: number,
    inputRange: number[],
    outputRange: number[],
    clamp = false
): number {
    const [inputMin, inputMax] = inputRange;
    const [outputMin, outputMax] = outputRange;
    const progress = (input - inputMin) / (inputMax - inputMin);
    let result = outputMin + progress * (outputMax - outputMin);
    if (clamp) {
        if (outputMax > outputMin) {
            result = Math.min(Math.max(result, outputMin), outputMax);
        } else {
            result = Math.min(Math.max(result, outputMax), outputMin);
        }
    }
    return result;
}

const renderAnimatedTag = (props: any, color: any, showText: any) => {
    const Component: any = (motion as any)[props.tag];
    const trDur =
        typeof props.transition?.duration === "number"
            ? props.transition.duration
            : 1;
    const inDur = trDur * (FADE_OUT - TEXT_IN);
    return (
        <Component
            initial="hidden"
            animate={showText ? "visible" : "hidden"}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{
                duration: showText ? inDur : trDur * 0.4,
                type: "tween",
                ease: showText ? "linear" : "easeOut",
            }}
            style={{
                color: color,
                margin: 0,
                zIndex: 1,
                fontFamily: props.font.fontFamily,
                fontWeight: props.font.fontWeight,
                fontSize: props.font.fontSize,
                letterSpacing: props.font.letterSpacing,
                userSelect: "text",
                whiteSpace: "nowrap",
            }}
        >
            {props.text}
        </Component>
    );
};

const waitForFont = async (fontFamily: any) => {
    if (typeof window === "undefined" || !("FontFace" in window)) return;
    try {
        const families = fontFamily
            .split(",")
            .map((f: string) => f.trim().replace(/['"]/g, ""));
        await Promise.race([
            Promise.all(
                families.map((family: string) =>
                    (document as any).fonts?.load(`16px "${family}"`)
                )
            ),
            new Promise((resolve) => setTimeout(resolve, 5e3)),
        ]);
    } catch (e) {
        console.warn("Font loading failed:", e);
    }
};

export default function MagicTextReveal({
    text = "DUST TEXT REVEAL",
    color: colorProp = "rgba(255, 255, 255, 1)",
    font = {
        fontFamily: "Inter",
        fontSize: "50px",
        textAlign: "center",
        fontWeight: 400,
    },
    noise = 100,
    transition = { type: "tween", duration: 1, ease: "easeInOut" },
    density = 8,
    resetOnMouseLeave = true,
    tag = "h1",
    playMode = "enter",
    startAlign = "center",
    replay = true,
}: MagicTextRevealProps) {
    const props = {
        text,
        color: colorProp,
        font,
        noise,
        transition,
        density,
        resetOnMouseLeave,
        tag,
        playMode,
        startAlign,
        replay,
    };
    const canvasRef = useRef<any>(null);
    const wrapperRef = useRef<any>(null);
    const lastFontRef = useRef<any>(null);
    const particlesRef = useRef<any[]>([]);
    const animationFrameRef = useRef<any>(null);
    const lastTimeRef = useRef(performance.now());
    const formProgressRef = useRef(0);
    const [fontLoaded, setFontLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [entered, setEntered] = useState(false);
    const [showText, setShowText] = useState(false);
    const [hasBeenShown, setHasBeenShown] = useState(false);
    const active = props.playMode === "enter" ? entered : isHovered;
    const d = Math.max(1, Math.min(10, Math.round(props.density)));
    const transformedDensity = DENSITY_MAP[d - 1];
    const trDuration =
        typeof props.transition?.duration === "number"
            ? props.transition.duration
            : 1;
    const derivedSpeed = Math.min(
        3,
        Math.max(0.1, 0.5 / Math.max(0.1, trDuration))
    );
    const easeFn = useMemo(
        () => easeToFn(props.transition?.ease),
        [props.transition]
    );
    const color = useMemo(() => parseFramerColor(props.color), [props.color]);
    const isInView = useInView(wrapperRef);
    const { wrapperSize, setWrapperSize } = useWrapperSize();
    const globalDpr = useMemo(() => {
        if (typeof window !== "undefined")
            return window.devicePixelRatio * 1.5 || 1;
        return 1;
    }, []);
    const tranformedCanvasY = useMemo(() => {
        return transformValue(
            parseInt(props.font.fontSize?.replace("px", "") || "50"),
            [0, 100],
            [0, 5],
            true
        );
    }, [props.font.fontSize]);
    const transformedY = tranformedCanvasY;

    useEffect(() => {
        if (!props.font.fontFamily) return;
        const loadFont = async () => {
            await waitForFont(props.font.fontFamily);
            setFontLoaded(true);
        };
        loadFont();
    }, [props.font.fontFamily]);

    useEffect(() => {
        if (!isInView) return;
        if (!fontLoaded) return;
        renderCanvas({
            canvasRef,
            wrapperRef,
            globalDpr,
            props,
            wrapperSize,
            particlesRef,
            transformedDensity,
            color,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fontLoaded, isInView, wrapperSize, color]);

    useEffect(() => {
        if (!isInView) return;
        const animate = (currentTime: number) => {
            const deltaTime = (currentTime - lastTimeRef.current) / 1e3;
            lastTimeRef.current = currentTime;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx || !particlesRef.current.length) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const target = active ? 1 : 0;
            const rate = deltaTime / Math.max(0.05, trDuration);
            const cur = formProgressRef.current;
            formProgressRef.current =
                cur < target
                    ? Math.min(target, cur + rate)
                    : Math.max(target, cur - rate);
            const p = easeFn(formProgressRef.current);
            updateParticles(
                particlesRef.current,
                deltaTime,
                p,
                showText,
                setShowText,
                props.noise,
                derivedSpeed
            );
            renderParticles(ctx, particlesRef.current, globalDpr);
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInView, props.noise, derivedSpeed, trDuration, easeFn, globalDpr, active]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        setHasBeenShown(true);
    }, []);
    const handleMouseLeave = useCallback(() => {
        if (props.resetOnMouseLeave || !hasBeenShown) {
            setIsHovered(false);
        }
    }, [props.resetOnMouseLeave, hasBeenShown]);

    useEffect(() => {
        if (props.playMode !== "enter") return;
        const el = wrapperRef.current;
        if (!el) return;
        setEntered(false);
        let has = false;
        const threshold =
            props.startAlign === "top"
                ? 0
                : props.startAlign === "center"
                  ? 0.5
                  : 1;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (!has) {
                        has = true;
                        setEntered(true);
                        if (!props.replay) io.disconnect();
                    }
                } else if (props.replay) {
                    has = false;
                    setEntered(false);
                }
            },
            { threshold }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [props.playMode, props.startAlign, props.replay]);

    useEffect(() => {
        if (props.playMode !== "enter" || active || isInView) return;
        formProgressRef.current = 0;
        setShowText(false);
    }, [active, props.playMode, isInView]);

    useEffect(() => {
        renderCanvas({
            canvasRef,
            wrapperRef,
            globalDpr,
            props,
            wrapperSize,
            particlesRef,
            transformedDensity,
            color,
        });
        const currentFont = props.font.fontFamily || "sans-serif";
        return handleFontChange({
            currentFont,
            lastFontRef,
            props,
            canvasRef,
            wrapperRef,
            globalDpr,
            wrapperSize,
            particlesRef,
            transformedDensity,
            color,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props, wrapperSize]);

    useResizeObserver({
        wrapperRef,
        wrapperSize,
        setWrapperSize,
        props,
        canvasRef,
        globalDpr,
        particlesRef,
        transformedDensity,
        color,
    });

    return (
        <div
            ref={wrapperRef}
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {renderAnimatedTag(props, color, showText)}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    transform: `translateY(${transformedY}px)`,
                }}
            />
        </div>
    );
}

function handleFontChange({
    currentFont,
    lastFontRef,
    props,
    canvasRef,
    wrapperRef,
    globalDpr,
    wrapperSize,
    particlesRef,
    transformedDensity,
    color,
}: any) {
    if (currentFont !== lastFontRef.current) {
        lastFontRef.current = currentFont;
    }
    return () => {
        cleanup({ canvasRef, particlesRef });
    };
}
