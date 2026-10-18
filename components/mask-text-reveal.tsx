"use client";

import * as React from "react";
import { useEffect, useCallback } from "react";
import { motion, useAnimate, type AnimationOptions } from "framer-motion";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"] as const;

type Props = {
    text: string;
    font?: React.CSSProperties;
    color: string;
    tag: string;

    direction:
        | "center-horizontal"
        | "center-vertical"
        | "left-to-right"
        | "right-to-left"
        | "top-to-bottom"
        | "bottom-to-top";

    transition: AnimationOptions;
};

const INSET_MAP: Record<string, string> = {
    "center-horizontal": "inset(0% 50% 0% 50%)",
    "center-vertical": "inset(50% 0% 50% 0%)",
    "left-to-right": "inset(0% 100% 0% 0%)",
    "right-to-left": "inset(0% 0% 0% 100%)",
    "top-to-bottom": "inset(0% 0% 100% 0%)",
    "bottom-to-top": "inset(100% 0% 0% 0%)",
};

export default function CurtainReveal({
    text = "Curtain Reveal",
    font = {
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: 120,
        lineHeight: "1.5em",
        letterSpacing: "0em",
        textAlign: "left",
    },
    color = "#FFFFFF",
    tag = "h3",
    direction = "center-horizontal",
    transition = {
        type: "tween",
        stiffness: 800,
        damping: 60,
        mass: 1,
        ease: "easeInOut",
        duration: 1,
    },
}: Partial<Props>) {
    const [scope, animate] = useAnimate();

    const startClip = INSET_MAP[direction] || INSET_MAP["center-horizontal"];
    const endClip = "inset(0% 0% 0% 0%)";

    const resetToHidden = useCallback(() => {
        if (!scope.current) return;
        animate(".curtain-text", { clipPath: startClip }, { duration: 0 });
    }, [animate, startClip, scope]);

    const runAppear = useCallback(() => {
        if (!scope.current) return;
        animate(".curtain-text", { clipPath: endClip }, transition as any);
    }, [animate, transition, endClip, scope]);

    useEffect(() => {
        resetToHidden();
        const t = setTimeout(runAppear, 50);
        return () => clearTimeout(t);
    }, [runAppear, resetToHidden]);

    const fontStyles = (font ?? {}) as React.CSSProperties;
    const safeTag = (TAGS as readonly string[]).includes(tag) ? tag : "h3";
    const Tag = (motion as any)[safeTag];

    return (
        <div
            ref={scope}
            style={{
                width: "100%",
                display: "flex",
                justifyContent:
                    fontStyles.textAlign === "right"
                        ? "flex-end"
                        : fontStyles.textAlign === "center"
                          ? "center"
                          : "flex-start",
                overflow: "visible",
            }}
        >
            <Tag
                className="curtain-text"
                style={{
                    margin: 0,
                    display: "inline-block",
                    whiteSpace: "pre-wrap",
                    ...fontStyles,
                    color,
                    clipPath: startClip,
                    willChange: "clip-path",
                }}
            >
                {text}
            </Tag>
        </div>
    );
}
