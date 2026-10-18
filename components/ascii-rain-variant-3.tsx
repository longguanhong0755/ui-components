"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const DEFAULTS = {
    headColor: "#FFFFFF",
    trailColor: "#F7FF00",
    glyphSize: 20,
    speed: 6,
    angle: 0,
    density: 50,
    trail: 23,
    glyphs: "ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｿﾝ",
    shuffle: true,
    shuffleGlyphs: "ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｿﾝ",
}

// A stream either runs the full height or dies somewhere past this much of it —
// never sooner, so every column gets well down the frame before it goes.
const MIN_BURNOUT = 0.75
// Share of streams that make it all the way across without fading.
const CROSSING_SHARE = 0.35

interface DigitalRainProps {
    headColor?: string
    trailColor?: string
    glyphSize?: number
    speed?: number
    angle?: number
    density?: number
    trail?: number
    glyphs?: string
    shuffle?: boolean
    shuffleGlyphs?: string
    style?: CSSProperties
}

interface Stream {
    /** Head position down the column, in pixels. Negative means still above the top. */
    y: number
    /** Pixels per second this stream falls. */
    rate: number
    /** Height fraction at which it starts dying; Infinity means it crosses. */
    burnout: number
    /** Current opacity, driven down once past burnout. */
    alpha: number
    /** The glyphs it is carrying, head first. Held steady so they stay readable. */
    chars: string[]
}

interface Column {
    /** Streams currently in flight here, oldest first. */
    streams: Stream[]
    /** How far the newest stream must fall before the next one is released. */
    releaseAt: number
}

// A column releases its next stream once the current one is this far down —
// randomised per release, so the columns never fall into a repeating pattern.
const MIN_RELEASE = 0.3
const MAX_RELEASE = 0.8

function __BaseImpl_DigitalRain(props: DigitalRainProps) {
    const {
        headColor = DEFAULTS.headColor,
        trailColor = DEFAULTS.trailColor,
        glyphSize = DEFAULTS.glyphSize,
        speed = DEFAULTS.speed,
        angle = DEFAULTS.angle,
        density = DEFAULTS.density,
        trail = DEFAULTS.trail,
        glyphs = DEFAULTS.glyphs,
        shuffle = DEFAULTS.shuffle,
        shuffleGlyphs = DEFAULTS.shuffleGlyphs,
        style,
    } = props

    const wrapRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const wrapEl = wrapRef.current
        const canvasEl = canvasRef.current
        if (!wrapEl || !canvasEl) return
        const context = canvasEl.getContext("2d")
        if (!context) return
        const wrap: HTMLDivElement = wrapEl
        const canvas: HTMLCanvasElement = canvasEl
        const ctx: CanvasRenderingContext2D = context

        // Shuffle on: draw from the Shuffle Characters set, and churn between them
        // over time. Shuffle off: fill from the plain Characters set once and hold
        // it — the streams still fall, but each glyph stays put.
        const source = shuffle
            ? shuffleGlyphs || DEFAULTS.shuffleGlyphs
            : glyphs || DEFAULTS.glyphs
        const chars = [...source]
        const pick = () => chars[Math.floor(Math.random() * chars.length)]
        const rad = (angle * Math.PI) / 180
        const rate = speed * glyphSize // pixels per second
        // Density 50 packs the columns one glyph apart; 1 spreads them right out.
        const gap = glyphSize * (1 + (50 - density) / 12)
        const tailLength = Math.max(1, Math.round(trail))

        let alive = true
        let raf = 0
        let last = 0
        let w = 0
        let h = 0
        let span = 0
        let cols = 0
        let columns: Column[] = []

        function spawn(y: number): Stream {
            return {
                y,
                // A little rate scatter so the field never falls in lockstep.
                rate: rate * (0.75 + Math.random() * 0.5),
                burnout:
                    Math.random() < CROSSING_SHARE
                        ? Infinity
                        : MIN_BURNOUT + Math.random() * (1 - MIN_BURNOUT),
                alpha: 1,
                chars: Array.from({ length: tailLength }, pick),
            }
        }

        function nextRelease(): number {
            return (
                span *
                (MIN_RELEASE + Math.random() * (MAX_RELEASE - MIN_RELEASE))
            )
        }

        function layout() {
            const dpr = Math.min(2, window.devicePixelRatio || 1)
            w = wrap.clientWidth || 360
            h = wrap.clientHeight || 320
            canvas.width = Math.round(w * dpr)
            canvas.height = Math.round(h * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            // Tilting the field means drawing past the corners, so lay the columns
            // out across the diagonal. Anything less and the angle bares the edges.
            span = Math.hypot(w, h)
            cols = Math.max(1, Math.ceil(span / gap))
            // Seed each column mid-flight so the frame is already raining on the
            // very first paint instead of waiting for streams to arrive.
            columns = Array.from({ length: cols }, () => ({
                streams: [spawn(Math.random() * span)],
                releaseAt: nextRelease(),
            }))
        }

        function draw(dt: number) {
            // Wipe outright. Fading the previous frame is what smears the glyphs
            // into an illegible trail; every frame is painted from scratch.
            ctx.clearRect(0, 0, w, h)

            ctx.save()
            ctx.translate(w / 2, h / 2)
            ctx.rotate(rad)
            ctx.font = `${glyphSize}px ui-monospace, Menlo, monospace`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"

            const lead = tailLength * glyphSize

            for (let i = 0; i < cols; i++) {
                const column = columns[i]
                const x = -span / 2 + i * gap + gap / 2

                for (const stream of column.streams) {
                    stream.y += stream.rate * dt

                    const travelled = stream.y / span
                    if (
                        stream.burnout !== Infinity &&
                        travelled > stream.burnout
                    ) {
                        stream.alpha -= dt * 1.5
                    }

                    // Churn one glyph per frame so the stream flickers without
                    // the whole line rewriting itself and turning to mush. Only
                    // when Shuffle is on — off, the glyphs are frozen at spawn.
                    if (shuffle && Math.random() < 0.25) {
                        stream.chars[
                            Math.floor(Math.random() * stream.chars.length)
                        ] = pick()
                    }

                    const headY = -span / 2 + stream.y
                    const columnAlpha = Math.max(0, Math.min(1, stream.alpha))

                    for (let j = 0; j < tailLength; j++) {
                        const y = headY - j * glyphSize
                        if (
                            y < -span / 2 - glyphSize ||
                            y > span / 2 + glyphSize
                        )
                            continue
                        // Head is bright; the tail ramps down behind it.
                        const taper = j === 0 ? 1 : 1 - j / tailLength
                        ctx.globalAlpha = columnAlpha * taper
                        ctx.fillStyle = j === 0 ? headColor : trailColor
                        ctx.fillText(stream.chars[j], x, y)
                    }
                }

                // Retire whatever has dimmed out or dropped clean off the bottom.
                column.streams = column.streams.filter(
                    (stream) => stream.alpha > 0 && stream.y - lead <= span
                )

                // Release the next stream once the newest one is far enough down.
                // The column never has to wait for a stream to finish, so the rain
                // keeps coming without gaps.
                const newest = column.streams[column.streams.length - 1]
                if (!newest || newest.y >= column.releaseAt) {
                    column.streams.push(spawn(-lead))
                    column.releaseAt = nextRelease()
                }
            }

            ctx.globalAlpha = 1
            ctx.restore()
        }

        function loop(time: number) {
            if (!alive) return
            const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60
            last = time
            draw(dt)
            raf = requestAnimationFrame(loop)
        }

        layout()

        let ro: ResizeObserver | null = null
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(layout)
            ro.observe(wrap)
        }
        raf = requestAnimationFrame(loop)

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro?.disconnect()
        }
    }, [
        headColor,
        trailColor,
        glyphSize,
        speed,
        angle,
        density,
        trail,
        glyphs,
        shuffle,
        shuffleGlyphs,
    ])

    return (
        <div
            ref={wrapRef}
            style={{
                ...style,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

const __presetProps = {
  "angle": -16,
  "speed": 11,
  "trail": 40,
  "glyphs": "ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｿﾝ",
  "density": 50,
  "shuffle": true,
  "glyphSize": 14,
  "headColor": "#FF4545",
  "trailColor": "#FF9C73",
  "shuffleGlyphs": "ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｿﾝ"
};

export default function DigitalRain(props: Record<string, unknown>) {
  return <__BaseImpl_DigitalRain {...(__presetProps as Record<string, unknown>)} {...props} />;
}
