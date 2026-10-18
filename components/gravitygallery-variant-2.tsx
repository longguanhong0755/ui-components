import { useEffect, useRef } from "react"
// @ts-ignore — matter-js may not ship bundled type declarations
import Matter from "matter-js"

// Shown when the user hasn't added their own images.
const DEFAULT_IMAGES = [
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
]

/**
 * Physics
 * Drops a set of generated bodies (circles or squares) into a Matter.js world:
 * gravity, walls, click-drag with the mouse. Bodies are filled with the
 * uploaded images, cycled across the count (one image repeats for all).
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */

const M: any = Matter

// Static boundary walls around the container (thick, just outside the edges).
function makeWalls(
    bounding: { width: number; height: number },
    world: any,
    opts: any
) {
    const { width: w, height: h } = bounding
    const t = 200
    const walls: any[] = []
    if (opts.top)
        walls.push(
            M.Bodies.rectangle(w / 2, -t / 2, w + 2 * t, t, { isStatic: true })
        )
    if (opts.bottom)
        walls.push(
            M.Bodies.rectangle(w / 2, h + t / 2, w + 2 * t, t, {
                isStatic: true,
            })
        )
    if (opts.left)
        walls.push(
            M.Bodies.rectangle(-t / 2, h / 2, t, h + 2 * t, { isStatic: true })
        )
    if (opts.right)
        walls.push(
            M.Bodies.rectangle(w + t / 2, h / 2, t, h + 2 * t, {
                isStatic: true,
            })
        )
    M.Composite.add(world, walls)
    return walls
}

function __BaseImpl_Physics(props: any) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        images = DEFAULT_IMAGES,
        count = 20,
        size = 126,
        shape = "square",
        color = "#FFFFFF",
        friction = 1,
        mouseEnable = true,
        mouseStiffness = 0.991,
        mouseAngularStiffness = 0,
        gravX = 0,
        gravY = 1,
        wallOptions = { top: true, bottom: true, right: true, left: true },
        style,
    } = props

    const n = Math.max(1, Math.min(20, Math.round(count)))
    const containerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef(0)

    const depKey = JSON.stringify({
        n,
        size,
        shape,
        gravX,
        gravY,
        wallOptions,
        friction,
        mouseEnable,
        mouseStiffness,
        mouseAngularStiffness,
    })

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const engine = M.Engine.create({
            enableSleeping: false,
            gravity: { x: gravX, y: gravY },
        })

        const bounding = container.getBoundingClientRect()
        makeWalls(bounding, engine.world, wallOptions)

        let mouseConstraint: any = null
        const onLeave = () =>
            mouseConstraint?.mouse?.mouseup(new Event("mouseup"))
        if (mouseEnable) {
            const mouse = M.Mouse.create(container)
            mouseConstraint = M.MouseConstraint.create(engine, {
                mouse,
                constraint: {
                    angularStiffness: mouseAngularStiffness,
                    stiffness: mouseStiffness,
                },
            })
            M.Composite.add(engine.world, mouseConstraint)
            const el = mouseConstraint.mouse.element
            el.removeEventListener(
                "mousewheel",
                mouseConstraint.mouse.mousewheel
            )
            el.removeEventListener(
                "DOMMouseScroll",
                mouseConstraint.mouse.mousewheel
            )
            container.addEventListener("mouseleave", onLeave)
        }

        // Build the generated bodies, spread across the top so they fall in.
        // Friction 1–10 → 0.1–1; a little air friction keeps motion settled.
        const bodyOpts = {
            friction: Math.max(1, Math.min(10, friction)) / 10,
            frictionAir: 0.02,
        }
        const made: any[] = []
        for (let i = 0; i < n; i++) {
            const x = ((i + 0.5) / n) * bounding.width
            const y = size / 2 + i * (size * 0.15 + 10)
            const body =
                shape === "square"
                    ? M.Bodies.rectangle(x, y, size, size, bodyOpts)
                    : M.Bodies.circle(x, y, size / 2, bodyOpts)
            made.push(body)
        }
        M.Composite.add(engine.world, made)

        const els = Array.from(
            container.querySelectorAll<HTMLElement>("[data-physics-body]")
        )

        const update = () => {
            rafRef.current = requestAnimationFrame(update)
            for (let i = 0; i < made.length; i++) {
                const el = els[i]
                if (!el) continue
                const { position, angle } = made[i]
                el.style.visibility = "visible"
                el.style.left = `${position.x}px`
                el.style.top = `${position.y}px`
                el.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`
            }
            M.Engine.update(engine)
        }
        update()

        return () => {
            cancelAnimationFrame(rafRef.current)
            if (mouseEnable)
                container.removeEventListener("mouseleave", onLeave)
            M.World.clear(engine.world, false)
            M.Engine.clear(engine)
        }
    }, [depKey])

    // Cycle the uploaded images across the bodies (one image repeats for all).
    const imgFor = (i: number) => {
        const imgs =
            Array.isArray(images) && images.length > 0 ? images : DEFAULT_IMAGES
        if (!imgs.length) return undefined
        return imgs[i % imgs.length]?.src
    }

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                height: "100%",
                width: "100%",
                overflow: "hidden",
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
        >
            {Array.from({ length: n }).map((_, i) => {
                const src = imgFor(i)
                return (
                    <div
                        key={i}
                        data-physics-body=""
                        style={{
                            position: "absolute",
                            visibility: "hidden",
                            width: size,
                            height: size,
                            borderRadius: shape === "circle" ? "50%" : 0,
                            overflow: "hidden",
                            background: src ? "transparent" : color,
                            backgroundImage: src ? `url(${src})` : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            cursor: "grab",
                        }}
                        draggable={false}
                    />
                )
            })}
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    images: DEFAULT_IMAGES,
    count: 20,
    size: 126,
    shape: "square",
    color: "#FFFFFF",
    gravY: 1,
    gravX: 0,
    wallOptions: {
        top: true,
        bottom: true,
        left: true,
        right: true,
    },
    friction: 1,
    mouseEnable: true,
    mouseStiffness: 0.991,
    mouseAngularStiffness: 0,
}

Physics.displayName = "Physics"

const __presetProps = {
  "size": 71,
  "color": "#FFFFFF",
  "count": 15,
  "gravX": 5,
  "gravY": 5,
  "shape": "circle",
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
    }
  ],
  "friction": 1,
  "mouseEnable": true,
  "wallOptions": {
    "top": true,
    "left": false,
    "right": true,
    "bottom": true
  },
  "mouseStiffness": 99,
  "mouseAngularStiffness": 0
};

export default function Physics(props: Record<string, unknown>) {
  return <__BaseImpl_Physics {...(__presetProps as Record<string, unknown>)} {...props} />;
}
