"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * BALL OF GLASS — a truncated-icosahedron shell of 32 faceted glass tiles, held
 * together by their own pull home, shoved apart by a metal ball that rides
 * under the pointer, the whole shell leaning and swinging with the pointer's
 * momentum.
 *
 * A port of antonbobrov/r3f-rapier-ball-of-glass. Gone: three,
 * @react-three/fiber, @react-three/rapier, the WebGPU renderer, the 6.7 MB
 * model.glb and the 1.7 MB warehouse.hdr. One file, raw WebGL, no fetch.
 *
 * WHAT THE MODEL ACTUALLY IS. The GLB's 32 meshes are named Icosphere but they
 * are not spheres: 12 have 5300 vertices and 20 have 6318, and every vertex of
 * every mesh lies between r = 0.894 and r = 1.007. They are SHELL SEGMENTS —
 * 12 pentagons and 20 hexagons of a truncated icosahedron, each a slice of a
 * spherical shell. Pentagons sit slightly proud (outer 1.0066) of the hexagons
 * (0.9899); both share an inner radius of 0.8943.
 *
 * WHY THAT MAKES IT CHEAP. A tile is the intersection of: the ball r <= Ro, the
 * complement of the ball r < Ri, and its Voronoi cell among the 32 face axes.
 * Every Voronoi boundary is the bisector of two unit axes, so every side plane
 * passes through the ORIGIN. A ray meets all of that in closed form: clip a
 * t-interval by K planes, clip by two quadratics, subtract the inner one. No
 * marching, no mesh, no vertex buffer, and the surface normal falls out of
 * whichever constraint set the entry.
 *
 * WHY 11 NUMBERS DESCRIBE ALL 32 TILES. A truncated icosahedron is
 * face-transitive within each face type, so all 20 hexagons are congruent and
 * all 12 pentagons are congruent. Expressed in a local frame built from the
 * face axis and one neighbour, every hexagon gives the SAME six side planes and
 * every pentagon the SAME five — verified to 2.3e-5 over all 32 (see
 * buildTiles). So the shader carries two constant plane sets and one quaternion
 * per tile, not 32 plane sets. Uniform cost: 96 vec4.
 *
 * WHAT REPLACES warehouse.hdr. The real thing, downsampled. The 1024x512 HDR is
 * box-filtered to 64x32 and log-encoded to 8 bits per channel (mean round-trip
 * error 3.8%), embedded below as 8 KB of base64. Log encoding is what allows
 * LINEAR filtering — RGBE cannot be interpolated, and a tone-mapped 8-bit
 * encoding loses the windows, which carry 53x the mean radiance. This matters
 * more than any other single decision here: the warehouse is a DARK ceiling
 * with a bright band at the horizon, and a procedural room with strip lights
 * overhead renders a completely different, much darker object.
 *
 * Rendering matches the source's r3f defaults: linear light throughout, ACES
 * filmic tone map, sRGB encode.
 *
 * WHAT REPLACES rapier, AND WHERE IT DELIBERATELY DIFFERS. Collision uses one
 * sphere per tile, sized so the rest packing is exact: hex-hex rest spacing is
 * 0.6708 and hex-pent 0.6024, which solves to r_hex = 0.3354 and r_pent =
 * 0.2670, and the nearest non-neighbour pair is 0.9884 apart, so no false
 * contact exists. But sphere colliders can NEST where hull shell-segments
 * cannot, so the source's pull-to-origin would collapse the shell into a blob.
 * The restoring force is therefore a spring to the tile's REST slot rather than
 * to the origin. Same visible behaviour — shoved tiles spring back and the ball
 * re-forms — and it additionally guarantees the pentagon/hexagon pattern can
 * never permute, which sphere physics alone would allow and which would render
 * as overlapping tiles. This is the one behavioural substitution in the port
 * and it is here because of the collider approximation, not by preference.
 *
 * THE POINTER FEEL IS THE SOURCE'S SPRING. useAnimatableVec3: a target that
 * accumulates raw mouse DELTAS and decays back to zero on `friction`, and a
 * current that eases toward that target on `ease`. Group 0.02/0.1, pointer
 * 0.1/0.25 — the source's numbers, as are parallax 1.5, rotation PI*0.6,
 * collider 0.75 and the visible ball 0.5; the Cursor group scales the last four
 * and ships at 200%, which is what holds the shell open. That is why it swings
 * after the pointer stops and why standing still recentres it. Both rates are
 * frame-rate corrected. The source's device-orientation and window-drag inputs
 * are dropped: neither exists on a Framer canvas.
 *
 * The group transform is applied to the CAMERA, not to the tiles — the shell
 * and the physics stay in ball space and only the ray is moved, so the 32
 * quaternions are constants. The environment is scene-level in the source, so
 * env lookups are rotated back into world space.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop (raw rAF ticks on the Framer canvas). Never
 * calls loseContext(). Buffer is sized from canvas.clientWidth/Height — the
 * width/height props are not numeric in preview.
 *
 * PERFORMANCE. A pixel budget rather than a fixed DPR, four tile traversals,
 * per-tile bounding sphere before the plane test, and a whole-ball bounding
 * sphere that rejects every background pixel for one quadratic. Not designer
 * dials (rule 10).
 *
 * RESPONSIVE. Two things have to give for the ball to survive a change of
 * shape. The camera is normalised on the SHORTER axis, so the 60 degree fov
 * applies to whichever axis is scarce and the framing holds from a wide banner
 * to a portrait phone; on a height-normalised camera the ball needs an aspect
 * of 0.55 to fit and clips on anything narrower. And the root carries no
 * minimum width — a floor there does not enlarge the component, it widens the
 * PAGE and hands the viewport a slice of an oversized ball.
 */

const TILES = 32
const BOUNCES = 4
const DPR_CAP = 2
// Roughly what a 1600x900 hero costs at the old flat 1.25 ratio. resize() sizes
// the buffer to hold to this, so a small box gets a sharper ratio and a huge one
// a cheaper one, instead of every box paying the same multiplier.
const PIXEL_BUDGET = 1600 * 900 * 1.25 * 1.25
const PHYS_DT = 1 / 120
const MAX_SUBSTEPS = 5

// Resting contact is the normal condition here, not the exception: the pointer
// ball parks at the origin and holds all 32 tiles open against their own pull,
// so every tile is touching something every substep. A textbook solver buzzes
// forever in that state — full positional projection fights the spring and a
// restitution of 1 hands the energy straight back. These three are rapier's own
// answer and they are what make the resting shell silent.
const PEN_SLOP = 0.002 // penetration left uncorrected, so contact can rest
const PEN_CORRECT = 0.8 // fraction of the excess resolved per substep
// Below this approach speed a contact does not bounce. It has to clear the
// speed the pull spring alone builds in one substep — at the strongest pull
// and the widest opening that is about 0.45 — or the resting shell buzzes.
// A real pointer flick drives tiles several units/s, so bounce survives it.
const REST_SPEED = 1.0
// Substeps run once at mount so the shell opens before the first frame instead
// of popping outward in front of the viewer. 5 s of sim, and the pull spring is
// lightly damped, so this needs the headroom. 32 bodies for 600 steps is a few
// milliseconds once, at mount.
const WARMUP_STEPS = 600

// Measured off the GLB (see the header).
const RI = 0.8943 // inner shell radius, both tile types
const RO_HEX = 0.9899
const RO_PENT = 1.0066
const RC = 0.94 // tile centre radius, used for collision and bounds
const BOUND_HEX = 0.45
const BOUND_PENT = 0.33
// Solved from the rest spacings (see header), then backed off 1%. At the exact
// solve every neighbour pair sits precisely at contact, so float noise fires
// half of them every substep and the shell breathes itself apart by 0.15 with
// nothing touching it. With the gap, resting contact count is zero.
const COL_HEX = 0.3354 * 0.99
const COL_PENT = 0.267 * 0.99
// Angular radius of a tile about its own axis, measured off the GLB.
const COS_HEX = Math.cos((26.36 * Math.PI) / 180)
const COS_PENT = Math.cos((18.45 * Math.PI) / 180)

const ROT_STRENGTH = Math.PI * 0.6 // source: `const rotation = Math.PI * 0.6`
const PTR_PARALLAX = 1.5 // source: `const parallax = 1.5`
const PTR_VISIBLE_R = 0.5 // source: visible mesh sphereGeometry args[0]
const PTR_COLLIDER_R = 0.75 // source: invisible collider sphereGeometry args[0]

// The 32 face axes, taken from the GLB's vertex centroids so the ball keeps the
// source's exact orientation. w: 1 = pentagon, 0 = hexagon.
const AXES: number[][] = [
    [-0.794655, -0.187594, 0.577349, 0],
    [-0.491121, -0.794657, 0.35682, 0],
    [-0.491121, -0.794657, -0.35682, 0],
    [0.187594, -0.794658, 0.577345, 0],
    [0.303533, -0.187595, 0.934171, 0],
    [-0.303533, 0.187595, 0.934171, 0],
    [-0.187594, 0.794658, 0.577345, 0],
    [0.491121, 0.794657, 0.35682, 0],
    [0.491121, 0.794657, -0.35682, 0],
    [-0.607059, 0.794657, 0, 0],
    [-0.982247, 0.187594, 0, 0],
    [-0.794655, -0.187594, -0.577349, 0],
    [-0.187594, 0.794658, -0.577345, 0],
    [-0.303533, 0.187595, -0.934171, 0],
    [0.303533, -0.187595, -0.934171, 0],
    [0.187594, -0.794658, -0.577345, 0],
    [0.607059, -0.794657, 0, 0],
    [0.982247, -0.187594, 0, 0],
    [0.794655, 0.187594, -0.577349, 0],
    [0.794655, 0.187594, 0.577349, 0],
    [-0.894426, -0.447216, 0, 1],
    [-0.276389, -0.447219, 0.850649, 1],
    [0.000001, -1, 0, 1],
    [0.276389, 0.447219, 0.850649, 1],
    [-0.000001, 1, 0, 1],
    [-0.723607, 0.447219, 0.525726, 1],
    [-0.723607, 0.447219, -0.525726, 1],
    [0.276389, 0.447219, -0.850649, 1],
    [-0.276389, -0.447219, -0.850649, 1],
    [0.723607, -0.447219, 0.525726, 1],
    [0.894426, 0.447216, 0, 1],
    [0.723607, -0.447219, -0.525726, 1],
]

type V3 = [number, number, number]
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross3 = (a: V3, b: V3): V3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
]
const norm3 = (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    return [a[0] / l, a[1] / l, a[2] / l]
}

interface TileData {
    quats: Float32Array // 32 * 4, canonical -> world
    types: Float32Array // 32, 1 = pentagon
    rest: Float32Array // 32 * 3, rest centre in ball space
    hexPlanes: Float32Array // 6 * 3, canonical
    pentPlanes: Float32Array // 5 * 3, canonical
    deviation: number // max canonical mismatch across all 32 tiles
}

/**
 * Builds the per-tile rotations and the two canonical plane sets.
 *
 * Local frame: e3 = the face axis, e1 = the in-plane direction toward a
 * reference neighbour (a HEXAGON neighbour for a hexagon tile, so the choice is
 * one of the three the tile's own 120-degree symmetry maps onto itself, and any
 * of the five for a pentagon). Side-plane normals are sorted by azimuth from a
 * small positive offset — sorting from exactly zero puts the plane that sits at
 * azimuth 0 either first or last depending on 1e-5 of float noise, which is
 * what makes the sets disagree by a whole element.
 */
function buildTiles(): TileData {
    const axes: V3[] = AXES.map((a) => [a[0], a[1], a[2]])
    const isPent = AXES.map((a) => a[3] === 1)

    const neighbours = (i: number) =>
        axes
            .map((n, j) => ({ j, a: Math.acos(Math.min(1, dot3(axes[i], n))) }))
            .filter((o) => o.j !== i && o.a < Math.PI / 4)
            .sort((a, b) => a.a - b.a)

    const frame = (i: number) => {
        const nb = neighbours(i)
        const ref = isPent[i] ? nb[0] : nb.find((o) => !isPent[o.j])!
        const e3 = axes[i]
        const nr = axes[ref.j]
        const k = dot3(nr, e3)
        const e1 = norm3(sub3(nr, [e3[0] * k, e3[1] * k, e3[2] * k]))
        const e2 = cross3(e3, e1)
        const planes = nb
            .map((o) => {
                const p = norm3(sub3(axes[i], axes[o.j]))
                return [dot3(p, e1), dot3(p, e2), dot3(p, e3)] as V3
            })
            .sort((a, b) => {
                const A = (Math.atan2(a[1], a[0]) + 2 * Math.PI + 0.01) % (2 * Math.PI)
                const B = (Math.atan2(b[1], b[0]) + 2 * Math.PI + 0.01) % (2 * Math.PI)
                return A - B
            })
        return { e1, e2, e3, planes }
    }

    const hexRef = frame(AXES.findIndex((a) => a[3] === 0))
    const pentRef = frame(AXES.findIndex((a) => a[3] === 1))

    const quats = new Float32Array(TILES * 4)
    const types = new Float32Array(TILES)
    const rest = new Float32Array(TILES * 3)
    let deviation = 0

    for (let i = 0; i < TILES; i++) {
        const f = frame(i)
        const ref = isPent[i] ? pentRef : hexRef
        for (let k = 0; k < f.planes.length; k++) {
            const d = sub3(f.planes[k], ref.planes[k])
            deviation = Math.max(deviation, Math.hypot(d[0], d[1], d[2]))
        }

        // Quaternion of the matrix whose COLUMNS are e1, e2, e3.
        const m00 = f.e1[0]
        const m10 = f.e1[1]
        const m20 = f.e1[2]
        const m01 = f.e2[0]
        const m11 = f.e2[1]
        const m21 = f.e2[2]
        const m02 = f.e3[0]
        const m12 = f.e3[1]
        const m22 = f.e3[2]
        const tr = m00 + m11 + m22
        let x: number, y: number, z: number, w: number
        if (tr > 0) {
            const s = Math.sqrt(tr + 1) * 2
            w = 0.25 * s
            x = (m21 - m12) / s
            y = (m02 - m20) / s
            z = (m10 - m01) / s
        } else if (m00 > m11 && m00 > m22) {
            const s = Math.sqrt(1 + m00 - m11 - m22) * 2
            w = (m21 - m12) / s
            x = 0.25 * s
            y = (m01 + m10) / s
            z = (m02 + m20) / s
        } else if (m11 > m22) {
            const s = Math.sqrt(1 + m11 - m00 - m22) * 2
            w = (m02 - m20) / s
            x = (m01 + m10) / s
            y = 0.25 * s
            z = (m12 + m21) / s
        } else {
            const s = Math.sqrt(1 + m22 - m00 - m11) * 2
            w = (m10 - m01) / s
            x = (m02 + m20) / s
            y = (m12 + m21) / s
            z = 0.25 * s
        }
        quats[i * 4] = x
        quats[i * 4 + 1] = y
        quats[i * 4 + 2] = z
        quats[i * 4 + 3] = w
        types[i] = isPent[i] ? 1 : 0
        rest[i * 3] = axes[i][0] * RC
        rest[i * 3 + 1] = axes[i][1] * RC
        rest[i * 3 + 2] = axes[i][2] * RC
    }

    const flat = (p: V3[]) => {
        const out = new Float32Array(p.length * 3)
        p.forEach((v, i) => {
            out[i * 3] = v[0]
            out[i * 3 + 1] = v[1]
            out[i * 3 + 2] = v[2]
        })
        return out
    }

    return {
        quats,
        types,
        rest,
        hexPlanes: flat(hexRef.planes),
        pentPlanes: flat(pentRef.planes),
        deviation,
    }
}

const TILE_DATA = buildTiles()

// warehouse.hdr, 64x32, log-encoded RGB. See the header.
const ENV_W = 64
const ENV_H = 32
const ENV_LOG = 5.7674
const ENV_B64 = "BAMCBAMCBAMCBAMCBAMCBAMCAwMCAwMCAwMCAwMCAwMCAwMCAwMCAwMCAwMCAwMCBAMCBAMCBAMCBAMCBAMCBAMCBAMCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAMCBAQCBAQCBAQCBAQCBAQCBAMCBAMCBAMCBAMCAwIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAwIBAwMCAwMCBAMCBAMCBAMCBAQCBAQCBQQCBQQCBQQCBQQCBQQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAMCBAMCBAMCBAMCBAQCBAMCBAMCBAMCBAMCBAMCBAMCBAMCBAMCBAMCBAMCBAMCAwMCAwMCAgIBAgIBAgEBAgEBAgEBAgEBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgIBAgEBAgEBAgEBAgEBAgEBAgEBAgIBAgIBAgEBAgIBAwMCAwMBBAMCBAMCBAMCBAQCBAQCBAQCBAQCBAQCBAQCBQQCBQQCBQUDBQUDBQUDBQQDBQQDBQQDBQQDBQQDBQQDBQQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAQCBAMCBAMCBAMCBAMCBAMCBAMCAwMCAgIBAgIBAQEBAgIBAgIBAgIBAgIBAgIBAwIBAwICAwMCAwMCAwMCAwMCAwMCAwMCAwICAwIBAgIBAgIBAgIBAgIBAgEBAgEBAgIBAgEBAgEBAgIBAgIBAwIBAwIBAwIBAwIBAwMCBAMCBQQDBgYDCAcECQgFCQgFCQkGCQgGCQgGCAgFCAcFBwYEBgUDBgUDBQQDBQQDBQQDBQQDBQQCBAQCBAQCBAQCBAQCBAQCBAQCBAMCBAMCBAMCBAMCAgIBAgIBAgIBAgIBAgIBAgIBAwIBAwMCAwMCAwMCBAMCBAQDBAQDBAQDBQQDBAQDBAQDBAQDAwMCAwMCAwMCAwIBAgEBAgEBAgEBAgEBAgEBAgEBAwIBBAMCBAMCBAMCBAMCAwMCBAMCBAMCAwMCBQQDDQwIGBYSHBsWIB8ZHx4YHBoWFxYSEA8MCgkH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GRcRGBUQFhMOFBINFRMOFRMOExENEhAMFBIOFBIOERAMDw4LDQwJDw4KEhEMFRQPFhUQFhQPFRMOFRMOFBMOFBIOFRMPFBMPFBMPExIOEhENERAMEA8LDw4KDw4LDg0KDQwJDAsICwoHCwoHCwoHDAsIDgwIDw0JDg0JDg0JDw0JEQ8KExEMFRMNFxUQGRYRGBUQFxUQFxUPFxUPFxUPFxUPGBUQGBYQGRYQGhgSHBoUHBkUGxkTGxkUGxkUGRcSGBUQFxUQFhQPFRMOFRMOFBIOExEMExENFBINExENEhEMEhEMExINFBIOFhQPFhUQFRQPFhQPFRMPFRMOExINExIOEhENFBMOFRMPFBMOFBIOEhENEhAMEA8LEA8LEA8LDw4KDg0JDgwJDQwIDQwIDQwIDgwIDQwIDg0JDw0JEA4KEQ8LEhALExEMFBINFhQPGBYQFxUPFhQOFhQOFxQPFxQPFxQPGhcRGxgSGhgSGhgSGhgTGRcSGRcTGRcSGBUQFhQPFhQPFhQOFRMOExENExEMEhAMEhEMEhAMEhEMExEMExINFBMOFRMOFRQPExINExIOEhENEhENExENExENEhENExEOExIOExIOEhENEQ8LERAMEA8LDw4KEA8LEA4KDw4KDg0JDg0JDQsIDAsIDAsHDAsIDQwIDgwJDg0JDw4KEA4KEQ8LEhEMFBINFRMOFhMOFxUPFxUQGRYRGRcRGBYQFxUPGBYQGRcRGBYRFxUQGRYRGBYRFxUQGBYRGBYRGBYQFhQPFBIOFBIOFBINExEMExENExEMEhEMEhEMEhAMEhAMExENFBINExINERAMEhAMEhENExIOERAMERAMEhENEhENEhENEhEMEhAMEA8LERALDw4KDw4KEA4KDw4KDg0JDg0JDQwIDQsIDAsIDAsIDQsIDQwIDQwIDg0JDw4KEA8KEA8KEhALExEMExEMEhAMExENFxQPGBUQGBUQGBYQFhQOFhQPGRcRFxUQGBYRGRcRGRcRFxUQGBYQFxUPFhQPFhQPFRMPFBINExINExINEhAMEhAMERALEQ8LEA8KEA8LERALEhAMEhAMEhAMEhEMEhEMERAMEQ8MEQ8LEA8LEhENEhAMEhAMERAMDw4KEA8LEA8LDw4KDw4KDw0KDg0JDgwJDQwIDQsIDQsIDQwIDAsIDQsIDQsIDg0JDw0JEA4KEQ8KEQ8KEQ8LFBINExENFBINFRMOFhMOFxQPFRMOFhMOFxUQGBYRGBYRGRcSGhgTFxURFhQPFxUQFhQPFhQPFRMOFBINFBINFRMOFBINFBINEhAMEhAMERALERALEQ8LEhENDw4KEA8LEA8LEA8LEA8LEA4LEA4LEA8LERAMEQ8MEA8LDw4KDg0JDw4KDw4KDgwJDQwIDAsIDQsIDAsIDQwIDQwIDQwIDQsIDQsIDQsIDgwIDQwIDw0JDw4KEA4KEA4KExEMEhALExENExENExEMExELFRMNFhQPGBYRFhUQFhQQGBYRGBYSFxURGBYRFhQPFhQPFRMOFRMOFBINFBINFRMOFRMOFRMOFhMOFRMOExINEQ8LERALEQ8LEhAMEQ8LEA4LEA8LDw4KDg0KDg0KDg0JDg0JDQwJDw4KEA8LDw4KDg0KDg0JDg0JDw4KDw4KDQwJDQsIDAsIDQwIDQwIDgwJDQwIDgwIDgwIDgwIDg0JDg0JDw0JDw0JDw4JEA4KEA8KEhALExEMEhALExEMFBINFRMOFhQPFxUPFhQPFRMOFxUQGBYRFxUQFxURFhQPFhQPFhQOFBINFBINFRMOFRMOFBINFRMOFRMOFRMOExENEhAMERALERALEQ8LEQ8LEA8LEA8LEA8LDw4KDw0KDg0JDg0KDw4KEA8LDw4KDg0KDQwJDQwJDw4KDw4KDw0JDw4KDw0JDw4KDw4KDw0JDw0JDw4KDg0JDg0JDw0JDw0JDw4KEA8KEA4KEA4KEQ8LEhEMEhAMEhAMExEMFBINFRMOFRMOFBMOFhQPFhQPFRMOFRMPFRQPFRMPFRMOFBINFRMOFRMOFBINExINFBINExEMExENFBINFBINExEMExEMEhAMEhAMEhAMEhAMEhAMEA4LDw4LDw4LDw4KDw4KDg0KDg0KDg0KEA8LDw4LDw4KDw4KDw4KDw4KEA4KDw4JEA8KEA4KEQ8LEA8KEA4KEA4KEQ8KEA8KEA4KEA4KEA8KEQ8LEQ8LEhALEhALEhALExEMEhAMEQ8LExENFRMOFBINFRMOFRMOFBMOFBINFBINFRMOFRMOFBINExENFBINFBINExEMEhAMExENExINExEMEhAMExINExENEhEMExEMEA8LEQ8LEQ8LEA8LEA8LEA8LDw4LDw4KDw4LDw4KDw4KEA8LEA8LEA4LDw4KDw0KDg0JDQwJDQwIDw4KEA8LEQ8LEQ8LEQ8LEhALERALEQ8LEA8KDw4KEA4KEQ8LEA4KEA4KEA8KEhALEhALExEMFBINFBINFBIOFBINFBINExINFBMOFBIOFRMOFBINFBMOFRMPFhQPFRQPFRMOFBMOExINEhEMEQ8LERALEhAMEhAMEhAMEhENEhENEhENExENEhAMEA8LEA8LDg0JDw4KEA8LEA8LEA8LEA8MEQ8MEA8LEA8LDw4LEA8LEA8LDw4KDg0KDw4KDw0KDw0JEA4KEQ8LERAMEQ8LEQ4KEhAMEhAMERAMERALEhAMExEMEhAMEhAMExINEhEMEhEMExENExENExENExIOFBIOExENEhAMEhAMExEMExEMEhEMExENExINFBINFBINExINExENExEMEhEMEhENEhAMERAMEA8LERAMERAMERAMERAMERAMERAMEhENERAMERAMEQ8MEhENEhAMERAMERAMERAMEQ8MEA8MEA8LEA8MEA8LEA8LDw4KDw4KDw4KDg0JDg0JDg0JEA4KEA8LERAMEhAMERAMEhEMExINExINExINFBIOFBIOFBINFBINFBINExENExENExENExENExINExEMEhAMEQ8LERAMEhAMEhENExINExENEhAMEhAMExENEQ8LEQ8LEhAMERAMERAMEQ8LEA8LEA8LERAMEQ8LERAMERAMERAMERAMEhAMEhANEhENERAMEhAMERAMEhAMERAMERAMEhAMERAMERAMEQ8LEA8LEA8LEQ8LEA8LEA8LEQ8LEA8LEA8LEA8LEA8LEA8LEA8LEQ8LEQ8LEQ8LEQ8LEA8LEQ8LEQ8LERALERALEA8LEA8LEA8LEA8LEA8LEQ8LEQ8LERAMERAMERAMERAMEQ8LERAMERAMERAMERAMERAMEQ8LERAMERAMEQ8LERAMERAMERAMERALERAMERALERAMERAMEQ8LERALERALERAL"

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

// The source's bloom: strength 0.1, radius 0.5, threshold 0.5, over the scene
// pass. Fixed numbers, not designer dials (rule 10). Bright pass -> 1/8 res ->
// two separable blurs -> additive composite.
const BLOOM_STRENGTH = 0.1
const BLOOM_THRESHOLD = 0.5
const BLOOM_DOWN = 8
const BLOOM_ITER = 2

const BRIGHT_FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uRes;
void main() {
  vec3 c = texture2D(uTex, gl_FragCoord.xy / uRes).rgb;
  gl_FragColor = vec4(max(c - ${BLOOM_THRESHOLD}, 0.0), 1.0);
}
`

const BLUR_FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uDir;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 s = uDir / uRes;
  vec3 c = texture2D(uTex, uv).rgb * 0.2270270;
  c += (texture2D(uTex, uv + s * 1.3846154).rgb + texture2D(uTex, uv - s * 1.3846154).rgb) * 0.3162162;
  c += (texture2D(uTex, uv + s * 3.2307692).rgb + texture2D(uTex, uv - s * 3.2307692).rgb) * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}
`

// Premultiplied output: the halo has to show over the root's CSS background, so
// it carries its own alpha rather than being a colour on a transparent pixel.
const COMP_FRAG = `
precision mediump float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 s = texture2D(uScene, uv);
  vec3 b = texture2D(uBloom, uv).rgb * ${BLOOM_STRENGTH};
  float ba = clamp(dot(b, vec3(0.2126, 0.7152, 0.0722)) * 2.5, 0.0, 1.0);
  gl_FragColor = vec4(s.rgb + b, clamp(s.a + ba, 0.0, 1.0));
}
`

const FRAG = `
precision highp float;

uniform vec2 uRes;
uniform vec4 uQ[${TILES}];   // canonical -> world rotation
uniform vec4 uD[${TILES}];   // xyz displacement from rest, w = 1 for pentagon
uniform vec4 uC[${TILES}];   // xyz bounding centre (ball space), w bounding radius
uniform vec3 uHexP[6];
uniform vec3 uPentP[5];
uniform mat3 uRg;            // group rotation, ball space -> world
uniform vec3 uCam;           // camera origin in ball space
uniform mat3 uCamR;          // camera rotation, camera -> ball space
uniform vec4 uPtr;           // pointer ball in ball space, w = radius
uniform vec3 uGlass;
uniform vec3 uAccent;
uniform sampler2D uEnv;
uniform float uEnvI;
uniform float uIor;
uniform float uDisp;
uniform float uGap;
uniform float uBallR;

const float RI = ${RI};
const float RO_HEX = ${RO_HEX};
const float RO_PENT = ${RO_PENT};
const float ENV_LOG = ${ENV_LOG};

vec3 qrot(vec4 q, vec3 v) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}
vec3 qrotInv(vec4 q, vec3 v) {
  vec3 a = -q.xyz;
  vec3 t = 2.0 * cross(a, v);
  return v + q.w * t + cross(a, t);
}

vec3 envColor(vec3 d) {
  vec3 w = uRg * d;
  vec2 uv = vec2(atan(w.z, w.x) * 0.1591549 + 0.5, acos(clamp(w.y, -1.0, 1.0)) * 0.3183099);
  vec3 v = texture2D(uEnv, uv).rgb;
  return (exp2(v * ENV_LOG) - 1.0) * uEnvI;
}

// Entry and exit of one tile: a t-interval clipped by the side planes, by the
// outer sphere, then with the inner sphere subtracted. Normals are outward and
// come back in ball space.
bool tileHit(vec3 ro, vec3 rd, vec4 q, vec4 pd, out float t0, out vec3 n0, out float t1, out vec3 n1) {
  bool pent = pd.w > 0.5;
  vec3 o = qrotInv(q, ro - pd.xyz);
  vec3 dr = qrotInv(q, rd);

  float ta = 1e-4;
  float tb = 1e9;
  vec3 na = vec3(0.0);
  vec3 nb = vec3(0.0);

  for (int k = 0; k < 6; k++) {
    if (pent && k == 5) break;
    vec3 p = pent ? uPentP[k] : uHexP[k];
    float a = dot(dr, p);
    float b = dot(o, p) - uGap;
    if (abs(a) < 1e-7) {
      if (b < 0.0) return false;
      continue;
    }
    float t = -b / a;
    if (a > 0.0) { if (t > ta) { ta = t; na = -p; } }
    else         { if (t < tb) { tb = t; nb = -p; } }
  }
  if (ta > tb) return false;

  float rOut = pent ? RO_PENT : RO_HEX;
  float bq = dot(o, dr);
  float h = bq * bq - (dot(o, o) - rOut * rOut);
  if (h < 0.0) return false;
  h = sqrt(h);
  float s0 = -bq - h;
  float s1 = -bq + h;
  if (s0 > ta) { ta = s0; na = normalize(o + dr * s0); }
  if (s1 < tb) { tb = s1; nb = normalize(o + dr * s1); }
  if (ta > tb) return false;

  float hi = bq * bq - (dot(o, o) - RI * RI);
  if (hi > 0.0) {
    hi = sqrt(hi);
    float i0 = -bq - hi;
    float i1 = -bq + hi;
    if (i0 <= ta && i1 >= tb) return false;
    if (i0 > ta && i0 < tb) { tb = i0; nb = -normalize(o + dr * i0); }
    else if (i1 > ta && i1 < tb) { ta = i1; na = -normalize(o + dr * i1); }
  }
  if (ta > tb || tb < 1e-4) return false;

  t0 = ta; t1 = tb;
  n0 = qrot(q, na);
  n1 = qrot(q, nb);
  return true;
}

// id: 0 = glass tile, 1 = pointer ball.
bool hitScene(vec3 ro, vec3 rd, out float bt, out vec3 bn, out vec4 bq, out vec4 bd, out int bid) {
  bt = 1e9;
  bn = vec3(0.0);
  bq = vec4(0.0, 0.0, 0.0, 1.0);
  bd = vec4(0.0);
  bid = -1;
  bool any = false;

  for (int i = 0; i < ${TILES}; i++) {
    vec4 c = uC[i];
    vec3 oc = ro - c.xyz;
    float b = dot(oc, rd);
    float h = b * b - (dot(oc, oc) - c.w * c.w);
    if (h < 0.0) continue;
    h = sqrt(h);
    if (-b + h < 1e-4) continue;
    if (-b - h > bt) continue;
    float t0, t1;
    vec3 n0, n1;
    if (!tileHit(ro, rd, uQ[i], uD[i], t0, n0, t1, n1)) continue;
    if (t0 > 1e-4 && t0 < bt) { bt = t0; bn = n0; bq = uQ[i]; bd = uD[i]; bid = 0; any = true; }
  }

  vec3 oc = ro - uPtr.xyz;
  float b = dot(oc, rd);
  float h = b * b - (dot(oc, oc) - uPtr.w * uPtr.w);
  if (h >= 0.0) {
    h = sqrt(h);
    float t = -b - h;
    if (t < 1e-4) t = -b + h;
    if (t >= 1e-4 && t < bt) {
      bt = t;
      bn = normalize(ro + rd * t - uPtr.xyz);
      bid = 1;
      any = true;
    }
  }
  return any;
}

vec3 trace(vec3 ro, vec3 rd, float ior, out float alpha) {
  vec3 acc = vec3(0.0);
  vec3 tint = vec3(1.0);
  alpha = 0.0;

  for (int i = 0; i < ${BOUNCES}; i++) {
    float t;
    vec3 n;
    vec4 q, d;
    int id;

    if (!hitScene(ro, rd, t, n, q, d, id)) {
      if (i > 0) acc += tint * envColor(rd);
      break;
    }

    alpha = 1.0;
    vec3 p = ro + rd * t;

    if (id == 1) {
      // Source: meshStandardMaterial color 0x999999, emissive 0x555555,
      // roughness 0.5 — a diffuse ball lit by the environment.
      vec3 irr = envColor(n) * 0.55 + envColor(vec3(0.0, 1.0, 0.0)) * 0.25 + vec3(0.10);
      float F = 0.04 + 0.30 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      acc += tint * (uAccent * irr + F * envColor(reflect(rd, n)));
      break;
    }

    float F = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    acc += tint * F * envColor(reflect(rd, n));
    tint *= (1.0 - F);

    vec3 rin = refract(rd, n, 1.0 / ior);
    if (dot(rin, rin) < 0.5) {
      rd = reflect(rd, n);
      ro = p + rd * 1e-3;
      continue;
    }

    float e0, e1;
    vec3 en0, en1;
    if (!tileHit(p + rin * 1e-4, rin, q, d, e0, en0, e1, en1)) {
      rd = rin;
      ro = p + rin * 1e-3;
      continue;
    }
    vec3 pe = p + rin * (e1 + 1e-4);

    // Thickness tint: path through the glass over the shell thickness.
    tint *= mix(vec3(1.0), uGlass, clamp(e1 / 0.19, 0.0, 1.0));

    vec3 rout = refract(rin, -en1, ior);
    if (dot(rout, rout) < 0.5) rout = reflect(rin, -en1);

    rd = rout;
    ro = pe + rd * 1e-3;

    if (i == ${BOUNCES} - 1) acc += tint * envColor(rd);
  }

  return acc;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  // Normalised on the SHORTER axis, not on height. A fixed 60 degree vertical
  // fov frames the ball against the height alone, so the moment the frame is
  // taller than it is wide the ball keeps its height and runs out of width: at
  // the resting radius it needs an aspect of 0.55 to fit, and a portrait phone
  // is 0.49, which clips it at the sides. Dividing by the short axis makes the
  // 60 degrees apply to whichever axis is scarce, so the ball is framed the
  // same at every aspect. Landscape is unchanged — there min is the height.
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec3 ro = uCam;
  vec3 rd = normalize(uCamR * vec3(uv * 1.1547005, -1.0)); // fov 60, the source's camera

  vec3 oc = ro;
  float bb = dot(oc, rd);
  if (bb * bb - (dot(oc, oc) - uBallR * uBallR) < 0.0) { gl_FragColor = vec4(0.0); return; }

  vec3 col;
  float alpha;

  if (uDisp > 0.005) {
    float sp = uDisp * 0.055;
    float a0, a1, a2;
    float r = trace(ro, rd, uIor - sp, a0).r;
    float g = trace(ro, rd, uIor, a1).g;
    float b = trace(ro, rd, uIor + sp, a2).b;
    col = vec3(r, g, b);
    alpha = max(a0, max(a1, a2));
  } else {
    col = trace(ro, rd, uIor, alpha);
  }

  if (alpha < 0.5) { gl_FragColor = vec4(0.0); return; }

  col = pow(aces(col), vec3(0.4545455));
  gl_FragColor = vec4(col, 1.0);
}
`

// --- colour ------------------------------------------------------------------
// ControlType.Color emits rgb()/rgba()/hsl() as well as hex.
function parseColor(input: string | undefined, fallback: V3): V3 {
    if (!input) return fallback
    const s = String(input).trim()

    const fn = s.match(/^rgba?\s*\(([^)]+)\)$/i)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
        const ch = (v: string) => {
            const n = parseFloat(v)
            return v.indexOf("%") >= 0 ? n / 100 : n / 255
        }
        if (parts.length >= 3) return [ch(parts[0]), ch(parts[1]), ch(parts[2])]
        return fallback
    }

    const hsl = s.match(/^hsla?\s*\(([^)]+)\)$/i)
    if (hsl) {
        const p = hsl[1].split(/[\s,/]+/).filter(Boolean)
        const h = ((parseFloat(p[0]) % 360) + 360) / 360
        const sa = parseFloat(p[1]) / 100
        const l = parseFloat(p[2]) / 100
        const cc = (1 - Math.abs(2 * l - 1)) * sa
        const x = cc * (1 - Math.abs(((h * 6) % 2) - 1))
        const mm = l - cc / 2
        const seg = Math.floor(h * 6) % 6
        const t: number[][] = [
            [cc, x, 0],
            [x, cc, 0],
            [0, cc, x],
            [0, x, cc],
            [x, 0, cc],
            [cc, 0, x],
        ]
        const r = t[seg] || [0, 0, 0]
        return [r[0] + mm, r[1] + mm, r[2] + mm]
    }

    let hex = s.replace(/^#/, "")
    if (hex.length === 3 || hex.length === 4) {
        hex = hex
            .slice(0, 3)
            .split("")
            .map((ch) => ch + ch)
            .join("")
    }
    if (hex.length >= 6 && /^[0-9a-f]{6}/i.test(hex)) {
        const n = parseInt(hex.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    return fallback
}

// sRGB colour controls are display-referred; the render is linear.
const toLinear = (c: V3): V3 => [
    Math.pow(c[0], 2.2),
    Math.pow(c[1], 2.2),
    Math.pow(c[2], 2.2),
]

// --- the source's useAnimatableVec3 ------------------------------------------
// target accumulates deltas and decays to 0 on `friction`; current eases toward
// target on `ease`. Both rates corrected for the frame length.
interface Spring {
    tx: number
    ty: number
    tz: number
    cx: number
    cy: number
    cz: number
    ease: number
    friction: number
}

function makeSpring(ease: number, friction: number): Spring {
    return { tx: 0, ty: 0, tz: 0, cx: 0, cy: 0, cz: 0, ease, friction }
}

function stepSpring(sp: Spring, dt: number) {
    const f = 1 - Math.pow(1 - sp.friction, dt * 60)
    const e = 1 - Math.pow(1 - sp.ease, dt * 60)
    sp.tx += (0 - sp.tx) * f
    sp.ty += (0 - sp.ty) * f
    sp.tz += (0 - sp.tz) * f
    sp.cx += (sp.tx - sp.cx) * e
    sp.cy += (sp.ty - sp.cy) * e
    sp.cz += (sp.tz - sp.cz) * e
}

// --- props -------------------------------------------------------------------
interface GlassProps {
    refraction?: number
    dispersion?: number
    brightness?: number
    gap?: number
}
interface MotionProps {
    pull?: number
    bounce?: number
    damping?: number
}
interface CursorProps {
    reach?: number
    parallax?: number
    rotation?: number
}

interface BallOfGlassProps {
    background?: string
    baseColor?: string
    accentColor?: string
    speed?: number
    distance?: number
    glass?: GlassProps
    motion?: MotionProps
    cursor?: CursorProps
    width?: number
    height?: number
    style?: React.CSSProperties
}

// One source of truth: the signature merges these and every control below
// points its defaultValue at the same field, so the panel and the code cannot
// drift. Reach 200 is load-bearing, not taste — it puts the collider at 1.5,
// past the shell's inner radius of 0.894, so the ball holds the 32 tiles open
// at rest. Drop it under ~120 and the shell closes into a solid blob.
const GLASS_DEFAULTS: Required<GlassProps> = {
    refraction: 250,
    dispersion: 100,
    brightness: 105,
    gap: 20,
}
const MOTION_DEFAULTS: Required<MotionProps> = { pull: 100, bounce: 100, damping: 22 }
const CURSOR_DEFAULTS: Required<CursorProps> = { reach: 200, parallax: 200, rotation: 116 }

export default function BallOfGlass(props: BallOfGlassProps) {
    const {
        background = "#000000",
        baseColor = "#0017FF",
        accentColor = "#FFFFFF",
        speed = 50,
        distance = 5,
        glass,
        motion,
        cursor,
        style,
    } = props

    const g: Required<GlassProps> = { ...GLASS_DEFAULTS, ...(glass || {}) }
    const m: Required<MotionProps> = { ...MOTION_DEFAULTS, ...(motion || {}) }
    const c: Required<CursorProps> = { ...CURSOR_DEFAULTS, ...(cursor || {}) }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Every live input reaches the loop through this ref (rule 6).
    const live = useRef({
        glassCol: [0.93, 0.94, 1] as V3,
        accent: [0.6, 0.6, 0.6] as V3,
        speed: 1,
        distance: 5,
        ior: 1.4,
        disp: 0.6,
        envI: 1,
        gap: 0.008,
        pull: 1,
        restitution: 0.5,
        damping: 1,
        reach: 1,
        parallax: 1,
        rot: ROT_STRENGTH,
    })

    live.current.glassCol = toLinear(parseColor(baseColor, [0.93, 0.94, 1]))
    live.current.accent = toLinear(parseColor(accentColor, [0.6, 0.6, 0.6]))
    live.current.speed = Math.max(0, speed) / 50
    live.current.distance = Math.max(2, distance)
    live.current.ior = Math.max(1.01, g.refraction / 100)
    live.current.disp = Math.max(0, g.dispersion) / 100
    live.current.envI = Math.max(0, g.brightness) / 100
    live.current.gap = (Math.max(0, g.gap) / 100) * 0.02
    live.current.pull = (Math.max(0, m.pull) / 50) * 40
    live.current.restitution = Math.max(0, Math.min(1, m.bounce / 100))
    live.current.damping = (Math.max(1, m.damping) / 50) * 4
    live.current.reach = Math.max(0, c.reach) / 100
    live.current.parallax = Math.max(0, c.parallax) / 100
    live.current.rot = (c.rotation * Math.PI) / 180

    useEffect(() => {
        const canvas = canvasRef.current
        const host = hostRef.current
        if (!canvas || !host) return

        const opts = {
            alpha: true,
            // Premultiplied: the bloom halo carries its own alpha so it shows
            // over the root's CSS background instead of being dimmed by it.
            premultipliedAlpha: true,
            antialias: false,
            depth: false,
            stencil: false,
        }
        const gl = (canvas.getContext("webgl", opts) ||
            canvas.getContext("experimental-webgl", opts)) as WebGLRenderingContext | null
        if (!gl) return

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type)!
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(sh))
            }
            return sh
        }

        const link = (fs: string) => {
            const pr = gl.createProgram()!
            gl.attachShader(pr, compile(gl.VERTEX_SHADER, VERT))
            gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, fs))
            gl.linkProgram(pr)
            if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
                console.error(gl.getProgramInfoLog(pr))
            }
            return pr
        }

        const prog = link(FRAG)
        const progBright = link(BRIGHT_FRAG)
        const progBlur = link(BLUR_FRAG)
        const progComp = link(COMP_FRAG)
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        for (const pr of [prog, progBright, progBlur, progComp]) {
            const loc = gl.getAttribLocation(pr, "aPos")
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
        }

        // Uniform locations are per-program; never cache one across programs.
        const UB = {
            tex: gl.getUniformLocation(progBright, "uTex"),
            res: gl.getUniformLocation(progBright, "uRes"),
        }
        const UL = {
            tex: gl.getUniformLocation(progBlur, "uTex"),
            res: gl.getUniformLocation(progBlur, "uRes"),
            dir: gl.getUniformLocation(progBlur, "uDir"),
        }
        const UC = {
            scene: gl.getUniformLocation(progComp, "uScene"),
            bloom: gl.getUniformLocation(progComp, "uBloom"),
            res: gl.getUniformLocation(progComp, "uRes"),
        }

        interface Target {
            fb: WebGLFramebuffer
            tex: WebGLTexture
            w: number
            h: number
        }
        const targets: Target[] = []
        const makeTarget = (w: number, h: number): Target => {
            const tex = gl.createTexture()!
            // Unit 3 is scratch: units 0-2 hold the environment, the scene and
            // the bloom, and binding here would silently steal one of them.
            gl.activeTexture(gl.TEXTURE3)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            const fb = gl.createFramebuffer()!
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            const t = { fb, tex, w, h }
            targets.push(t)
            return t
        }
        let scene: Target | null = null
        let blurA: Target | null = null
        let blurB: Target | null = null
        const disposeTargets = () => {
            for (const t of targets) {
                gl.deleteFramebuffer(t.fb)
                gl.deleteTexture(t.tex)
            }
            targets.length = 0
        }

        // Uniform locations are per-program; never cache across programs.
        const U = {
            res: gl.getUniformLocation(prog, "uRes"),
            q: gl.getUniformLocation(prog, "uQ[0]"),
            d: gl.getUniformLocation(prog, "uD[0]"),
            c: gl.getUniformLocation(prog, "uC[0]"),
            hexP: gl.getUniformLocation(prog, "uHexP[0]"),
            pentP: gl.getUniformLocation(prog, "uPentP[0]"),
            rg: gl.getUniformLocation(prog, "uRg"),
            cam: gl.getUniformLocation(prog, "uCam"),
            camR: gl.getUniformLocation(prog, "uCamR"),
            ptr: gl.getUniformLocation(prog, "uPtr"),
            glass: gl.getUniformLocation(prog, "uGlass"),
            accent: gl.getUniformLocation(prog, "uAccent"),
            env: gl.getUniformLocation(prog, "uEnv"),
            envI: gl.getUniformLocation(prog, "uEnvI"),
            ior: gl.getUniformLocation(prog, "uIor"),
            disp: gl.getUniformLocation(prog, "uDisp"),
            gap: gl.getUniformLocation(prog, "uGap"),
            ballR: gl.getUniformLocation(prog, "uBallR"),
        }

        // Static per-tile data.
        gl.uniform4fv(U.q, TILE_DATA.quats)
        gl.uniform3fv(U.hexP, TILE_DATA.hexPlanes)
        gl.uniform3fv(U.pentP, TILE_DATA.pentPlanes)

        // --- environment ------------------------------------------------------
        const bin = atob(ENV_B64)
        const envBytes = new Uint8Array(ENV_W * ENV_H * 3)
        for (let i = 0; i < envBytes.length; i++) envBytes[i] = bin.charCodeAt(i)
        const envTex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, envTex)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, ENV_W, ENV_H, 0, gl.RGB, gl.UNSIGNED_BYTE, envBytes)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.uniform1i(U.env, 0)

        // --- bodies -----------------------------------------------------------
        const cx = new Float32Array(TILES)
        const cy = new Float32Array(TILES)
        const cz = new Float32Array(TILES)
        const vx = new Float32Array(TILES)
        const vy = new Float32Array(TILES)
        const vz = new Float32Array(TILES)
        const colR = new Float32Array(TILES)
        const axis = new Float32Array(TILES * 3)
        const dispU = new Float32Array(TILES * 4)
        const boundU = new Float32Array(TILES * 4)

        for (let i = 0; i < TILES; i++) {
            cx[i] = TILE_DATA.rest[i * 3]
            cy[i] = TILE_DATA.rest[i * 3 + 1]
            cz[i] = TILE_DATA.rest[i * 3 + 2]
            colR[i] = TILE_DATA.types[i] > 0.5 ? COL_PENT : COL_HEX
            axis[i * 3] = TILE_DATA.rest[i * 3] / RC
            axis[i * 3 + 1] = TILE_DATA.rest[i * 3 + 1] / RC
            axis[i * 3 + 2] = TILE_DATA.rest[i * 3 + 2] / RC
        }

        // --- pointer springs (the source's numbers) ---------------------------
        const groupSpring = makeSpring(0.02, 0.1)
        const ptrSpring = makeSpring(0.1, 0.25)

        let prevMx = NaN
        let prevMy = NaN

        const onMove = (e: PointerEvent) => {
            const w = window.innerWidth || 1
            const h = window.innerHeight || 1
            const x = (e.clientX - w / 2) / w
            const y = (e.clientY - h / 2) / h
            if (isNaN(prevMx)) {
                prevMx = x
                prevMy = y
            }
            const dx = x - prevMx
            const dy = y - prevMy
            prevMx = x
            prevMy = y
            groupSpring.tx += dx
            groupSpring.ty += dy
            ptrSpring.tx += dx
            ptrSpring.ty += dy
        }
        window.addEventListener("pointermove", onMove, { passive: true })

        // --- sizing -----------------------------------------------------------
        let bw = 0
        let bh = 0
        const resize = () => {
            const cw = canvas.clientWidth
            const ch = canvas.clientHeight
            // Not laid out yet. Guessing a size would allocate against it and
            // paint one wrongly framed frame, which the fade-in would then
            // reveal. Leave the targets alone; frame() bails while they are
            // null and the next tick picks up the real box.
            if (cw < 1 || ch < 1) return
            // A pixel BUDGET, not a flat ratio. This shader costs the same per
            // pixel everywhere, so the sensible sample rate depends on how many
            // pixels the box has, not on the device: a phone at 390x700 can
            // afford 2x for less work than a desktop hero does at 1.25x, and a
            // 1440p hero at 1.25x would be 5.8M pixels of four-bounce tracing.
            // Never below 1, so it is never softer than the CSS resolution.
            const fit = Math.sqrt(PIXEL_BUDGET / (cw * ch))
            const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, DPR_CAP, fit))
            const w = Math.max(1, Math.round(cw * dpr))
            const h = Math.max(1, Math.round(ch * dpr))
            if (w === bw && h === bh) return
            bw = w
            bh = h
            canvas.width = w
            canvas.height = h
            gl.viewport(0, 0, w, h)
            disposeTargets()
            scene = makeTarget(w, h)
            const dw = Math.max(1, Math.round(w / BLOOM_DOWN))
            const dh = Math.max(1, Math.round(h / BLOOM_DOWN))
            blurA = makeTarget(dw, dh)
            blurB = makeTarget(dw, dh)
        }
        const obs = new ResizeObserver(resize)
        obs.observe(host)
        resize()

        // --- physics ----------------------------------------------------------
        const ptrLocal = { x: 0, y: 0, z: 0 }

        const substep = (dt: number) => {
            const L = live.current
            const damp = Math.exp(-L.damping * dt)
            const rest = TILE_DATA.rest

            for (let i = 0; i < TILES; i++) {
                vx[i] = (vx[i] + (rest[i * 3] - cx[i]) * L.pull * dt) * damp
                vy[i] = (vy[i] + (rest[i * 3 + 1] - cy[i]) * L.pull * dt) * damp
                vz[i] = (vz[i] + (rest[i * 3 + 2] - cz[i]) * L.pull * dt) * damp
                cx[i] += vx[i] * dt
                cy[i] += vy[i] * dt
                cz[i] += vz[i] * dt
            }

            const e = L.restitution
            for (let i = 0; i < TILES; i++) {
                for (let j = i + 1; j < TILES; j++) {
                    const dx = cx[j] - cx[i]
                    const dy = cy[j] - cy[i]
                    const dz = cz[j] - cz[i]
                    const d2 = dx * dx + dy * dy + dz * dz
                    const sum = colR[i] + colR[j]
                    if (d2 >= sum * sum || d2 < 1e-9) continue
                    const d = Math.sqrt(d2)
                    const nx = dx / d
                    const ny = dy / d
                    const nz = dz / d
                    const pen = Math.max(sum - d - PEN_SLOP, 0) * PEN_CORRECT * 0.5
                    cx[i] -= nx * pen
                    cy[i] -= ny * pen
                    cz[i] -= nz * pen
                    cx[j] += nx * pen
                    cy[j] += ny * pen
                    cz[j] += nz * pen
                    const rel = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny + (vz[j] - vz[i]) * nz
                    if (rel > 0) continue
                    // A slow touch only has its approach cancelled; bounce is
                    // for real impacts. Without this, neighbours in permanent
                    // contact trade the same energy back and forth for ever.
                    const imp = -(1 + (rel < -REST_SPEED ? e : 0)) * rel * 0.5
                    vx[i] -= nx * imp
                    vy[i] -= ny * imp
                    vz[i] -= nz * imp
                    vx[j] += nx * imp
                    vy[j] += ny * imp
                    vz[j] += nz * imp
                }
            }

            // Kinematic pointer body: it pushes, nothing pushes it.
            //
            // The tile's collision SPHERE cannot be used here. A tile is a shell
            // segment whose nearest point to the centre is at RI = 0.894, but
            // its bounding sphere reaches in to 0.61 — so a collider parked at
            // the origin, which is exactly where the pointer rests, would read
            // as touching all 32 tiles long before it really does. Contact is
            // therefore against the closest point of the actual shell segment:
            // project the pointer onto the tile's cell, clamp into the cell's
            // angular radius, clamp the radius into [RI, RO]. At the default
            // reach the collider is 1.5, genuinely past RI, so it holds the
            // shell open at rest — that is the component's resting pose, not a
            // hover effect. On the axis the test resolves radially against the
            // inner pole rather than the true nearest point, which is the tile's
            // rim; that puts the resting radius at 0.606 instead of 0.66. The
            // pole is taken deliberately: it is the only choice that keeps all
            // 32 pushes radial, so the open shell is symmetric and silent.
            const pr = PTR_COLLIDER_R * L.reach
            for (let i = 0; i < TILES; i++) {
                const pent = TILE_DATA.types[i] > 0.5
                const ax = axis[i * 3]
                const ay = axis[i * 3 + 1]
                const az = axis[i * 3 + 2]
                const dxi = cx[i] - rest[i * 3]
                const dyi = cy[i] - rest[i * 3 + 1]
                const dzi = cz[i] - rest[i * 3 + 2]
                const rx = ptrLocal.x - dxi
                const ry = ptrLocal.y - dyi
                const rz = ptrLocal.z - dzi
                const len = Math.hypot(rx, ry, rz)
                const cosT = pent ? COS_PENT : COS_HEX
                const rOut = pent ? RO_PENT : RO_HEX
                // ON THE AXIS THERE IS NO CLOSEST POINT — every direction round
                // the tile is equally near — and that is not a corner case, it
                // is the RESTING case: pointer at the origin, tile undisplaced,
                // r exactly zero for all 32 at once. Bailing out here is what
                // used to leave the shell shut on load and open it only once a
                // pointer move made r non-zero. Symmetry gives the answer the
                // degenerate test cannot: straight out along the tile's own
                // axis, against its inner face. Both on-axis cases (r zero, and
                // r pointing back down the axis once the tile has moved out)
                // land on these defaults.
                let ux = ax
                let uy = ay
                let uz = az
                let rr = RI
                if (len >= 1e-4) {
                    const px = rx / len
                    const py = ry / len
                    const pz = rz / len
                    const ca = px * ax + py * ay + pz * az
                    if (ca >= cosT) {
                        ux = px
                        uy = py
                        uz = pz
                        rr = Math.min(rOut, Math.max(RI, len))
                    } else {
                        // Outside the cell: swing the direction onto its rim.
                        let tx = px - ax * ca
                        let ty = py - ay * ca
                        let tz = pz - az * ca
                        const tl = Math.hypot(tx, ty, tz)
                        if (tl >= 1e-4) {
                            const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT))
                            tx /= tl
                            ty /= tl
                            tz /= tl
                            ux = ax * cosT + tx * sinT
                            uy = ay * cosT + ty * sinT
                            uz = az * cosT + tz * sinT
                            rr = Math.min(rOut, Math.max(RI, len))
                        }
                    }
                }
                // Closest point on the tile, back in ball space.
                const qx = dxi + ux * rr
                const qy = dyi + uy * rr
                const qz = dzi + uz * rr
                const sx2 = qx - ptrLocal.x
                const sy2 = qy - ptrLocal.y
                const sz2 = qz - ptrLocal.z
                const sd2 = sx2 * sx2 + sy2 * sy2 + sz2 * sz2
                if (sd2 >= pr * pr || sd2 < 1e-12) continue
                const sd = Math.sqrt(sd2)
                const nx = sx2 / sd
                const ny = sy2 / sd
                const nz = sz2 / sd
                const pen = Math.max(pr - sd - PEN_SLOP, 0) * PEN_CORRECT
                cx[i] += nx * pen
                cy[i] += ny * pen
                cz[i] += nz * pen
                const rel = vx[i] * nx + vy[i] * ny + vz[i] * nz
                if (rel < 0) {
                    // Same rest rule as tile-tile, and it matters more here:
                    // the tile leans on this contact permanently, so a bouncy
                    // response would leave the whole shell trembling at rest.
                    const imp = -(1 + (rel < -REST_SPEED ? e : 0)) * rel
                    vx[i] += nx * imp
                    vy[i] += ny * imp
                    vz[i] += nz * imp
                }
            }
        }

        // --- settle -----------------------------------------------------------
        // The tiles start in the closed shell, which is not where the pointer
        // ball lets them stay. Run the substeps the shell would have spent
        // opening before anything is drawn, so the viewer's first frame is the
        // open lattice rather than a closed ball that bursts a moment later.
        for (let i = 0; i < WARMUP_STEPS; i++) substep(PHYS_DT)

        // --- loop -------------------------------------------------------------
        let raf = 0
        let last = performance.now()
        let acc = 0
        let painted = false

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const L = live.current

            let dt = (now - last) / 1000
            last = now
            if (!isFinite(dt) || dt < 0) dt = 0
            dt = Math.min(dt, 0.1)

            stepSpring(groupSpring, dt)
            stepSpring(ptrSpring, dt)

            // Source Pointer: setNextKinematicTranslation(x * 1.5, -y * 1.5, 0)
            const par = PTR_PARALLAX * L.parallax
            ptrLocal.x = ptrSpring.cx * par
            ptrLocal.y = -ptrSpring.cy * par
            ptrLocal.z = 0

            acc += dt * L.speed
            let steps = 0
            while (acc >= PHYS_DT && steps < MAX_SUBSTEPS) {
                substep(PHYS_DT)
                acc -= PHYS_DT
                steps++
            }
            if (steps === MAX_SUBSTEPS) acc = 0

            // Source Scene group: position (x, -y, 0), rotation (y*R, x*R, z*R),
            // Euler XYZ. Applied to the CAMERA instead, so the tiles and the
            // physics stay in ball space and the 32 quaternions are constants.
            const rx = groupSpring.cy * L.rot
            const ry = groupSpring.cx * L.rot
            const rz = groupSpring.cz * L.rot
            const sx = Math.sin(rx)
            const kx = Math.cos(rx)
            const sy = Math.sin(ry)
            const ky = Math.cos(ry)
            const sz = Math.sin(rz)
            const kz = Math.cos(rz)
            // Rg = Rx * Ry * Rz, ball space -> world (column-major for GL).
            const r00 = ky * kz
            const r01 = -ky * sz
            const r02 = sy
            const r10 = sx * sy * kz + kx * sz
            const r11 = -sx * sy * sz + kx * kz
            const r12 = -sx * ky
            const r20 = -kx * sy * kz + sx * sz
            const r21 = kx * sy * sz + sx * kz
            const r22 = kx * ky
            const rg = new Float32Array([r00, r10, r20, r01, r11, r21, r02, r12, r22])
            // Camera -> ball space is the inverse of the group rotation, and the
            // group's translation moves the ball, so the camera moves against it.
            const camR = new Float32Array([r00, r01, r02, r10, r11, r12, r20, r21, r22])
            const gx = groupSpring.cx
            const gy = -groupSpring.cy
            const ex = 0 - gx
            const ey = 0 - gy
            const ez = L.distance
            const camX = r00 * ex + r10 * ey + r20 * ez
            const camY = r01 * ex + r11 * ey + r21 * ez
            const camZ = r02 * ex + r12 * ey + r22 * ez

            let ballR = 0
            for (let i = 0; i < TILES; i++) {
                const dx = cx[i] - TILE_DATA.rest[i * 3]
                const dy = cy[i] - TILE_DATA.rest[i * 3 + 1]
                const dz = cz[i] - TILE_DATA.rest[i * 3 + 2]
                dispU[i * 4] = dx
                dispU[i * 4 + 1] = dy
                dispU[i * 4 + 2] = dz
                dispU[i * 4 + 3] = TILE_DATA.types[i]
                const br = TILE_DATA.types[i] > 0.5 ? BOUND_PENT : BOUND_HEX
                boundU[i * 4] = cx[i]
                boundU[i * 4 + 1] = cy[i]
                boundU[i * 4 + 2] = cz[i]
                boundU[i * 4 + 3] = br
                const rr = Math.hypot(cx[i], cy[i], cz[i]) + br
                if (rr > ballR) ballR = rr
            }
            const ptrR = PTR_VISIBLE_R * L.reach
            const pb = Math.hypot(ptrLocal.x, ptrLocal.y, ptrLocal.z) + ptrR
            if (pb > ballR) ballR = pb

            resize()
            gl.useProgram(prog)
            gl.uniform2f(U.res, bw, bh)
            gl.uniform4fv(U.d, dispU)
            gl.uniform4fv(U.c, boundU)
            gl.uniformMatrix3fv(U.rg, false, rg)
            gl.uniformMatrix3fv(U.camR, false, camR)
            gl.uniform3f(U.cam, camX, camY, camZ)
            gl.uniform4f(U.ptr, ptrLocal.x, ptrLocal.y, ptrLocal.z, ptrR)
            gl.uniform3f(U.glass, L.glassCol[0], L.glassCol[1], L.glassCol[2])
            gl.uniform3f(U.accent, L.accent[0], L.accent[1], L.accent[2])
            gl.uniform1f(U.envI, L.envI)
            gl.uniform1f(U.ior, L.ior)
            gl.uniform1f(U.disp, L.disp)
            gl.uniform1f(U.gap, L.gap)
            gl.uniform1f(U.ballR, ballR * 1.02)

            if (!scene || !blurA || !blurB) return

            gl.clearColor(0, 0, 0, 0)

            // 1. scene
            gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fb)
            gl.viewport(0, 0, scene.w, scene.h)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            // 2. bright pass into the 1/8 target
            gl.useProgram(progBright)
            gl.bindFramebuffer(gl.FRAMEBUFFER, blurA.fb)
            gl.viewport(0, 0, blurA.w, blurA.h)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, scene.tex)
            gl.uniform1i(UB.tex, 1)
            gl.uniform2f(UB.res, blurA.w, blurA.h)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            // 3. separable blur, ping-pong
            gl.useProgram(progBlur)
            gl.uniform1i(UL.tex, 1)
            gl.uniform2f(UL.res, blurA.w, blurA.h)
            let src = blurA
            let dst = blurB
            for (let i = 0; i < BLOOM_ITER * 2; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb)
                gl.viewport(0, 0, dst.w, dst.h)
                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, src.tex)
                gl.uniform2f(UL.dir, i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0 : 1)
                gl.drawArrays(gl.TRIANGLES, 0, 3)
                const t = src
                src = dst
                dst = t
            }

            // 4. composite to the canvas
            gl.useProgram(progComp)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, bw, bh)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, scene.tex)
            gl.activeTexture(gl.TEXTURE2)
            gl.bindTexture(gl.TEXTURE_2D, src.tex)
            gl.uniform1i(UC.scene, 1)
            gl.uniform1i(UC.bloom, 2)
            gl.uniform2f(UC.res, bw, bh)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 3)

            gl.useProgram(prog)

            // Reveal only once there is something in the buffer. The canvas is
            // transparent until here, so the mount reads as a fade-up over the
            // background instead of a black rectangle that blinks.
            if (!painted) {
                painted = true
                canvas.style.opacity = "1"
            }
        }

        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            obs.disconnect()
            window.removeEventListener("pointermove", onMove)
            disposeTargets()
            // Never loseContext(): getContext() hands the same context back on
            // the next StrictMode mount and it renders black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // No minWidth. A 1200px floor here does not make the component
                // big, it makes the PAGE 1200px wide: the div refuses to shrink,
                // so on any narrower parent it pushes out a horizontal scrollbar
                // and the canvas renders a 1200px ball of which the viewport
                // shows a slice. The intrinsic size below is what Framer uses to
                // pick a sensible default frame; it must not become a floor.
                // minHeight only binds outside Framer, where a parent with auto
                // height would otherwise collapse this to nothing. Pass `style`
                // to override it.
                minHeight: 320,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    opacity: 0,
                    transition: "opacity 600ms ease",
                }}
            />
        </div>
    )
}
