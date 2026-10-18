"use client";

import {
    useState,
    useCallback,
    useMemo,
    useRef,
    useEffect,
    startTransition,
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
} from "react";

interface RippleGridProps {
    radius?: number;
    elementSize?: number;
    gap?: number;
    borderColor?: string;
    image?: { src: string };
    animation?: "default" | "enter";
    startAlign?: "top" | "center" | "bottom";
    replay?: boolean;
    rippleColor?: string[];
    rippleShape?: string;
    style?: CSSProperties;
}

const RIPPLE_SCALE = 1;

interface GridElement {
    id: string;
    row: number;
    col: number;
    x: number;
    y: number;
}

interface RippleData {
    delay: number;
    colorIndex: number;
    progress: number;
    scale: number;
}

const extractRGBColorFromString = (str: string): string => {
    const rgbRegex = /(rgba|rgb)\(.*?\)/g;
    const match = str.match(rgbRegex);
    return match ? match[0] : str;
};

function __BaseImpl_RippleGrid(props: RippleGridProps) {
    const {
        radius = 100,
        elementSize = 4,
        gap = 10,
        borderColor = "#FFFFFF",
        image = {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/08f4d1ae-43ca-4879-80f4-c1e7969eef00/w=800",
        },
        animation = "default",
        startAlign = "top",
        replay = true,
        rippleColor = ["#FFFFFF", "#FED34D", "#78371F", "#D78B4E"],
        rippleShape = "lightning",
        style,
    } = props;
    const [rippleElements, setRippleElements] = useState<
        Map<string, RippleData>
    >(new Map());
    const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
    const [isRipplePlaying, setIsRipplePlaying] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const revealedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const width =
                    style?.width === "100%"
                        ? containerRef.current.offsetWidth
                        : parseFloat(String(style?.width ?? "")) || rect.width;
                const height =
                    style?.height === "100%"
                        ? containerRef.current.offsetHeight
                        : parseFloat(String(style?.height ?? "")) ||
                          rect.height;
                setDimensions({ width, height });
            }
        };
        updateDimensions();
        if (typeof window !== "undefined") {
            const resizeObserver = new ResizeObserver(updateDimensions);
            if (containerRef.current) {
                resizeObserver.observe(containerRef.current);
            }
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [style?.width, style?.height]);

    const { columns, rows, elements } = useMemo(() => {
        const containerWidth = dimensions.width;
        const containerHeight = dimensions.height;
        const columns = Math.max(
            1,
            Math.floor((containerWidth + gap) / (elementSize + gap))
        );
        const rows = Math.max(
            1,
            Math.floor((containerHeight + gap) / (elementSize + gap))
        );
        const totalGridWidth = columns * elementSize + (columns - 1) * gap;
        const totalGridHeight = rows * elementSize + (rows - 1) * gap;
        const offsetX = (containerWidth - totalGridWidth) / 2;
        const offsetY = (containerHeight - totalGridHeight) / 2;
        const elements: GridElement[] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                elements.push({
                    id: `${row}-${col}`,
                    row,
                    col,
                    x: offsetX + col * (elementSize + gap),
                    y: offsetY + row * (elementSize + gap),
                });
            }
        }
        return { columns, rows, elements };
    }, [dimensions.width, dimensions.height, elementSize, gap]);

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = imgRef.current;
        const cW = dimensions.width;
        const cH = dimensions.height;
        let dispW = cW;
        let dispH = cH;
        if (img) {
            const nW = img.naturalWidth || 1;
            const nH = img.naturalHeight || 1;
            const imgAspect = nW / nH;
            const contAspect = cW / (cH || 1);
            if (imgAspect > contAspect) {
                dispH = cH;
                dispW = cH * imgAspect;
            } else {
                dispW = cW;
                dispH = cW / imgAspect;
            }
        }
        const imgX0 = (cW - dispW) / 2;
        const imgY0 = (cH - dispH) / 2;
        elements.forEach((element) => {
            const rippleData = rippleElements.get(element.id);
            const isActive = rippleData !== undefined;
            const currentScale = isActive ? rippleData!.scale : 1;
            const currentSize = elementSize * currentScale;
            const currentX = element.x + (elementSize - currentSize) / 2;
            const currentY = element.y + (elementSize - currentSize) / 2;
            const isRevealed = revealedRef.current.has(element.id);
            const centerX = element.x + elementSize / 2;
            const centerY = element.y + elementSize / 2;
            const inImage =
                !!img &&
                centerX >= imgX0 &&
                centerX <= imgX0 + dispW &&
                centerY >= imgY0 &&
                centerY <= imgY0 + dispH;

            if (isActive) {
                const currentColor =
                    rippleColor[rippleData!.colorIndex] || rippleColor[0];
                ctx.fillStyle = extractRGBColorFromString(currentColor);
                ctx.beginPath();
                ctx.roundRect(
                    currentX,
                    currentY,
                    currentSize,
                    currentSize,
                    radius
                );
                ctx.fill();
            } else if (isRevealed && inImage && img) {
                const nW = img.naturalWidth || 1;
                const nH = img.naturalHeight || 1;
                const tileX = element.x - gap / 2;
                const tileY = element.y - gap / 2;
                const tileW = elementSize + gap;
                const tileH = elementSize + gap;
                const sx = ((tileX - imgX0) / dispW) * nW;
                const sy = ((tileY - imgY0) / dispH) * nH;
                const sw = (tileW / dispW) * nW;
                const sh = (tileH / dispH) * nH;
                try {
                    ctx.drawImage(
                        img,
                        sx,
                        sy,
                        sw,
                        sh,
                        tileX,
                        tileY,
                        tileW,
                        tileH
                    );
                } catch {
                    // ignore draw errors (e.g. image not decodable yet)
                }
            } else {
                ctx.strokeStyle = extractRGBColorFromString(borderColor);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(
                    currentX,
                    currentY,
                    currentSize,
                    currentSize,
                    radius
                );
                ctx.stroke();
            }
        });
    }, [
        elements,
        rippleElements,
        elementSize,
        gap,
        radius,
        borderColor,
        rippleColor,
        dimensions,
    ]);

    useEffect(() => {
        const animate = () => {
            renderCanvas();
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [renderCanvas]);

    const calculateRippleDelay = useCallback(
        (
            element: GridElement,
            closestElement: GridElement,
            columns: number,
            rows: number,
            shape: string
        ) => {
            const dx = element.col - closestElement.col;
            const dy = element.row - closestElement.row;
            let distance = 0;
            switch (shape) {
                case "circle":
                    distance = Math.sqrt(dx * dx + dy * dy);
                    break;
                case "star": {
                    const angle = Math.atan2(dy, dx);
                    const normalizedAngle =
                        ((angle + Math.PI) / (2 * Math.PI)) * 10;
                    const rayIndex = Math.floor(normalizedAngle);
                    const rayOffset = normalizedAngle - rayIndex;
                    const isMainRay = rayIndex % 2 === 0;
                    const isSubRay = Math.abs(rayOffset - 0.5) < 0.2;
                    const baseDistance = Math.sqrt(dx * dx + dy * dy);
                    if (isMainRay) {
                        distance = baseDistance * 0.8;
                    } else if (isSubRay) {
                        distance = baseDistance * 2.5;
                    } else {
                        distance = baseDistance * 4;
                    }
                    distance *= 0.8 + Math.random() * 0.4;
                    break;
                }
                case "radialLines": {
                    const radialDistance = Math.sqrt(dx * dx + dy * dy);
                    const radialAngle = Math.atan2(dy, dx);
                    const normalizedRadialAngle =
                        ((radialAngle + Math.PI) / (2 * Math.PI)) * 8;
                    const lineIndex = Math.round(normalizedRadialAngle) % 8;
                    const isOnLine =
                        Math.abs(normalizedRadialAngle - lineIndex) < 0.3;
                    distance = isOnLine ? radialDistance : radialDistance * 3;
                    break;
                }
                case "diamond":
                    distance = Math.abs(dx) + Math.abs(dy);
                    break;
                case "cross":
                    distance =
                        dx === 0 || dy === 0
                            ? Math.max(Math.abs(dx), Math.abs(dy))
                            : Math.max(Math.abs(dx), Math.abs(dy)) * 3;
                    break;
                case "wave": {
                    const waveDistance = Math.sqrt(dx * dx + dy * dy);
                    const waveModifier = Math.sin((dx + dy) * 0.5) * 0.5 + 1;
                    distance = waveDistance * waveModifier;
                    break;
                }
                case "lightning": {
                    const lightningDistance = Math.sqrt(dx * dx + dy * dy);
                    const zigzag = Math.sin(lightningDistance * 2) * 0.5 + 1;
                    distance = lightningDistance * zigzag;
                    break;
                }
                default:
                    distance = Math.sqrt(dx * dx + dy * dy);
            }
            const maxDistance = Math.max(columns, rows);
            return (distance / maxDistance) * 500;
        },
        []
    );

    const animateElement = useCallback(
        (elementId: string, colorIndex: number, delay: number) => {
            const startTime = Date.now() + delay;
            const duration = 300;
            const animate = () => {
                const now = Date.now();
                const elapsed = now - startTime;
                if (elapsed < 0) {
                    requestAnimationFrame(animate);
                    return;
                }
                if (elapsed >= duration) {
                    revealedRef.current.add(elementId);
                    startTransition(() => {
                        setRippleElements((prev) => {
                            const next = new Map(prev);
                            next.delete(elementId);
                            return next;
                        });
                    });
                    return;
                }
                const progress = elapsed / duration;
                let scale;
                if (progress < 0.5) {
                    scale = 1 + (RIPPLE_SCALE - 1) * (progress * 2);
                } else {
                    scale =
                        RIPPLE_SCALE -
                        (RIPPLE_SCALE - 1) * ((progress - 0.5) * 2);
                }
                startTransition(() => {
                    setRippleElements((prev) => {
                        const next = new Map(prev);
                        next.set(elementId, {
                            delay,
                            colorIndex,
                            progress,
                            scale,
                        });
                        return next;
                    });
                });
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        },
        []
    );

    const triggerRippleFromCenter = useCallback(() => {
        revealedRef.current = new Set();
        const centerCol = Math.floor(columns / 2);
        const centerRow = Math.floor(rows / 2);
        const closestElement = elements.find(
            (el) => el.col === centerCol && el.row === centerRow
        );
        if (!closestElement) return;
        setIsRipplePlaying(true);
        elements.forEach((element) => {
            const delay = calculateRippleDelay(
                element,
                closestElement,
                columns,
                rows,
                rippleShape
            );
            const dx = element.col - closestElement.col;
            const dy = element.row - closestElement.row;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let colorIndex;
            if (distance === 0) {
                colorIndex = 0;
            } else {
                const maxDistance = Math.max(columns, rows) * 0.5;
                const normalizedDistance = Math.min(distance / maxDistance, 1);
                colorIndex = Math.round(
                    normalizedDistance * (rippleColor.length - 1)
                );
            }
            animateElement(element.id, colorIndex, delay);
        });
        const maxDelay = Math.max(
            ...elements.map((element) =>
                calculateRippleDelay(
                    element,
                    closestElement,
                    columns,
                    rows,
                    rippleShape
                )
            )
        );
        setTimeout(() => {
            setIsRipplePlaying(false);
        }, maxDelay + 300);
    }, [
        elements,
        columns,
        rows,
        calculateRippleDelay,
        rippleShape,
        rippleColor,
        animateElement,
    ]);

    const elementsRef = useRef(elements);
    elementsRef.current = elements;
    const triggerRef = useRef(triggerRippleFromCenter);
    triggerRef.current = triggerRippleFromCenter;

    const [imageReady, setImageReady] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const src = image?.src;
        revealedRef.current = new Set();
        setImageReady(false);
        setHasAnimated(false);
        if (!src) {
            imgRef.current = null;
            return;
        }
        let cancelled = false;
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.src = src;
        im.onload = () => {
            if (cancelled) return;
            imgRef.current = im;
            setImageReady(true);
        };
        return () => {
            cancelled = true;
            im.onload = null;
        };
    }, [image?.src]);

    useEffect(() => {
        if (animation !== "enter" || !containerRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        if (replay || !hasAnimated) setHasAnimated(true);
                    } else if (replay) {
                        setIsInView(false);
                        revealedRef.current = new Set();
                    }
                });
            },
            {
                threshold:
                    startAlign === "top"
                        ? 0
                        : startAlign === "center"
                          ? 0.5
                          : 1,
            }
        );
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [animation, startAlign, replay, hasAnimated]);

    useEffect(() => {
        if (!imageReady) return;
        const shouldPlay =
            animation === "default"
                ? true
                : isInView && (replay || !hasAnimated);
        if (shouldPlay) triggerRef.current();
    }, [imageReady, animation, isInView, replay, hasAnimated, elements]);

    const runRippleFrom = useCallback(
        (clickX: number, clickY: number) => {
            let closestElement: GridElement | null = null;
            let minDistance = Infinity;
            elements.forEach((element) => {
                const centerX = element.x + elementSize / 2;
                const centerY = element.y + elementSize / 2;
                const distance = Math.sqrt(
                    Math.pow(clickX - centerX, 2) +
                        Math.pow(clickY - centerY, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestElement = element;
                }
            });
            if (!closestElement) return;
            const origin: GridElement = closestElement;
            setIsRipplePlaying(true);
            elements.forEach((element) => {
                const delay = calculateRippleDelay(
                    element,
                    origin,
                    columns,
                    rows,
                    rippleShape
                );
                const dx = element.col - origin.col;
                const dy = element.row - origin.row;
                const distance = Math.sqrt(dx * dx + dy * dy);
                let colorIndex;
                if (distance === 0) {
                    colorIndex = 0;
                } else {
                    const maxDistance = Math.max(columns, rows) * 0.5;
                    const normalizedDistance = Math.min(
                        distance / maxDistance,
                        1
                    );
                    colorIndex = Math.round(
                        normalizedDistance * (rippleColor.length - 1)
                    );
                }
                animateElement(element.id, colorIndex, delay);
            });
            const maxDelay = Math.max(
                ...elements.map((element) =>
                    calculateRippleDelay(
                        element,
                        origin,
                        columns,
                        rows,
                        rippleShape
                    )
                )
            );
            setTimeout(() => {
                setIsRipplePlaying(false);
            }, maxDelay + 300);
        },
        [
            elements,
            columns,
            rows,
            elementSize,
            calculateRippleDelay,
            rippleShape,
            rippleColor,
            animateElement,
        ]
    );

    const handleClick = useCallback(
        (event: ReactMouseEvent<HTMLCanvasElement>) => {
            if (isRipplePlaying) return;
            const rect = event.currentTarget.getBoundingClientRect();
            runRippleFrom(event.clientX - rect.left, event.clientY - rect.top);
        },
        [isRipplePlaying, runRippleFrom]
    );

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleGlobalClick = (event: MouseEvent) => {
            if (isRipplePlaying) return;
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            if (
                clickX >= 0 &&
                clickX <= rect.width &&
                clickY >= 0 &&
                clickY <= rect.height
            ) {
                runRippleFrom(clickX, clickY);
            }
        };
        document.addEventListener("click", handleGlobalClick);
        return () => {
            document.removeEventListener("click", handleGlobalClick);
        };
    }, [isRipplePlaying, runRippleFrom]);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                cursor: "default",
                pointerEvents: "none",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block" }}
                onClick={handleClick}
            />
        </div>
    );
}

const __presetProps = {
  "gap": 10,
  "image": {
    "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/08f4d1ae-43ca-4879-80f4-c1e7969eef00/w=800"
  },
  "radius": 100,
  "replay": true,
  "animation": "default",
  "startAlign": "top",
  "transition": {
    "ease": "easeOut",
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.8,
    "stiffness": 800
  },
  "borderColor": "#FFFFFF",
  "elementSize": 4,
  "rippleColor": [
    "#FFFFFF",
    "#FED34D",
    "#78371F",
    "#D78B4E"
  ],
  "rippleShape": "lightning"
};

export default function RippleGrid(props: Record<string, unknown>) {
  return <__BaseImpl_RippleGrid {...(__presetProps as Record<string, unknown>)} {...props} />;
}
