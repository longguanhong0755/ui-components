"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import * as THREE from "three"

/* ------------------------------------------------------------------ *
 *  EmberHusk
 *
 *  Built after a reference animation supplied as twelve stills: a ball
 *  of charred volcanic rock, cracked into slabs, hanging over a red
 *  fire-glow with molten light in its seams and a cloud of small white
 *  crosses spilling out of the break. Our component is EmberHusk.
 *
 *  WHAT THE TWELVE FRAMES ACTUALLY DO
 *
 *    The timeline runs INWARD.  Frame 1 is a white motion-blurred
 *                  burst; 2-4 are big slabs flung wide and tumbling
 *                  fast; 5-8 converge; 9-12 close into a compact
 *                  cluster with one bright orange seam running top to
 *                  bottom.  The rest state is the closed shell and the
 *                  explosion is the entrance, so the shatter here is an
 *                  initial condition fed into the same spring that the
 *                  pointer pushes against — one solver, two causes,
 *                  which is why a hover during the entrance blends
 *                  instead of fighting it.
 *    The orange lines are FISSURES, not gaps.  This one is worth being
 *                  careful about, because the obvious reading is wrong.
 *                  It looks like the light between the slabs — but
 *                  frames 4 and 5 show a bright line running the length
 *                  of a chunk that has broken clear of everything it
 *                  could be adjacent to, and frame 12 shows the same
 *                  line on a husk that is shut.  They are splits in the
 *                  crust with the melt behind them, so they belong to
 *                  the rock and travel with it.  Built here as the ridge
 *                  of a single smooth noise sampled in REST space (see
 *                  aRest): the set where a smooth field crosses its own
 *                  mid-value is a few long curves, so the network comes
 *                  out of one octave and nothing has to be traced.
 *                  Reading the field from the LIVE position instead
 *                  would let the lines swim across a tumbling slab.
 *    Fracture faces are cold.  A slab broken clear shows plain grey
 *                  stone; the emissive band sits narrowly on the cavity,
 *                  and the molten undersides in frames 6-12 are the
 *                  point light in the hollow landing on them, not the rock
 *                  emitting.  Lighting the whole interior instead — the
 *                  first thing tried here — turns a scattered husk into
 *                  a bag of glowing lava rocks, which is a different and
 *                  much worse picture.
 *    The crosses are lit, not emissive.  White top faces, blue-grey
 *                  shadow sides, red bounce from the lava beneath —
 *                  that shading is what makes them read as solid
 *                  extruded blocks.  Emissive white would flatten them
 *                  into stickers, so they take the same lighting model
 *                  as the rock with a white albedo.
 *    Unequal mass.  The slabs are not congruent shell tiles: some are
 *                  broad plates, some narrow wedges.  The seeds are
 *                  jittered in both direction and RADIUS, and a seed
 *                  pulled inward loses its cell to its neighbours, so
 *                  one number gives the whole size spread.
 *
 *  WHERE WE DEVIATE, AND WHY
 *
 *    - The reference is rendered footage with per-object motion blur.
 *      A velocity buffer and a second geometry pass is real cost for a
 *      hero that has to hold 60fps on a laptop, so the speed of the
 *      entrance is carried by the settle curve instead. Nothing else
 *      about the look depends on it.
 *    - No GLB, no textures: one file. The slabs are generated as convex
 *      Voronoi cells of a faceted ball (see buildHusk), which is what
 *      makes the seams close EXACTLY at rest — adjacent chunks are
 *      clipped by the same bisector plane, so they share a face rather
 *      than nearly sharing one. Basalt is procedural fbm.
 *    - UnrealBloomPass is replaced by the mip-chain bloom below: a
 *      soft-knee bright pass, a 13-tap downsample chain and a 9-tap
 *      tent upsample. It is what lets the melt bleed past the slab
 *      edges, which is the whole silhouette read of frames 9-12.
 *
 *  NO TRANSITION CONTROL. The motion is a hand-rolled fixed-step spring
 *  integrator on a rAF loop, not a framer-motion animation, so there is
 *  nothing for a ControlType.Transition to drive. Entrance and Response
 *  carry their own abstract scales instead.
 *
 *  Requires `three`.
 * ------------------------------------------------------------------ */

/* ----------------------------------------------------------- defaults */

const DEFAULT_BACKGROUND = {
    color: "#1A0402",
    glowColor: "#FF2606",
    glow: 6,
}

const DEFAULT_STRUCTURE = {
    shards: 11,
    irregularity: 6,
    thickness: 5,
}

const DEFAULT_ROCK = {
    color: "#171512",
    weathering: 5,
    seam: 4,
}

const DEFAULT_CORE = {
    color: "#FF3B00",
    hotColor: "#FFC46A",
    intensity: 6,
    flow: 5,
}

const DEFAULT_DEBRIS = {
    count: 54,
    size: 5,
    spread: 5,
}

const DEFAULT_CROSSES = {
    count: 52,
    size: 5,
    thickness: 5,
    color: "#EDEFF5",
    spread: 5,
}

const DEFAULT_ENTRANCE = {
    scatter: 6,
    tumble: 6,
    stagger: 4,
}

const DEFAULT_RESPONSE = {
    reach: 5,
    strength: 5,
    repel: 6,
    settle: 5,
}

const DEFAULT_DRIFT = {
    spin: 3,
    bob: 4,
    sway: 4,
}

const DEFAULT_GLOW = {
    strength: 5,
    radius: 5,
    threshold: 5,
}

const DEFAULTS = {
    size: 3.7,
    beads: 5,
    quality: "high",
}

/* -------------------------------------------------------------- types */

export interface EmberHuskBackground {
    /** The cold ground the fire sits on — the top of the frame */
    color?: string
    /** The fire itself, pooled at the bottom centre */
    glowColor?: string
    /** 0-10 how far up the frame the fire reaches; 0 is a flat ground */
    glow?: number
}

export interface EmberHuskStructure {
    /** How many slabs the husk is broken into */
    shards?: number
    /** 0-10 how faceted and uneven the ball and its break are */
    irregularity?: number
    /** 0-10 slab thickness; thin slabs leave a wider hollow */
    thickness?: number
}

export interface EmberHuskRock {
    /** The cold char of the outer shell */
    color?: string
    /** 0-10 how much weathered grey shows through the char */
    weathering?: number
    /** 0-10 how far apart the slabs rest, so how much light leaks out */
    seam?: number
}

export interface EmberHuskCore {
    /** The body of the melt on the inner faces */
    color?: string
    /** The hottest part of it, where the crust is thinnest */
    hotColor?: string
    /** 0-10 how bright the hollow burns, and how far it lights the slabs */
    intensity?: number
    /** 0-10 how fast the melt crawls across the inner faces */
    flow?: number
}

export interface EmberHuskDebris {
    /** How many pebbles are in the field */
    count?: number
    /** 0-10 size of one pebble against the husk */
    size?: number
    /** 0-10 how far out the field reaches */
    spread?: number
}

export interface EmberHuskCrosses {
    /** How many crosses are in the swarm */
    count?: number
    /** 0-10 size of one cross against the husk */
    size?: number
    /** 0-10 how deep the plate is; 0 is foil, 10 is nearly a block */
    thickness?: number
    /** The matte body colour; they are lit, not glowing */
    color?: string
    /** 0-10 how far the swarm reaches from the husk */
    spread?: number
}

export interface EmberHuskEntrance {
    /** 0-10 how far out the slabs start */
    scatter?: number
    /** 0-10 how hard they are tumbling when they arrive */
    tumble?: number
    /** 0-10 how much later the last slab lands than the first */
    stagger?: number
}

export interface EmberHuskResponse {
    /** 0-10 how much of the frame the cursor pushes */
    reach?: number
    /** 0-10 how far the nearest pieces are shoved */
    strength?: number
    /** 0-10 which way they go: 0 bulges straight out from the middle,
     *  10 shoves them directly away from the cursor */
    repel?: number
    /** 0-10 how sharply everything springs back home */
    settle?: number
}

export interface EmberHuskDrift {
    /** 0-10 idle turn rate */
    spin?: number
    /** 0-10 how far it rises and falls */
    bob?: number
    /** 0-10 how much it rocks off vertical */
    sway?: number
}

export interface EmberHuskGlow {
    /** 0-10 how much bloom is added back */
    strength?: number
    /** 0-10 how wide the bloom spreads */
    radius?: number
    /** 0-10 how bright a thing must be before it blooms */
    threshold?: number
}

export interface EmberHuskProps {
    background?: EmberHuskBackground
    /** 0-10 how much of the frame the husk fills */
    size?: number
    structure?: EmberHuskStructure
    rock?: EmberHuskRock
    core?: EmberHuskCore
    crosses?: EmberHuskCrosses
    debris?: EmberHuskDebris
    /** How many chrome beads drift around the husk */
    beads?: number
    entrance?: EmberHuskEntrance
    response?: EmberHuskResponse
    drift?: EmberHuskDrift
    glow?: EmberHuskGlow
    /** Render scale; drop it on a page with several instances */
    quality?: "low" | "medium" | "high"
    style?: CSSProperties
}

/* ---------------------------------------------------------- constants */

/** The husk is built at unit radius and framed by moving the camera. */
const R = 1

/** Vertical field of view. The reference is a long lens on a small
 *  object — a wide one bends the slabs at the edge of the cluster and
 *  the ball stops reading as a ball. */
const FOV = 40

/** Fixed lighting rig. Key from the upper front left, a cool fill from
 *  behind right to lift the far slabs off the ground. Both are part of
 *  the look, not knobs: the piece is lit by the fire it contains. */
const KEY_DIR = new THREE.Vector3(2, 8, 4).normalize()
const FILL_DIR = new THREE.Vector3(0.72, -0.12, -0.62).normalize()

/** The molten underlight, from below and slightly toward the viewer. It
 *  takes the ground fire's own colour rather than carrying a second one:
 *  what lights the undersides IS the pool the husk hangs over, so one
 *  control keeps the two from drifting apart, and the default puts it at
 *  #FF2606 -- the underlight in the reference. */
const BOUNCE_DIR = new THREE.Vector3(0, -4, 1).normalize()

/** Planes on the outer hull. Enough to read as a rough ball, few enough
 *  that every slab keeps visible flat facets. */
const HULL_PLANES = 26

/** Physics runs on its own clock at this step, so a 144Hz screen and a
 *  60Hz one settle identically. The reference is rendered footage and
 *  has no opinion about this; a per-frame decay would have given two
 *  different components on two different monitors. */
const PHYS_STEP = 1 / 120
const MAX_SUBSTEPS = 5

/** Damping ratio of the settle. Just under critical: the frames show
 *  the slabs arrive and stop, with no bounce, but a touch of overshoot
 *  keeps the arrival from looking like a lerp. */
const DAMPING = 0.88

/** The single frame drawn for a visitor who has asked for less movement. */
const FROZEN_TIME = 8

const MAX_SHARDS = 24
const MAX_CROSSES = 260
const MAX_DEBRIS = 160
const MAX_BEADS = 24

/* -------------------------------------------------------------- maths */

/** A pose with no bias to it. Sampling three Euler angles would crowd
 *  the poles; this is the usual quaternion form, which does not. */
function randomQuat(rng: () => number): THREE.Quaternion {
    const u = rng()
    const v = rng() * Math.PI * 2
    const w = rng() * Math.PI * 2
    const a = Math.sqrt(1 - u)
    const b = Math.sqrt(u)
    return new THREE.Quaternion(
        a * Math.sin(v),
        a * Math.cos(v),
        b * Math.sin(w),
        b * Math.cos(w)
    )
}

/** Deterministic, so the break is the same shape on the server, on the
 *  canvas and in the browser — and so a re-render is not a re-shatter. */
function makeRng(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** A direction with no bias to it. Normalising a cube sample would
 *  cluster on the diagonals; inverting the cosine does not. */
function randomDir(rng: () => number): THREE.Vector3 {
    const z = rng() * 2 - 1
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(Math.max(0, 1 - z * z))
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z)
}

/** Evenly spread directions on the sphere. */
function fibonacciDirs(n: number): THREE.Vector3[] {
    const out: THREE.Vector3[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < n; i++) {
        const y = 1 - (i / Math.max(1, n - 1)) * 2
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const th = golden * i
        out.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r))
    }
    return out
}

/* ------------------------------------------------- convex polyhedra --
 * A slab is the intersection of half-spaces: the faceted outer ball,
 * the Voronoi bisectors against every other seed, and one inner plane
 * that hollows the shell out. Clipping a convex body by a plane is
 * Sutherland-Hodgman on each face plus a cap built from the cut edges,
 * and it is exact — which is the point. Two neighbours clipped by the
 * same bisector share that face to the last bit, so the closed husk has
 * no gaps except the one we deliberately hold it open by.
 */

interface Face {
    n: THREE.Vector3
    pts: THREE.Vector3[]
}

const CLIP_EPS = 1e-7

function boxFaces(h: number): Face[] {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
    return [
        { n: v(1, 0, 0), pts: [v(h, -h, -h), v(h, h, -h), v(h, h, h), v(h, -h, h)] },
        { n: v(-1, 0, 0), pts: [v(-h, -h, h), v(-h, h, h), v(-h, h, -h), v(-h, -h, -h)] },
        { n: v(0, 1, 0), pts: [v(-h, h, -h), v(-h, h, h), v(h, h, h), v(h, h, -h)] },
        { n: v(0, -1, 0), pts: [v(-h, -h, h), v(-h, -h, -h), v(h, -h, -h), v(h, -h, h)] },
        { n: v(0, 0, 1), pts: [v(-h, -h, h), v(h, -h, h), v(h, h, h), v(-h, h, h)] },
        { n: v(0, 0, -1), pts: [v(h, -h, -h), v(-h, -h, -h), v(-h, h, -h), v(h, h, -h)] },
    ]
}

/** Keep the half-space dot(p, n) <= d. */
function clipConvex(faces: Face[], n: THREE.Vector3, d: number): Face[] {
    const out: Face[] = []
    const cut: THREE.Vector3[] = []

    for (const f of faces) {
        const pts = f.pts
        const m = pts.length
        const kept: THREE.Vector3[] = []
        for (let i = 0; i < m; i++) {
            const a = pts[i]
            const b = pts[(i + 1) % m]
            const da = a.dot(n) - d
            const db = b.dot(n) - d
            if (da <= CLIP_EPS) kept.push(a)
            if ((da < -CLIP_EPS && db > CLIP_EPS) || (da > CLIP_EPS && db < -CLIP_EPS)) {
                const t = da / (da - db)
                const p = a.clone().lerp(b, t)
                kept.push(p)
                cut.push(p)
            }
        }
        if (kept.length >= 3) out.push({ n: f.n.clone(), pts: kept })
    }

    if (cut.length >= 3) {
        // The cut edges arrive in no order and with every vertex met
        // twice, so the cap is rebuilt by angle around its own centroid
        // in the plane's basis.
        const c = new THREE.Vector3()
        for (const p of cut) c.add(p)
        c.multiplyScalar(1 / cut.length)

        const helper =
            Math.abs(n.x) < 0.9
                ? new THREE.Vector3(1, 0, 0)
                : new THREE.Vector3(0, 1, 0)
        const u = new THREE.Vector3().crossVectors(n, helper).normalize()
        const w = new THREE.Vector3().crossVectors(n, u)

        const ranked = cut
            .map((p) => {
                const rel = p.clone().sub(c)
                return { p, a: Math.atan2(rel.dot(w), rel.dot(u)) }
            })
            .sort((x, y) => x.a - y.a)

        const ring: THREE.Vector3[] = []
        for (const r of ranked) {
            const last = ring[ring.length - 1]
            if (!last || last.distanceToSquared(r.p) > 1e-12) ring.push(r.p)
        }
        if (ring.length >= 3 && ring[0].distanceToSquared(ring[ring.length - 1]) < 1e-12) {
            ring.pop()
        }
        if (ring.length >= 3) out.push({ n: n.clone(), pts: ring })
    }

    return out
}

interface Slab {
    geometry: THREE.BufferGeometry
    /** Where the slab sits when the husk is closed */
    home: THREE.Vector3
    /** Its outward normal — the axis it is pushed along */
    dir: THREE.Vector3
}

/**
 * One slab per seed. Non-indexed with flat face normals, because a rock
 * that shares normals across a facet is a rock that looks inflated.
 *
 * `aRest` carries each vertex's position in the CLOSED husk. Everything
 * that has to stay put while the slab flies — the basalt grain, and how
 * deep (so how hot) a point is — is a function of that, not of where
 * the slab happens to be. Read it from the live position instead and
 * the texture swims and the crack walls cool as they open.
 */
function buildHusk(
    shards: number,
    irregularity: number,
    thickness: number
): { slabs: Slab[]; inner: number } {
    const rng = makeRng(0x9e3779b9)
    const count = Math.max(3, Math.min(MAX_SHARDS, Math.round(shards)))

    // Thicker slabs hollow out less of the ball.
    const inner = THREE.MathUtils.lerp(0.62, 0.28, THREE.MathUtils.clamp(thickness, 0, 10) / 10)
    const amp = 0.06 + (THREE.MathUtils.clamp(irregularity, 0, 10) / 10) * 0.42

    // The faceted ball every slab is cut from. Shared by all of them, so
    // their union is exactly this body.
    const hull = fibonacciDirs(HULL_PLANES).map((dir) => ({
        n: dir,
        d: R * (1 - amp * 0.5 + rng() * amp),
    }))

    // Seeds jittered in direction AND radius: a seed pulled inward gives
    // ground away to its neighbours, so the slabs come out at different
    // sizes the way the reference's do.
    const spread = 0.15 + (THREE.MathUtils.clamp(irregularity, 0, 10) / 10) * 0.45
    const seeds = fibonacciDirs(count).map((dir) => {
        const jitter = new THREE.Vector3(
            rng() - 0.5,
            rng() - 0.5,
            rng() - 0.5
        ).multiplyScalar(spread)
        const axis = dir.clone().add(jitter).normalize()
        return axis.multiplyScalar(R * (0.7 + rng() * 0.5))
    })

    const slabs: Slab[] = []

    for (let i = 0; i < seeds.length; i++) {
        const si = seeds[i]
        const axis = si.clone().normalize()

        let faces = boxFaces(R * 2.4)
        for (const h of hull) faces = clipConvex(faces, h.n, h.d)
        for (let j = 0; j < seeds.length; j++) {
            if (j === i) continue
            const n = seeds[j].clone().sub(si)
            const len = n.length()
            if (len < 1e-6) continue
            n.multiplyScalar(1 / len)
            const mid = seeds[j].clone().add(si).multiplyScalar(0.5)
            faces = clipConvex(faces, n, mid.dot(n))
        }
        // Hollow: keep dot(p, axis) >= inner.
        faces = clipConvex(faces, axis.clone().negate(), -inner * R)
        if (faces.length < 4) continue

        // Pivot on the slab's own centroid, so a tumble spins it in
        // place rather than swinging it round the husk's middle.
        const centroid = new THREE.Vector3()
        let n = 0
        for (const f of faces) {
            for (const p of f.pts) {
                centroid.add(p)
                n++
            }
        }
        if (n === 0) continue
        centroid.multiplyScalar(1 / n)

        // The reference's slabs are not one rock in twelve pieces: some
        // are pale weathered plates and some are near-black char. One
        // number per slab carries that, written flat across its vertices
        // rather than sampled from a field, because the contrast has to
        // land ON the break and not wander across it.
        const slabValue = rng()

        const pos: number[] = []
        const nor: number[] = []
        const rest: number[] = []
        const seed: number[] = []
        const ab = new THREE.Vector3()
        const ac = new THREE.Vector3()
        const fn = new THREE.Vector3()

        for (const f of faces) {
            const pts = f.pts
            for (let k = 1; k + 1 < pts.length; k++) {
                const a = pts[0]
                const b = pts[k]
                const c = pts[k + 1]
                ab.subVectors(b, a)
                ac.subVectors(c, a)
                fn.crossVectors(ab, ac)
                const area = fn.length()
                if (area < 1e-10) continue
                fn.multiplyScalar(1 / area)
                // The body is convex and contains its centroid, so a
                // face normal points outward exactly when it leads away
                // from that centroid. Cheaper than trusting winding
                // through forty clips.
                const mid = a.clone().add(b).add(c).multiplyScalar(1 / 3)
                const flip = fn.dot(mid.clone().sub(centroid)) < 0
                const tri = flip ? [a, c, b] : [a, b, c]
                if (flip) fn.negate()
                for (const v of tri) {
                    pos.push(v.x - centroid.x, v.y - centroid.y, v.z - centroid.z)
                    nor.push(fn.x, fn.y, fn.z)
                    rest.push(v.x, v.y, v.z)
                    seed.push(slabValue)
                }
            }
        }
        if (pos.length < 9) continue

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
        geometry.setAttribute("aRest", new THREE.Float32BufferAttribute(rest, 3))
        geometry.setAttribute("aSlab", new THREE.Float32BufferAttribute(seed, 1))

        slabs.push({
            geometry,
            home: centroid.clone(),
            dir: centroid.clone().normalize(),
        })
    }

    return { slabs, inner }
}

/* --------------------------------------------------------- the cross --
 * An extruded plus, built by hand rather than through ExtrudeGeometry so
 * the caps stay two triangles a rectangle and the whole swarm is one
 * 36-triangle instanced draw. Arm and waist are read straight off the
 * reference stills: the bar is a little under a third of the span, and
 * the block is nearly as deep as the bar is wide, which is what gives
 * them their visible side faces.
 */
/** Read off the reference: a span of 0.45 to an arm width of 0.15 and a
 *  depth of 0.06, so against a unit span the waist is a sixth and the
 *  block is a third as deep as the arm is wide. They are PLATES, not
 *  bricks -- an earlier pass had them at more than twice this depth and
 *  the swarm read as a heap of gravel. */
const CROSS_ARM = 0.5
const CROSS_WAIST = 1 / 6
/** What Thickness 5 gives, so the control's middle is the reference. */
const CROSS_DEPTH = 1 / 15
/** Chamfer on every edge. It is a sliver, and it is most of what makes
 *  them look machined: the key light catches the bevel as a bright hem
 *  right round a face that would otherwise end in an aliased step. */
const CROSS_BEVEL = 0.016

/**
 * Depth is a build parameter rather than a scale on the instance. A
 * plate is flattened along its OWN normal, and the instances are all
 * turned differently, so squashing one through its matrix is a
 * non-uniform scale in a rotated frame -- the side faces would come out
 * lit by a normal that no longer points along them. Rebuilding is a
 * hundred triangles and happens only when the control moves.
 */
function buildCrossGeometry(depth: number): THREE.BufferGeometry {
    const A = CROSS_ARM
    const W = CROSS_WAIST
    const T = Math.max(0.004, depth)
    // On a foil-thin plate the standing bevel would be the whole of the
    // edge, so it gives way rather than swallowing the side face.
    const B = Math.min(CROSS_BEVEL, T * 0.35)

    const pos: number[] = []
    const nor: number[] = []

    const tri = (
        a: THREE.Vector3,
        b: THREE.Vector3,
        c: THREE.Vector3
    ) => {
        const ab = new THREE.Vector3().subVectors(b, a)
        const ac = new THREE.Vector3().subVectors(c, a)
        const n = new THREE.Vector3().crossVectors(ab, ac)
        if (n.lengthSq() < 1e-12) return
        n.normalize()
        const mid = a.clone().add(b).add(c).multiplyScalar(1 / 3)
        // Every face plane of a plus centred on the origin sits at a
        // positive distance from it, so the same outward test as the
        // slabs works here.
        const flip = n.dot(mid) < 0
        const v = flip ? [a, c, b] : [a, b, c]
        if (flip) n.negate()
        for (const p of v) {
            pos.push(p.x, p.y, p.z)
            nor.push(n.x, n.y, n.z)
        }
    }

    const quad = (
        a: THREE.Vector3,
        b: THREE.Vector3,
        c: THREE.Vector3,
        d: THREE.Vector3
    ) => {
        tri(a, b, c)
        tri(a, c, d)
    }

    // The outline of a plus, given its arm and waist. Offset it inward
    // by the bevel and it is still a plus, just a smaller one: every
    // edge moves in by B, and so does the reflex corner where two arms
    // meet. That one fact is what makes the chamfer a few lines rather
    // than a polygon-offset routine.
    const outlineOf = (a: number, w: number): [number, number][] => [
        [w, a],
        [w, w],
        [a, w],
        [a, -w],
        [w, -w],
        [w, -a],
        [-w, -a],
        [-w, -w],
        [-a, -w],
        [-a, w],
        [-w, w],
        [-w, a],
    ]

    // Caps, inset by the bevel: the plus splits into three disjoint
    // rectangles, so two triangles each and no triangulator.
    const ai = A - B
    const wi = W - B
    const rects: [number, number, number, number][] = [
        [-wi, wi, -ai, ai],
        [-ai, -wi, -wi, wi],
        [wi, ai, -wi, wi],
    ]
    for (const z of [T, -T]) {
        for (const [x0, x1, y0, y1] of rects) {
            quad(
                new THREE.Vector3(x0, y0, z),
                new THREE.Vector3(x1, y0, z),
                new THREE.Vector3(x1, y1, z),
                new THREE.Vector3(x0, y1, z)
            )
        }
    }

    // Sides: the outline at full width, extruded between the two bevels.
    const outer = outlineOf(A, W)
    const inner = outlineOf(ai, wi)
    const zs = T - B
    for (let i = 0; i < outer.length; i++) {
        const [x0, y0] = outer[i]
        const [x1, y1] = outer[(i + 1) % outer.length]
        quad(
            new THREE.Vector3(x0, y0, -zs),
            new THREE.Vector3(x1, y1, -zs),
            new THREE.Vector3(x1, y1, zs),
            new THREE.Vector3(x0, y0, zs)
        )
        // and the chamfer at each end, running from the full outline up
        // to the inset cap. Both rings carry the same twelve points in
        // the same order, so the strip between them is one quad a step.
        const [u0, v0] = inner[i]
        const [u1, v1] = inner[(i + 1) % inner.length]
        quad(
            new THREE.Vector3(x0, y0, zs),
            new THREE.Vector3(x1, y1, zs),
            new THREE.Vector3(u1, v1, T),
            new THREE.Vector3(u0, v0, T)
        )
        quad(
            new THREE.Vector3(x1, y1, -zs),
            new THREE.Vector3(x0, y0, -zs),
            new THREE.Vector3(u0, v0, -T),
            new THREE.Vector3(u1, v1, -T)
        )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
    return geometry
}

/* ------------------------------------------------------- the pebble --
 * Micro-debris: a dodecahedron with all twenty of its corners moved. It
 * is drawn once as an InstancedMesh, so every pebble is the same twelve
 * faces under a different rotation -- which at a twentieth of the husk
 * across is far past the point where anyone can tell, and it costs one
 * draw call for the whole field.
 */
function buildDebrisGeometry(): THREE.BufferGeometry {
    const geo = new THREE.DodecahedronGeometry(1, 0)
    const pos = geo.getAttribute("position") as THREE.BufferAttribute
    const rng = makeRng(0x27d4eb2f)

    // PolyhedronGeometry is non-indexed, so each of the twenty corners
    // appears in the buffer several times over. Move them independently
    // and the faces come apart, so a corner is displaced ONCE and the
    // result looked up by position for every copy of it.
    const moved = new Map<string, THREE.Vector3>()
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        const key = v.x.toFixed(4) + "|" + v.y.toFixed(4) + "|" + v.z.toFixed(4)
        let out = moved.get(key)
        if (!out) {
            out = v
                .clone()
                .multiplyScalar(0.58 + rng() * 0.62)
                .add(
                    new THREE.Vector3(
                        rng() - 0.5,
                        rng() - 0.5,
                        rng() - 0.5
                    ).multiplyScalar(0.26)
                )
            moved.set(key, out)
        }
        pos.setXYZ(i, out.x, out.y, out.z)
    }
    pos.needsUpdate = true
    // Non-indexed, so this gives a flat normal per triangle rather than
    // a smoothed one, which is what a chipped shard wants.
    geo.computeVertexNormals()
    return geo
}

/* ------------------------------------------------------------ shaders */

/** Value noise and fbm, shared by the rock grain and the melt. */
const NOISE_GLSL = `
float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
        mix(mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.1, 1.0)), f.x), f.y),
        f.z);
}

float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return s;
}
`

/**
 * The one lighting model in the piece: a neutral key from above, a cool
 * fill from behind, a hot directional bounce from below, a dim
 * hemisphere over the top of both, and a point light in the hollow
 * standing in for the melt. Rock, crosses, debris and beads all go
 * through it, which is why the swarm sits in the same room as the slabs
 * instead of looking pasted on.
 *
 * MeshStandardMaterial is deliberately not used for any of them. Three's
 * lights would light the instanced parts and not the rock, whose grain,
 * fissures and heat are computed in this shader -- two lighting systems
 * on one object, disagreeing about where the light is. Roughness and
 * metalness are matched here instead: the swarm is shaded with the
 * Blinn exponent and reflectance equivalent to roughness 0.35 /
 * metalness 0.1, so it reads the same without the split.
 */
const LIGHT_GLSL = `
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform vec3 uBounceDir;
uniform vec3 uGroundColor;
uniform vec3 uLavaColor;
uniform float uLavaPower;
uniform vec3 uCenter;

vec3 shade(vec3 P, vec3 N, vec3 V, vec3 albedo, float spec, float gloss, float ground) {
    float key = max(dot(N, uKeyDir), 0.0);
    vec3 col = albedo * key * 2.05;

    col += albedo * max(dot(N, uFillDir), 0.0) * vec3(0.2, 0.235, 0.35);

    // The bounce off the fire, as a directional rather than a second
    // hemisphere: the reference's underlight has a direction to it --
    // undersides angled toward the viewer are hotter than ones angled
    // away -- and a hemisphere cannot say that.
    col += albedo * max(dot(N, uBounceDir), 0.0) * uGroundColor * 1.55 * ground;

    // Hemisphere over the top of it, for the ambient the bounce misses.
    float up = N.y * 0.5 + 0.5;
    col += albedo * mix(uGroundColor * 0.42 * ground, vec3(0.078, 0.085, 0.108), up);

    // The melt in the hollow, as a point light. Falls off fast so the
    // slabs nearest the middle are the ones that catch it.
    vec3 toCore = uCenter - P;
    float dist = max(length(toCore), 0.0001);
    vec3 L = toCore / dist;
    float atten = 1.0 / (1.0 + dist * dist * 3.2);
    col += albedo * uLavaColor * max(dot(N, L), 0.0) * atten * uLavaPower * 5.5 * ground;

    vec3 H = normalize(uKeyDir + V);
    col += vec3(1.0) * pow(max(dot(N, H), 0.0), gloss) * spec;

    return col;
}
`

const ROCK_VERT = `
attribute vec3 aRest;
attribute float aSlab;
varying float vSlab;
varying vec3 vRest;
varying vec3 vN;
varying vec3 vW;

void main() {
    vRest = aRest;
    vSlab = aSlab;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const ROCK_FRAG = `
precision highp float;

varying float vSlab;
varying vec3 vRest;
varying vec3 vN;
varying vec3 vW;

uniform vec3 uRockColor;
uniform float uWeathering;
uniform vec3 uHotColor;
uniform float uInner;
uniform float uHeat;
uniform float uTime;

${NOISE_GLSL}
${LIGHT_GLSL}

void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);

    // Grain is sampled in REST space, so it is painted on the rock and
    // stays there while the rock flies.
    float grain = fbm(vRest * 9.0);
    float coarse = fbm(vRest * 1.9 + 11.0);

    // Bumping the normal by the gradient of the grain. Three extra taps
    // rather than derivatives: the slabs are flat-shaded, and dFdx on a
    // flat facet gives a clean field but ties the bump to screen size.
    float e = 0.035;
    vec3 g = vec3(
        fbm(vRest * 9.0 + vec3(e, 0.0, 0.0)) - grain,
        fbm(vRest * 9.0 + vec3(0.0, e, 0.0)) - grain,
        fbm(vRest * 9.0 + vec3(0.0, 0.0, e)) - grain
    );
    N = normalize(N - (g - N * dot(g, N)) * 5.5);

    // Weathered grey plates over cold char, the way basalt breaks.
    float plate = smoothstep(0.44 + (0.5 - vSlab) * 0.28, 0.74, coarse + grain * 0.14);
    vec3 albedo = mix(uRockColor, uRockColor + vec3(0.34, 0.335, 0.325), plate * uWeathering);
    albedo *= (0.86 + grain * 0.38) * (0.42 + vSlab * 1.25);

    vec3 col = shade(vW, N, V, albedo, 0.035, 26.0, 1.0);

    // Heat is depth, and only depth. An earlier pass also lit every
    // TANGENTIAL face — every surface a slab was split along — and it
    // made a scattered husk read as a bag of glowing lava rocks. The
    // reference is the opposite: a chunk broken clear of the ball shows
    // plain grey fracture, and the orange in those frames is either a
    // hairline between two slabs still nearly closed, or the light out
    // of the hollow landing on an underside. So the emissive band is
    // narrow and sits right on the cavity: the seam lines are those
    // inner faces seen THROUGH the gap, and the molten undersides are
    // the point light in the hollow. There is no core body to see --
    // the shell is empty, and this band is the whole of its light.
    float depth = length(vRest);
    float heat = 1.0 - smoothstep(uInner * 0.96, uInner * 1.55, depth);
    heat *= heat;
    // Veins rather than a wash, so the molten faces have structure.
    float vein = smoothstep(0.34, 0.78, fbm(vRest * 5.0 + vec3(0.0, uTime * 0.35, 0.0)));
    float melt = heat * (0.35 + vein * 0.9);
    col += mix(uLavaColor, uHotColor, vein * 0.8) * melt * uHeat;

    // FISSURES. The bright orange lines in the reference are not gaps
    // between slabs — frames 4 and 5 show them running across the face
    // of a chunk that has broken clear of everything, and frame 12 shows
    // the same line on a husk that is shut. They are splits in the crust
    // with the melt showing through, so they belong to the ROCK and
    // travel with it. A ridge of the noise (the set where it crosses its
    // own mid-value) gives a connected network of thin curves for free —
    // no seam has to be traced, and because the field is sampled in rest
    // space the line stays painted on the slab as it tumbles.
    // ONE octave, not fbm: the zero-set of a smooth field is a few long
    // curves, while the zero-set of a five-octave one is a web, and the
    // reference has one or two lines to a chunk. The band is tight
    // enough to stay a line at any size the frame is set to, and a
    // slower mask decides WHICH parts of the crust are split at all, so
    // some slabs come out unbroken the way they do in the footage.
    float fis = vnoise(vRest * 1.6 + 3.7);
    float ridge = 1.0 - abs(fis - 0.5) * 22.0;
    float mask = smoothstep(0.44, 0.74, fbm(vRest * 0.9 + 9.1));
    float line = smoothstep(0.5, 1.0, ridge) * mask;
    // A wider, dimmer skirt around it, or the line reads as a decal laid
    // on the rock rather than a split with heat behind it.
    float skirt = smoothstep(-1.6, 1.0, ridge) * mask;
    col += mix(uLavaColor, uHotColor, line * 0.8) * (line * 2.6 + skirt * skirt * 0.22) * uHeat * 0.35;

    gl_FragColor = vec4(col, 1.0);
}
`

/** Debris runs the rock's own fragment shader, so a pebble is the same
 *  basalt as the slabs down to the grain. Only the vertex stage differs,
 *  because these are instanced and the slabs are not. */
const DEBRIS_VERT = `
attribute float aSlab;
varying float vSlab;
varying vec3 vRest;
varying vec3 vN;
varying vec3 vW;

void main() {
    vSlab = aSlab;
    vec4 lp = instanceMatrix * vec4(position, 1.0);
    // ROCK_FRAG reads vRest as a position in the CLOSED husk: it picks
    // the grain, the fissures, and how molten the point is. A pebble is
    // a tenth of a unit across and floats outside the shell, so its own
    // husk-space position is scaled up before being handed over. That
    // does two things at once. It drops every pebble into a different
    // patch of the grain, so no two are textured alike; and it puts them
    // all far outside the heat band, so debris comes out cold basalt
    // instead of embers.
    vRest = lp.xyz * 2.6;
    vec4 wp = modelMatrix * lp;
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const CROSS_VERT = `
attribute vec3 aSeedColor;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;

void main() {
    vTint = aSeedColor;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    // Instances are rotated and uniformly scaled, so the upper 3x3 needs
    // no inverse-transpose.
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const CROSS_FRAG = `
precision highp float;

varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;

uniform vec3 uCrossColor;

${LIGHT_GLSL}

void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    // A little spread in value so a dense cluster still reads as many
    // blocks rather than one white mass.
    vec3 albedo = uCrossColor * vTint;
    // Roughness 0.35 as a Blinn exponent is 2/a^2 - 2 with a = 0.35^2,
    // about 130; reflectance is the 0.04 dielectric floor lifted a
    // tenth of the way to the albedo for metalness 0.1. The swarm is
    // matte stock with a tight sheen, never self-illuminated.
    // A white plate takes far more of the fire than dark basalt does, so
    // it is handed about a tenth of what the rock gets. At the rock own
    // setting half of every cross came out scarlet; the reference has it
    // as a warm hem along the under-edges and nothing more.
    vec3 col = shade(vW, N, V, albedo, 0.13, 130.0, 0.12);
    // A cool floor under it. With the fire turned down to a hem, a face
    // angled away from the key had nothing left but that hem, and the
    // shadow sides of the swarm came out maroon; in the reference they
    // are blue-grey. This is the room the plates sit in, not the fire.
    col += albedo * vec3(0.088, 0.099, 0.128);

    // The bevels are a sliver wide and at glancing angles they are most
    // of what the eye has to go on, so they get a little help.
    float rim = pow(1.0 - max(dot(N, V), 0.0), 5.0);
    col += vec3(0.42, 0.44, 0.5) * rim * 0.35;
    gl_FragColor = vec4(col, 1.0);
}
`

const BEAD_VERT = `
varying vec3 vN;
varying vec3 vW;

void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`

/** No cubemap in a single file, so the beads reflect the room they are
 *  actually in: fire below, dark above, one key highlight, and the melt
 *  glowing up at them. At this size that is indistinguishable from
 *  chrome, and it costs nothing. */
const BEAD_FRAG = `
precision highp float;

varying vec3 vN;
varying vec3 vW;

uniform vec3 uKeyDir;
uniform vec3 uGroundColor;
uniform vec3 uLavaColor;
uniform float uLavaPower;
uniform vec3 uCenter;

void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 Rv = reflect(-V, N);

    vec3 env = mix(uGroundColor * 1.35, vec3(0.045, 0.05, 0.07), smoothstep(-0.35, 0.45, Rv.y));
    env += vec3(1.0) * pow(max(dot(Rv, uKeyDir), 0.0), 90.0) * 2.4;

    vec3 toCore = normalize(uCenter - vW);
    float dist = max(length(uCenter - vW), 0.0001);
    env += uLavaColor * pow(max(dot(Rv, toCore), 0.0), 8.0) * uLavaPower * 2.2 / (1.0 + dist * dist);

    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    env += vec3(0.5, 0.52, 0.58) * fres * 0.5;

    gl_FragColor = vec4(env, 1.0);
}
`

const BG_VERT = `
varying vec2 vUvBg;
void main() {
    vUvBg = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
}
`

/** The ground. Not a CSS gradient behind the canvas: the fire has to be
 *  inside the linear buffer so the bloom sits on it and the beads can
 *  reflect the same colour the viewer sees. */
const BG_FRAG = `
precision highp float;
varying vec2 vUvBg;

uniform vec3 uDeep;
uniform vec3 uGlowColor;
uniform float uGlow;
uniform float uAspect;

void main() {
    vec2 q = vUvBg - vec2(0.5, -0.08);
    // Squashed by aspect so the pool of fire stays wide in a portrait
    // frame instead of turning into a circle.
    q.x *= uAspect * 0.62;
    float d = length(q);
    // Added rather than mixed. A mix reaches the fire colour and then has
    // nowhere left to go, so the whole lower half of the frame flattens
    // into one flat red; adding keeps the falloff going all the way down.
    float g = pow(clamp(1.0 - d * 1.02, 0.0, 1.0), 2.7);
    vec3 col = uDeep + uGlowColor * g * uGlow;

    // Ordered dither, or a gradient this shallow bands on an 8-bit
    // display however good the buffer behind it is.
    float dither = fract(sin(dot(vUvBg, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += dither * 0.0035;

    gl_FragColor = vec4(col, 1.0);
}
`

/* -------------------------------------------------------------- bloom --
 * A mip chain rather than a gaussian: prefilter with a soft knee, halve
 * as many times as the frame can carry, then walk back up adding a 9-tap
 * tent at each step. Wide, cheap, and free of the ringing a two-pass
 * blur leaves along a hard rock edge.
 */

const QUAD_VERT = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const PREFILTER_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;

void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float lum = max(c.r, max(c.g, c.b));
    float soft = clamp(lum - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 0.0001);
    gl_FragColor = vec4(c * max(soft, lum - uThreshold) / max(lum, 0.0001), 1.0);
}
`

const DOWN_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;

vec3 tap(float x, float y) {
    return texture2D(tDiffuse, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
    vec3 a = tap(-2.0,  2.0), b = tap( 0.0,  2.0), c = tap( 2.0,  2.0);
    vec3 d = tap(-2.0,  0.0), e = tap( 0.0,  0.0), f = tap( 2.0,  0.0);
    vec3 g = tap(-2.0, -2.0), h = tap( 0.0, -2.0), i = tap( 2.0, -2.0);
    vec3 j = tap(-1.0,  1.0), k = tap( 1.0,  1.0);
    vec3 l = tap(-1.0, -1.0), m = tap( 1.0, -1.0);

    vec3 sum = e * 0.125;
    sum += (a + c + g + i) * 0.03125;
    sum += (b + d + f + h) * 0.0625;
    sum += (j + k + l + m) * 0.125;
    gl_FragColor = vec4(sum, 1.0);
}
`

const UP_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;

vec3 tap(float x, float y) {
    return texture2D(tDiffuse, vUv + vec2(x, y) * uTexel * uRadius).rgb;
}

void main() {
    vec3 sum = tap(-1.0,  1.0) + tap(0.0,  1.0) * 2.0 + tap(1.0,  1.0);
    sum += tap(-1.0,  0.0) * 2.0 + tap(0.0,  0.0) * 4.0 + tap(1.0,  0.0) * 2.0;
    sum += tap(-1.0, -1.0) + tap(0.0, -1.0) * 2.0 + tap(1.0, -1.0);
    gl_FragColor = vec4(sum * 0.0625, 1.0);
}
`

const COMPOSITE_FRAG = `
precision highp float;
uniform sampler2D tBase;
uniform sampler2D tBloom;
uniform float uStrength;
varying vec2 vUv;

void main() {
    vec4 base = texture2D(tBase, vUv);
    vec3 bloom = texture2D(tBloom, vUv).rgb * uStrength;
    gl_FragColor = vec4(base.rgb + bloom, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`

/* ------------------------------------------------------------- params */

/** A partial group coming from a caller may not carry every field --
 *  merge rather than trust, and drop undefined so a partial group cannot
 *  punch a hole in the defaults. */
function merge<T extends object>(base: T, over?: Partial<T>): T {
    const out = { ...base }
    if (!over) return out
    for (const key of Object.keys(over) as (keyof T)[]) {
        const value = over[key]
        if (value !== undefined) out[key] = value as T[keyof T]
    }
    return out
}

const clamp01to10 = (v: number, fallback: number) =>
    Number.isFinite(v) ? THREE.MathUtils.clamp(v, 0, 10) : fallback

interface Params {
    background: Required<EmberHuskBackground>
    size: number
    structure: Required<EmberHuskStructure>
    rock: Required<EmberHuskRock>
    core: Required<EmberHuskCore>
    crosses: Required<EmberHuskCrosses>
    debris: Required<EmberHuskDebris>
    beads: number
    entrance: Required<EmberHuskEntrance>
    response: Required<EmberHuskResponse>
    drift: Required<EmberHuskDrift>
    glow: Required<EmberHuskGlow>
    quality: "low" | "medium" | "high"
}

function makeParams(p: EmberHuskProps): Params {
    const crosses = merge(DEFAULT_CROSSES, p.crosses)
    const debris = merge(DEFAULT_DEBRIS, p.debris)
    const beads = Number(p.beads)
    return {
        background: merge(DEFAULT_BACKGROUND, p.background),
        size: clamp01to10(Number(p.size), DEFAULTS.size),
        structure: merge(DEFAULT_STRUCTURE, p.structure),
        rock: merge(DEFAULT_ROCK, p.rock),
        core: merge(DEFAULT_CORE, p.core),
        crosses: {
            ...crosses,
            count: THREE.MathUtils.clamp(
                Number.isFinite(Number(crosses.count)) ? Math.round(Number(crosses.count)) : 0,
                0,
                MAX_CROSSES
            ),
        },
        debris: {
            ...debris,
            count: THREE.MathUtils.clamp(
                Number.isFinite(Number(debris.count)) ? Math.round(Number(debris.count)) : 0,
                0,
                MAX_DEBRIS
            ),
        },
        beads: THREE.MathUtils.clamp(
            Number.isFinite(beads) ? Math.round(beads) : DEFAULTS.beads,
            0,
            MAX_BEADS
        ),
        entrance: merge(DEFAULT_ENTRANCE, p.entrance),
        response: merge(DEFAULT_RESPONSE, p.response),
        drift: merge(DEFAULT_DRIFT, p.drift),
        glow: merge(DEFAULT_GLOW, p.glow),
        quality: p.quality ?? (DEFAULTS.quality as "low" | "medium" | "high"),
    }
}

/** Thickness on the panel to a plate depth against a unit span. The
 *  middle of the control is the reference's own 0.06-to-0.45 ratio. */
const crossDepth = (thickness: number) =>
    0.015 + (THREE.MathUtils.clamp(thickness, 0, 10) / 10) * 0.1034

/** How far the camera stands so the husk fills the asked-for share of
 *  the frame's SHORT side — the piece keeps its size when the frame goes
 *  from portrait to landscape. */
function cameraDistance(size: number, aspect: number): number {
    const fill = 0.36 + (size / 10) * 0.62
    const halfFov = Math.tan((FOV * Math.PI) / 360)
    const shrink = Math.min(1, aspect)
    return (R * 1.16) / Math.max(0.02, fill * halfFov * shrink)
}

const makeRT = (w: number, h: number, depth: boolean) =>
    new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: depth,
        stencilBuffer: false,
    })

/* -------------------------------------------------------- piece state */

/** One entry per moving thing. `push` is where it is along its own
 *  outward axis and `ang` how far it is turned off rest; both are
 *  springs, and both are fed by the entrance and by the cursor. */
interface Piece {
    home: THREE.Vector3
    dir: THREE.Vector3
    axis: THREE.Vector3
    tilt: number
    delay: number
    push: number
    pushVel: number
    ang: number
    angVel: number
    /** Its resting orientation. Identity for the slabs, which have to
     *  close up exactly; a random one for anything that only floats. */
    base: THREE.Quaternion
    /** Per-axis idle turn, radians a second. Zero for the slabs. */
    spin: THREE.Vector3
    /** Whether it turns forever rather than locking back to `base`. */
    free: boolean
    scale: number
    /** Rest distance from the middle, in husk radii. Only the swarm uses
     *  it: Spread scales it every frame, so dragging that control moves
     *  the crosses already on screen instead of only the next batch. */
    radius: number
    /** Which way the cursor last shoved it, in rig space. Chased rather
     *  than snapped, so a piece swings round as the cursor passes it
     *  instead of flicking to the far side. */
    lateral: THREE.Vector3
}

/* --------------------------------------------------------- component -- */

export default function EmberHusk(props: EmberHuskProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const paramsRef = useRef<Params>(makeParams(props))
    const q = (paramsRef.current = makeParams(props))

    const apiRef = useRef<{
        invalidate: () => void
        rebuild: () => void
    } | null>(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let renderer: THREE.WebGLRenderer
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
            })
        } catch (err) {
            console.error("[ember-husk] could not create a WebGL context:", err)
            return
        }

        const p0 = paramsRef.current
        const dprCap = p0.quality === "low" ? 1 : p0.quality === "medium" ? 1.5 : 2
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
        renderer.setClearColor(0x000000, 1)
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1
        renderer.autoClear = false

        const canvas = renderer.domElement
        canvas.style.position = "absolute"
        canvas.style.inset = "0"
        canvas.style.display = "block"
        container.appendChild(canvas)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100)
        camera.position.set(0, 0, 4)

        /* ---------------------------------------------------- uniforms */

        const lava = new THREE.Color(DEFAULT_CORE.color)
        const hot = new THREE.Color(DEFAULT_CORE.hotColor)
        const ground = new THREE.Color(DEFAULT_BACKGROUND.glowColor)
        const centre = new THREE.Vector3()

        const shared = {
            uKeyDir: { value: KEY_DIR.clone() },
            uFillDir: { value: FILL_DIR.clone() },
            uBounceDir: { value: BOUNCE_DIR.clone() },
            uGroundColor: { value: ground },
            uLavaColor: { value: lava },
            uLavaPower: { value: 0.6 },
            uCenter: { value: centre },
        }

        const rockMat = new THREE.ShaderMaterial({
            uniforms: {
                ...shared,
                uRockColor: { value: new THREE.Color(DEFAULT_ROCK.color) },
                uWeathering: { value: 0.5 },
                uHotColor: { value: hot },
                uInner: { value: 0.45 },
                uHeat: { value: 1 },
                uTime: { value: 0 },
            },
            vertexShader: ROCK_VERT,
            fragmentShader: ROCK_FRAG,
            toneMapped: false,
        })

        // Shares rockMat's uniform objects rather than copying them, so
        // Rock Color and Core Intensity reach the pebbles without a
        // second set of assignments that could fall out of step.
        const debrisMat = new THREE.ShaderMaterial({
            uniforms: rockMat.uniforms,
            vertexShader: DEBRIS_VERT,
            fragmentShader: ROCK_FRAG,
            toneMapped: false,
        })

        const crossMat = new THREE.ShaderMaterial({
            uniforms: {
                ...shared,
                uCrossColor: { value: new THREE.Color(DEFAULT_CROSSES.color) },
            },
            vertexShader: CROSS_VERT,
            fragmentShader: CROSS_FRAG,
            toneMapped: false,
        })

        const beadMat = new THREE.ShaderMaterial({
            uniforms: { ...shared },
            vertexShader: BEAD_VERT,
            fragmentShader: BEAD_FRAG,
            toneMapped: false,
        })

        const bgMat = new THREE.ShaderMaterial({
            uniforms: {
                uDeep: { value: new THREE.Color(DEFAULT_BACKGROUND.color) },
                uGlowColor: { value: ground },
                uGlow: { value: 0.6 },
                uAspect: { value: 1 },
            },
            vertexShader: BG_VERT,
            fragmentShader: BG_FRAG,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
        })

        /* ------------------------------------------------------- scene */

        const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat)
        bgQuad.frustumCulled = false
        bgQuad.renderOrder = -1000
        scene.add(bgQuad)

        // Everything that moves together hangs off the rig: the bob, the
        // sway and the idle turn are on it, the shatter is inside it.
        const rig = new THREE.Group()
        scene.add(rig)

        // Rebuilt by build() whenever Thickness moves, so it cannot be
        // const -- the cleanup disposes whichever one is current.
        let crossGeo = buildCrossGeometry(CROSS_DEPTH)
        const debrisGeo = buildDebrisGeometry()
        const beadGeo = new THREE.SphereGeometry(1, 18, 14)

        let slabMeshes: THREE.Mesh[] = []
        let slabPieces: Piece[] = []
        let crossMesh: THREE.InstancedMesh | null = null
        let crossPieces: Piece[] = []
        let debrisMesh: THREE.InstancedMesh | null = null
        let debrisPieces: Piece[] = []
        let beadMesh: THREE.InstancedMesh | null = null
        let beadPieces: Piece[] = []

        const disposeHusk = () => {
            for (const m of slabMeshes) {
                rig.remove(m)
                m.geometry.dispose()
            }
            slabMeshes = []
            slabPieces = []
            if (crossMesh) {
                rig.remove(crossMesh)
                crossMesh.dispose()
                crossMesh = null
            }
            crossPieces = []
            if (debrisMesh) {
                rig.remove(debrisMesh)
                debrisMesh.dispose()
                debrisMesh = null
            }
            debrisPieces = []
            if (beadMesh) {
                rig.remove(beadMesh)
                beadMesh.dispose()
                beadMesh = null
            }
            beadPieces = []
        }

        /** Structural rebuild. Everything else is a uniform, so this runs
         *  only when a count or a shape changes — never on a colour. */
        const build = () => {
            const q = paramsRef.current
            disposeHusk()

            const { slabs, inner } = buildHusk(
                q.structure.shards,
                q.structure.irregularity,
                q.structure.thickness
            )
            rockMat.uniforms.uInner.value = inner

            const rng = makeRng(0x1f123bb5)
            for (const s of slabs) {
                const mesh = new THREE.Mesh(s.geometry, rockMat)
                mesh.frustumCulled = false
                rig.add(mesh)
                slabMeshes.push(mesh)
                slabPieces.push({
                    home: s.home.clone(),
                    dir: s.dir.clone(),
                    axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
                    tilt: rng() - 0.5,
                    delay: rng(),
                    push: 0,
                    pushVel: 0,
                    ang: 0,
                    angVel: 0,
                    base: new THREE.Quaternion(),
                    spin: new THREE.Vector3(),
                    free: false,
                    scale: 1,
                    radius: 0,
                    lateral: new THREE.Vector3(),
                })
            }

            // The swarm rings the husk evenly. An earlier pass biased it
            // onto one flank, which the first stills seemed to show; the
            // later frame settles it -- crosses come round the far side
            // and sit in the cracks between slabs, so the sample is
            // uniform over the sphere and starts well inside the shell.
            crossGeo.dispose()
            crossGeo = buildCrossGeometry(crossDepth(q.crosses.thickness))

            const n = q.crosses.count
            if (n > 0) {
                crossMesh = new THREE.InstancedMesh(crossGeo, crossMat, n)
                crossMesh.frustumCulled = false
                const tints = new Float32Array(n * 3)
                for (let i = 0; i < n; i++) {
                    const dir = randomDir(rng)
                    // From inside the shell to well clear of it: the ones
                    // that start under the outer radius are the ones that
                    // show through the cracks when the husk opens.
                    const radius = R * (0.45 + Math.pow(rng(), 0.62) * 1.15)
                    const t = 0.82 + rng() * 0.3
                    tints[i * 3] = t
                    tints[i * 3 + 1] = t
                    tints[i * 3 + 2] = t * (0.99 + rng() * 0.05)
                    crossPieces.push({
                        home: dir.clone().multiplyScalar(radius),
                        dir: dir.clone(),
                        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
                        tilt: rng() - 0.5,
                        delay: rng(),
                        push: 0,
                        pushVel: 0,
                        ang: rng() * Math.PI * 2,
                        angVel: 0,
                        // They never lock to anything, so they keep a
                        // slow turn of their own for good -- on all three
                        // of their own axes, not one shared line.
                        base: randomQuat(rng),
                        spin: new THREE.Vector3(
                            (rng() - 0.5) * 0.62,
                            (rng() - 0.5) * 0.62,
                            (rng() - 0.5) * 0.62
                        ),
                        free: true,
                        scale: 0.7 + rng() * 0.6,
                        radius,
                        lateral: new THREE.Vector3(),
                    })
                }
                crossGeo.setAttribute(
                    "aSeedColor",
                    new THREE.InstancedBufferAttribute(tints, 3)
                )
                rig.add(crossMesh)
            }

            // Micro-debris. The reference asks for a shell at r = 1.8
            // to 3.2 against a unit ball, but at the framing this
            // component ships with, the short side of the frame only
            // reaches world 1.73 -- that whole field would sit off
            // screen. Kept in proportion and brought in to where it can
            // be seen, with Spread to push it back out.
            const pebbles = q.debris.count
            if (pebbles > 0) {
                debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, pebbles)
                debrisMesh.frustumCulled = false
                const values = new Float32Array(pebbles)
                for (let i = 0; i < pebbles; i++) {
                    const dir = randomDir(rng)
                    const radius = R * (1.12 + Math.pow(rng(), 0.8) * 0.95)
                    values[i] = 0.4 + rng() * 0.6
                    debrisPieces.push({
                        home: dir.clone().multiplyScalar(radius),
                        dir: dir.clone(),
                        axis: randomDir(rng),
                        tilt: rng() - 0.5,
                        delay: rng(),
                        push: 0,
                        pushVel: 0,
                        ang: 0,
                        angVel: 0,
                        base: randomQuat(rng),
                        // Faster than the swarm: a chip carries less
                        // moment than a plate, and the reference's small
                        // pieces are visibly the busiest thing in frame.
                        spin: new THREE.Vector3(
                            (rng() - 0.5) * 1.6,
                            (rng() - 0.5) * 1.6,
                            (rng() - 0.5) * 1.6
                        ),
                        free: true,
                        scale: 0.05 + rng() * 0.1,
                        radius,
                        lateral: new THREE.Vector3(),
                    })
                }
                debrisGeo.setAttribute(
                    "aSlab",
                    new THREE.InstancedBufferAttribute(values, 1)
                )
                rig.add(debrisMesh)
            }

            const beads = q.beads
            if (beads > 0) {
                beadMesh = new THREE.InstancedMesh(beadGeo, beadMat, beads)
                beadMesh.frustumCulled = false
                for (let i = 0; i < beads; i++) {
                    const dir = new THREE.Vector3(
                        rng() - 0.5,
                        rng() - 0.5,
                        rng() - 0.5
                    ).normalize()
                    beadPieces.push({
                        home: dir.clone().multiplyScalar(R * (0.95 + rng() * 0.65)),
                        dir: dir.clone(),
                        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
                        tilt: rng() - 0.5,
                        delay: rng(),
                        push: 0,
                        pushVel: 0,
                        ang: 0,
                        angVel: 0,
                        base: new THREE.Quaternion(),
                        spin: new THREE.Vector3(),
                        free: false,
                        scale: 0.016 + rng() * 0.016,
                        radius: 0,
                        lateral: new THREE.Vector3(),
                    })
                }
                rig.add(beadMesh)
            }

            resetEntrance()
        }

        /* --------------------------------------------------- entrance */

        // The shatter is not a separate animation: it is the initial
        // condition of the same spring the cursor pushes. That is why a
        // hover halfway through the arrival blends instead of fighting.
        const resetEntrance = () => {
            const q = paramsRef.current
            const rng = makeRng(0x85ebca6b)
            const scatter = (q.entrance.scatter / 10) * 2.9 + 0.15
            const tumble = (q.entrance.tumble / 10) * 3.4

            const seed = (list: Piece[], reach: number) => {
                for (const piece of list) {
                    piece.push = scatter * reach * (0.55 + rng() * 0.9)
                    piece.pushVel = -scatter * (0.4 + rng() * 0.5)
                    piece.ang = (rng() - 0.5) * 2 * tumble
                    piece.angVel = (rng() - 0.5) * 2 * tumble * 2.2
                }
            }
            seed(slabPieces, 1)
            seed(crossPieces, 1.35)
            seed(debrisPieces, 2.1)
            seed(beadPieces, 1.6)
            entranceClock = 0
        }

        let entranceClock = 0

        build()

        /* ---------------------------------------------------- bloom rig */

        const quadScene = new THREE.Scene()
        const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        const quadGeo = new THREE.PlaneGeometry(2, 2)
        const quad = new THREE.Mesh(quadGeo)
        quad.frustumCulled = false
        quadScene.add(quad)

        const passMat = (
            fragmentShader: string,
            extra: Record<string, THREE.IUniform>
        ) =>
            new THREE.ShaderMaterial({
                uniforms: { tDiffuse: { value: null }, ...extra },
                vertexShader: QUAD_VERT,
                fragmentShader,
                depthTest: false,
                depthWrite: false,
                blending: THREE.NoBlending,
                toneMapped: false,
            })

        const prefilterMat = passMat(PREFILTER_FRAG, {
            uThreshold: { value: 0.85 },
            uKnee: { value: 0.4 },
        })
        const downMat = passMat(DOWN_FRAG, {
            uTexel: { value: new THREE.Vector2() },
        })
        const upMat = passMat(UP_FRAG, {
            uTexel: { value: new THREE.Vector2() },
            uRadius: { value: 1.2 },
        })
        upMat.blending = THREE.AdditiveBlending

        const compositeMat = new THREE.ShaderMaterial({
            uniforms: {
                tBase: { value: null },
                tBloom: { value: null },
                uStrength: { value: 0.4 },
            },
            vertexShader: QUAD_VERT,
            fragmentShader: COMPOSITE_FRAG,
            depthTest: false,
            depthWrite: false,
            blending: THREE.NoBlending,
        })

        const blit = (
            mat: THREE.Material,
            target: THREE.WebGLRenderTarget | null,
            clear: boolean
        ) => {
            quad.material = mat
            renderer.setRenderTarget(target)
            if (clear) renderer.clear(true, true, false)
            renderer.render(quadScene, quadCam)
        }

        /* ------------------------------------------------------ sizing */

        const rtScene = makeRT(1, 1, true)
        let mips: { rt: THREE.WebGLRenderTarget; w: number; h: number }[] = []
        let sizeW = 0
        let sizeH = 0
        let aspect = 1
        let dirty = true

        const dropMips = () => {
            for (const m of mips) m.rt.dispose()
            mips = []
        }

        const resize = () => {
            const w = Math.max(1, container.clientWidth)
            const h = Math.max(1, container.clientHeight)
            if (w === sizeW && h === sizeH) return
            sizeW = w
            sizeH = h
            aspect = w / h

            renderer.setSize(w, h)
            camera.aspect = aspect
            camera.updateProjectionMatrix()
            bgMat.uniforms.uAspect.value = aspect

            const dpr = renderer.getPixelRatio()
            const pw = Math.max(1, Math.round(w * dpr))
            const ph = Math.max(1, Math.round(h * dpr))
            rtScene.setSize(pw, ph)

            const cap = paramsRef.current.quality === "low" ? 3 : 5
            const levels = Math.max(
                2,
                Math.min(cap, Math.floor(Math.log2(Math.min(pw, ph))) - 3)
            )
            dropMips()
            let mw = Math.max(1, pw >> 1)
            let mh = Math.max(1, ph >> 1)
            for (let i = 0; i < levels; i++) {
                mips.push({ rt: makeRT(mw, mh, false), w: mw, h: mh })
                mw = Math.max(1, mw >> 1)
                mh = Math.max(1, mh >> 1)
            }
            dirty = true
        }

        resize()

        const ro = new ResizeObserver(resize)
        ro.observe(container)

        let onScreen = true
        const io = new IntersectionObserver(
            (entries) => {
                onScreen = entries.some((e) => e.isIntersecting)
            },
            { rootMargin: "200px" }
        )
        io.observe(container)

        /* ----------------------------------------------------- pointer */

        // Held in normalised device coordinates and compared there: the
        // cursor pushes a fixed share of the FRAME, so Reach means the
        // same thing on a hero and on a thumbnail, and a slab at the far
        // side of the husk is not pushed because it happens to be closer
        // in world space.
        const pointer = new THREE.Vector2(0, 0)
        let over = false
        let hoverAmount = 0

        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect()
            if (rect.width < 1 || rect.height < 1) return
            pointer.set(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -(((e.clientY - rect.top) / rect.height) * 2 - 1)
            )
            over = true
        }
        const onPointerLeave = () => {
            over = false
        }

        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerenter", onPointerMove)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("pointercancel", onPointerLeave)

        /* ------------------------------------------------------ params */

        let lastQuality = p0.quality
        const parsed = {
            rock: "",
            lava: "",
            hot: "",
            cross: "",
            deep: "",
            ground: "",
        }
        const recolour = (target: THREE.Color, css: string) => {
            try {
                target.setStyle(css)
            } catch {}
        }

        const applyParams = () => {
            const q = paramsRef.current

            if (parsed.rock !== q.rock.color) {
                parsed.rock = q.rock.color
                recolour(rockMat.uniforms.uRockColor.value, q.rock.color)
            }
            if (parsed.lava !== q.core.color) {
                parsed.lava = q.core.color
                recolour(lava, q.core.color)
            }
            if (parsed.hot !== q.core.hotColor) {
                parsed.hot = q.core.hotColor
                recolour(hot, q.core.hotColor)
            }
            if (parsed.cross !== q.crosses.color) {
                parsed.cross = q.crosses.color
                recolour(crossMat.uniforms.uCrossColor.value, q.crosses.color)
            }
            if (parsed.deep !== q.background.color) {
                parsed.deep = q.background.color
                recolour(bgMat.uniforms.uDeep.value, q.background.color)
            }
            if (parsed.ground !== q.background.glowColor) {
                parsed.ground = q.background.glowColor
                recolour(ground, q.background.glowColor)
            }

            if (lastQuality !== q.quality) {
                lastQuality = q.quality
                const cap = q.quality === "low" ? 1 : q.quality === "medium" ? 1.5 : 2
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap))
                // resize() early-outs on an unchanged size, and the size
                // has not changed — only what it is multiplied by.
                sizeW = 0
                sizeH = 0
                resize()
            }

            bgMat.uniforms.uGlow.value = 0.14 + (q.background.glow / 10) * 1.35

            const intensity = q.core.intensity / 10
            // No core body any more, so the inner faces and the point
            // light in the hollow carry the whole of it and both have to
            // work harder than they did with a lamp sitting in there.
            rockMat.uniforms.uHeat.value = 0.4 + intensity * 5.2
            rockMat.uniforms.uWeathering.value = q.rock.weathering / 10
            shared.uLavaPower.value = 0.12 + intensity * 1.55

            prefilterMat.uniforms.uThreshold.value = 0.4 + (q.glow.threshold / 10) * 3.0
            prefilterMat.uniforms.uKnee.value =
                Math.max(0.05, prefilterMat.uniforms.uThreshold.value * 0.4)
            upMat.uniforms.uRadius.value = 0.55 + (q.glow.radius / 10) * 1.7
            compositeMat.uniforms.uStrength.value = 0.04 + (q.glow.strength / 10) * 0.62

            camera.position.z = cameraDistance(q.size, aspect)
            camera.lookAt(0, 0, 0)
        }

        /* ----------------------------------------------------- physics */

        const tmpVec = new THREE.Vector3()
        const tmpQuat = new THREE.Quaternion()
        const tmpSpin = new THREE.Quaternion()
        const tmpEuler = new THREE.Euler()
        const tmpMat = new THREE.Matrix4()
        const tmpScale = new THREE.Vector3()

        /** The direction the last piece measured lies from the cursor, in
         *  NDC. Written by proximity() so the falloff and the direction
         *  come out of one projection instead of two. */
        const away = new THREE.Vector2()
        const lateralWorld = new THREE.Vector3()
        const rigInv = new THREE.Quaternion()

        /** Screen-space falloff from the cursor to a piece's home. */
        const proximity = (piece: Piece, reach: number): number => {
            tmpVec.copy(piece.home).applyMatrix4(rig.matrixWorld).project(camera)
            let dx = tmpVec.x - pointer.x
            const dy = tmpVec.y - pointer.y
            away.set(dx, dy)
            // NDC is square; the frame usually is not. Correcting keeps
            // the reach circular on the screen.
            dx *= aspect > 1 ? aspect : 1
            const dyc = aspect < 1 ? dy / Math.max(aspect, 0.05) : dy
            const d = Math.sqrt(dx * dx + dyc * dyc)
            const f = 1 - THREE.MathUtils.clamp(d / Math.max(reach, 0.001), 0, 1)
            return f * f
        }

        const stepPieces = (
            list: Piece[],
            dt: number,
            k: number,
            c: number,
            strength: number,
            reach: number,
            released: number
        ) => {
            for (const piece of list) {
                // A piece still inside its stagger is frozen where the
                // shatter left it, so the husk lands in waves.
                if (released < piece.delay) continue

                const near = hoverAmount > 0.001 ? proximity(piece, reach) : 0

                if (near > 0.0001) {
                    // NDC x and y are world X and Y here: the camera sits
                    // on +Z looking at the origin with no roll, and it is
                    // the rig that turns, never the camera. So the shove
                    // is read straight off the screen and then carried
                    // back into rig space, which is the space the piece
                    // is positioned in.
                    lateralWorld.set(away.x, away.y, 0)
                    if (lateralWorld.lengthSq() < 1e-9) {
                        // Cursor exactly on the piece: no side to be
                        // pushed to, so fall back to straight out.
                        lateralWorld.copy(piece.dir)
                    } else {
                        lateralWorld.normalize().applyQuaternion(rigInv)
                    }
                    piece.lateral.lerp(lateralWorld, 1 - Math.exp(-dt * 11))
                    const len = piece.lateral.length()
                    if (len > 1e-6) piece.lateral.multiplyScalar(1 / len)
                }

                const targetPush = near * strength
                const targetAng = near * strength * piece.tilt * 3.4

                piece.pushVel += ((targetPush - piece.push) * k - piece.pushVel * c) * dt
                piece.push += piece.pushVel * dt

                piece.angVel += ((targetAng - piece.ang) * k - piece.angVel * c) * dt
                piece.ang += piece.angVel * dt
            }
        }

        const poseSlabs = (restGap: number, repel: number) => {
            for (let i = 0; i < slabMeshes.length; i++) {
                const piece = slabPieces[i]
                const mesh = slabMeshes[i]
                // Even closed, the slabs are held a hair apart. That gap
                // is the only thing the hollow's light gets out through,
                // and it is what draws the hairline seams.
                // The push splits two ways: out from the middle, and
                // away from the cursor. Repel picks the mix. The rest gap
                // is radial whatever happens, or a closed husk would come
                // apart sideways.
                const offset = piece.push * (1 - repel) + restGap
                mesh.position
                    .copy(piece.home)
                    .addScaledVector(piece.dir, offset)
                    .addScaledVector(piece.lateral, piece.push * repel)
                mesh.quaternion.setFromAxisAngle(piece.axis, piece.ang)
            }
        }

        const poseInstances = (
            mesh: THREE.InstancedMesh | null,
            list: Piece[],
            t: number,
            baseScale: number,
            repel: number
        ) => {
            if (!mesh) return
            for (let i = 0; i < list.length; i++) {
                const piece = list[i]
                tmpVec
                    .copy(piece.home)
                    .addScaledVector(piece.dir, piece.push * (1 - repel))
                    .addScaledVector(piece.lateral, piece.push * repel)
                // Three rotations stacked, outermost first: the shatter
                // and hover tumble about a world axis, then a free turn
                // on the piece's own three axes, then the pose it was
                // born in. Composing them beats one axis-angle, which
                // could only ever tumble a cross about a single line and
                // made a whole swarm look like it was on a rotisserie.
                tmpQuat.setFromAxisAngle(piece.axis, piece.ang)
                if (piece.free) {
                    tmpEuler.set(
                        piece.spin.x * t,
                        piece.spin.y * t,
                        piece.spin.z * t
                    )
                    tmpQuat.multiply(tmpSpin.setFromEuler(tmpEuler))
                }
                tmpQuat.multiply(piece.base)
                tmpScale.setScalar(baseScale * piece.scale)
                tmpMat.compose(tmpVec, tmpQuat, tmpScale)
                mesh.setMatrixAt(i, tmpMat)
            }
            mesh.instanceMatrix.needsUpdate = true
        }

        /* ------------------------------------------------------- frame */

        const renderFrame = (t: number, dt: number) => {
            const q = paramsRef.current
            applyParams()

            const wanted = q.response.strength > 0 && over ? 1 : 0
            hoverAmount += (wanted - hoverAmount) * (1 - Math.exp(-dt * 9))
            if (hoverAmount < 0.002) hoverAmount = 0

            const k = 14 + (q.response.settle / 10) * 62
            const c = 2 * Math.sqrt(k) * DAMPING
            // Curved rather than linear, and running to 1.9 husk radii.
            // The old linear 0.8 topped out at a nudge -- at 10 the husk
            // now blows properly open, while the middle of the control
            // still lands near where it always sat.
            const strength =
                Math.pow(THREE.MathUtils.clamp(q.response.strength, 0, 10) / 10, 1.35) *
                1.9 *
                hoverAmount
            const reach = 0.12 + (q.response.reach / 10) * 0.9
            const repel = THREE.MathUtils.clamp(q.response.repel, 0, 10) / 10
            const stagger = (q.entrance.stagger / 10) * 0.95

            const spread = 0.5 + (q.crosses.spread / 10) * 1.1
            for (const piece of crossPieces) {
                piece.home.copy(piece.dir).multiplyScalar(piece.radius * spread)
            }
            const dust = 0.6 + (q.debris.spread / 10) * 0.8
            for (const piece of debrisPieces) {
                piece.home.copy(piece.dir).multiplyScalar(piece.radius * dust)
            }

            // The rig has to be current before proximity() projects
            // through it, or the push lands one frame behind the turn.
            rig.updateMatrixWorld(true)
            rigInv.copy(rig.quaternion).invert()

            let remaining = Math.min(dt, MAX_SUBSTEPS * PHYS_STEP)
            let guard = 0
            while (remaining > 0 && guard < MAX_SUBSTEPS) {
                const step = Math.min(PHYS_STEP, remaining)
                entranceClock += step
                const released =
                    stagger <= 0 ? 1 : THREE.MathUtils.clamp(entranceClock / stagger, 0, 1)
                stepPieces(slabPieces, step, k, c, strength, reach, released)
                stepPieces(crossPieces, step, k, c, strength * 1.3, reach, released)
                // Softer spring, harder shove, wider catchment: the
                // debris is the part of the field that scatters furthest
                // and takes longest to come back.
                stepPieces(
                    debrisPieces,
                    step,
                    k * 0.55,
                    c * 0.55,
                    strength * 2.4,
                    reach * 1.2,
                    released
                )
                stepPieces(beadPieces, step, k * 0.7, c * 0.7, strength * 1.6, reach, released)
                remaining -= step
                guard++
            }

            // Idle. The rig turns, rises and rocks; nothing inside it
            // knows, which is what keeps the shell closed while it moves.
            const spin = (q.drift.spin / 10) * 0.52
            const bob = (q.drift.bob / 10) * 0.11
            const sway = (q.drift.sway / 10) * 0.17
            rig.rotation.y = t * spin
            rig.rotation.z = Math.sin(t * 0.43) * sway
            rig.rotation.x = Math.sin(t * 0.31 + 1.1) * sway * 0.6
            rig.position.y = Math.sin(t * 0.6) * bob
            rig.updateMatrixWorld(true)

            centre.copy(rig.position)

            poseSlabs((q.rock.seam / 10) * 0.045 + 0.002, repel)
            poseInstances(
                crossMesh,
                crossPieces,
                t,
                (q.crosses.size / 10) * 0.4 + 0.08,
                repel
            )
            poseInstances(
                debrisMesh,
                debrisPieces,
                t,
                (q.debris.size / 10) * 1.4 + 0.3,
                repel
            )
            poseInstances(beadMesh, beadPieces, t, 1, repel)

            // Flow drove the core body's melt; with that gone it drives
            // the only melt left, the veining on the inner faces. uTime
            // is read nowhere else in the rock shader, so scaling it here
            // keeps the control meaning exactly what its label says.
            rockMat.uniforms.uTime.value = t * (0.12 + (q.core.flow / 10) * 1.3)

            // 1. the piece, into a linear buffer that can hold values the
            //    core pushes well past 1
            renderer.setRenderTarget(rtScene)
            renderer.clear(true, true, false)
            renderer.render(scene, camera)

            // 2. bright pass, straight into the foot of the mip chain
            prefilterMat.uniforms.tDiffuse.value = rtScene.texture
            blit(prefilterMat, mips[0].rt, true)

            // 3. down the chain
            for (let i = 1; i < mips.length; i++) {
                const src = mips[i - 1]
                downMat.uniforms.tDiffuse.value = src.rt.texture
                downMat.uniforms.uTexel.value.set(1 / src.w, 1 / src.h)
                blit(downMat, mips[i].rt, true)
            }

            // 4. and back up it, every level adding into the one below
            for (let i = mips.length - 1; i > 0; i--) {
                const src = mips[i]
                upMat.uniforms.tDiffuse.value = src.rt.texture
                upMat.uniforms.uTexel.value.set(1 / src.w, 1 / src.h)
                blit(upMat, mips[i - 1].rt, false)
            }

            // 5. out to the canvas, tone mapped
            compositeMat.uniforms.tBase.value = rtScene.texture
            compositeMat.uniforms.tBloom.value = mips[0].rt.texture
            blit(compositeMat, null, true)
        }

        /** The still frame: the husk closed, nothing tumbling, no cursor. */
        const settle = () => {
            for (const list of [slabPieces, crossPieces, debrisPieces, beadPieces]) {
                for (const piece of list) {
                    piece.push = 0
                    piece.pushVel = 0
                    piece.lateral.set(0, 0, 0)
                    piece.ang = 0
                    piece.angVel = 0
                }
            }
            hoverAmount = 0
            over = false
            entranceClock = 10
        }

        /* -------------------------------------------------------- loop */

        let prefersReduced = false
        try {
            prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        } catch {}

        const clock = new THREE.Clock()
        let last = 0

        const loop = () => {
            // For a visitor whose system asks for less movement, the
            // piece is a picture: painted once and repainted only when
            // something it stands on changes. There is no control for
            // the second half of that — a visitor who has asked the OS
            // for less movement has already answered the question, and
            // it is not the designer's to overrule.
            if (prefersReduced) {
                if (!dirty) return
                dirty = false
                settle()
                renderFrame(FROZEN_TIME, 0)
                return
            }
            if (!onScreen) return

            const t = clock.getElapsedTime()
            const dt = Math.min(0.1, t - last)
            last = t
            renderFrame(t, dt)
        }

        renderer.setAnimationLoop(loop)

        apiRef.current = {
            invalidate: () => {
                dirty = true
            },
            rebuild: () => {
                build()
                dirty = true
            },
        }

        return () => {
            renderer.setAnimationLoop(null)
            apiRef.current = null

            ro.disconnect()
            io.disconnect()
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerenter", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("pointercancel", onPointerLeave)

            disposeHusk()
            crossGeo.dispose()
            debrisGeo.dispose()
            beadGeo.dispose()
            bgQuad.geometry.dispose()
            quadGeo.dispose()
            rockMat.dispose()
            crossMat.dispose()
            debrisMat.dispose()
            beadMat.dispose()
            bgMat.dispose()
            prefilterMat.dispose()
            downMat.dispose()
            upMat.dispose()
            compositeMat.dispose()
            rtScene.dispose()
            dropMips()

            // dispose() frees GL resources but leaves the context alive
            // until the canvas is collected, which is not deterministic.
            // This effect re-runs on every StrictMode double mount and
            // every hot update, so without an explicit release they pile
            // up and the browser's context limit is reached.
            renderer.dispose()
            renderer.forceContextLoss()
            canvas.remove()
        }
        // Mounted once. Everything the loop needs is read through
        // paramsRef; the structural counts are handed in by the effect
        // below, because rebuilding a buffer must not tear down the
        // WebGL context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const structuralKey = [
        Math.round(q.structure.shards),
        Math.round(q.structure.irregularity * 10),
        Math.round(q.structure.thickness * 10),
        q.crosses.count,
        Math.round(q.crosses.thickness * 10),
        q.debris.count,
        q.beads,
    ].join("|")
    const builtRef = useRef(structuralKey)
    useEffect(() => {
        if (builtRef.current === structuralKey) return
        builtRef.current = structuralKey
        apiRef.current?.rebuild()
    }, [structuralKey])

    // Deliberately without a dependency list: this is what turns a prop
    // change into a repainted frame while the render loop is running.
    useEffect(() => {
        apiRef.current?.invalidate()
    })

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                // The canvas paints its own ground; this is only what
                // shows in the instant before WebGL comes up.
                background: q.background.color,
                ...props.style,
            }}
        />
    )
}
