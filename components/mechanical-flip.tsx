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
type AnimationTrigger = "hover" | "enter";
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

    startRotationX?: number;
    transformOrigin?: string;
    staggerFrom?: StaggerFrom;

    animation?: AnimationTrigger;

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

export default function FlipBoard({
    text = "Mechanical Flip",

    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "120px",
        fontWeight: 600,
        letterSpacing: "-0.025em",
        lineHeight: "1.1em",
        textAlign: "left",
    },
    color = "#ffffff",

    startRotationX = -90,
    transformOrigin = "50% 0%",
    staggerFrom = "start",

    animation = "enter",

    tag = "h1",

    transition = {
        type: "tween",
        duration: 0.3,
        delay: 0,
        ease: "easeOut",
        staggerChildren: 0.1,
    },
}: Props) {
    const containerRef = useRef<HTMLElement>(null);
    const canTriggerHoverRef = useRef(true);

    const playAnimation = useCallback(() => {
        if (!containerRef.current) return;

        const chars = containerRef.current.querySelectorAll(".char");

        gsap.killTweensOf(chars);

        gsap.set(chars, {
            clearProps: "transform,opacity",
            transformOrigin,
        });

        gsap.from(chars, {
            rotationX: startRotationX,
            opacity: 0,
            transformOrigin,

            duration: transition.duration ?? 0.3,
            delay: transition.delay ?? 0,
            stagger: {
                each: transition.staggerChildren ?? 0.1,
                from: staggerFrom,
            },
            ease: mapEase(transition.ease),
        });
    }, [startRotationX, transformOrigin, staggerFrom, transition]);

    useEffect(() => {
        if (animation !== "enter") return;
        playAnimation();
    }, [animation, text, playAnimation]);

    const handlePointerEnter = () => {
        if (animation !== "hover" || !canTriggerHoverRef.current) return;
        canTriggerHoverRef.current = false;
        playAnimation();
    };

    const handlePointerLeave = () => {
        canTriggerHoverRef.current = true;
    };

    return React.createElement(
        tag,
        {
            ref: containerRef,
            onPointerEnter: handlePointerEnter,
            onPointerLeave: handlePointerLeave,
            style: {
                margin: 0,
                display: "block",
                whiteSpace: "pre-wrap",
                perspective: 800,
                color,
                cursor: animation === "hover" ? "pointer" : undefined,
                ...font,
            },
        },
        text.split("").map((char, index) => (
            <span
                key={index}
                className="char"
                style={{
                    display: "inline-block",
                    transformOrigin,
                }}
            >
                {char === " " ? "\u00A0" : char}
            </span>
        ))
    );
}
