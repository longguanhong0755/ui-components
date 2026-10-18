"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type FontStyle = React.CSSProperties;

type SplitBy = "characters" | "words";

type ScrollPosition =
    | "top top"
    | "top center"
    | "top bottom"
    | "center top"
    | "center center"
    | "center bottom"
    | "bottom top"
    | "bottom center"
    | "bottom bottom";

type ScrollHighlightProps = {
    text?: string;
    font?: FontStyle;

    dimColor?: string;
    highlightColor?: string;

    splitBy?: SplitBy;
    scrollStart?: ScrollPosition;
    scrollEnd?: ScrollPosition;
    scrub?: boolean;
};

const CHAR_STAGGER = 0.03;
const WORD_STAGGER = 0.1;

function __BaseImpl_ScrollHighlight({
    text = "Every word in this paragraph will light up as you scroll through it.",

    font = {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "60px",
        fontWeight: 600,
        letterSpacing: "-0.025em",
        lineHeight: "1.1em",
        textAlign: "left",
    },

    dimColor = "rgba(255, 255, 255, 0.15)",
    highlightColor = "#FFFFFF",

    splitBy = "words",
    scrollStart = "top center",
    scrollEnd = "bottom center",
    scrub = true,
}: ScrollHighlightProps) {
    const containerRef = useRef<HTMLParagraphElement>(null);
    const words = text.trim().split(/\s+/).filter(Boolean);
    const chars = Array.from(text);
    const stagger = splitBy === "characters" ? CHAR_STAGGER : WORD_STAGGER;

    useEffect(() => {
        const paragraph = containerRef.current;
        if (!paragraph) return;

        const targets = paragraph.querySelectorAll(
            splitBy === "characters" ? ".char" : ".word"
        );

        const ctx = gsap.context(() => {
            gsap.set(targets, {
                color: dimColor,
            });

            gsap.to(targets, {
                color: highlightColor,
                stagger,
                scrollTrigger: {
                    trigger: paragraph,
                    start: scrollStart,
                    end: scrollEnd,
                    scrub,
                },
            });
        }, paragraph);

        return () => ctx.revert();
    }, [
        text,
        dimColor,
        highlightColor,
        splitBy,
        stagger,
        scrollStart,
        scrollEnd,
        scrub,
    ]);

    return (
        <div style={{ paddingTop: "100dvh", paddingBottom: "100dvh" }}>
            <p
                ref={containerRef}
                style={{
                    margin: 0,
                    display: "inline-block",
                    whiteSpace: "pre-wrap",
                    color: dimColor,
                    ...font,
                }}
            >
                {splitBy === "characters"
                    ? chars.map((char, index) => (
                          <span
                              key={`${char}-${index}`}
                              className="char"
                              style={{
                                  display: "inline-block",
                                  color: dimColor,
                              }}
                          >
                              {char === " " ? "\u00A0" : char}
                          </span>
                      ))
                    : words.map((word, index) => (
                          <React.Fragment key={`${word}-${index}`}>
                              <span
                                  className="word"
                                  style={{
                                      display: "inline-block",
                                      color: dimColor,
                                  }}
                              >
                                  {word}
                              </span>
                              {index < words.length - 1 ? " " : null}
                          </React.Fragment>
                      ))}
            </p>
        </div>
    );
}

const __presetProps = {
  "text": "Every detail matters. Small interactions shape perception, build trust, and transform ordinary experiences into memorable ones.",
  "scrub": true,
  "splitBy": "words",
  "dimColor": "rgba(255, 255, 255, 0.15)",
  "scrollEnd": "bottom center",
  "scrollStart": "top center",
  "highlightColor": "#FFFFFF"
};

export default function ScrollHighlight(props: Record<string, unknown>) {
  return <__BaseImpl_ScrollHighlight {...(__presetProps as Record<string, unknown>)} {...props} />;
}
