"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, type CSSProperties } from "react";

const DEFAULTS = {
    label: "WATER BUTTON",
    textColor: "#000000",
    paddingX: 64,
    paddingY: 38,
    rounded: 100,
    glass: {
        tint: "rgba(214, 194, 162, 0.12)",
        blur: 40,
        frost: 100,
    },
    waterAmount: 69,
    waterColor: "#00EEFF",
    border: true,
    borderOptions: {
        color: "rgba(120, 120, 120, 0.7)",
        stroke: 1,
    },
    shadow: true,
    shadowOptions: {
        color: "#141A1F",
        intensity: 0,
    },
    press: true,
};

const DEFAULT_FONT: CSSProperties = {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: "-0.01em",
};

/* ---------------------------------------------------------------------------
 * Water: 1D shallow water, on a staggered grid.
 *
 *   h[i]  depth of column i          (COLUMNS cells, measured up off the floor)
 *   u[i]  velocity at face i         (COLUMNS + 1 faces; the walls are 0)
 *
 * Two equations: water accelerates down the slope of its own surface, and mass
 * moves between columns by flux. That second one is the whole point — water
 * that leaves one column ARRIVES in another, so the level tips, piles against
 * the far wall and sloshes back. A surface of springs cannot do that: each
 * column only bobs in place, which is exactly what read as rubber rather than
 * liquid.
 *
 * Mass is conserved to machine precision, so Water % stays honest no matter how
 * hard it is stirred.
 * ------------------------------------------------------------------------- */

const COLUMNS = 64;
const SUBSTEPS = 6;
const GRAVITY = 6000;
const VISCOSITY = 2.6;
const CURSOR_REACH = 46;
const SWEEP_FORCE = 3;
const DIP_FORCE = 1.5;
const CLICK_FORCE = 260;
const MAX_KICK = 8;
const MAX_FILL = 0.9;
const STILL = 0.05;
const SLEEP_FRAMES = 20;

/* ---------------------------------------------------------------------------
 * Spray.
 *
 * A height field cannot break. h[i] is ONE depth per column, so the surface is
 * single-valued by construction: it can fold nowhere, and nothing can exist
 * above it. Flow it can do; fly it cannot, ever, at any setting.
 *
 * So the water that leaves the surface stops being a height field and becomes a
 * droplet — plain ballistics, no solver. Torn off where the cursor rips through
 * or where a wave outruns itself, and poured back into whichever column it lands
 * in. Each droplet carries its volume out of the water and back into it, so the
 * two halves together still conserve mass exactly.
 * ------------------------------------------------------------------------- */

const MAX_DROPS = 96;
const DROP_GRAVITY = 1400;
const DROP_DRAG = 0.6;
const DROP_VOLUME = 0.18;
const DROP_RADIUS = 1.25;
const SPRAY_THRESHOLD = 1.6;
const SPRAY_RATE = 0.5;
const SPRAY_PER_FRAME = 4;
const SPRAY_LIFT = 150;
const BREAK_SPEED = 210;
const MIN_SPRAY_DEPTH = 2;

const RIPPLE = 1;

const MAX_PIXEL_SCALE = 8;
const MAX_PIXELS = 2_000_000;

interface Glass {
    tint: string;
    blur: number;
    frost: number;
}

interface BorderOptions {
    color: string;
    stroke: number;
}

interface ShadowOptions {
    color: string;
    intensity: number;
}

interface MetallicButtonProps {
    label?: string;
    font?: CSSProperties;
    textColor?: string;
    paddingX?: number;
    paddingY?: number;
    rounded?: number;
    glass?: Glass;
    waterAmount?: number;
    waterColor?: string;
    border?: boolean;
    borderOptions?: BorderOptions;
    shadow?: boolean;
    shadowOptions?: ShadowOptions;
    press?: boolean;
    style?: CSSProperties;
}

/**
 * A seven-stop shadow ramp: each step further out and fainter, which is what
 * reads as a real object casting light rather than a flat blur.
 *
 * Intensity scales the ALPHA of every stop and leaves the geometry alone. The
 * ramp is the whole point — shrinking the offsets instead would collapse seven
 * carefully spaced stops back into one flat blur on the way down.
 *
 * The colour's OWN alpha multiplies in on top, so a translucent pick fades the
 * whole ramp rather than being quietly ignored.
 */
const dropShadow = (color: string, intensity: number) => {
    const k = Math.min(100, Math.max(0, intensity)) / 100;
    const [r, g, b, a] = parseColor(color);
    const tone = (alpha: number) =>
        `rgba(${r}, ${g}, ${b}, ${(alpha * k * a).toFixed(4)})`;
    return [
        `0 0 0.75px ${tone(0.2)}`,
        `0.7px 0.8px 1.2px -0.4px ${tone(0.1)}`,
        `1.3px 1.5px 2.2px -0.8px ${tone(0.1)}`,
        `2.3px 2.6px 3.9px -1.2px ${tone(0.1)}`,
        `3.9px 4.4px 6.6px -1.7px ${tone(0.1)}`,
        `6.5px 7.2px 10.9px -2.1px ${tone(0.1)}`,
        `8px 9px 14px -2.5px ${tone(0.2)}`,
    ].join(", ");
};

/** Colors arrive as hex or rgb/rgba; fold either to [r, g, b, a]. */
function parseColor(color: string): [number, number, number, number] {
    const value = (color ?? "").trim();
    const hex = value.replace("#", "");
    if (/^[0-9a-f]{6}$/i.test(hex)) {
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16),
            1,
        ];
    }
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (match) {
        const parts = match[1].split(",").map((p) => parseFloat(p));
        return [
            parts[0] || 0,
            parts[1] || 0,
            parts[2] || 0,
            parts[3] === undefined ? 1 : parts[3],
        ];
    }
    return [62, 155, 214, 1];
}

/** Cap one frame of cursor motion, so a mouse jump cannot detonate the surface. */
const clampKick = (value: number) =>
    Math.max(-MAX_KICK, Math.min(MAX_KICK, value));

/** Lighten (f > 0) or darken (f < 0) a channel toward white or black. */
const shift = (channel: number, f: number) =>
    Math.round(
        Math.max(
            0,
            Math.min(255, channel + (f > 0 ? (255 - channel) * f : channel * f))
        )
    );

/**
 * Trace a rounded rectangle. The button's own shape — it bounds the water, and
 * it draws the rim, so the two can never disagree about where the glass is.
 */
function roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
) {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/**
 * Glass Button
 *
 * A pane of glass part-filled with water, level and dead still. The sim switches
 * itself off once it settles, so nothing creeps or simmers. Run the cursor over
 * it and the surface is dragged and split into ripples that travel out, bounce
 * off the ends and cross back through each other; stop, and it levels off and
 * freezes again.
 *
 * The glass is a frosted backdrop blur plus a gradient edge. A backdrop filter
 * needs something behind it: over a flat fill there is nothing to refract, so
 * Blur will look like it does nothing. Put it over a photo or a gradient.
 */
function __BaseImpl_MetallicButton(props: MetallicButtonProps) {
    const {
        label = DEFAULTS.label,
        font,
        textColor = DEFAULTS.textColor,
        paddingX = DEFAULTS.paddingX,
        paddingY = DEFAULTS.paddingY,
        rounded = DEFAULTS.rounded,
        glass = DEFAULTS.glass,
        waterAmount = DEFAULTS.waterAmount,
        waterColor = DEFAULTS.waterColor,
        border = DEFAULTS.border,
        borderOptions = DEFAULTS.borderOptions,
        shadow = DEFAULTS.shadow,
        shadowOptions = DEFAULTS.shadowOptions,
        press = DEFAULTS.press,
        style,
    } = props;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const tint = glass?.tint ?? DEFAULTS.glass.tint;
    const blur = glass?.blur ?? DEFAULTS.glass.blur;
    const frost = glass?.frost ?? DEFAULTS.glass.frost;
    const borderColor = borderOptions?.color ?? DEFAULTS.borderOptions.color;
    const borderStroke = Math.max(
        0,
        borderOptions?.stroke ?? DEFAULTS.borderOptions.stroke
    );
    const shadowColor = shadowOptions?.color ?? DEFAULTS.shadowOptions.color;
    const shadowIntensity =
        shadowOptions?.intensity ?? DEFAULTS.shadowOptions.intensity;

    const typography: CSSProperties = {
        ...DEFAULT_FONT,
        ...font,
    };

    useEffect(() => {
        const rootEl = rootRef.current;
        const canvasEl = canvasRef.current;
        if (!rootEl || !canvasEl) return;
        const context = canvasEl.getContext("2d");
        if (!context) return;
        const root: HTMLDivElement = rootEl;
        const canvas: HTMLCanvasElement = canvasEl;
        const ctx: CanvasRenderingContext2D = context;

        let alive = true;
        let raf = 0;
        let last = 0;
        let pixScale = 1;
        let W = 0;
        let H = 0;

        const h = new Float32Array(COLUMNS);
        const u = new Float32Array(COLUMNS + 1);
        const flux = new Float32Array(COLUMNS + 1);
        let rest = 0;
        let colW = 1;

        const dropX = new Float32Array(MAX_DROPS);
        const dropY = new Float32Array(MAX_DROPS);
        const dropVX = new Float32Array(MAX_DROPS);
        const dropVY = new Float32Array(MAX_DROPS);
        const dropLive = new Uint8Array(MAX_DROPS);
        let flying = 0;

        let hovering = false;
        let asleep = false;
        let quiet = 0;
        const pointer = { x: -9999, y: -9999, vx: 0, vy: 0 };

        const amount = Math.min(MAX_FILL, Math.max(0, waterAmount / 100));
        const ripple = RIPPLE;

        const [cr, cg, cb, ca] = parseColor(waterColor);
        const surfaceTone = `rgba(${shift(cr, 0.45)}, ${shift(cg, 0.45)}, ${shift(cb, 0.45)}, ${ca})`;
        const bodyTone = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;
        const depthTone = `rgba(${shift(cr, -0.35)}, ${shift(cg, -0.35)}, ${shift(cb, -0.35)}, ${ca})`;
        const glintTone = `rgba(${shift(cr, 0.75)}, ${shift(cg, 0.75)}, ${shift(cb, 0.75)}, ${Math.min(1, ca + 0.25)})`;

        const [rr, rg, rb, ra] = parseColor(borderColor);
        const borderTone = `rgba(${rr}, ${rg}, ${rb}, ${ra})`;
        const borderBase = `rgba(${rr}, ${rg}, ${rb}, ${ra * 0.35})`;
        const borderFade = `rgba(${rr}, ${rg}, ${rb}, 0)`;

        const colX = (i: number) => (i + 0.5) * colW;

        function pixelScale() {
            const rect = root.getBoundingClientRect();
            const zoom = rect.width > 1 && W > 1 ? rect.width / W : 1;
            let s = Math.min(
                MAX_PIXEL_SCALE,
                (window.devicePixelRatio || 1) * zoom
            );
            const area = Math.max(1, W * H);
            if (area * s * s > MAX_PIXELS) s = Math.sqrt(MAX_PIXELS / area);
            return Math.max(1, s);
        }

        function raster() {
            pixScale = pixelScale();
            canvas.width = Math.round(W * pixScale);
            canvas.height = Math.round(H * pixScale);
            ctx.setTransform(pixScale, 0, 0, pixScale, 0, 0);
        }

        function build() {
            W = Math.max(2, root.clientWidth);
            H = Math.max(2, root.clientHeight);
            raster();

            colW = W / COLUMNS;
            rest = H * amount;
            h.fill(rest);
            u.fill(0);
            dropLive.fill(0);
            flying = 0;
            asleep = true;
            quiet = 0;
        }

        function freeze() {
            h.fill(rest);
            u.fill(0);
            dropLive.fill(0);
            flying = 0;
            asleep = true;
            quiet = 0;
        }

        function drive(dt: number) {
            const reach = CURSOR_REACH;
            const kx = clampKick(pointer.vx) * 60;
            const ky = clampKick(pointer.vy) * 60;
            const first = Math.max(1, Math.floor((pointer.x - reach) / colW));
            const last = Math.min(
                COLUMNS - 1,
                Math.ceil((pointer.x + reach) / colW)
            );
            for (let i = first; i <= last; i++) {
                const dx = i * colW - pointer.x;
                const fall = 1 - Math.abs(dx) / reach;
                if (fall <= 0) continue;
                if (pointer.y < H - h[i] - reach) continue;
                const bite = fall * ripple * dt;
                u[i] += kx * SWEEP_FORCE * bite;
                u[i] += Math.sign(dx) * ky * DIP_FORCE * bite;
            }
        }

        function splash(px: number) {
            const reach = CURSOR_REACH;
            const first = Math.max(1, Math.floor((px - reach) / colW));
            const last = Math.min(COLUMNS - 1, Math.ceil((px + reach) / colW));
            for (let i = first; i <= last; i++) {
                const dx = i * colW - px;
                const fall = 1 - Math.abs(dx) / reach;
                if (fall <= 0) continue;
                u[i] += Math.sign(dx || 1) * CLICK_FORCE * fall * ripple;
            }
        }

        function tear(i: number, vx: number, vy: number) {
            if (h[i] <= MIN_SPRAY_DEPTH) return;
            let slot = -1;
            for (let d = 0; d < MAX_DROPS; d++) {
                if (!dropLive[d]) {
                    slot = d;
                    break;
                }
            }
            if (slot < 0) return;

            dropLive[slot] = 1;
            flying++;
            dropX[slot] = colX(i);
            dropY[slot] = H - h[i] - DROP_RADIUS;
            dropVX[slot] = vx;
            dropVY[slot] = vy;
            h[i] -= DROP_VOLUME / colW;
        }

        function spray(dt: number) {
            if (hovering) {
                const kx = clampKick(pointer.vx);
                const ky = clampKick(pointer.vy);
                const speed = Math.abs(kx) + Math.abs(ky);
                if (speed > SPRAY_THRESHOLD) {
                    const want = Math.min(
                        SPRAY_PER_FRAME,
                        Math.round(
                            (speed - SPRAY_THRESHOLD) * SPRAY_RATE * ripple
                        )
                    );
                    for (let k = 0; k < want; k++) {
                        const x =
                            pointer.x +
                            (Math.random() - 0.5) * CURSOR_REACH * 0.7;
                        const i = Math.max(
                            0,
                            Math.min(COLUMNS - 1, Math.floor(x / colW))
                        );
                        if (pointer.y < H - h[i] - CURSOR_REACH * 0.5) continue;
                        tear(
                            i,
                            kx * 60 * 0.45 + (Math.random() - 0.5) * 70,
                            -(SPRAY_LIFT * (0.6 + Math.random() * 0.9)) +
                                ky * 60 * 0.25
                        );
                    }
                }
            }

            for (let i = 1; i < COLUMNS - 1; i++) {
                const flow = Math.abs(u[i]);
                if (flow < BREAK_SPEED) continue;
                if (
                    Math.random() >
                    (flow - BREAK_SPEED) * 0.004 * ripple * dt * 60
                )
                    continue;
                tear(
                    i,
                    u[i] * 0.5 + (Math.random() - 0.5) * 40,
                    -(SPRAY_LIFT * 0.5 * (0.5 + Math.random()))
                );
            }
        }

        function fall(dt: number) {
            if (flying === 0) return;
            for (let d = 0; d < MAX_DROPS; d++) {
                if (!dropLive[d]) continue;
                dropVY[d] += DROP_GRAVITY * dt;
                dropVX[d] -= dropVX[d] * Math.min(1, DROP_DRAG * dt);
                dropX[d] += dropVX[d] * dt;
                dropY[d] += dropVY[d] * dt;

                if (dropX[d] < 0) {
                    dropX[d] = 0;
                    dropVX[d] = -dropVX[d] * 0.35;
                } else if (dropX[d] > W) {
                    dropX[d] = W;
                    dropVX[d] = -dropVX[d] * 0.35;
                }

                const i = Math.max(
                    0,
                    Math.min(COLUMNS - 1, Math.floor(dropX[d] / colW))
                );
                if (dropVY[d] > 0 && dropY[d] >= H - h[i]) {
                    h[i] += DROP_VOLUME / colW;
                    if (i > 0 && i < COLUMNS) u[i] += dropVX[d] * 0.25;
                    dropLive[d] = 0;
                    flying--;
                }
            }
        }

        function step(dt: number) {
            spray(dt);
            fall(dt);

            const sub = dt / SUBSTEPS;
            for (let s = 0; s < SUBSTEPS; s++) {
                if (hovering) drive(sub);

                for (let i = 1; i < COLUMNS; i++) {
                    u[i] += ((-GRAVITY * (h[i] - h[i - 1])) / colW) * sub;
                    u[i] -= u[i] * Math.min(1, VISCOSITY * sub);
                }
                u[0] = 0;
                u[COLUMNS] = 0;

                for (let i = 1; i < COLUMNS; i++) {
                    flux[i] = (u[i] > 0 ? h[i - 1] : h[i]) * u[i];
                }
                flux[0] = 0;
                flux[COLUMNS] = 0;

                for (let i = 0; i < COLUMNS; i++) {
                    h[i] -= ((flux[i + 1] - flux[i]) / colW) * sub;
                    if (h[i] < 0) h[i] = 0;
                }
            }

            let worst = 0;
            for (let i = 0; i < COLUMNS; i++) {
                const off = Math.abs(h[i] - rest);
                if (off > worst) worst = off;
            }
            return worst;
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            ctx.save();
            roundRectPath(ctx, 0, 0, W, H, rounded);
            ctx.clip();

            const surfaceAt = (i: number) => H - h[i];

            ctx.beginPath();
            ctx.moveTo(0, surfaceAt(0));
            for (let i = 0; i < COLUMNS; i++) ctx.lineTo(colX(i), surfaceAt(i));
            ctx.lineTo(W, surfaceAt(COLUMNS - 1));
            ctx.lineTo(W, H);
            ctx.lineTo(0, H);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, H - rest, 0, H);
            grad.addColorStop(0, surfaceTone);
            grad.addColorStop(0.35, bodyTone);
            grad.addColorStop(1, depthTone);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, surfaceAt(0));
            for (let i = 0; i < COLUMNS; i++) ctx.lineTo(colX(i), surfaceAt(i));
            ctx.lineTo(W, surfaceAt(COLUMNS - 1));
            ctx.strokeStyle = glintTone;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (flying > 0) {
                ctx.beginPath();
                for (let d = 0; d < MAX_DROPS; d++) {
                    if (!dropLive[d]) continue;
                    ctx.moveTo(dropX[d] + DROP_RADIUS, dropY[d]);
                    ctx.arc(dropX[d], dropY[d], DROP_RADIUS, 0, Math.PI * 2);
                }
                ctx.fillStyle = surfaceTone;
                ctx.fill();
            }

            ctx.restore();

            if (!border || borderStroke <= 0) return;

            const half = borderStroke / 2;
            roundRectPath(
                ctx,
                half,
                half,
                W - borderStroke,
                H - borderStroke,
                rounded - half
            );
            ctx.lineWidth = borderStroke;

            ctx.strokeStyle = borderBase;
            ctx.stroke();

            const rim = ctx.createLinearGradient(W, H, 0, 0);
            rim.addColorStop(0, borderTone);
            rim.addColorStop(0.3, borderFade);
            rim.addColorStop(0.7, borderFade);
            rim.addColorStop(1, borderTone);
            ctx.strokeStyle = rim;
            ctx.stroke();
        }

        function loop(now: number) {
            if (!alive) return;
            const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
            last = now;

            pointer.vx *= 0.8;
            pointer.vy *= 0.8;

            if (!asleep) {
                const worst = step(dt);
                draw();

                if (!hovering && flying === 0 && worst < STILL) quiet++;
                else quiet = 0;
                if (quiet > SLEEP_FRAMES) {
                    freeze();
                    draw();
                }
            }
            raf = requestAnimationFrame(loop);
        }

        const wake = () => {
            asleep = false;
            quiet = 0;
        };
        const toLocal = (e: MouseEvent) => {
            const rect = root.getBoundingClientRect();
            const sx = rect.width > 0 ? W / rect.width : 1;
            const sy = rect.height > 0 ? H / rect.height : 1;
            return {
                x: (e.clientX - rect.left) * sx,
                y: (e.clientY - rect.top) * sy,
            };
        };
        const onEnter = (e: MouseEvent) => {
            hovering = true;
            const p = toLocal(e);
            pointer.x = p.x;
            pointer.y = p.y;
            pointer.vx = 0;
            pointer.vy = 0;
            wake();
        };
        const onMove = (e: MouseEvent) => {
            const p = toLocal(e);
            pointer.vx = p.x - pointer.x;
            pointer.vy = p.y - pointer.y;
            pointer.x = p.x;
            pointer.y = p.y;
            wake();
        };
        const onLeave = () => {
            hovering = false;
            pointer.x = -9999;
            pointer.y = -9999;
            pointer.vx = 0;
            pointer.vy = 0;
            wake();
        };
        const onDown = (e: MouseEvent) => {
            const p = toLocal(e);
            pointer.x = p.x;
            pointer.y = p.y;
            splash(p.x);
            wake();
        };

        root.addEventListener("mouseenter", onEnter);
        root.addEventListener("mousemove", onMove);
        root.addEventListener("mouseleave", onLeave);
        root.addEventListener("pointerdown", onDown);

        const observer = new ResizeObserver(() => {
            build();
            draw();
        });
        observer.observe(root);

        const probe = window.setInterval(() => {
            if (!alive) return;
            if (Math.abs(pixelScale() - pixScale) < 0.02) return;
            raster();
            draw();
        }, 300);

        build();
        draw();
        raf = requestAnimationFrame(loop);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            clearInterval(probe);
            root.removeEventListener("mouseenter", onEnter);
            root.removeEventListener("mousemove", onMove);
            root.removeEventListener("mouseleave", onLeave);
            root.removeEventListener("pointerdown", onDown);
            observer.disconnect();
        };
    }, [
        waterAmount,
        waterColor,
        border,
        borderColor,
        borderStroke,
        paddingX,
        paddingY,
        rounded,
        label,
    ]);

    return (
        <motion.div
            ref={rootRef}
            whileTap={press ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            style={{
                ...style,
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "fit-content",
                padding: `${paddingY}px ${paddingX}px`,
                boxSizing: "border-box",
                borderRadius: rounded,
                background: "transparent",
                boxShadow: shadow
                    ? dropShadow(shadowColor, shadowIntensity)
                    : "none",
                cursor: "pointer",
                isolation: "isolate",
            }}
        >
            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    overflow: "hidden",
                    background: `hsl(0 0% 100% / ${frost / 100})`,
                    backdropFilter: `blur(${blur}px)`,
                    WebkitBackdropFilter: `blur(${blur}px)`,
                    pointerEvents: "none",
                }}
            />

            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    backgroundColor: tint,
                    pointerEvents: "none",
                }}
            />

            <div
                aria-hidden
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                    }}
                />
            </div>

            <span
                style={{
                    ...typography,
                    position: "relative",
                    zIndex: 3,
                    color: textColor,
                    textAlign: "center",
                    whiteSpace: "pre",
                    userSelect: "none",
                    lineHeight: 1,
                    display: "block",
                }}
            >
                {label}
            </span>
        </motion.div>
    );
}

const __presetProps = {
  "font": {
    "variant": "Semibold",
    "fontSize": "24px",
    "textAlign": "left",
    "fontFamily": "Lato",
    "fontWeight": 600,
    "lineHeight": "1.2em",
    "letterSpacing": "-0.01em"
  },
  "glass": {
    "blur": 40,
    "tint": "rgba(0, 0, 0, 0.12)",
    "frost": 24
  },
  "label": "Get Started",
  "press": true,
  "border": true,
  "shadow": true,
  "rounded": 16,
  "paddingX": 36,
  "paddingY": 24,
  "textColor": "#FFFFFF",
  "waterColor": "#FF8800",
  "waterAmount": 67,
  "borderOptions": {
    "color": "rgba(120, 120, 120, 0.7)",
    "stroke": 1
  },
  "shadowOptions": {
    "color": "#9B9B9B",
    "intensity": 80
  }
};

export default function MetallicButton(props: Record<string, unknown>) {
  return <__BaseImpl_MetallicButton {...(__presetProps as Record<string, unknown>)} {...props} />;
}
