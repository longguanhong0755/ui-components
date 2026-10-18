"use client";

import * as React from "react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";

const DEFAULT_URLS = [
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8e0d22a8-ac82-4893-90d8-3403f80ec600/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/d6af07a0-4dc5-4de4-07b1-9d2ad6100000/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c083d83a-f5a4-4434-989f-4eaa9bbe7500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/93bad0e0-e2ab-4e21-de9c-4cb54b028f00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/09a59a65-3c07-4500-f72c-68c824168c00/w=800",
];

const TRANSITION = { type: "spring", stiffness: 300, damping: 30 };

const srcOf = (img: any): string =>
    typeof img === "string" ? img : (img?.src ?? "");

interface Props {
    images: any[];
    imageWidth: number;
    imageHeight: number;
    radius: number;
    fit: "cover" | "contain";
    position: "top" | "center" | "bottom";
    frequency: number;
    visibleFor: number;
    showLabel: boolean;
    labelText: string;
    labelColor: string;
    labelFont: CSSProperties;
}

function __BaseImpl_CursorImageTrail(props: Partial<Props> & { [k: string]: any }) {
    const {
        images = DEFAULT_URLS,
        imageWidth = 100,
        imageHeight = 100,
        radius = 0,
        fit = "cover",
        position = "center",
        frequency = 35,
        visibleFor = 1,
        showLabel = true,
        labelText = "Hover Me",
        labelColor = "#ffffff",
        labelFont = {
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 60,
            lineHeight: "1.5em",
            letterSpacing: "0em",
            textAlign: "left",
        },
        ...rest
    } = props;

    const urls = useMemo(() => {
        const list = (images ?? []).map(srcOf).filter(Boolean);
        return list.length ? list : DEFAULT_URLS;
    }, [images]);

    const threshold = 200 - ((frequency - 1) * 199) / 49;

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeImages, setActiveImages] = useState<any[]>([]);

    const handleMouseMove = (event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMousePos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        });
        setIsHovering(true);
    };
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    useEffect(() => {
        if (!isHovering || urls.length === 0) return;
        const lastImage = activeImages[activeImages.length - 1];
        const distance = lastImage
            ? Math.hypot(mousePos.x - lastImage.x, mousePos.y - lastImage.y)
            : Infinity;
        if (distance <= threshold) return;

        const newImage = {
            id: Math.random(),
            position: currentImageIndex,
            x: mousePos.x,
            y: mousePos.y,
            state: "entering",
        };
        setActiveImages((prev) => [...prev, newImage]);
        setCurrentImageIndex((prev) => (prev + 1) % urls.length);

        setTimeout(() => {
            setActiveImages((prev) =>
                prev.map((img) =>
                    img.id === newImage.id ? { ...img, state: "exiting" } : img
                )
            );
        }, visibleFor * 1000);

        setTimeout(
            () => {
                setActiveImages((prev) =>
                    prev.filter((img) => img.id !== newImage.id)
                );
            },
            visibleFor * 1000 + 2000
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mousePos, isHovering, urls, threshold, currentImageIndex, visibleFor]);

    return (
        <div
            {...rest}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                position: "relative",
                overflow: "hidden",
                width: 600,
                height: 600,
                ...rest.style,
            }}
        >
            {showLabel && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        userSelect: "none",
                        ...labelFont,
                        color: labelColor,
                    }}
                >
                    {labelText}
                </div>
            )}

            {activeImages.map(({ id, position: slot, x, y, state }) => (
                <motion.div
                    key={id}
                    initial={{
                        opacity: 0,
                        scale: 0.5,
                        filter: "blur(10px)",
                        x: x - imageWidth / 2,
                        y: y - imageHeight / 2,
                    }}
                    animate={{
                        opacity: state === "entering" ? 1 : 0,
                        scale: state === "entering" ? 1 : 0.5,
                        filter:
                            state === "entering" ? "blur(0px)" : "blur(10px)",
                        x: x - imageWidth / 2,
                        y: y - imageHeight / 2,
                    }}
                    transition={TRANSITION}
                    style={{
                        position: "absolute",
                        width: `${imageWidth}px`,
                        height: `${imageHeight}px`,
                        backgroundImage: `url(${urls[slot]})`,
                        backgroundSize: fit,
                        backgroundPosition:
                            fit === "cover" ? `center ${position}` : "center",
                        backgroundRepeat: "no-repeat",
                        borderRadius: `${radius}px`,
                        pointerEvents: "none",
                    }}
                />
            ))}
        </div>
    );
}

const __presetProps = {
  "fit": "cover",
  "images": [
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/f8b3688c-11d0-425c-0b6f-66f133322c00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/b14ae2a2-1116-4a7f-0a18-1d74c4a46f00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/e5213ea9-fdf1-4b3b-7d6b-331203912500/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/e4476503-c1e3-4358-3ff6-539deda1f800/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4271959a-5964-4541-4809-a68cb90cde00/w=800",
    "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/eaafe6e8-cf8c-45c0-5a18-f468059e5800/w=800"
  ],
  "radius": 8,
  "position": "center",
  "frequency": 40,
  "labelFont": {
    "variant": "Regular",
    "fontSize": 60,
    "textAlign": "left",
    "fontFamily": "Inter",
    "fontWeight": 400,
    "lineHeight": "1.5em",
    "letterSpacing": "0em"
  },
  "labelText": "Hover Me",
  "showLabel": true,
  "imageWidth": 150,
  "labelColor": "#ffffff",
  "visibleFor": 0.5,
  "imageHeight": 200
};

export default function CursorImageTrail(props: Record<string, unknown>) {
  return <__BaseImpl_CursorImageTrail {...(__presetProps as Record<string, unknown>)} {...props} />;
}
