"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

type FontStyle = React.CSSProperties & {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number | string;
    letterSpacing?: number | string;
};

type FuzzyCanvas = HTMLCanvasElement & {
    cleanupFuzzyText?: () => void;
};

type Props = {
    text?: string;
    font?: FontStyle;
    color?: string;

    enableHover?: boolean;
    baseIntensity?: number;
    hoverIntensity?: number;
    clickIntensity?: number;
    fuzzRange?: number;
    fps?: number;

    clickEffect?: boolean;
    glitchMode?: boolean;
    glitchInterval?: number;
    glitchDuration?: number;

    useGradient?: boolean;
    gradientEnd?: string;
};

const parseFontSize = (fontSize: FontStyle["fontSize"]): string => {
    if (typeof fontSize === "number") return `${fontSize}px`;
    if (typeof fontSize === "string" && fontSize.length > 0) return fontSize;
    return "120px";
};

const parseLetterSpacing = (
    letterSpacing: FontStyle["letterSpacing"]
): number => {
    if (typeof letterSpacing === "number") return letterSpacing;
    if (typeof letterSpacing === "string") {
        const parsed = Number.parseFloat(letterSpacing);
        if (!Number.isNaN(parsed)) {
            if (letterSpacing.endsWith("em")) return parsed * 16;
            return parsed;
        }
    }
    return 0;
};

const parseFontWeight = (fontWeight: FontStyle["fontWeight"]): number => {
    if (typeof fontWeight === "number") return fontWeight;
    if (typeof fontWeight === "string") {
        const parsed = Number.parseInt(fontWeight, 10);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return 600;
};

function __BaseImpl_FuzzyText({
    text = "Text Noise",
    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 400,
        fontSize: "120px",
        lineHeight: "1.1em",
        letterSpacing: "0em",
        textAlign: "left",
    },
    color = "#ffffff",

    useGradient = false,
    gradientEnd = "#888888",

    baseIntensity = 2,
    hoverIntensity = 5,

    clickEffect = false,
    clickIntensity = 1,

    fuzzRange = 30,
    fps = 60,

    enableHover = true,

    glitchMode = false,
    glitchInterval = 2000,
    glitchDuration = 200,
}: Props) {
    const canvasRef = useRef<FuzzyCanvas>(null);
    const interactionRef = useRef({ hovering: false, clicking: false });
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    );

    const handlePointerEnter = () => {
        if (!enableHover) return;
        interactionRef.current.hovering = true;
    };

    const handlePointerLeave = () => {
        interactionRef.current.hovering = false;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!clickEffect) return;
        e.preventDefault();
        interactionRef.current.clicking = true;
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = setTimeout(() => {
            interactionRef.current.clicking = false;
        }, 400);
    };

    useEffect(() => {
        let animationFrameId = 0;
        let isCancelled = false;
        let glitchTimeoutId: ReturnType<typeof setTimeout> | undefined;
        let glitchEndTimeoutId: ReturnType<typeof setTimeout> | undefined;

        const canvas = canvasRef.current;
        if (!canvas) return;

        interactionRef.current.hovering = false;
        interactionRef.current.clicking = false;

        const init = async () => {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const fontSizeStr = parseFontSize(font.fontSize);
            const fontWeight = parseFontWeight(font.fontWeight);
            const letterSpacing = parseLetterSpacing(font.letterSpacing);
            const computedFontFamily =
                font.fontFamily && font.fontFamily !== "inherit"
                    ? String(font.fontFamily)
                    : window.getComputedStyle(canvas).fontFamily || "sans-serif";

            const fontString = `${fontWeight} ${fontSizeStr} ${computedFontFamily}`;

            try {
                await document.fonts.load(fontString);
            } catch {
                await document.fonts.ready;
            }
            if (isCancelled) return;

            let numericFontSize: number;
            if (typeof font.fontSize === "number") {
                numericFontSize = font.fontSize;
            } else {
                const temp = document.createElement("span");
                temp.style.fontSize = fontSizeStr;
                document.body.appendChild(temp);
                numericFontSize = Number.parseFloat(
                    window.getComputedStyle(temp).fontSize
                );
                document.body.removeChild(temp);
            }

            const offscreen = document.createElement("canvas");
            const offCtx = offscreen.getContext("2d");
            if (!offCtx) return;

            offCtx.font = fontString;
            offCtx.textBaseline = "alphabetic";

            let totalWidth = 0;
            if (letterSpacing !== 0) {
                for (const char of text) {
                    totalWidth += offCtx.measureText(char).width + letterSpacing;
                }
                totalWidth -= letterSpacing;
            } else {
                totalWidth = offCtx.measureText(text).width;
            }

            const metrics = offCtx.measureText(text);
            const actualLeft = metrics.actualBoundingBoxLeft ?? 0;
            const actualRight =
                letterSpacing !== 0
                    ? totalWidth
                    : (metrics.actualBoundingBoxRight ?? metrics.width);
            const actualAscent =
                metrics.actualBoundingBoxAscent ?? numericFontSize;
            const actualDescent =
                metrics.actualBoundingBoxDescent ?? numericFontSize * 0.2;

            const textBoundingWidth = Math.ceil(
                letterSpacing !== 0 ? totalWidth : actualLeft + actualRight
            );
            const tightHeight = Math.ceil(actualAscent + actualDescent);

            const extraWidthBuffer = 10;
            const offscreenWidth = textBoundingWidth + extraWidthBuffer;

            offscreen.width = offscreenWidth;
            offscreen.height = tightHeight;

            const xOffset = extraWidthBuffer / 2;
            offCtx.font = fontString;
            offCtx.textBaseline = "alphabetic";

            if (useGradient) {
                const grad = offCtx.createLinearGradient(
                    0,
                    0,
                    offscreenWidth,
                    0
                );
                grad.addColorStop(0, color);
                grad.addColorStop(1, gradientEnd);
                offCtx.fillStyle = grad;
            } else {
                offCtx.fillStyle = color;
            }

            if (letterSpacing !== 0) {
                let xPos = xOffset;
                for (const char of text) {
                    offCtx.fillText(char, xPos, actualAscent);
                    xPos += offCtx.measureText(char).width + letterSpacing;
                }
            } else {
                offCtx.fillText(text, xOffset - actualLeft, actualAscent);
            }

            const horizontalMargin = fuzzRange + 20;
            const verticalMargin = 0;
            canvas.width = offscreenWidth + horizontalMargin * 2;
            canvas.height = tightHeight + verticalMargin * 2;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.translate(horizontalMargin, verticalMargin);

            let isGlitching = false;
            let lastFrameTime = 0;
            const frameDuration = 1000 / fps;

            const startGlitchLoop = () => {
                if (!glitchMode || isCancelled) return;
                glitchTimeoutId = setTimeout(() => {
                    if (isCancelled) return;
                    isGlitching = true;
                    glitchEndTimeoutId = setTimeout(() => {
                        isGlitching = false;
                        startGlitchLoop();
                    }, glitchDuration);
                }, glitchInterval);
            };

            if (glitchMode) startGlitchLoop();

            const run = (timestamp: number) => {
                if (isCancelled) return;

                if (timestamp - lastFrameTime < frameDuration) {
                    animationFrameId = window.requestAnimationFrame(run);
                    return;
                }
                lastFrameTime = timestamp;

                ctx.clearRect(
                    -fuzzRange - 20,
                    -fuzzRange - 10,
                    offscreenWidth + 2 * (fuzzRange + 20),
                    tightHeight + 2 * (fuzzRange + 10)
                );

                const { hovering, clicking } = interactionRef.current;
                let currentIntensity = baseIntensity / 10;
                if (clicking || isGlitching) {
                    currentIntensity = clicking ? clickIntensity : 1;
                } else if (hovering) {
                    currentIntensity = hoverIntensity / 10;
                }

                for (let j = 0; j < tightHeight; j++) {
                    const dx = Math.floor(
                        currentIntensity * (Math.random() - 0.5) * fuzzRange
                    );
                    ctx.drawImage(
                        offscreen,
                        0,
                        j,
                        offscreenWidth,
                        1,
                        dx,
                        j,
                        offscreenWidth,
                        1
                    );
                }

                animationFrameId = window.requestAnimationFrame(run);
            };

            animationFrameId = window.requestAnimationFrame(run);

            canvas.cleanupFuzzyText = () => {
                window.cancelAnimationFrame(animationFrameId);
                clearTimeout(glitchTimeoutId);
                clearTimeout(glitchEndTimeoutId);
            };
        };

        init();

        return () => {
            isCancelled = true;
            window.cancelAnimationFrame(animationFrameId);
            clearTimeout(glitchTimeoutId);
            clearTimeout(glitchEndTimeoutId);
            clearTimeout(clickTimeoutRef.current);
            canvas.cleanupFuzzyText?.();
        };
    }, [
        text,
        font,
        color,
        enableHover,
        baseIntensity,
        hoverIntensity,
        clickIntensity,
        fuzzRange,
        fps,
        clickEffect,
        glitchMode,
        glitchInterval,
        glitchDuration,
        useGradient,
        gradientEnd,
    ]);

    return (
        <div
            style={{
                width: "100%",
                textAlign:
                    (font.textAlign as React.CSSProperties["textAlign"]) ??
                    "left",
            }}
        >
            <canvas
                ref={canvasRef}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handlePointerDown}
                style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    height: "auto",
                    pointerEvents: "auto",
                    touchAction: "manipulation",
                    cursor: enableHover || clickEffect ? "pointer" : "default",
                    userSelect: "none",
                    verticalAlign: "top",
                }}
            />
        </div>
    );
}

const __presetProps = {
  "fps": 41,
  "font": {
    "variant": "Bold",
    "fontSize": "120px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.1em",
    "letterSpacing": "0em"
  },
  "text": "Text Noise",
  "color": "#0046FF",
  "fuzzRange": 19,
  "glitchMode": true,
  "clickEffect": false,
  "enableHover": true,
  "gradientEnd": "#FFF800",
  "useGradient": true,
  "baseIntensity": 4,
  "clickIntensity": 1,
  "glitchDuration": 350,
  "glitchInterval": 1500,
  "hoverIntensity": 5
};

export default function FuzzyText(props: Record<string, unknown>) {
  return <__BaseImpl_FuzzyText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
