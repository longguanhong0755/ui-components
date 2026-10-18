// @ts-nocheck
"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

const ZONES = [
    { cx: 18, cy: 18 },
    { cx: 82, cy: 18 },
    { cx: 18, cy: 82 },
    { cx: 82, cy: 82 },
    { cx: 32, cy: 14 },
    { cx: 50, cy: 12 },
    { cx: 68, cy: 14 },
    { cx: 32, cy: 86 },
    { cx: 50, cy: 88 },
    { cx: 68, cy: 86 },
    { cx: 14, cy: 35 },
    { cx: 14, cy: 55 },
    { cx: 14, cy: 72 },
    { cx: 86, cy: 35 },
    { cx: 86, cy: 55 },
    { cx: 86, cy: 72 },
    { cx: 28, cy: 28 },
    { cx: 72, cy: 28 },
    { cx: 28, cy: 72 },
    { cx: 72, cy: 72 },
    { cx: 42, cy: 16 },
    { cx: 58, cy: 16 },
    { cx: 42, cy: 84 },
    { cx: 58, cy: 84 },
    { cx: 16, cy: 45 },
    { cx: 84, cy: 45 },
]

const ASPECT_RATIOS = [
    { w: 200, h: 200 },
    { w: 240, h: 240 },
    { w: 280, h: 280 },
    { w: 160, h: 250 },
    { w: 180, h: 280 },
    { w: 280, h: 165 },
    { w: 340, h: 195 },
    { w: 220, h: 150 },
]

// Newest tile sits on top — z-index increments per spawn.

// 20 spiral path templates. Each: random start angle, spin direction, turns.
// Tiles pick one and follow it from outer position to center.
// 20 spiral paths. startAngle = entry angle (radians). spinDir = ±1.
// turns = number of full revolutions (lower = straighter, higher = more spiral).
// startAngles spread evenly around 2π, spinDir alternates.
// 20 spiral path templates. Each: random start angle, spin direction, turns.
const SPIRAL_PATHS = Array.from({ length: 20 }, () => ({
    startAngle: Math.random() * Math.PI * 2,
    spinDir: Math.random() < 0.5 ? 1 : -1,
    turns: 1.2 + Math.random() * 0.8,
}))

function rand(min, max) {
    return min + Math.random() * (max - min)
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

// Maps Framer's transition ease values to GSAP equivalents.
function framerEaseToGsap(ease) {
    if (!ease || ease === "linear") return "none"
    if (Array.isArray(ease))
        return `cubic-bezier(${ease[0]},${ease[1]},${ease[2]},${ease[3]})`
    const map = {
        easeIn: "power2.in",
        easeOut: "power2.out",
        easeInOut: "power2.inOut",
        circIn: "circ.in",
        circOut: "circ.out",
        circInOut: "circ.inOut",
        backIn: "back.in",
        backOut: "back.out",
        backInOut: "back.inOut",
        anticipate: "back.inOut(1.7)",
        bounceIn: "bounce.in",
        bounceOut: "bounce.out",
    }
    return map[ease] ?? "power2.out"
}

function extractUrl(item) {
    if (!item) return null
    if (typeof item === "string") return item.trim() || null
    if (typeof item === "object") {
        const url =
            item.src || item.url || item.srcSet?.split?.(" ")?.[0] || null
        return typeof url === "string" ? url.trim() || null : null
    }
    return null
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1080
 * @framerIntrinsicHeight 480
 */
function __BaseImpl_ImageGallery(props) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        background,
        images,
        imageScale,
        blankArea,
        crowdDensity,
        crowdDelay,
        type,
        direction,
        appear,
        disappear,
    } = props
    const animType = type ?? "straight"
    const spiralDir = direction ?? "both"

    const containerRef = useRef(null)
    const zoneIdxRef = useRef(0)
    const zIndexRef = useRef(1)
    const timerRef = useRef(null)
    const pausedRef = useRef(false)
    const activeCountRef = useRef(0)
    const recentImgsRef = useRef([])
    const imagePoolRef = useRef([])
    const backgroundRef = useRef(background ?? "#000000")
    const imageScaleRef = useRef(imageScale ?? 5)
    const blankAreaRef = useRef(blankArea ?? 1)
    const crowdDensityRef = useRef(crowdDensity ?? 10)
    const crowdDelayRef = useRef(crowdDelay ?? 0)
    const typeRef = useRef(animType)
    const dirRef = useRef(spiralDir)
    const appearRef = useRef(
        appear ?? { style: "inToOut", ease: { duration: 0.5, ease: "easeOut" } }
    )
    const disappearRef = useRef(
        disappear ?? {
            style: "inToOut",
            ease: { duration: 0.67, ease: "easeIn" },
        }
    )
    backgroundRef.current = background ?? "#000000"
    imageScaleRef.current = imageScale ?? 5
    blankAreaRef.current = blankArea ?? 1
    crowdDensityRef.current = crowdDensity ?? 10
    crowdDelayRef.current = crowdDelay ?? 0
    typeRef.current = animType
    dirRef.current = spiralDir
    appearRef.current = appear ?? {
        style: "inToOut",
        ease: { duration: 0.5, ease: "easeOut" },
    }
    disappearRef.current = disappear ?? {
        style: "inToOut",
        ease: { duration: 0.67, ease: "easeIn" },
    }

    const FALLBACK_IMAGES = [
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/93ba867c-59af-4b58-8021-c0c0fbce8300/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6c99279a-d77b-4fe0-a32a-a674adced100/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9d2dbaa2-7b61-4bf9-4830-2c93e4706000/w=800",
        "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4d1fe81d-5289-4e08-b381-03e4e9efed00/w=800",
    ]
    const userInput = Array.isArray(images)
        ? images.map(extractUrl).filter(Boolean)
        : []
    const userUrls = userInput.length > 0 ? userInput : FALLBACK_IMAGES
    imagePoolRef.current = userUrls

    function getUniqueImage() {
        const pool = imagePoolRef.current
        if (pool.length === 0) return null
        const recent = recentImgsRef.current
        let available = pool.filter((img) => !recent.includes(img))
        if (available.length === 0) {
            recentImgsRef.current = []
            available = pool
        }
        const selected = pick(available)
        recentImgsRef.current.push(selected)
        if (recentImgsRef.current.length > Math.max(3, pool.length - 1))
            recentImgsRef.current.shift()
        return selected
    }

    useEffect(() => {
        recentImgsRef.current = []
    }, [images])
    useEffect(() => {
        userUrls.forEach((src) => {
            const i = new Image()
            i.src = src
        })
    }, [images])

    useEffect(() => {
        let gsapScript = document.getElementById("ma-gsap")
        if (!gsapScript) {
            gsapScript = document.createElement("script")
            gsapScript.id = "ma-gsap"
            gsapScript.src =
                "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
            gsapScript.async = true
            document.head.appendChild(gsapScript)
        }

        function init() {
            const gsap = window.gsap

            function handleVisibilityChange() {
                if (document.hidden) {
                    pausedRef.current = true
                    gsap.globalTimeline.pause()
                    containerRef.current
                        ?.querySelectorAll("[data-tile]")
                        .forEach((el) => el.remove())
                } else {
                    pausedRef.current = false
                    gsap.globalTimeline.resume()
                }
            }
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange
            )

            function spawnTile() {
                if (pausedRef.current) return
                const container = containerRef.current
                if (!container) return

                const imgSrc = getUniqueImage()
                if (!imgSrc) return

                const zone = ZONES[zoneIdxRef.current % ZONES.length]
                zoneIdxRef.current++

                const shape = pick(ASPECT_RATIOS)

                const containerW = containerRef.current?.offsetWidth || 800
                const containerH = containerRef.current?.offsetHeight || 600

                // Map integer slider → real scale multiplier
                // Linear remap: slider 1 → 0.125×, slider 20 → 5.0×
                const userScale =
                    0.125 + ((imageScaleRef.current - 1) / 19) * 4.875
                const maxByWidth = containerW / shape.w
                const maxByHeight = containerH / shape.h
                const effectiveScale = Math.min(
                    userScale,
                    maxByWidth,
                    maxByHeight
                )
                const tileW = Math.round(shape.w * effectiveScale)
                const tileH = Math.round(shape.h * effectiveScale)

                // Pre-calculate s0 here so we can use it to clamp spawn position
                const s0 = rand(0.1, 0.4)
                const s2 = rand(0.7, 1.1)
                const s3 = rand(3.0, 4.5)

                // Derive spawn angle from the zone's direction relative to center.
                // The zone's cx/cy are only used for angular distribution — the
                // actual spawn radius is driven entirely by blankArea.
                const centerX = containerW / 2
                const centerY = containerH / 2
                const zoneAngle = Math.atan2(zone.cy - 50, zone.cx - 50)
                const angleJitter = rand(-0.25, 0.25)
                const angle = zoneAngle + angleJitter + rand(-0.3, 0.3)

                // blankArea 1%  → tiny radius, tiles spawn at the center point.
                // blankArea 100% → radius exceeds the container, tiles off-screen.
                // In spiral mode, blankArea is ignored — tiles base at center.
                const isSpiralModeForSpawn = typeRef.current === "spiral"
                const spawnRadius = isSpiralModeForSpawn
                    ? 0
                    : (blankAreaRef.current / 100) *
                      Math.hypot(containerW / 2, containerH / 2)

                const spawnX_px = centerX + Math.cos(angle) * spawnRadius
                const spawnY_px = centerY + Math.sin(angle) * spawnRadius
                const cosA = Math.cos(angle)
                const sinA = Math.sin(angle)

                const el = document.createElement("div")
                el.setAttribute("data-tile", "1")
                el.style.cssText = `
                    position: absolute;
                    width: ${tileW}px;
                    height: ${tileH}px;
                    left: ${spawnX_px}px;
                    top: ${spawnY_px}px;
                    transform-origin: center center;
                    border-radius: 0;
                    overflow: hidden;
                    box-shadow: none;
                    z-index: ${zIndexRef.current++};
                    pointer-events: none;
                    will-change: transform, opacity;
                    translate: -50% -50%;
                    background: ${backgroundRef.current};
                    opacity: 0;
                `

                const imgEl = document.createElement("img")
                imgEl.alt = ""
                imgEl.loading = "eager"
                imgEl.decoding = "async"
                imgEl.referrerPolicy = "no-referrer"
                imgEl.style.cssText =
                    "width:100%;height:100%;object-fit:contain;display:block;"

                el.appendChild(imgEl)
                container.appendChild(el)
                activeCountRef.current++

                function startAnimation() {
                    if (pausedRef.current) {
                        activeCountRef.current--
                        el.remove()
                        return
                    }

                    const appearDir = appearRef.current?.style ?? "inToOut"
                    const disappearDir =
                        disappearRef.current?.style ?? "inToOut"

                    // appear.ease.duration   = time image takes to fully appear
                    // appear.ease.delay      = hold time before disappearing
                    // disappear.ease.duration = exit/scale-out duration
                    const entryDur = appearRef.current?.ease?.duration ?? 0.5
                    const holdDur = appearRef.current?.ease?.delay ?? 0
                    const zoopDur = disappearRef.current?.ease?.duration ?? 0.67
                    const entryEase = framerEaseToGsap(
                        appearRef.current?.ease?.ease ?? "easeOut"
                    )
                    const exitEase = framerEaseToGsap(
                        disappearRef.current?.ease?.ease ?? "easeIn"
                    )

                    const exitSign = disappearDir === "inToOut" ? 1 : -1
                    const exitScale = disappearDir === "inToOut" ? s3 : 0.08
                    const fadeOutPct = disappearRef.current?.fadeOut ?? 100
                    const fadeDur = zoopDur * (fadeOutPct / 100)

                    const entryD = rand(80, 140)
                    const exitD = rand(160, 260)

                    const onDone = () => {
                        gsap.set(el, { opacity: 0 })
                        el.remove()
                        activeCountRef.current--
                    }

                    const isSpiral = typeRef.current === "spiral"

                    if (isSpiral) {
                        const path =
                            SPIRAL_PATHS[
                                Math.floor(Math.random() * SPIRAL_PATHS.length)
                            ]
                        const R =
                            Math.hypot(containerW / 2, containerH / 2) * 1.1
                        const startA = path.startAngle
                        const dirSetting = dirRef.current
                        const spinDir =
                            dirSetting === "clockwise"
                                ? 1
                                : dirSetting === "anticlockwise"
                                  ? -1
                                  : path.spinDir
                        const turns = path.turns

                        // Start radius from appearDir, end radius from disappearDir.
                        // Tile follows continuous spiral: start → mid (u=0.5) → end.
                        // Appear = first half of path. Disappear = second half.
                        const startR = appearDir === "inToOut" ? 0 : R
                        const endR = disappearDir === "inToOut" ? R : 0
                        // Midpoint radius driven by blankArea: 0% = center,
                        // 100% = edge. Tile stops here after appearing.
                        const midR = R * (blankAreaRef.current / 100)

                        // Stop point varies: 45%, 50%, or 55% of the path.
                        const mid = pick([0.45, 0.5, 0.55])
                        const pathPos = (u: number) => {
                            // Piecewise lerp through midR at u=mid.
                            const r =
                                u <= mid
                                    ? startR + (midR - startR) * (u / mid)
                                    : midR +
                                      (endR - midR) * ((u - mid) / (1 - mid))
                            const a = startA + spinDir * u * turns * Math.PI * 2
                            return [Math.cos(a) * r, Math.sin(a) * r]
                        }

                        // Scale curve: matches direction.
                        // inToOut appear: 0 → s2 over u 0 → 1 (grows).
                        // outToIn appear: s2 → 0 over u 0 → 1 (shrinks).
                        const scaleAt = (u: number) =>
                            appearDir === "inToOut" ? s2 * u : s2 * (1 - u)

                        const [sx, sy] = pathPos(0)
                        const tl = gsap.timeline({ onComplete: onDone })
                        tl.set(el, {
                            scale: scaleAt(0),
                            opacity: 0,
                            x: sx,
                            y: sy,
                            rotation: 0,
                        })

                        // Single continuous tween across appear + drift + disappear.
                        // Position uses fast-slow-fast easing so the image:
                        //   - starts fast on appear
                        //   - smoothly decelerates into drift
                        //   - smoothly accelerates out of drift into exit
                        // Opacity ramps over each phase's real time independently.
                        const totalDur = entryDur + holdDur + zoopDur
                        const appearEnd = entryDur
                        const driftEnd = entryDur + holdDur
                        const big = { t: 0 }
                        tl.to(big, {
                            t: 1,
                            duration: totalDur,
                            ease: "none",
                            onUpdate: () => {
                                const t = big.t
                                const realT = t * totalDur
                                // Fast-slow-fast progression over [0,1]
                                const u = Math.max(
                                    0,
                                    Math.min(
                                        1,
                                        t + Math.sin(t * Math.PI * 2) * 0.12
                                    )
                                )
                                let op: number
                                if (realT < appearEnd) {
                                    op = entryDur > 0 ? realT / entryDur : 1
                                } else if (realT < driftEnd) {
                                    op = 1
                                } else {
                                    const since = realT - driftEnd
                                    op =
                                        fadeDur > 0
                                            ? Math.max(0, 1 - since / fadeDur)
                                            : 0
                                }
                                const [x, y] = pathPos(u)
                                gsap.set(el, {
                                    x,
                                    y,
                                    opacity: op,
                                    scale: scaleAt(u),
                                })
                            },
                        })
                    } else if (appearDir === "inToOut") {
                        const x1 = cosA * entryD
                        const y1 = sinA * entryD
                        const x2 = x1 + exitSign * cosA * exitD
                        const y2 = y1 + exitSign * sinA * exitD
                        // Drift point: 15% along the exit direction
                        const driftF = 0.15
                        const xD = x1 + (x2 - x1) * driftF
                        const yD = y1 + (y2 - y1) * driftF
                        const scaleD = s2 + (exitScale - s2) * driftF

                        const tl = gsap
                            .timeline({ onComplete: onDone })
                            .set(el, {
                                scale: s0,
                                opacity: 1,
                                x: 0,
                                y: 0,
                                rotation: 0,
                            })
                            .to(el, {
                                scale: s2,
                                x: x1,
                                y: y1,
                                duration: entryDur,
                                ease: entryEase,
                            })
                        if (holdDur > 0) {
                            tl.to(el, {
                                scale: scaleD,
                                x: xD,
                                y: yD,
                                duration: holdDur,
                                ease: "none",
                            })
                        }
                        tl.to(el, {
                            scale: exitScale,
                            x: x2,
                            y: y2,
                            duration: zoopDur,
                            ease: exitEase,
                        }).to(
                            el,
                            {
                                opacity: 0,
                                duration: fadeDur,
                                ease: exitEase,
                            },
                            "<"
                        )
                    } else {
                        const startX = cosA * entryD * 2.5
                        const startY = sinA * entryD * 2.5
                        const exitX = exitSign * cosA * exitD
                        const exitY = exitSign * sinA * exitD
                        const driftF = 0.15
                        const xD = (exitX - 0) * driftF
                        const yD = (exitY - 0) * driftF
                        const scaleD = s2 + (exitScale - s2) * driftF

                        const tl = gsap
                            .timeline({ onComplete: onDone })
                            .set(el, {
                                scale: s3,
                                opacity: 0,
                                x: startX,
                                y: startY,
                                rotation: 0,
                            })
                            .to(el, {
                                scale: s2,
                                opacity: 1,
                                x: 0,
                                y: 0,
                                duration: entryDur,
                                ease: entryEase,
                            })
                        if (holdDur > 0) {
                            tl.to(el, {
                                scale: scaleD,
                                x: xD,
                                y: yD,
                                duration: holdDur,
                                ease: "none",
                            })
                        }
                        tl.to(el, {
                            scale: exitScale,
                            x: exitX,
                            y: exitY,
                            duration: zoopDur,
                            ease: exitEase,
                        }).to(
                            el,
                            {
                                opacity: 0,
                                duration: fadeDur,
                                ease: exitEase,
                            },
                            "<"
                        )
                    }
                }

                imgEl.onerror = () => {
                    activeCountRef.current--
                    el.remove()
                }
                imgEl.src = imgSrc

                if (typeof imgEl.decode === "function") {
                    imgEl
                        .decode()
                        .then(startAnimation)
                        .catch(() => {
                            activeCountRef.current--
                            el.remove()
                        })
                } else {
                    imgEl.complete && imgEl.naturalWidth > 0
                        ? startAnimation()
                        : (imgEl.onload = startAnimation)
                }
            }

            let lastSpawn = 0
            let batchCount = 0
            let nextBatchAt = 0
            timerRef.current = setInterval(() => {
                if (pausedRef.current) return
                const target = Math.max(1, Math.round(crowdDensityRef.current))
                const delaySec = Math.max(0, crowdDelayRef.current)
                const now = performance.now()

                if (delaySec === 0) {
                    // Continuous flow: spawn paced by lifetime/target
                    const entryDur = appearRef.current?.ease?.duration ?? 0.5
                    const holdDur = appearRef.current?.ease?.delay ?? 0
                    const zoopDur = disappearRef.current?.ease?.duration ?? 0.67
                    const lifetimeMs = (entryDur + holdDur + zoopDur) * 1000
                    const spawnInterval = Math.max(20, lifetimeMs / target)
                    if (now - lastSpawn >= spawnInterval) {
                        spawnTile()
                        lastSpawn = now
                    }
                    return
                }

                // Batched flow: spawn `target` tiles, wait delaySec, repeat
                if (now < nextBatchAt) return
                if (batchCount < target) {
                    if (now - lastSpawn >= 50) {
                        spawnTile()
                        batchCount++
                        lastSpawn = now
                        if (batchCount >= target) {
                            nextBatchAt = now + delaySec * 1000
                            batchCount = 0
                        }
                    }
                }
            }, 20)

            gsapScript._visCleanup = () =>
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange
                )
        }

        if (window.gsap) {
            init()
        } else {
            gsapScript.addEventListener("load", init)
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            gsapScript._visCleanup?.()
            const w = window as any
            if (w.gsap) {
                try {
                    w.gsap.globalTimeline.clear()
                } catch {}
            }
            containerRef.current
                ?.querySelectorAll("[data-tile]")
                .forEach((el) => el.remove())
            activeCountRef.current = 0
            zoneIdxRef.current = 0
            zIndexRef.current = 1
            recentImgsRef.current = []
        }
    }, [
        images,
        background,
        imageScale,
        blankArea,
        crowdDensity,
        crowdDelay,
        animType,
        spiralDir,
        appear,
        disappear,
    ])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background: background ?? "#000000",
                overflow: "hidden",
            }}
        >
            {/* Dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.06,
                    pointerEvents: "none",
                    backgroundImage:
                        "radial-gradient(circle,rgba(255,255,255,0.5) 1px,transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    images: [
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/93ba867c-59af-4b58-8021-c0c0fbce8300/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6c99279a-d77b-4fe0-a32a-a674adced100/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9d2dbaa2-7b61-4bf9-4830-2c93e4706000/w=800",
        },
        {
            src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4d1fe81d-5289-4e08-b381-03e4e9efed00/w=800",
        },
    ],
    type: "straight",
    direction: "clockwise",
    appear: {
        style: "outToIn",
        ease: {
            type: "tween",
            duration: 2,
            delay: 2,
            ease: "easeInOut",
        },
    },
    disappear: {
        style: "outToIn",
        ease: { type: "tween", duration: 1, ease: "easeInOut" },
        fadeOut: 100,
    },
    blankArea: 45,
    imageScale: 2,
    crowdDensity: 10,
    crowdDelay: 0,
    background: "#000000",
}

const __presetProps = {
  "type": "straight",
  "appear": {
    "ease": {
      "ease": "easeInOut",
      "mass": 1,
      "type": "tween",
      "delay": 2,
      "damping": 60,
      "duration": 2,
      "stiffness": 800
    },
    "style": "outToIn"
  },
  "images": [
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/5f084e5a-2e3f-4239-be1a-5084a6dcef00/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3b42034b-897e-456d-cb00-1f2cf0aa4700/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c84f3e45-635f-4eaa-4e24-730098b55500/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9652cf81-4644-4471-1122-4e40ef6e2600/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/1640f8fe-2cb1-4026-88e3-10dd0019f400/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/20fd03c3-49d6-408c-3ac9-8c5a6ed2b500/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4b1ec233-9a09-4483-1adb-404a93094100/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8fd4d2a3-a363-4658-d6ee-84790bc8f300/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/3ad8e2bd-dc38-49ba-d186-1a5ab1428d00/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/93ba867c-59af-4b58-8021-c0c0fbce8300/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6c99279a-d77b-4fe0-a32a-a674adced100/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/6ab26fe4-5016-4c65-01e8-b3a71ea08200/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/9d2dbaa2-7b61-4bf9-4830-2c93e4706000/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/4d1fe81d-5289-4e08-b381-03e4e9efed00/w=800"
    }
  ],
  "blankArea": 45,
  "direction": "clockwise",
  "disappear": {
    "ease": {
      "ease": "easeInOut",
      "mass": 1,
      "type": "tween",
      "damping": 60,
      "duration": 1,
      "stiffness": 800
    },
    "style": "outToIn",
    "fadeOut": 100
  },
  "background": "#000000",
  "crowdDelay": 0,
  "imageScale": 2,
  "imageWidth": 240,
  "imageHeight": 240,
  "crowdDensity": 10
};

export default function ImageGallery(props: Record<string, unknown>) {
  return <__BaseImpl_ImageGallery {...(__presetProps as Record<string, unknown>)} {...props} />;
}
