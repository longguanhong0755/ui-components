"use client";

import * as React from "react";
import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";

type FontStyle = React.CSSProperties;

type TransitionValue = {
    type?: string;
    duration?: number;
    delay?: number;
    ease?: string | number[];
    staggerChildren?: number;
};

type StaggerFrom = "start" | "center" | "end" | "random";
type TextTag =
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "p"
    | "span"
    | "div"
    | "section";

type Props = {
    text?: string;
    font?: FontStyle;
    color?: string;

    startY?: number;
    startOpacity?: number;
    staggerFrom?: StaggerFrom;

    tag?: TextTag;

    transition?: TransitionValue;
};

const mapEase = (ease: TransitionValue["ease"]): string => {
    if (typeof ease !== "string") return "power2.out";

    const easeMap: Record<string, string> = {
        linear: "none",
        easeIn: "power2.in",
        easeOut: "power2.out",
        easeInOut: "power2.inOut",
        circIn: "circ.in",
        circOut: "circ.out",
        circInOut: "circ.inOut",
        backIn: "back.in",
        backOut: "back.out(1.7)",
        backInOut: "back.inOut",
        anticipate: "back.out(1.7)",
    };

    return easeMap[ease] ?? ease;
};

export default function MatrixRain({
    text = "Letter Drop",
    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "120px",
        fontWeight: 600,
        letterSpacing: "-0.025em",
        lineHeight: "1.1em",
        textAlign: "left",
    },
    color = "#ffffff",

    startY = -100,
    startOpacity = 0,
    staggerFrom = "random",

    tag = "h1",

    transition = {
        type: "tween",
        duration: 0.5,
        delay: 0,
        ease: "easeOut",
        staggerChildren: 0.05,
    },
}: Props) {
    const containerRef = useRef<HTMLElement>(null);

    const playAnimation = useCallback(() => {
        if (!containerRef.current) return;

        const chars = containerRef.current.querySelectorAll(".char");

        gsap.killTweensOf(chars);

        gsap.set(chars, {
            clearProps: "transform,opacity",
        });

        gsap.from(chars, {
            y: startY,
            opacity: startOpacity / 100,

            duration: transition.duration ?? 0.5,
            delay: transition.delay ?? 0,
            stagger: {
                each: transition.staggerChildren ?? 0.05,
                from: staggerFrom,
            },
            ease: mapEase(transition.ease),
        });
    }, [startY, startOpacity, staggerFrom, transition]);

    useEffect(() => {
        playAnimation();
    }, [text, playAnimation]);

    return React.createElement(
        tag,
        {
            ref: containerRef,
            style: {
                margin: 0,
                display: "block",
                width: "100%",
                whiteSpace: "pre-wrap",
                color,
                ...font,
            },
        },
        text.split("").map((char, index) => (
            <span
                key={index}
                className="char"
                style={{
                    display: "inline-block",
                }}
            >
                {char === " " ? "\u00A0" : char}
            </span>
        ))
    );
}
