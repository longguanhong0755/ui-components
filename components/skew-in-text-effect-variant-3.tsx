"use client";

import * as React from "react";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimate, type AnimationOptions } from "framer-motion";

type ScrollConfig = { position: "top" | "bottom"; distance: number };

type Props = {
    width?: number | string;
    height?: number | string;
    style?: React.CSSProperties;
    text?: string;
    font?: React.CSSProperties;
    color?: string;

    startSkewX?: number;
    startX?: number;
    startOpacity?: number;
    transformOrigin?: string;

    appearTransition?: AnimationOptions;
    appearTrigger?: "default" | "hover" | "scroll";
    scrollConfig?: ScrollConfig;
};

function __BaseImpl_SkewInText(props: Props) {
    const {
        width,
        height,
        style,
        text = "Skew-In Effect",
        font = {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 120,
            lineHeight: "1.2em",
            letterSpacing: "0em",
            textAlign: "left",
        },
        color = "#FFFFFF",

        startSkewX = 30,
        startX = -100,
        startOpacity = 0,
        transformOrigin = "bottom left",

        appearTrigger = "default",
        scrollConfig = { position: "bottom", distance: 20 },
        appearTransition = {
            type: "tween",
            stiffness: 800,
            damping: 60,
            mass: 1,
            ease: "easeOut",
            duration: 1,
            delay: 0,
        } as AnimationOptions,
    } = props;

    const [scope, animate] = useAnimate();
    const hoverFiredRef = useRef(false);

    const { originX, originY } = useMemo(() => {
        let x = 0.5;
        let y = 0.5;

        if (transformOrigin.includes("left")) x = 0;
        if (transformOrigin.includes("right")) x = 1;
        if (transformOrigin.includes("top")) y = 0;
        if (transformOrigin.includes("bottom")) y = 1;

        return { originX: x, originY: y };
    }, [transformOrigin]);

    const runAppear = useCallback(() => {
        if (!scope.current) return;
        animate(
            ".skew-text",
            { x: 0, skewX: 0, opacity: 1 },
            appearTransition as any
        );
    }, [animate, appearTransition, scope]);

    useEffect(() => {
        let rafId: number | null = null;
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
        scope,
    ]);

    const align = font.textAlign || "left";
    const justifyContent =
        align === "center"
            ? "center"
            : align === "right"
              ? "flex-end"
              : "flex-start";

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
                display: "flex",
                justifyContent,
                alignItems: "center",
                overflow: "visible",
                position: "relative",
                width: width ?? "100%",
                height: height ?? "100%",
                minWidth: 0,
                boxSizing: "border-box",
                ...style,
            }}
        >
            <motion.div
                className="skew-text"
                initial={{
                    x: startX,
                    skewX: startSkewX,
                    opacity: startOpacity,
                }}
                style={{
                    ...font,
                    color,
                    display: "inline-block",
                    originX,
                    originY,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    willChange: "transform, opacity",
                }}
            >
                {text}
            </motion.div>
        </div>
    );
}

const __presetProps = {
  "font": {
    "variant": "Bold",
    "fontSize": "100px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.2em",
    "letterSpacing": "0em"
  },
  "text": "SKEW IN EFFECT",
  "color": "#FF4200",
  "startX": -440,
  "startSkewX": 70,
  "scrollConfig": {
    "distance": 20,
    "position": "bottom"
  },
  "startOpacity": 0,
  "appearTransition": {
    "ease": "easeIn",
    "mass": 4.3,
    "type": "spring",
    "delay": 0,
    "damping": 24,
    "duration": 1,
    "stiffness": 167
  }
};

export default function SkewInText(props: Record<string, unknown>) {
  return <__BaseImpl_SkewInText {...(__presetProps as Record<string, unknown>)} {...props} />;
}
