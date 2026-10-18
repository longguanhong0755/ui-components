"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type FontStyle = React.CSSProperties;

type TransitionValue = {
    type?: string;
    duration?: number;
    delay?: number;
    ease?: string | number[];
    staggerChildren?: number;
};

type MagneticPullProps = {
    text?: string;
    font?: FontStyle;
    color?: string;

    startRotation?: number;
    startOpacity?: number;

    transition?: TransitionValue;
};

const SCATTER_X = 200;
const SCATTER_Y = 200;

const mapEase = (ease: TransitionValue["ease"]): string => {
    if (typeof ease !== "string") return "power3.out";

    const easeMap: Record<string, string> = {
        linear: "none",
        easeIn: "power2.in",
        easeOut: "power3.out",
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

function __BaseImpl_MagneticPull({
    text = "Text Gather",

    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "120px",
        fontWeight: 600,
        letterSpacing: "-0.025em",
        lineHeight: "1.1em",
        textAlign: "center",
    } as FontStyle,
    color = "#ffffff",

    startRotation = 90,
    startOpacity = 0,

    transition = {
        type: "tween",
        duration: 1,
        delay: 0,
        ease: "easeOut",
        staggerChildren: 0.02,
    },
}: MagneticPullProps) {
    const containerRef = useRef<HTMLHeadingElement>(null);

    const duration = transition.duration ?? 1;
    const delay = transition.delay ?? 0;
    const stagger = transition.staggerChildren ?? 0.02;
    const ease = mapEase(transition.ease);
    const textAlign =
        (font.textAlign as React.CSSProperties["textAlign"]) ?? "center";

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const chars = container.querySelectorAll(".char");
        if (chars.length === 0) return;

        const runAnimation = () => {
            gsap.killTweensOf(chars);
            gsap.fromTo(
                chars,
                {
                    x: () => gsap.utils.random(-SCATTER_X, SCATTER_X),
                    y: () => gsap.utils.random(-SCATTER_Y, SCATTER_Y),
                    opacity: startOpacity / 100,
                    rotation: () =>
                        gsap.utils.random(-startRotation, startRotation),
                },
                {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    rotation: 0,
                    duration,
                    delay,
                    stagger,
                    ease,
                    immediateRender: true,
                }
            );
        };

        const ctx = gsap.context(() => {
            runAnimation();
        }, container);

        return () => {
            ctx.revert();
        };
    }, [text, startRotation, startOpacity, duration, delay, stagger, ease]);

    return (
        <h1
            ref={containerRef}
            aria-label={text}
            style={{
                margin: 0,
                display: "block",
                width: "100%",
                whiteSpace: "pre-wrap",
                color,
                ...font,
                textAlign,
                pointerEvents: "none",
            }}
        >
            {text.split("").map((char, index) => (
                <span
                    key={index}
                    className="char"
                    aria-hidden="true"
                    style={{
                        display: "inline-block",
                        pointerEvents: "none",
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </span>
            ))}
        </h1>
    );
}

const __presetProps = {
  "text": "ACTIONS",
  "font": {
    "variant": "Medium",
    "fontSize": "82px",
    "fontWeight": 500
  },
  "color": "#E800FF",
  "startRotation": 130,
  "startOpacity": 61,
  "transition": {
    "ease": "easeInOut",
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 1,
    "stiffness": 800,
    "staggerChildren": 0.02
  }
};

export default function MagneticPull(props: Record<string, unknown>) {
  return <__BaseImpl_MagneticPull {...(__presetProps as Record<string, unknown>)} {...props} />;
}
