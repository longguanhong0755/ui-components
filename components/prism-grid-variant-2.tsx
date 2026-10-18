"use client";

import {
    useMemo,
    useRef,
    useState,
    useLayoutEffect,
    useCallback,
    type CSSProperties,
} from "react";
import { motion } from "framer-motion";

const DEFAULT_COLORS = [
    "#FFFFFF",
    "#FFC2E3",
    "#DEFFEA",
    "#A68F1F",
    "#A85E5E",
    "#DFC2FF",
];

const PERSPECTIVE = 1000;

function screenToPlane(
    sx: number,
    sy: number,
    yawDeg: number,
    pitchDeg: number,
    p = PERSPECTIVE
): { x: number; y: number } | null {
    const a = (yawDeg * Math.PI) / 180;
    const b = (pitchDeg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cb = Math.cos(b);
    const sb = Math.sin(b);

    const a11 = p * ca - sx * sa * cb;
    const a12 = sx * sb;
    const a21 = p * sa * sb - sy * sa * cb;
    const a22 = p * cb + sy * sb;

    const det = a11 * a22 - a12 * a21;
    if (!isFinite(det) || Math.abs(det) < 1e-6) return null;

    const b1 = sx * p;
    const b2 = sy * p;
    return {
        x: (b1 * a22 - a12 * b2) / det,
        y: (a11 * b2 - b1 * a21) / det,
    };
}

interface Cell {
    id: number;
    row: number;
    col: number;
    color: string;
}

interface Rotate {
    x?: number;
    y?: number;
}

interface ColorsProp {
    paletteCount?: number;
    [key: string]: string | number | undefined;
}

interface BackgroundBoxesProps {
    backgroundColor?: string;
    boxSize?: number;
    borderWidth?: number;
    borderColor?: string;
    rotate?: Rotate;
    colors?: ColorsProp;
    style?: CSSProperties;
}

function __BaseImpl_BackgroundBoxes({
    backgroundColor = "rgba(0,0,0,1)",
    boxSize = 40,
    borderWidth = 2,
    borderColor = "rgba(255,255,255,0.2)",
    rotate = { x: 0, y: 0 },
    colors: colorsProp = {
        paletteCount: 6,
        color1: "#FFFFFF",
        color2: "#FFC2E3",
        color3: "#DEFFEA",
        color4: "#A68F1F",
        color5: "#A85E5E",
        color6: "#DFC2FF",
        color7: "rgb(147 197 253)",
        color8: "rgb(165 180 252)",
        color9: "rgb(196 181 253)",
        color10: "rgb(125 211 252)",
    },
    style,
}: BackgroundBoxesProps) {
    const inDuration = 0;
    const outDuration = 1;

    const containerRef = useRef<HTMLDivElement>(null);
    const zoomProbeRef = useRef<HTMLDivElement>(null);
    const [rows, setRows] = useState(35);
    const [cols, setCols] = useState(35);

    const swingX = rotate?.x ?? 0;
    const swingY = rotate?.y ?? 0;

    const colors = useMemo(() => {
        const entries: string[] = [];
        if (colorsProp) {
            const count = Math.max(
                1,
                Math.min(10, colorsProp.paletteCount || 6)
            );
            for (let i = 1; i <= count; i++) {
                const value = colorsProp[`color${i}`];
                if (typeof value === "string" && value.trim().length > 0) {
                    entries.push(value.trim());
                }
            }
        }
        if (entries.length === 0) return DEFAULT_COLORS;
        return entries;
    }, [colorsProp]);

    const getRandomColor = () => {
        if (colors.length === 0) return DEFAULT_COLORS[0] || "rgb(125 211 252)";
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const calculateGrid = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const w = container.clientWidth || container.offsetWidth || 1;
        const h = container.clientHeight || container.offsetHeight || 1;
        setCols(Math.max(1, Math.ceil(w / boxSize)));
        setRows(Math.max(1, Math.ceil(h / boxSize)));
    }, [boxSize]);

    useLayoutEffect(() => {
        calculateGrid();
        window.addEventListener("resize", calculateGrid);
        return () => window.removeEventListener("resize", calculateGrid);
    }, [calculateGrid]);

    const gridWidth = cols * boxSize;
    const gridHeight = rows * boxSize;

    const border = borderWidth
        ? `${borderWidth}px solid ${borderColor}`
        : undefined;

    const [lit, setLit] = useState<Cell | null>(null);
    const [fading, setFading] = useState<Cell[]>([]);
    const idRef = useRef(0);

    const leave = useCallback(() => {
        setLit((current) => {
            if (current) setFading((f) => [...f, current]);
            return null;
        });
    }, []);

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const sx = event.clientX - rect.left - rect.width / 2;
            const sy = event.clientY - rect.top - rect.height / 2;

            const point = screenToPlane(sx, sy, swingX, swingY);
            if (!point) return leave();

            const gx = point.x + gridWidth / 2;
            const gy = point.y + gridHeight / 2;
            const col = Math.floor(gx / boxSize);
            const row = Math.floor(gy / boxSize);
            if (col < 0 || col >= cols || row < 0 || row >= rows) return leave();

            setLit((current) => {
                if (current && current.row === row && current.col === col) {
                    return current;
                }
                if (current) setFading((f) => [...f, current]);
                return {
                    id: ++idRef.current,
                    row,
                    col,
                    color: getRandomColor(),
                };
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            swingX,
            swingY,
            gridWidth,
            gridHeight,
            boxSize,
            cols,
            rows,
            colors,
            leave,
        ]
    );

    useLayoutEffect(() => {
        if (fading.length === 0) return;
        const timer = setTimeout(
            () => setFading((f) => f.slice(1)),
            outDuration * 1000
        );
        return () => clearTimeout(timer);
    }, [fading, outDuration]);

    const boxes = useMemo(() => {
        const rowsArray = new Array(rows).fill(1);
        const colsArray = new Array(cols).fill(1);
        return rowsArray.map((_, i) => (
            <div
                key={`row-${i}`}
                style={{
                    display: "flex",
                    borderLeft: border,
                    borderBottom: i === rows - 1 ? border : undefined,
                }}
            >
                {colsArray.map((_, j) => (
                    <div
                        key={`col-${j}`}
                        style={{
                            width: `${boxSize}px`,
                            height: `${boxSize}px`,
                            flexShrink: 0,
                            boxSizing: "border-box",
                            borderRight: border,
                            borderTop: border,
                        }}
                    />
                ))}
            </div>
        ));
    }, [rows, cols, boxSize, border]);

    const cellStyle = (cell: Cell): CSSProperties => ({
        position: "absolute",
        left: cell.col * boxSize,
        top: cell.row * boxSize,
        width: boxSize,
        height: boxSize,
        backgroundColor: cell.color,
        pointerEvents: "none",
    });

    return (
        <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={leave}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                backgroundColor,
            }}
        >
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    perspective: `${PERSPECTIVE}px`,
                    perspectiveOrigin: "center center",
                    transformStyle: "preserve-3d",
                }}
            >
                <div
                    style={{
                        transform: `translate(-50%, -50%) rotateY(${swingX}deg) rotateX(${swingY}deg)`,
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        display: "flex",
                        flexDirection: "column",
                        transformOrigin: "center center",
                        width: `${gridWidth}px`,
                        height: `${gridHeight}px`,
                        zIndex: 0,
                    }}
                >
                    {boxes}
                    {fading.map((cell) => (
                        <motion.div
                            key={cell.id}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: outDuration }}
                            style={cellStyle(cell)}
                        />
                    ))}
                    {lit && (
                        <motion.div
                            key={lit.id}
                            initial={{ opacity: inDuration > 0 ? 0 : 1 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: inDuration }}
                            style={cellStyle(lit)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

const __presetProps = {
  "colors": {
    "color1": "#FFA300",
    "color2": "#D0FF00",
    "color3": "#00FF5D",
    "color4": "#00FF91",
    "color5": "#FF0000",
    "color6": "#7900FF",
    "color7": "rgb(147 197 253)",
    "color8": "rgb(165 180 252)",
    "color9": "rgb(196 181 253)",
    "color10": "rgb(125 211 252)",
    "paletteCount": 6
  },
  "rotate": {
    "x": 0,
    "y": 0
  },
  "boxSize": 42,
  "borderColor": "#14141433",
  "borderWidth": 10,
  "backgroundColor": "rgba(0,0,0,1)"
};

export default function BackgroundBoxes(props: Record<string, unknown>) {
  return <__BaseImpl_BackgroundBoxes {...(__presetProps as Record<string, unknown>)} {...props} />;
}
