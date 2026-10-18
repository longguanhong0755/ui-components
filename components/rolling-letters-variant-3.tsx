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
type StartFrom = "top" | "bottom";
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

    startFrom?: StartFrom;
    staggerFrom?: StaggerFrom;

    tag?: TextTag;

    transition?: TransitionValue;
};

const startYPercentMap: Record<StartFrom, number> = {
    top: -500,
    bottom: 500,
};

const mapEase = (ease: TransitionValue["ease"]): string => {
    if (typeof ease !== "string") return "power4.out";

    const easeMap: Record<string, string> = {
        linear: "none",
        easeIn: "power2.in",
        easeOut: "power4.out",
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

function __BaseImpl_SlotMachine({
    text = "Rolling Letters",
    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "120px",
        fontWeight: 600,
        letterSpacing: "-0.025em",
        lineHeight: "1.1em",
        textAlign: "left",
    },
    color = "#ffffff",

    startFrom = "top",
    staggerFrom = "start",

    tag = "h1",

    transition = {
        type: "tween",
        duration: 0.6,
        delay: 0,
        ease: "easeOut",
        staggerChildren: 0.08,
    },
}: Props) {
    const containerRef = useRef<HTMLElement>(null);

    const playAnimation = useCallback(() => {
        if (!containerRef.current) return;

        const chars = containerRef.current.querySelectorAll(".char");

        gsap.killTweensOf(chars);

        gsap.set(chars, {
            clearProps: "transform",
        });

        gsap.from(chars, {
            yPercent: startYPercentMap[startFrom],

            duration: transition.duration ?? 0.6,
            delay: transition.delay ?? 0,
            stagger: {
                each: transition.staggerChildren ?? 0.08,
                from: staggerFrom,
            },
            ease: mapEase(transition.ease),
        });
    }, [startFrom, staggerFrom, transition]);

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
                overflow: "hidden",
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

const __presetProps = {
  "text": "ROLLING LETTERS",
  "font": {
    "variant": "Bold",
    "fontSize": "72px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 700,
    "lineHeight": "1.1em",
    "letterSpacing": "-0.025em"
  },
  "color": "#FF6F00",
  "startFrom": "top",
  "staggerFrom": "random",
  "tag": "h1",
  "transition": {
    "ease": "easeOut",
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 0.6,
    "stiffness": 800,
    "staggerChildren": 0.08
  }
};

export default function SlotMachine(props: Record<string, unknown>) {
  return <__BaseImpl_SlotMachine {...(__presetProps as Record<string, unknown>)} {...props} />;
}
