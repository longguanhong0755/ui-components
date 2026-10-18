"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

const GLYPHS: Record<string, string[]> = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};
const GW = 5;
const GH = 7;

interface Grid {
    cols: number;
    rows: number;
    cells: boolean[][];
}

function titleGrid(title: string): Grid {
    const chars = (title || "").split("").filter((c) => GLYPHS[c]);
    const src = chars.length ? chars : ["4", "0", "4"];
    const cols = src.length * GW + (src.length - 1);
    const cells: boolean[][] = [];
    for (let r = 0; r < GH; r++) {
        const row: boolean[] = new Array(cols).fill(false);
        src.forEach((ch, i) => {
            const bits = GLYPHS[ch];
            const off = i * (GW + 1);
            for (let c = 0; c < GW; c++) row[off + c] = bits[r][c] === "1";
        });
        cells.push(row);
    }
    return { cols, rows: GH, cells };
}

function drawNumber(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, px: number) {
    const s = String(Math.max(0, Math.round(n)));
    for (let i = 0; i < s.length; i++) {
        const bits = GLYPHS[s[i]];
        if (!bits) continue;
        const ox = x + i * (GW + 1) * px;
        for (let r = 0; r < GH; r++)
            for (let c = 0; c < GW; c++)
                if (bits[r][c] === "1") ctx.fillRect(ox + c * px, y + r * px, px, px);
    }
}

interface Colors {
    background?: string;
    ink?: string;
    accent?: string;
}
const DEFAULT_COLORS: Required<Colors> = {
    background: "#0d0d14",
    ink: "#ffffff",
    accent: "#57e0a0",
};

function mergeColors(c?: Colors): Required<Colors> {
    const out: Required<Colors> = { ...DEFAULT_COLORS };
    if (c)
        for (const k of Object.keys(out) as (keyof Colors)[]) {
            const v = c[k];
            if (typeof v === "string" && v) out[k] = v;
        }
    return out;
}

function cssColor(v: string): string {
    const s = v.trim();
    const m = /^var\(\s*--[^,)]*,\s*([\s\S]+)\)\s*$/.exec(s);
    return m ? m[1].trim() : s;
}

interface Pillar {
    x: number;
    gap: number; // gap centre, 0..1 of height
    scored: boolean;
}

interface World {
    pillars: Pillar[];
    y: number;
    vy: number;
    score: number;
    best: number;
    flash: number;
    played: boolean;
    idle: number;
    started: boolean;
    layoutKey: string;
}

const SCROLL = 230; // px/s at Speed 50
const SPACING = 360; // px between pillars
const PILLAR_W = 92;
const GRAV = 1750; // px/s^2 at Gravity 50
const FLAP = 560; // px/s at Gravity 50
const BIRD_X = 0.28;
const BIRD_R = 15;
const IDLE_RESUME = 3;

function newWorld(): World {
    return {
        pillars: [],
        y: 0,
        vy: 0,
        score: 0,
        best: 0,
        flash: 0,
        played: false,
        idle: 0,
        started: false,
        layoutKey: "",
    };
}

interface Props {
    colors?: Colors;
    speed?: number;
    gap?: number;
    gravity?: number;
    style?: React.CSSProperties;
}

export default function Flap404(props: Props) {
    const {
        colors,
        speed = 37,
        gap = 39,
        gravity = 50,
        style,
    } = props;

    const col = mergeColors(colors);
    const ink = cssColor(col.ink);
    const accent = cssColor(col.accent);
    const background = cssColor(col.background);

    const hostRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // The overlay (message + button) owns the bottom of the frame. Its height is
    // MEASURED, not guessed, because the Font control changes it: a designer who
    // sets 32px type would otherwise get the game drawn underneath their own
    // button. Everything the game draws lives above `h - insetRef.current`.
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const insetRef = useRef(0);
    const worldRef = useRef<World>(newWorld());
    const rafRef = useRef<number | null>(null);
    const lastRef = useRef(0);
    const hoverRef = useRef(false);
    const flapRef = useRef<() => void>(() => undefined);

    const cfg = useRef({ ink, accent, background, speed, gap, gravity });
    useLayoutEffect(() => {
        cfg.current = { ink, accent, background, speed, gap, gravity };
    }, [ink, accent, background, speed, gap, gravity]);

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 0;
        let h = 0;
        let ghost: Grid = titleGrid("404");
        let ghostCell = 0;
        let ghostX = 0;
        let ghostY = 0;

        const measure = (): boolean => {
            const cw = Math.max(1, canvas.clientWidth || host.offsetWidth);
            const ch = Math.max(1, canvas.clientHeight || host.offsetHeight);
            if (cw === w && ch === h) return false;
            w = cw;
            h = ch;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return true;
        };

        /** Height the game may use: everything above the overlay's own band. */
        const playH = () => Math.max(120, h - insetRef.current);

        const layoutGhost = () => {
            const key = "404|" + Math.round(w) + "x" + Math.round(h) + "|" + Math.round(insetRef.current);
            if (key === worldRef.current.layoutKey) return;
            worldRef.current.layoutKey = key;
            const ph = playH();
            ghost = titleGrid("404");
            ghostCell = Math.max(4, Math.min((w * 0.6) / ghost.cols, (ph * 0.5) / ghost.rows));
            ghostX = (w - ghostCell * ghost.cols) / 2;
            ghostY = (ph - ghostCell * ghost.rows) / 2;
        };

        const spawn = (x: number): Pillar => ({
            x,
            gap: 0.28 + Math.random() * 0.44,
            scored: false,
        });

        const reset = (world: World) => {
            world.pillars = [];
            for (let i = 0; i < 6; i++) world.pillars.push(spawn(w + 220 + i * SPACING));
            world.y = playH() / 2;
            world.vy = 0;
            world.best = Math.max(world.best, world.score);
            world.score = 0;
            world.started = false;
        };

        // `byUser` is what separates a tap from the autopilot's own flap. An
        // autopilot flap must NOT reset the idle timer, or the component would
        // read its own input as a player and never hand control back.
        const flap = (byUser: boolean) => {
            const world = worldRef.current;
            if (byUser) {
                world.played = true;
                world.idle = 0;
            }
            world.started = true;
            world.vy = -FLAP * Math.sqrt(Math.max(0.1, cfg.current.gravity / 50));
        };
        flapRef.current = () => flap(true);

        const step = (dt: number) => {
            const world = worldRef.current;
            const mul = cfg.current.speed / 50;
            const g = GRAV * (cfg.current.gravity / 50);
            const ph = playH();
            const gapPx = (ph * cfg.current.gap) / 100;
            const bx = w * BIRD_X;

            world.idle += dt;
            if (world.idle > IDLE_RESUME) world.played = false;
            if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 3);
            if (mul <= 0) return;

            // Autopilot: aim a little above the gap centre and only flap on the
            // way down, which is what stops it oscillating at the ceiling.
            if (!world.played) {
                let next: Pillar | null = null;
                for (const p of world.pillars)
                    if (p.x + PILLAR_W > bx - BIRD_R && (!next || p.x < next.x)) next = p;
                const target = next ? next.gap * ph - gapPx * 0.12 : ph / 2;
                if (world.y > target && world.vy > -60) flap(false);
                world.started = true;
            }

            if (!world.started) {
                // Idle bob before the first input, so a still frame is not a
                // bird sitting on the floor.
                world.y = ph / 2 + Math.sin(performance.now() / 520) * 14;
                world.vy = 0;
            } else {
                world.vy += g * dt;
                world.y += world.vy * dt;
            }

            for (const p of world.pillars) {
                p.x -= SCROLL * mul * dt;
                if (!p.scored && p.x + PILLAR_W < bx) {
                    p.scored = true;
                    world.score++;
                }
            }
            // Recycle rather than allocate: the array length never changes.
            for (const p of world.pillars)
                if (p.x + PILLAR_W < -40) {
                    let far = 0;
                    for (const q of world.pillars) far = Math.max(far, q.x);
                    p.x = far + SPACING;
                    p.gap = 0.28 + Math.random() * 0.44;
                    p.scored = false;
                }

            // Collision. Ceiling and floor kill too, or the autopilot can park.
            let dead = world.y < BIRD_R || world.y > ph - BIRD_R;
            if (!dead)
                for (const p of world.pillars) {
                    if (bx + BIRD_R < p.x || bx - BIRD_R > p.x + PILLAR_W) continue;
                    const gy = p.gap * ph;
                    if (world.y - BIRD_R < gy - gapPx / 2 || world.y + BIRD_R > gy + gapPx / 2) {
                        dead = true;
                        break;
                    }
                }
            if (dead) {
                world.flash = 1;
                reset(world);
            }
        };

        const paint = () => {
            const world = worldRef.current;
            const c = cfg.current;
            const ph = playH();
            const gapPx = (ph * c.gap) / 100;
            const bx = w * BIRD_X;

            ctx.globalAlpha = 1;
            ctx.fillStyle = c.background;
            ctx.fillRect(0, 0, w, h);

            // Pillars as solid columns. They were first drawn as a stack of
            // 22px blocks to echo the glyph's material; at this column width the
            // seams read as venetian blinds rather than blocks, and the partial
            // block at each end clipped to a sliver. Solid is the honest shape.
            ctx.globalAlpha = 1;
            ctx.fillStyle = c.ink;
            for (const p of world.pillars) {
                if (p.x > w || p.x + PILLAR_W < 0) continue;
                const gy = p.gap * ph;
                const topH = gy - gapPx / 2;
                const botY = gy + gapPx / 2;
                if (topH > 0) ctx.fillRect(p.x + 1, 0, PILLAR_W - 2, topH);
                if (botY < ph) ctx.fillRect(p.x + 1, botY, PILLAR_W - 2, ph - botY);
            }

            // Bird. Pitch reads off velocity, clamped so it never spins.
            const tilt = Math.max(-0.5, Math.min(1.1, world.vy / 900));
            ctx.save();
            ctx.translate(bx, world.y);
            ctx.rotate(tilt);
            ctx.fillStyle = c.accent;
            ctx.fillRect(-BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
            ctx.fillStyle = c.background;
            ctx.fillRect(BIRD_R * 0.1, -BIRD_R * 0.5, BIRD_R * 0.5, BIRD_R * 0.5);
            ctx.restore();

            ctx.fillStyle = c.ink;
            ctx.globalAlpha = 0.45;
            drawNumber(ctx, world.score, 28, 28, 3);
            ctx.globalAlpha = 1;

            if (world.flash > 0) {
                ctx.globalAlpha = world.flash * 0.35;
                ctx.fillStyle = c.accent;
                ctx.fillRect(0, 0, w, h);
                ctx.globalAlpha = 1;
            }
        };

        measure();
        layoutGhost();
        reset(worldRef.current);
        paint();

        const ro = new ResizeObserver(() => {
            if (measure()) {
                worldRef.current.layoutKey = "";
                layoutGhost();
                reset(worldRef.current);
                paint();
            }
        });
        ro.observe(host);

        lastRef.current = 0;
        const frame = (now: number) => {
            const prev = lastRef.current || now;
            lastRef.current = now;
            const dt = Math.min(0.05, (now - prev) / 1000);
            layoutGhost();
            if (dt > 0) step(dt);
            paint();
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);

        return () => {
            ro.disconnect();
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;

        const onDown = (e: PointerEvent) => {
            e.preventDefault();
            flapRef.current();
        };
        const onEnter = () => {
            hoverRef.current = true;
        };
        const onLeave = () => {
            hoverRef.current = false;
        };
        const onKey = (e: KeyboardEvent) => {
            const mine =
                hoverRef.current ||
                (typeof document !== "undefined" && document.activeElement === host);
            if (!mine) return;
            if (e.code === "Space" || e.code === "ArrowUp" || e.key === " " || e.key === "ArrowUp") {
                e.preventDefault();
                flapRef.current();
            }
        };

        canvas.addEventListener("pointerdown", onDown);
        host.addEventListener("pointerenter", onEnter);
        host.addEventListener("pointerleave", onLeave);
        window.addEventListener("keydown", onKey, { passive: false });
        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            host.removeEventListener("pointerenter", onEnter);
            host.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    // Measure the overlay rather than reserving a constant. offsetHeight only —
    // getBoundingClientRect would fold in the Framer canvas zoom and the
    // reserved band would grow as the designer zoomed in.
    useEffect(() => {
        const el = overlayRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            insetRef.current = el.offsetHeight;
        });
        ro.observe(el);
        insetRef.current = el.offsetHeight;
        return () => ro.disconnect();
    }, []);

    return (
        <div
            ref={hostRef}
            tabIndex={0}
            style={{
                position: "relative",
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                touchAction: "none",
                outline: "none",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100%", height: "100%", cursor: "pointer" }}
            />
            <div
                ref={overlayRef}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 18,
                    padding: 44,
                    pointerEvents: "none",
                }}
            >
                <a
                    href="/"
                    style={{
                        pointerEvents: "auto",
                        display: "inline-block",
                        padding: "14px 30px",
                        borderRadius: 999,
                        border: "1px solid " + ink,
                        color: ink,
                        background: "transparent",
                        textDecoration: "none",
                        cursor: "pointer",
                    }}
                >
                    Take me home
                </a>
            </div>
        </div>
    );
}
