"use client";

import { useEffect, useRef } from "react";

type GapKind = "custom" | "line" | "seam";

type Glyph = {
    character: string;
    longitude: number;
    opacityVariation: number;
    polarAngle: number;
};

type GeometrySettings = {
    fontFamily: string;
    fontSize: number;
    fontWeight: number | string;
    letterSpacing: number;
    word: string;
};

const VIEWBOX_SIZE = 720;
const SILHOUETTE_RADIUS = 286;
const FULL_ROTATION = Math.PI * 2;
const MAX_GLYPHS = 6000;

const CAMERA_DISTANCE = 6.1;
const EQUATOR_BULGE = 0.28;
const SPARSE_SPACING_RATIO = 1.92;

const LINE_GAP_WEIGHT = 4;
const CUSTOM_GAP_WEIGHT = 19;
const SEAM_GAP_WEIGHT = 13;

const DENSE_FACE_GAPS: GapKind[] = [
    "line",
    "line",
    "line",
    "custom",
    "line",
    "line",
    "line",
    "line",
    "line",
    "line",
    "line",
    "line",
    "custom",
    "line",
    "line",
    "line",
];

const SPARSE_FACE_GAPS: GapKind[] = [
    "line",
    "custom",
    "line",
    "line",
    "line",
    "custom",
    "line",
    "line",
];

const BAND_GAPS: GapKind[] = [
    ...DENSE_FACE_GAPS,
    "seam",
    ...SPARSE_FACE_GAPS,
    "seam",
];

const DENSE_BAND_COUNT = DENSE_FACE_GAPS.length + 1;

const SPHERE_RADIUS =
    SILHOUETTE_RADIUS /
    (CAMERA_DISTANCE / Math.sqrt(CAMERA_DISTANCE * CAMERA_DISTANCE - 1));

const BAND_LONGITUDES = (() => {
    const intervalWeights = BAND_GAPS.map((gapKind) => {
        if (gapKind === "custom") return CUSTOM_GAP_WEIGHT;
        if (gapKind === "seam") return SEAM_GAP_WEIGHT;
        return LINE_GAP_WEIGHT;
    });
    const totalWeight = intervalWeights.reduce(
        (total, intervalWeight) => total + intervalWeight,
        0
    );

    let travelledWeight = 0;

    return BAND_GAPS.map((_, bandIndex) => {
        if (bandIndex > 0) {
            travelledWeight += intervalWeights[bandIndex - 1] ?? 0;
        }
        return (travelledWeight / totalWeight) * FULL_ROTATION;
    });
})();

const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(Math.max(value, minimum), maximum);

const getDeterministicVariation = (index: number, salt: number) => {
    const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
};

const wrapLongitude = (longitude: number) =>
    ((longitude % FULL_ROTATION) + FULL_ROTATION) % FULL_ROTATION;

const walkBand = (
    startLongitude: number,
    startPolarAngle: number,
    spacing: number,
    twist: number,
    settings: GeometrySettings,
    characters: string[],
    characterWidths: number[],
    startCharacterIndex: number,
    variationSeed: number,
    output: Glyph[]
) => {
    let polarAngle = startPolarAngle;
    let characterIndex = startCharacterIndex;

    while (polarAngle < Math.PI && output.length < MAX_GLYPHS) {
        const slot = characterIndex % characters.length;
        const character = characters[slot] ?? "d";

        const advancePixels = Math.max(
            characterWidths[slot] * spacing,
            settings.fontSize * 0.25
        );
        const advanceRadians = advancePixels / SPHERE_RADIUS;

        if (character.trim().length > 0) {
            output.push({
                character,
                longitude: wrapLongitude(
                    startLongitude +
                        twist * polarAngle +
                        EQUATOR_BULGE * Math.sin(polarAngle)
                ),
                opacityVariation:
                    0.82 +
                    getDeterministicVariation(output.length, variationSeed) *
                        0.18,
                polarAngle,
            });
        }

        const arcStretch = Math.sqrt(
            1 + twist * twist * Math.sin(polarAngle) * Math.sin(polarAngle)
        );
        polarAngle += advanceRadians / arcStretch;
        characterIndex += 1;
    }

    return characterIndex;
};

const buildGeometry = (
    context: CanvasRenderingContext2D,
    settings: GeometrySettings,
    twist: number
): Glyph[] => {
    const characters = Array.from(settings.word || "dream");
    const previousFont = context.font;
    context.font = `${settings.fontWeight} ${settings.fontSize}px ${settings.fontFamily}`;
    const characterWidths = characters.map(
        (character) => context.measureText(character).width
    );
    context.font = previousFont;

    const glyphs: Glyph[] = [];
    let characterIndex = 0;

    const averageWidth =
        characterWidths.reduce((total, width) => total + width, 0) /
        Math.max(characterWidths.length, 1);
    const poleStagger = (averageWidth * settings.letterSpacing) / SPHERE_RADIUS;

    BAND_LONGITUDES.forEach((startLongitude, bandIndex) => {
        const spacing =
            bandIndex < DENSE_BAND_COUNT
                ? settings.letterSpacing
                : settings.letterSpacing * SPARSE_SPACING_RATIO;

        characterIndex = walkBand(
            startLongitude,
            (bandIndex / BAND_LONGITUDES.length) * poleStagger,
            spacing,
            twist,
            settings,
            characters,
            characterWidths,
            characterIndex,
            bandIndex,
            glyphs
        );
    });

    return glyphs;
};

type FontSetting = {
    fontFamily?: string;
    variant?: string;
    fontWeight?: number | string;
    fontSize?: number | string;
    lineHeight?: string | number;
    letterSpacing?: string | number;
    textAlign?: string;
};

type TextSphereProps = {
    word?: string;
    color?: string;
    font?: FontSetting;
    speed?: number;
    rotationSide?: "clockwise" | "counterclockwise";
    twist?: number;
    letterSpacing?: number;
    style?: React.CSSProperties;
};

function __BaseImpl_TextSphere({
    word = "origin kit",
    color = "#ffffff",
    font = {
        fontFamily: "Inter",
        variant: "Regular",
        fontWeight: 500,
        fontSize: 15,
        lineHeight: "1.5em",
        letterSpacing: "0em",
        textAlign: "left",
    },
    speed = 7,
    rotationSide = "counterclockwise",
    twist = 50,
    letterSpacing = 800,
    style,
}: TextSphereProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const scheduleFrameRef = useRef<(() => void) | null>(null);

    const propsRef = useRef({
        word,
        color,
        font,
        speed,
        rotationSide,
        twist,
        letterSpacing,
    });
    propsRef.current = {
        word,
        color,
        font,
        speed,
        rotationSide,
        twist,
        letterSpacing,
    };

    useEffect(() => {
        scheduleFrameRef.current?.();
    }, [word, color, font, speed, rotationSide, twist, letterSpacing]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const reducedMotionQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        let canvasHeight = 0;
        let canvasWidth = 0;
        let disposed = false;
        let frameScheduled = false;
        let geometry: Glyph[] = [];
        let geometrySignature = "";
        let isVisible = true;
        let previousTimestamp: number | null = null;
        let rotationElapsed = 0;

        const ensureGeometry = () => {
            const currentProps = propsRef.current;

            const rawFontSize = currentProps.font?.fontSize;
            const fontSizeNum =
                typeof rawFontSize === "number"
                    ? rawFontSize
                    : typeof rawFontSize === "string"
                      ? parseInt(rawFontSize, 10) || 15
                      : 15;

            const settings: GeometrySettings = {
                fontFamily:
                    currentProps.font?.fontFamily || "Inter, sans-serif",
                fontSize: Math.max(fontSizeNum, 4),
                fontWeight: currentProps.font?.fontWeight || 500,
                letterSpacing: Math.max(currentProps.letterSpacing, 40) / 100,
                word: currentProps.word,
            };
            const twistValue = currentProps.twist / 10;
            const signature = JSON.stringify([settings, twistValue]);
            if (signature === geometrySignature) return;
            geometrySignature = signature;
            geometry = buildGeometry(context, settings, twistValue);
        };

        const renderFrame = (timestamp: number) => {
            frameScheduled = false;
            if (
                disposed ||
                !isVisible ||
                canvasWidth === 0 ||
                canvasHeight === 0
            ) {
                return;
            }

            if (previousTimestamp !== null && !reducedMotionQuery.matches) {
                rotationElapsed += timestamp - previousTimestamp;
            }
            previousTimestamp = timestamp;

            const currentProps = propsRef.current;
            ensureGeometry();

            const safeDuration = (60 / Math.max(currentProps.speed, 0.1)) * 1000;
            const sideMultiplier =
                currentProps.rotationSide === "counterclockwise" ? -1 : 1;
            const angle = reducedMotionQuery.matches
                ? 0
                : (rotationElapsed / safeDuration) *
                  FULL_ROTATION *
                  sideMultiplier;

            const cosSpin = Math.cos(angle);
            const sinSpin = Math.sin(angle);

            const projected = geometry.map((glyph) => {
                const ringRadius = Math.sin(glyph.polarAngle);
                const modelX = ringRadius * Math.cos(glyph.longitude);
                const modelY = Math.cos(glyph.polarAngle);
                const modelZ = ringRadius * Math.sin(glyph.longitude);

                const spunX = modelX * cosSpin + modelZ * sinSpin;
                const spunZ = -modelX * sinSpin + modelZ * cosSpin;

                const perspective = CAMERA_DISTANCE / (CAMERA_DISTANCE - spunZ);

                return {
                    character: glyph.character,
                    depth: (spunZ + 1) / 2,
                    opacityVariation: glyph.opacityVariation,
                    scale: perspective,
                    x: VIEWBOX_SIZE / 2 + spunX * SPHERE_RADIUS * perspective,
                    y: VIEWBOX_SIZE / 2 - modelY * SPHERE_RADIUS * perspective,
                };
            });

            projected.sort(
                (firstGlyph, secondGlyph) =>
                    firstGlyph.depth - secondGlyph.depth
            );

            const logicalScale =
                Math.min(canvasWidth, canvasHeight) / VIEWBOX_SIZE;
            const horizontalOffset =
                (canvasWidth - VIEWBOX_SIZE * logicalScale) / 2;
            const verticalOffset =
                (canvasHeight - VIEWBOX_SIZE * logicalScale) / 2;

            context.clearRect(0, 0, canvasWidth, canvasHeight);
            context.fillStyle = currentProps.color;
            context.textAlign = "center";
            context.textBaseline = "middle";

            const fontFamily =
                currentProps.font?.fontFamily || "Inter, sans-serif";
            const fontWeight = currentProps.font?.fontWeight || 500;

            const rawFontSize = currentProps.font?.fontSize;
            const baseFontSize =
                typeof rawFontSize === "number"
                    ? rawFontSize
                    : typeof rawFontSize === "string"
                      ? parseInt(rawFontSize, 10) || 15
                      : 15;

            let activeFont = "";

            projected.forEach((glyph) => {
                const rawGlyphSize = baseFontSize * glyph.scale * logicalScale;
                const fontSize = Math.max(1, Math.round(rawGlyphSize * 2) / 2);
                const opacity = clamp(
                    (0.12 + Math.pow(glyph.depth, 1.35) * 0.88) *
                        glyph.opacityVariation,
                    0.04,
                    1
                );

                context.globalAlpha = opacity;
                const nextFont = `${fontWeight} ${fontSize.toFixed(1)}px ${fontFamily}`;
                if (nextFont !== activeFont) {
                    activeFont = nextFont;
                    context.font = nextFont;
                }

                context.fillText(
                    glyph.character,
                    horizontalOffset + glyph.x * logicalScale,
                    verticalOffset + glyph.y * logicalScale
                );
            });

            context.globalAlpha = 1;

            if (reducedMotionQuery.matches || disposed || !isVisible) return;
            frameScheduled = true;
            animationFrameRef.current =
                window.requestAnimationFrame(renderFrame);
        };

        const scheduleFrame = () => {
            if (disposed || frameScheduled || !isVisible) return;
            frameScheduled = true;
            animationFrameRef.current =
                window.requestAnimationFrame(renderFrame);
        };
        scheduleFrameRef.current = scheduleFrame;

        const syncCanvasSize = () => {
            const bounds = canvas.getBoundingClientRect();
            const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);

            canvasWidth = bounds.width || canvas.clientWidth || 300;
            canvasHeight = bounds.height || canvas.clientHeight || 300;

            const pixelWidth = Math.round(canvasWidth * pixelRatio);
            const pixelHeight = Math.round(canvasHeight * pixelRatio);

            if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                canvas.width = pixelWidth;
                canvas.height = pixelHeight;
            }

            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            scheduleFrame();
        };

        const handleReducedMotionChange = () => {
            previousTimestamp = null;
            scheduleFrame();
        };

        const resizeObserver = new ResizeObserver(syncCanvasSize);
        const intersectionObserver = new IntersectionObserver(
            ([entry]) => {
                const nextVisibility = entry?.isIntersecting ?? true;
                if (nextVisibility === isVisible) return;

                isVisible = nextVisibility;
                previousTimestamp = null;

                if (!isVisible && animationFrameRef.current !== null) {
                    window.cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                    frameScheduled = false;
                    return;
                }
                scheduleFrame();
            },
            { rootMargin: "100px" }
        );

        resizeObserver.observe(canvas);
        intersectionObserver.observe(canvas);
        reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
        syncCanvasSize();

        void document.fonts.ready.then(() => {
            if (disposed) return;
            geometrySignature = "";
            scheduleFrame();
        });

        return () => {
            disposed = true;
            scheduleFrameRef.current = null;
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            reducedMotionQuery.removeEventListener(
                "change",
                handleReducedMotionChange
            );

            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = null;
        };
    }, []);

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                ...style,
            }}
        >
            <canvas
                aria-label={`A rotating sphere made from repetitions of the phrase ${word}`}
                style={{ width: "100%", height: "100%", display: "block" }}
                ref={canvasRef}
                role="img"
            >
                A rotating text sphere made from repetitions of the phrase{" "}
                {word}.
            </canvas>
        </div>
    );
}

const __presetProps = {
  "font": {
    "variant": "Bold",
    "fontSize": 15,
    "textAlign": "left",
    "fontFamily": "Roboto",
    "fontWeight": 700,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "word": "Lander Studio",
  "color": "#FFE300",
  "speed": 7,
  "twist": 50,
  "rotationSide": "clockwise",
  "letterSpacing": 50
};

export default function TextSphere(props: Record<string, unknown>) {
  return <__BaseImpl_TextSphere {...(__presetProps as Record<string, unknown>)} {...props} />;
}
