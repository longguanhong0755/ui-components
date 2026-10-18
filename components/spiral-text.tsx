"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useMemo } from "react";
import {
    motion,
    useAnimate,
    stagger as motionStagger,
    type AnimationOptions,
} from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

type ScrollConfig = { position: "top" | "bottom"; distance: number };

type Props = {
    text?: string;
    font?: React.CSSProperties;
    color?: string;
    tag?: string;

    radius?: number;
    startRotation?: number;
    startScale?: number;
    startOpacity?: number;

    stagger?: number;
    transition?: AnimationOptions;
    appearTrigger?: "default" | "hover" | "scroll";
    scrollConfig?: ScrollConfig;
};

function __BaseImpl_SpiralIn({
    text = "Spiral In",
    font = {
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: 120,
        lineHeight: "1.1em",
        letterSpacing: "0em",
        textAlign: "center",
    },
    color = "#FFFFFF",
    tag = "h1",

    radius = 100,
    startRotation = 1,
    startScale = 0,
    startOpacity = 0,

    stagger = 0.04,
    transition = {
        type: "tween",
        duration: 0.8,
        ease: [0.165, 0.84, 0.44, 1],
    } as AnimationOptions,
    appearTrigger = "default",
    scrollConfig = { position: "bottom", distance: 20 },
}: Props) {
    const [scope, animate] = useAnimate();
    const hoverFiredRef = useRef(false);

    const rotationInDegrees = startRotation * 360;

    const chars = useMemo(() => (text ?? "").split(""), [text]);
    const charsConfig = useMemo(() => {
        return chars.map((char, i) => {
            const startX = Math.cos(i) * radius;
            const startY = Math.sin(i) * radius;
            return {
                char,
                startX,
                startY,
            };
        });
    }, [chars, radius]);

    const resetToHidden = useCallback(() => {
        if (!scope.current) return;
        animate(
            ".char",
            {
                x: "var(--start-x)",
                y: "var(--start-y)",
                rotate: rotationInDegrees,
                scale: startScale,
                opacity: startOpacity,
            },
            { duration: 0 }
        );
    }, [animate, rotationInDegrees, startScale, startOpacity, scope]);

    const runAppear = useCallback(() => {
        if (!scope.current) return;

        const animationConfig = {
            ...transition,
            delay: motionStagger(stagger),
        };

        animate(
            ".char",
            { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 },
            animationConfig as any
        );
    }, [animate, transition, stagger, scope]);

    useEffect(() => {
        let rafId: number | null = null;

        resetToHidden();
        hoverFiredRef.current = false;

        if (appearTrigger === "default") {
            const t = setTimeout(runAppear, 50);
            return () => clearTimeout(t);
        }

        if (appearTrigger === "scroll") {
            const el = scope.current;
            if (!el) return;

            const scrollPos = scrollConfig?.position ?? "bottom";
            const scrollDist = Math.max(
                0,
                Math.min(100, scrollConfig?.distance ?? 20)
            );

            const check = () => {
                const vh =
                    window.innerHeight || document.documentElement.clientHeight;
                const rect = el.getBoundingClientRect();
                if (scrollPos === "top")
                    return rect.top <= vh * (scrollDist / 100);
                return rect.bottom <= vh * (1 - scrollDist / 100);
            };

            if (check()) {
                runAppear();
                return;
            }

            let ticking = false;
            const onScroll = () => {
                if (!ticking) {
                    rafId = window.requestAnimationFrame(() => {
                        if (check()) {
                            runAppear();
                            window.removeEventListener("scroll", onScroll, true);
                            window.removeEventListener("resize", onScroll);
                        }
                        ticking = false;
                    });
                    ticking = true;
                }
            };

            window.addEventListener("scroll", onScroll, true);
            window.addEventListener("resize", onScroll);

            return () => {
                window.removeEventListener("scroll", onScroll, true);
                window.removeEventListener("resize", onScroll);
                if (rafId) window.cancelAnimationFrame(rafId);
            };
        }
    }, [
        appearTrigger,
        scrollConfig?.position,
        scrollConfig?.distance,
        runAppear,
        resetToHidden,
        scope,
    ]);

    const fontStyles = (font ?? {}) as React.CSSProperties;
    const align = fontStyles.textAlign || "center";
    const justifyContent =
        align === "center"
            ? "center"
            : align === "right"
              ? "flex-end"
              : "flex-start";

    const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h1";
    const Tag = (motion as any)[safeTag];

    return (
        <div
            ref={scope}
            onMouseEnter={() => {
                if (appearTrigger === "hover" && !hoverFiredRef.current) {
                    hoverFiredRef.current = true;
                    runAppear();
                }
            }}
            style={{
                width: "100%",
                display: "flex",
                justifyContent,
                alignItems: "center",
                overflow: "visible",
            }}
        >
            <Tag
                aria-label={text}
                style={{
                    margin: 0,
                    display: "inline-block",
                    whiteSpace: "pre-wrap",
                    color,
                    ...fontStyles,
                }}
            >
                {charsConfig.map((item, index) => (
                    <motion.span
                        key={index}
                        className="char"
                        aria-hidden="true"
                        style={
                            {
                                display: "inline-block",
                                "--start-x": `${item.startX}px`,
                                "--start-y": `${item.startY}px`,
                                x: "var(--start-x)",
                                y: "var(--start-y)",
                                rotate: rotationInDegrees,
                                scale: startScale,
                                opacity: startOpacity,
                                willChange: "transform, opacity",
                            } as any
                        }
                    >
                        {item.char === " " ? "\u00A0" : item.char}
                    </motion.span>
                ))}
            </Tag>
        </div>
    );
}

const __presetProps = {
  "tag": "h1",
  "font": {
    "variant": "Regular",
    "fontSize": 120,
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.1em",
    "letterSpacing": "-0.04em"
  },
  "text": "SPIRAL TEXT",
  "color": "#FFFFFF",
  "radius": 10,
  "transition": {
    "ease": [
      0.165,
      0.84,
      0.44,
      1
    ],
    "mass": 1,
    "type": "tween",
    "damping": 60,
    "duration": 0.8,
    "stiffness": 800
  },
  "scrollConfig": {
    "distance": 20,
    "position": "bottom"
  },
  "startRotation": 10
};

export default function SpiralIn(props: Record<string, unknown>) {
  return <__BaseImpl_SpiralIn {...(__presetProps as Record<string, unknown>)} {...props} />;
}
