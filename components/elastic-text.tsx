"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    animate,
    motion,
    useSpring,
    type AnimationPlaybackControls,
    type MotionValue,
    type SpringOptions,
} from "framer-motion";

type FontStyle = React.CSSProperties & {
    fontFamily?: string;
    fontWeight?: number | string;
    fontSize?: number | string;
    letterSpacing?: number | string;
    lineHeight?: number | string;
};

type Props = {
    text?: string;
    font?: FontStyle;
    color?: string;
    /** How strongly neighbors follow the dragged letter (0–20). */
    follow?: number;
    style?: React.CSSProperties;
};

type LetterMotion = {
    x: MotionValue<number>;
    y: MotionValue<number>;
};

const DEFAULT_FONT: FontStyle = {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: 400,
    fontSize: "120px",
    letterSpacing: "-0.04em",
    lineHeight: "1em",
    textAlign: "center",
};

const DRAG_SPRING: SpringOptions = {
    stiffness: 520,
    damping: 38,
    mass: 0.4,
};

const RELEASE_SPRING: SpringOptions & { type: "spring" } = {
    type: "spring",
    stiffness: 240,
    damping: 13,
    mass: 0.75,
};

const prefersReducedMotion = (): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const isLineBreak = (char: string): boolean => char === "\n";

const isSpaceLike = (char: string): boolean => char === " " || char === "\t";

/** Distance along the glyph chain on the same line; null if a newline breaks the path. Spaces count as characters. */
const getChainDistance = (
    from: number,
    to: number,
    chars: string[]
): number | null => {
    if (from === to) return 0;
    if (isLineBreak(chars[from]!) || isLineBreak(chars[to]!)) return null;

    const lo = Math.min(from, to);
    const hi = Math.max(from, to);

    for (let i = lo + 1; i < hi; i += 1) {
        if (isLineBreak(chars[i]!)) return null;
    }

    return hi - lo;
};

type LetterProps = {
    char: string;
    index: number;
    color: string;
    reducedMotion: boolean;
    registerMotion: (index: number, pair: LetterMotion | null) => void;
    onLetterPointerDown: (
        index: number,
        event: React.PointerEvent<HTMLSpanElement>
    ) => void;
};

const ElasticLetter = ({
    char,
    index,
    color,
    reducedMotion,
    registerMotion,
    onLetterPointerDown,
}: LetterProps) => {
    const x = useSpring(0, DRAG_SPRING);
    const y = useSpring(0, DRAG_SPRING);

    useEffect(() => {
        if (isLineBreak(char)) {
            registerMotion(index, null);
            return;
        }

        registerMotion(index, { x, y });
        return () => registerMotion(index, null);
    }, [char, index, registerMotion, x, y]);

    if (isLineBreak(char)) {
        return (
            <span aria-hidden="true" style={{ whiteSpace: "pre" }}>
                {char}
            </span>
        );
    }

    return (
        <motion.span
            aria-hidden="true"
            onPointerDown={(event) => onLetterPointerDown(index, event)}
            style={{
                x: reducedMotion ? 0 : x,
                y: reducedMotion ? 0 : y,
                display: "inline-block",
                color,
                cursor: reducedMotion ? "default" : "grab",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                willChange: "transform",
                whiteSpace: isSpaceLike(char) ? "pre" : undefined,
            }}
        >
            {char === " " ? "\u00A0" : char}
        </motion.span>
    );
};

export default function StretchyText(props: Props) {
    const {
        text = "ELASTIC TEXT",
        font = DEFAULT_FONT,
        color = "#FFFFFF",
        follow = 12,
        style,
    } = props;

    const safeFollow = Math.min(20, Math.max(0, Math.round(follow)));
    // Map 0–20 → 0–1 geometric falloff used along the letter chain
    const followStrength = safeFollow / 20;

    const chars = useMemo(() => Array.from(text || "STRETCHY"), [text]);
    const motionsRef = useRef<(LetterMotion | null)[]>([]);
    const animControlsRef = useRef<AnimationPlaybackControls[]>([]);
    const activeIndexRef = useRef<number | null>(null);
    const originRef = useRef({ x: 0, y: 0 });
    const draggingRef = useRef(false);

    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(prefersReducedMotion());
    }, []);

    const registerMotion = useCallback(
        (index: number, pair: LetterMotion | null) => {
            motionsRef.current[index] = pair;
        },
        []
    );

    const stopAnims = useCallback(() => {
        animControlsRef.current.forEach((control) => control.stop());
        animControlsRef.current = [];
    }, []);

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            if (!draggingRef.current || activeIndexRef.current == null) return;

            const active = activeIndexRef.current;
            const deltaX = event.clientX - originRef.current.x;
            const deltaY = event.clientY - originRef.current.y;

            chars.forEach((char, index) => {
                const pair = motionsRef.current[index];
                if (!pair || isLineBreak(char)) return;

                const distance = getChainDistance(active, index, chars);
                // Same-line chain includes spaces; only newlines break the path
                if (distance == null) {
                    pair.x.set(0);
                    pair.y.set(0);
                    return;
                }

                if (distance === 0) {
                    if (typeof pair.x.jump === "function") {
                        pair.x.jump(deltaX);
                        pair.y.jump(deltaY);
                    } else {
                        pair.x.set(deltaX);
                        pair.y.set(deltaY);
                    }
                    return;
                }

                const strength = Math.pow(followStrength, distance);
                pair.x.set(deltaX * strength);
                pair.y.set(deltaY * strength);
            });
        },
        [chars, followStrength]
    );

    const handlePointerUp = useCallback(() => {
        if (!draggingRef.current) return;

        draggingRef.current = false;
        activeIndexRef.current = null;

        stopAnims();
        motionsRef.current.forEach((pair) => {
            if (!pair) return;
            animControlsRef.current.push(
                animate(pair.x, 0, RELEASE_SPRING),
                animate(pair.y, 0, RELEASE_SPRING)
            );
        });

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
    }, [handlePointerMove, stopAnims]);

    const handleLetterPointerDown = useCallback(
        (index: number, event: React.PointerEvent<HTMLSpanElement>) => {
            if (reducedMotion) return;
            if (event.button !== 0) return;

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);

            stopAnims();
            draggingRef.current = true;
            activeIndexRef.current = index;
            originRef.current = { x: event.clientX, y: event.clientY };

            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("pointercancel", handlePointerUp);
        },
        [reducedMotion, stopAnims, handlePointerMove, handlePointerUp]
    );

    useEffect(() => {
        return () => {
            stopAnims();
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp, stopAnims]);

    const textAlign =
        (font.textAlign as React.CSSProperties["textAlign"]) ?? "center";
    const alignItems =
        textAlign === "left" || textAlign === "start"
            ? "flex-start"
            : textAlign === "right" || textAlign === "end"
              ? "flex-end"
              : "center";

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems,
                justifyContent: "center",
                width: "100%",
                height: "100%",
                ...style,
            }}
        >
            <p
                aria-label={text}
                style={{
                    ...font,
                    margin: 0,
                    color,
                    textAlign,
                    whiteSpace: "pre-wrap",
                }}
            >
                {chars.map((char, index) => (
                    <ElasticLetter
                        key={`${char}-${index}`}
                        char={char}
                        index={index}
                        color={color}
                        reducedMotion={reducedMotion}
                        registerMotion={registerMotion}
                        onLetterPointerDown={handleLetterPointerDown}
                    />
                ))}
            </p>
        </div>
    );
}

StretchyText.defaultProps = {
    text: "ELASTIC TEXT",
    font: {
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 400,
        fontSize: "120px",
        letterSpacing: "-0.04em",
        lineHeight: "1em",
        textAlign: "center",
    } as FontStyle,
    color: "#FFFFFF",
    follow: 12,
};
