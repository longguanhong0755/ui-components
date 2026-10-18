"use client";

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimate, stagger as motionStagger, type Transition } from "framer-motion";

type Message = {
  text: string;
  sender: "me" | "them";
  timestamp?: string;
};

type Props = {
  messages?: Message[];
  font?: React.CSSProperties;
  sentBubbleColor?: string;
  sentTextColor?: string;
  receivedBubbleColor?: string;
  receivedTextColor?: string;
  showTimestamps?: boolean;
  showTyping?: boolean;
  typingSender?: "me" | "them";
  animate?: boolean;
  staggerDelay?: number;
  transition?: Transition;
  style?: React.CSSProperties;
};

const HIDDEN = { opacity: 0, scale: 0.85, y: 10 };
const SHOWN = { opacity: 1, scale: 1, y: 0 };

const DEFAULT_MESSAGES: Message[] = [
  {
    text: "Hey! Are you coming to the Framer workshop?",
    sender: "them",
    timestamp: "10:14 AM",
  },
  {
    text: "Yeah, definitely! Just finishing up some code.",
    sender: "me",
    timestamp: "10:15 AM",
  },
  {
    text: "Awesome, see you there! \ud83d\ude80",
    sender: "them",
    timestamp: "10:16 AM",
  },
];

const DEFAULT_FONT: React.CSSProperties = {
  fontFamily: "Inter",
  fontWeight: 400,
  fontSize: 16,
  lineHeight: "1.35em",
  letterSpacing: "0em",
  textAlign: "left",
};

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 450,
  damping: 28,
  mass: 1,
};

function TypingBubble({
  bubbleColor,
  isMe,
}: {
  bubbleColor: string;
  isMe: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "12px 16px",
        backgroundColor: bubbleColor,
        borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: isMe ? "rgba(255, 255, 255, 0.85)" : "#8E8E93",
            display: "inline-block",
            opacity: 0.5,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

function __BaseImpl_IOSMessageList({
  messages = DEFAULT_MESSAGES,
  font = DEFAULT_FONT,
  sentBubbleColor = "#007AFF",
  sentTextColor = "#FFFFFF",
  receivedBubbleColor = "#E9E9EB",
  receivedTextColor = "#000000",
  showTimestamps = true,
  showTyping = true,
  typingSender = "them",
  animate: doAnimate = true,
  staggerDelay = 150,
  transition = DEFAULT_TRANSITION,
  style,
}: Props) {
  const [scope, animate] = useAnimate();
  const fontStyles = (font ?? {}) as React.CSSProperties;
  const baseTransition = useMemo<Transition>(
    () => transition ?? { type: "spring", stiffness: 450, damping: 28 },
    [transition]
  );
  const staggerSec = (staggerDelay ?? 150) / 1000;
  const isTypingFromMe = typingSender === "me";

  const resetToHidden = useCallback(() => {
    if (!scope.current?.querySelectorAll(".msg-item").length) return;
    animate(".msg-item", HIDDEN, { duration: 0 });
  }, [animate, scope]);

  const runAppear = useCallback(() => {
    if (!scope.current?.querySelectorAll(".msg-item").length) return;
    animate(".msg-item", SHOWN, {
      ...baseTransition,
      delay: motionStagger(staggerSec),
    } as any);
  }, [animate, baseTransition, staggerSec, scope]);

  const runDots = useCallback(() => {
    if (!scope.current?.querySelectorAll(".typing-dot").length) return;
    animate(
      ".typing-dot",
      { y: [0, -5, 0], opacity: [0.35, 1, 0.35] },
      {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: motionStagger(0.18),
      } as any
    );
  }, [animate, scope]);

  useEffect(() => {
    runDots();

    if (!doAnimate) {
      animate(".msg-item", SHOWN, { duration: 0 });
      return;
    }

    resetToHidden();
    const t = setTimeout(runAppear, 50);
    return () => clearTimeout(t);
  }, [doAnimate, runAppear, resetToHidden, runDots, animate, messages.length, showTyping]);

  return (
    <div
      ref={scope}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        boxSizing: "border-box",
        overflowY: "auto",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: "antialiased",
        minWidth: 240,
        minHeight: 120,
        ...fontStyles,
        ...style,
      }}
    >
      {messages.map((msg, index) => {
        const isMe = msg.sender === "me";

        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start",
              width: "100%",
            }}
          >
            <div
              className="msg-item"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
                maxWidth: "75%",
                willChange: "transform, opacity",
              }}
            >
              {showTimestamps && msg.timestamp && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#8E8E93",
                    marginBottom: 4,
                    paddingLeft: isMe ? 0 : 12,
                    paddingRight: isMe ? 12 : 0,
                    fontWeight: 400,
                  }}
                >
                  {msg.timestamp}
                </span>
              )}

              <div
                style={{
                  padding: "10px 14px",
                  lineHeight: fontStyles.lineHeight ?? "1.35",
                  color: isMe ? sentTextColor : receivedTextColor,
                  backgroundColor: isMe ? sentBubbleColor : receivedBubbleColor,
                  borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  wordBreak: "break-word",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              >
                {msg.text}
              </div>
            </div>
          </div>
        );
      })}

      {showTyping && (
        <div
          style={{
            display: "flex",
            justifyContent: isTypingFromMe ? "flex-end" : "flex-start",
            width: "100%",
            marginTop: 4,
          }}
        >
          <div
            className="msg-item"
            style={{
              display: "inline-flex",
              willChange: "transform, opacity",
            }}
          >
            <TypingBubble
              bubbleColor={isTypingFromMe ? sentBubbleColor : receivedBubbleColor}
              isMe={isTypingFromMe}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const __presetProps = {
  "font": {
    "variant": "Regular",
    "fontSize": "20px",
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.35em",
    "letterSpacing": "0em"
  },
  "animate": false,
  "messages": [
    {
      "text": "Hey! Are you coming to the Framer workshop?",
      "sender": "them",
      "timestamp": "10:14 AM"
    },
    {
      "text": "Yeah, definitely! Just finishing up some code.",
      "sender": "me",
      "timestamp": "10:15 AM"
    },
    {
      "text": "Awesome, see you there! 🚀",
      "sender": "them",
      "timestamp": "10:16 AM"
    }
  ],
  "showTyping": true,
  "transition": {
    "mass": 1,
    "type": "spring",
    "delay": 0.39,
    "damping": 28,
    "stiffness": 450
  },
  "typingSender": "them",
  "sentTextColor": "#FFFFFF",
  "showTimestamps": true,
  "sentBubbleColor": "#FF5E00",
  "receivedTextColor": "#FFFFFF",
  "receivedBubbleColor": "#171717"
};

export default function IOSMessageList(props: Record<string, unknown>) {
  return <__BaseImpl_IOSMessageList {...(__presetProps as Record<string, unknown>)} {...props} />;
}
