"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * StackTower — drop the block, keep what overlaps.
 *
 * A block slides above the top of the tower; a click, tap, Space or Enter drops
 * it. Whatever hangs over the block below is SLICED OFF and falls away
 * spinning, so the next block is narrower than the last and every loss is
 * legibly the player's own. A drop inside the `Perfect Window` snaps flush,
 * pays a rising combo and gives a little width back, which is the only way a
 * run gets longer rather than shorter.
 *
 * Miss the tower entirely — no overlap at all — and the run ends.
 *
 * Each block carries one character of `Title` through a 5x7 bitmap font, so the
 * tower spells a word going up and a sliced block shows a sliced letter. That
 * is also the readout: a block worn down to a sliver of an "E" says more about
 * how the run is going than the score does.
 *
 * ONE LIFE, by nature. There is nothing to lose but the tower, so there is no
 * `Lives` dial — the same call FlapFlyer makes.
 *
 * SELF-PLAY from frame zero (see BrickBreaker for the reasoning): the Framer
 * canvas has no player, so the component plays itself, hands over on the first
 * real pointer or key, and takes control back after IDLE_RESUME seconds with
 * the pointer away. Its tolerance is a FRACTION of the current width, so the
 * tower it builds narrows geometrically and the run genuinely ends — a
 * self-play that cannot lose would never show the losing half of the game.
 */

// ---------------------------------------------------------------- glyph table

/**
 * 5x7 bitmap font. Digits, A-Z and a few marks, so `Title` can be any word —
 * "STACK", a brand, a number. Unknown characters are skipped.
 */
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
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "00000", "00100"],
    ":": ["00000", "00100", "00000", "00000", "00000", "00100", "00000"],
};
const GW = 5;
const GH = 7;

/**
 * Every renderable character of a Title, uppercased. Uppercasing first matters:
 * the table is caps-only, and filtering a lowercase word without it would make
 * a typed Title vanish rather than read wrong.
 */
function chars(title: string, fallback: string): string[] {
    const src = (title || "")
        .toUpperCase()
        .split("")
        .filter((c) => GLYPHS[c]);
    return src.length ? src : fallback.split("");
}

/** One glyph centred on a point. */
function drawGlyph(ctx: CanvasRenderingContext2D, ch: string, cx: number, cy: number, px: number) {
    const bits = GLYPHS[ch];
    if (!bits) return;
    const x0 = cx - (GW * px) / 2;
    const y0 = cy - (GH * px) / 2;
    for (let r = 0; r < GH; r++)
        for (let c = 0; c < GW; c++)
            if (bits[r][c] === "1") ctx.fillRect(x0 + c * px, y0 + r * px, px + 0.4, px + 0.4);
}

/** Bitmap text for the HUD. No font dependency, so the readout cannot reflow. */
function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, px: number) {
    const t = String(s).toUpperCase();
    let ox = x;
    for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (ch === " ") {
            ox += 4 * px;
            continue;
        }
        const bits = GLYPHS[ch];
        if (!bits) {
            ox += (GW + 1) * px;
            continue;
        }
        for (let r = 0; r < GH; r++)
            for (let c = 0; c < GW; c++)
                if (bits[r][c] === "1") ctx.fillRect(ox + c * px, y + r * px, px, px);
        ox += (GW + 1) * px;
    }
    return ox - x;
}

/** Width `drawText` will occupy, for right-aligning and centring a readout. */
function textWidth(s: string, px: number) {
    const t = String(s).toUpperCase();
    let w = 0;
    for (const ch of t) w += (ch === " " ? 4 : GW + 1) * px;
    return Math.max(0, w - px);
}

// --------------------------------------------------------------------- colors

/**
 * ControlType.Color emits `var(--token, rgb(...))`, which neither a hex parser
 * nor Canvas2D understands. Unwrap to the fallback.
 */
function cssColor(v: string): string {
    const s = (v || "").trim();
    const m = /^var\(\s*--[^,)]*,\s*([\s\S]+)\)\s*$/.exec(s);
    return m ? m[1].trim() : s;
}

// ---------------------------------------------------------------------- world

interface Block {
    /** Left edge, in screen x. */
    x: number;
    w: number;
    ch: string;
}

/** A sliced-off offcut, tumbling away. Carries its share of the block's glyph. */
interface Chip {
    x: number;
    y: number;
    w: number;
    vx: number;
    vy: number;
    rot: number;
    vr: number;
    /** Where the parent block's glyph centre sat, relative to this chip's own. */
    gdx: number;
    ch: string;
    life: number;
}

interface World {
    blocks: Block[];
    chips: Chip[];
    /** Left edge of the sliding block, and which way it is going. */
    sliderX: number;
    sliderW: number;
    dir: number;
    /** Seconds until another drop is accepted, so one tap is one block. */
    cool: number;
    score: number;
    best: number;
    combo: number;
    over: boolean;
    overT: number;
    /** Smoothed camera lift, in px of tower already climbed. */
    camY: number;
    played: boolean;
    idle: number;
    flash: number;
    layoutKey: string;
}

const BASE_SLIDE = 260; // px/s at Speed 50
const SLIDE_RAMP = 0.035; // +3.5% slider speed per block placed
const MAX_SLIDE_RAMP = 2.6;
const PERFECT_GIVE = 0.05; // fraction of the BASE width handed back on a perfect
const DROP_COOL = 0.16; // seconds between accepted drops
const CAM_K = 7; // camera smoothing, 1/s
const CHIP_LIFE = 2.2;
const SELF_TOL = 0.12; // self-play drops within 12% of the current width, so the
// tower it builds narrows geometrically and the run ends on its own
const OVER_AUTOPLAY = 2.4; // seconds the GAME OVER board is held before self-play restarts
const IDLE_RESUME = 12; // seconds after the pointer LEAVES before self-play
// resumes. Short values make the game fight a player who is simply thinking.

function newWorld(): World {
    return {
        blocks: [],
        chips: [],
        sliderX: 0,
        sliderW: 0,
        dir: 1,
        cool: 0,
        score: 0,
        best: 0,
        combo: 0,
        over: false,
        overT: 0,
        camY: 0,
        played: false,
        idle: 0,
        flash: 0,
        layoutKey: "",
    };
}

interface StackTowerProps {
    title?: string;
    background?: string;
    ink?: string;
    accent?: string;
    speed?: number;
    blockHeight?: number;
    perfect?: number;
    showHud?: boolean;
    attract?: boolean;
    style?: React.CSSProperties;
}

export default function StackTower(props: StackTowerProps) {
    const {
        title = "STACK",
        background = "#0d0d14",
        ink = "#ffffff",
        accent = "#ffb347",
        speed = 50,
        blockHeight = 34,
        perfect = 6,
        showHud = false,
        attract = true,
        style,
    } = props;

    const inkC = cssColor(ink);
    const accentC = cssColor(accent);
    const backgroundC = cssColor(background);

    const hostRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const worldRef = useRef<World>(newWorld());
    const rafRef = useRef<number | null>(null);
    const lastRef = useRef(0);
    const hoverRef = useRef(false);
    const dropRef = useRef(false); // set by input, consumed by the step

    // Every live input goes through a ref so a colour or speed edit never tears
    // the render loop down and restarts the tower mid-run.
    const cfg = useRef({ title, ink: inkC, accent: accentC, background: backgroundC, speed, blockHeight, perfect, showHud, attract });
    useLayoutEffect(() => {
        cfg.current = { title, ink: inkC, accent: accentC, background: backgroundC, speed, blockHeight, perfect, showHud, attract };
    }, [title, inkC, accentC, backgroundC, speed, blockHeight, perfect, showHud, attract]);

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 0;
        let h = 0;

        // Size off the canvas's own client box. The injected width/height props
        // are not numeric in preview, and getBoundingClientRect carries the
        // canvas zoom.
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

        const blockH = () => Math.max(8, Math.round(cfg.current.blockHeight));
        const baseW = () => w * 0.42;
        const groundY = () => h;

        /** Camera lift that puts the top of the tower at ~45% of the frame. */
        const camTarget = (world: World) =>
            Math.max(0, world.blocks.length * blockH() - h * 0.45);

        /** Slider rate for the height the run has reached. */
        const slideRate = (world: World) =>
            BASE_SLIDE *
            (cfg.current.speed / 50) *
            Math.min(MAX_SLIDE_RAMP, 1 + SLIDE_RAMP * world.blocks.length);

        /**
         * Screen y of the TOP edge of the block at index i.
         *
         * A camera standing at height `camY` puts a world point of height Y at
         * `groundY - Y + camY`, so the camera term ADDS. Subtracting it instead
         * makes the tower climb at twice its real rate and leave the top of the
         * frame within a few blocks, which reads as the game simply stopping.
         */
        const blockTop = (world: World, i: number) =>
            groundY() - (i + 1) * blockH() + world.camY;

        const spawnSlider = (world: World) => {
            const top = world.blocks[world.blocks.length - 1];
            world.sliderW = top.w;
            // Alternate the entry side so the run does not become one rhythm.
            const fromLeft = world.blocks.length % 2 === 0;
            world.sliderX = fromLeft ? 0 : w - world.sliderW;
            world.dir = fromLeft ? 1 : -1;
        };

        const reset = (world: World) => {
            const cs = chars(cfg.current.title, "STACK");
            world.blocks = [{ x: (w - baseW()) / 2, w: baseW(), ch: cs[0] }];
            world.chips = [];
            world.combo = 0;
            world.over = false;
            world.overT = 0;
            world.cool = 0;
            world.camY = camTarget(world);
            spawnSlider(world);
        };

        const restart = (world: World) => {
            world.best = Math.max(world.best, world.score);
            world.score = 0;
            reset(world);
        };

        const layout = (world: World, force: boolean) => {
            const key =
                cfg.current.title + "|" + Math.round(w) + "x" + Math.round(h) + "|" + blockH();
            if (!force && key === world.layoutKey) return;
            world.layoutKey = key;
            restart(world);
        };

        /** Drop the sliding block onto the tower. */
        const drop = (world: World) => {
            const top = world.blocks[world.blocks.length - 1];
            const bh = blockH();
            const left = Math.max(top.x, world.sliderX);
            const right = Math.min(top.x + top.w, world.sliderX + world.sliderW);
            const overlap = right - left;

            if (overlap <= 0) {
                // Missed the tower entirely. The whole block becomes an offcut so
                // the failure is visible as a thing falling, not as a freeze.
                world.chips.push({
                    x: world.sliderX,
                    y: blockTop(world, world.blocks.length),
                    w: world.sliderW,
                    vx: world.dir * 90,
                    vy: -40,
                    rot: 0,
                    vr: world.dir * 3,
                    gdx: 0,
                    ch: world.blocks[world.blocks.length - 1].ch,
                    life: CHIP_LIFE,
                });
                world.over = true;
                world.overT = 0;
                world.flash = 1;
                world.best = Math.max(world.best, world.score);
                return;
            }

            const off = world.sliderX - top.x;
            const winPx = (Math.max(1, Math.round(cfg.current.perfect)) / 100) * top.w;
            const isPerfect = Math.abs(off) <= winPx;

            let nx = left;
            let nw = overlap;
            if (isPerfect) {
                // Snap flush and hand a little width back — the only way a run
                // gets longer instead of shorter.
                nx = top.x;
                nw = Math.min(baseW(), top.w + baseW() * PERFECT_GIVE);
                world.combo++;
                world.score += 1 + world.combo;
            } else {
                world.combo = 0;
                world.score += 1;
                // The offcut: whichever side hung over.
                const cutLeft = world.sliderX < top.x;
                const cx = cutLeft ? world.sliderX : right;
                const cw = cutLeft ? top.x - world.sliderX : world.sliderX + world.sliderW - right;
                if (cw > 0.5)
                    world.chips.push({
                        x: cx,
                        y: blockTop(world, world.blocks.length),
                        w: cw,
                        vx: (cutLeft ? -1 : 1) * (60 + Math.random() * 60),
                        vy: -30,
                        rot: 0,
                        vr: (cutLeft ? -1 : 1) * (2 + Math.random() * 2),
                        // Where the parent's glyph centre sat, relative to this
                        // chip's own centre — so a sliced letter stays sliced.
                        gdx: world.sliderX + world.sliderW / 2 - (cx + cw / 2),
                        ch: world.blocks[world.blocks.length - 1].ch,
                        life: CHIP_LIFE,
                    });
            }

            const cs = chars(cfg.current.title, "STACK");
            world.blocks.push({ x: nx, w: nw, ch: cs[world.blocks.length % cs.length] });
            void bh;
            spawnSlider(world);
            world.cool = DROP_COOL;
        };

        const step = (dt: number) => {
            const world = worldRef.current;
            const mul = cfg.current.speed / 50;

            // PRESENCE holds control, not action. While the pointer is over the
            // component self-play stays off, however long the visitor sits still
            // — reading the slider and waiting for it to line up is several
            // seconds of no input, and treating that as "they left" is what
            // makes a game read as a demo that fights you.
            if (hoverRef.current) {
                world.played = true;
                world.idle = 0;
            }
            world.idle += dt;
            if (world.idle > IDLE_RESUME) world.played = false;
            if (!cfg.current.attract) world.played = true;

            if (mul <= 0) return;

            if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 3);
            if (world.cool > 0) world.cool = Math.max(0, world.cool - dt);

            // Offcuts keep falling on the GAME OVER board, so the last mistake
            // stays visible rather than freezing mid-air.
            for (const c of world.chips) {
                c.vy += 1500 * dt;
                c.x += c.vx * dt;
                c.y += c.vy * dt;
                c.rot += c.vr * dt;
                c.life -= dt;
            }
            for (let i = world.chips.length - 1; i >= 0; i--)
                if (world.chips[i].life <= 0 || world.chips[i].y > h + 200) world.chips.splice(i, 1);

            if (world.over) {
                world.overT += dt;
                const auto = cfg.current.attract && !world.played && world.overT > OVER_AUTOPLAY;
                if (dropRef.current || auto) {
                    dropRef.current = false;
                    restart(world);
                }
                return;
            }

            // ---- slider
            const rate = slideRate(world);
            world.sliderX += world.dir * rate * dt;
            if (world.sliderX <= 0) {
                world.sliderX = 0;
                world.dir = 1;
            } else if (world.sliderX + world.sliderW >= w) {
                world.sliderX = w - world.sliderW;
                world.dir = -1;
            }

            // ---- camera
            const ct = camTarget(world);
            world.camY += (ct - world.camY) * Math.min(1, CAM_K * dt);

            // ---- drop, by player or by self-play
            let wantDrop = dropRef.current;
            dropRef.current = false;
            if (!world.played && !wantDrop) {
                const top = world.blocks[world.blocks.length - 1];
                const off = world.sliderX - top.x;
                // Tolerance is a FRACTION of the current width, not a constant,
                // so the tower narrows geometrically and the run ends. A fixed
                // pixel tolerance would let self-play stack forever.
                if (Math.abs(off) < top.w * SELF_TOL) wantDrop = true;
            }
            if (wantDrop && world.cool <= 0) drop(world);
        };

        const paint = () => {
            const world = worldRef.current;
            const c = cfg.current;
            const bh = blockH();
            const gpx = Math.max(1, (bh * 0.62) / GH);

            ctx.globalAlpha = 1;
            ctx.fillStyle = c.background;
            ctx.fillRect(0, 0, w, h);

            /** A block plus its knocked-out character, clipped to the block. */
            const plate = (x: number, y: number, bw: number, ch: string, fill: string) => {
                if (y > h || y + bh < 0 || bw <= 0.5) return;
                ctx.fillStyle = fill;
                ctx.fillRect(x, y, bw, bh - 1);
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, bw, bh - 1);
                ctx.clip();
                ctx.fillStyle = c.background;
                drawGlyph(ctx, ch, x + bw / 2, y + bh / 2, gpx);
                ctx.restore();
            };

            // Tower, deepest first, fading with depth so the stack recedes.
            for (let i = 0; i < world.blocks.length; i++) {
                const b = world.blocks[i];
                const depth = world.blocks.length - 1 - i;
                ctx.globalAlpha = Math.max(0.28, 1 - depth * 0.06);
                plate(b.x, blockTop(world, i), b.w, b.ch, c.ink);
            }
            ctx.globalAlpha = 1;

            // Offcuts.
            for (const ch of world.chips) {
                const a = Math.max(0, Math.min(1, ch.life / 0.6));
                ctx.globalAlpha = a * 0.85;
                ctx.save();
                ctx.translate(ch.x + ch.w / 2, ch.y + bh / 2);
                ctx.rotate(ch.rot);
                ctx.fillStyle = c.ink;
                ctx.fillRect(-ch.w / 2, -bh / 2, ch.w, bh - 1);
                ctx.save();
                ctx.beginPath();
                ctx.rect(-ch.w / 2, -bh / 2, ch.w, bh - 1);
                ctx.clip();
                ctx.fillStyle = c.background;
                drawGlyph(ctx, ch.ch, ch.gdx, 0, gpx);
                ctx.restore();
                ctx.restore();
            }
            ctx.globalAlpha = 1;

            // The sliding block, in accent so the live piece is never in doubt.
            if (!world.over) {
                const cs = chars(c.title, "STACK");
                plate(
                    world.sliderX,
                    blockTop(world, world.blocks.length),
                    world.sliderW,
                    cs[world.blocks.length % cs.length],
                    c.accent
                );
            }

            // ---- HUD
            if (c.showHud) {
                const px = 3;
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = c.ink;
                drawText(ctx, String(world.score), 28, 28, px);
                const bestStr = "BEST " + Math.max(world.best, world.score);
                drawText(ctx, bestStr, w - 28 - textWidth(bestStr, px), 28, px);
                ctx.globalAlpha = 1;
                if (world.combo > 1) {
                    ctx.fillStyle = c.accent;
                    drawText(ctx, "X" + world.combo, 28, 28 + GH * px + 10, px);
                }
            }

            if (world.over) {
                const px = Math.max(4, Math.min(10, Math.round(w / 150)));
                const s = "GAME OVER";
                ctx.globalAlpha = 1;
                ctx.fillStyle = c.accent;
                drawText(ctx, s, (w - textWidth(s, px)) / 2, h / 2 - GH * px, px);
                const sub = "HEIGHT " + world.score;
                const spx = Math.max(2, Math.round(px / 2));
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = c.ink;
                drawText(ctx, sub, (w - textWidth(sub, spx)) / 2, h / 2 + GH * px * 0.6, spx);
                ctx.globalAlpha = 1;
            }

            if (world.flash > 0) {
                ctx.globalAlpha = world.flash * 0.3;
                ctx.fillStyle = c.accent;
                ctx.fillRect(0, 0, w, h);
                ctx.globalAlpha = 1;
            }
        };

        measure();
        layout(worldRef.current, true);
        // Frame zero before the loop decides anything — a static render has to
        // be a correct still, not an empty one.
        paint();

        const ro = new ResizeObserver(() => {
            if (measure()) {
                layout(worldRef.current, true);
                paint();
            }
        });
        ro.observe(host);

        lastRef.current = 0;
        const frame = (now: number) => {
            const prev = lastRef.current || now;
            lastRef.current = now;
            const dt = Math.min(0.05, (now - prev) / 1000);
            layout(worldRef.current, false);
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

    // Input. One verb: drop. Space and Enter are answered ONLY while the pointer
    // is over the host or it holds focus — claiming Space on window for a
    // component nobody is looking at would break the page's own scrolling.
    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;

        const takeOver = () => {
            const world = worldRef.current;
            world.played = true;
            world.idle = 0;
        };
        const onDown = (e: PointerEvent) => {
            e.preventDefault();
            dropRef.current = true;
            takeOver();
        };
        const onEnter = () => {
            hoverRef.current = true;
            takeOver();
        };
        const onMove = () => {
            hoverRef.current = true;
            takeOver();
        };
        const onLeave = () => {
            hoverRef.current = false;
        };
        const mine = () => hoverRef.current || (typeof document !== "undefined" && document.activeElement === host);
        const onKey = (e: KeyboardEvent) => {
            if (!mine()) return;
            if (e.code === "Space" || e.key === " " || e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                dropRef.current = true;
                takeOver();
            }
        };

        canvas.addEventListener("pointerdown", onDown);
        host.addEventListener("pointerenter", onEnter);
        host.addEventListener("pointermove", onMove);
        host.addEventListener("pointerleave", onLeave);
        window.addEventListener("keydown", onKey, { passive: false });
        return () => {
            canvas.removeEventListener("pointerdown", onDown);
            host.removeEventListener("pointerenter", onEnter);
            host.removeEventListener("pointermove", onMove);
            host.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div
            ref={hostRef}
            tabIndex={0}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: backgroundC,
                touchAction: "none",
                outline: "none",
                ...style,
            }}
        >
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", cursor: "pointer" }} />
        </div>
    );
}
