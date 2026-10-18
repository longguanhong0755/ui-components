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
};

type WipeDirection = "left" | "right" | "top" | "bottom";
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
    direction?: WipeDirection;
    animation?: AnimationTrigger;
    tag?: TextTag;
    transition?: TransitionValue;
};

const wipeClipPath: Record<WipeDirection, string> = {
    left: "inset(0 100% 0 0)",
    right: "inset(0 0 0 100%)",
    top: "inset(100% 0 0 0)",
    bottom: "inset(0 0 100% 0)",
};

const mapEase = (ease: TransitionValue["ease"]): string => {
    if (typeof ease !== "string") return "power3.inOut";

    const easeMap: Record<string, string> = {
        linear: "none",
        easeIn: "power3.in",
        easeOut: "power3.out",
        easeInOut: "power3.inOut",
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

function __BaseImpl_RevealWipe({
    text = "Text Wipe",
    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "120px",
        fontWeight: 600,
        letterSpacing: "0em",
        lineHeight: "1.1em",
        textAlign: "left",
    },
    color = "#ffffff",
    direction = "left",
    animation = "enter",
    tag = "h1",
    transition = {
        type: "tween",
        duration: 1.2,
        delay: 0,
        ease: "easeInOut",
    },
}: Props) {
    const textRef = useRef<HTMLElement>(null);
    const hoverTargetRef = useRef<HTMLDivElement>(null);
    const canTriggerHoverRef = useRef(true);

    const playAnimation = useCallback(() => {
        const heading = textRef.current;
        if (!heading) return;

        gsap.killTweensOf(heading);

        gsap.set(heading, {
            clearProps: "clipPath",
        });

        gsap.from(heading, {
            clipPath: wipeClipPath[direction],
            duration: transition.duration ?? 1.2,
            delay: transition.delay ?? 0,
            ease: mapEase(transition.ease),
        });
    }, [direction, transition]);

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

    return (
        <div
            ref={hoverTargetRef}
            onPointerEnter={
                animation === "hover" ? handlePointerEnter : undefined
            }
            onPointerLeave={
                animation === "hover" ? handlePointerLeave : undefined
            }
            style={{
                display: "block",
                width: "100%",
                cursor: animation === "hover" ? "pointer" : undefined,
            }}
        >
            {React.createElement(
                tag,
                {
                    ref: textRef,
                    style: {
                        margin: 0,
                        display: "block",
                        width: "100%",
                        whiteSpace: "pre-wrap",
                        color,
                        ...font,
                        clipPath: "inset(0 0% 0 0)",
                    },
                },
                text
            )}
        </div>
    );
}

const __presetProps = {
  "tag": "h1",
  "font": {
    "variant": "Semibold",
    "fontSize": "92px",
    "textAlign": "center",
    "fontFamily": "Inter",
    "fontWeight": 600,
    "lineHeight": "1.1em",
    "letterSpacing": "0em"
  },
  "text": "Build Faster",
  "color": "#59FF06",
  "animation": "hover",
  "direction": "left",
  "transition": {
    "ease": "easeOut",
    "mass": 1,
    "type": "tween",
    "delay": 0,
    "damping": 60,
    "duration": 1.2,
    "stiffness": 800
  }
};

export default function RevealWipe(props: Record<string, unknown>) {
  return <__BaseImpl_RevealWipe {...(__presetProps as Record<string, unknown>)} {...props} />;
}
