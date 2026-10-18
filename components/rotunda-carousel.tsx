"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

/**
 * ROTUNDA CAROUSEL — a ring of pictures, seen from INSIDE it, for Framer.
 *
 * TypeBandCarousel is the outside of a cylinder. This is the inside: the camera
 * stands on the ring's axis and the images are hung on the wall around it, so
 * turning the ring sweeps them past you rather than spinning a drum in front of
 * you. Everything below follows from that one difference.
 *
 * THE CAMERA IS STRICTLY INSIDE, AND THAT IS THE WHOLE COMPLEXITY BUDGET.
 * A ray leaving a point inside a convex cylinder crosses the wall exactly once.
 * Algebraically: with the camera at (0, 0, d) and the wall at r = 1, the
 * quadratic in t has constant term d*d - 1, which is NEGATIVE for every d < 1,
 * so its two roots straddle zero and precisely one is forward. Nothing on the
 * wall can occlude anything else on the wall. So there is no depth buffer, no
 * back-to-front sort, and no two-pass face cull — the sibling's entire winding
 * argument evaporates. Distance is clamped to 0.9 of the radius to keep that
 * true, and the pitch rotates the camera ABOUT its own position rather than
 * swinging it around the origin, or a large Tilt would lift the eye out through
 * the top rim and occlusion would come back.
 *
 * It also means a gap between two panels shows the BACKGROUND, never the far
 * wall: the near gap and the hit point are the same point. That is what makes
 * "curved panels with gaps" read as a rotunda instead of as a see-through cage.
 *
 * ONE TEXTURE PER IMAGE, NOT AN ATLAS. The sibling needs an atlas because it
 * REPEAT-wraps one strip around the ring, which is where its power-of-two
 * padding inflates Gap. Here each panel is drawn once, so per-image textures
 * cost 8-24 draw calls (nothing) and skip both the packing and the resolution
 * loss of cropping into a cell. Each picture is resampled into a power-of-two
 * canvas before upload — full bleed, so normalized UVs address exactly the same
 * content and only the texel density changes — which buys mipmaps and
 * anisotropy on WebGL1 for the panels near the silhouette, where a raw LINEAR
 * sample smears into a streak.
 *
 * DRAG IS THE INVERSE PROJECTION, NOT A SCRUB RATE. "One component width = half
 * a turn" is fine for a band you watch from outside; from inside, the wall under
 * the pointer would slide out from under it, because screen x maps to ring angle
 * through an arctangent, not a scale. On pointerdown the ray is un-pitched,
 * intersected with the cylinder and the hit angle recorded; every move re-solves
 * it and sets yaw so that same wall point stays pinned to the pointer.
 *
 * THE RING IS DERIVED FROM THE PANELS, NOT THE OTHER WAY AROUND. Width, Height
 * and Gap are one unit, and the radius is whatever makes n panels plus n gaps
 * close the circle: R = n * (Width + Gap) / 2pi. So Width : Height IS the
 * picture aspect a designer types (800 x 600 is 4:3 and crops like it), and
 * Width : Gap is how much of the wall is picture. Nothing can disagree, because
 * there is no second dial claiming the same dimension.
 *
 * What still follows the item count is ANGULAR size, and that is not a dial
 * anyone can fix: standing at the centre of a ring, a panel subtends exactly
 * 2pi * Width / (n * (Width + Gap)), so twice as many pictures is half the
 * angle each. Distance is the framing dial against it. Very few items therefore
 * make very wide panels; at three, one panel is 98 degrees across and cannot
 * fit a 50-degree lens at any Distance. Raise Gap or lower Width. That is the
 * geometry, not a bug to dial around.
 *
 * Rule 6 recipe: ONE GL context built in useEffect([]); every live input read
 * from a ref inside a raw rAF loop (raw rAF ticks on the Framer canvas, unlike
 * IntersectionObserver / framer-motion appear props). Never calls
 * loseContext() — getContext hands back the same force-lost context on the next
 * StrictMode mount and renders black.
 *
 * TWO POINTER TERMS, NOT ONE (rule M). Damping is how a flick decays — input
 * physics. Hover is how much resting the pointer on the wall slows its own
 * drift, which is what lets you actually look at a picture. Different things.
 */

/* ---------------------------------------------------------------- constants */

const RADIUS = 1 // the ring. Fixed: with the camera on the axis, only ratios project.
const SEG = 28 // facets per panel; a 45-degree arc is smooth past ~20
const FOV = 50 // vertical field of view, degrees
const DPR_CAP = 2
const TEX_CAP = 2048 // per-image texture edge, before the device limit
const SPIN_AT_50 = 0.14 // rad/sec, the rate the rotunda shipped at
// A flick is delta / dt, and dt is whatever the platform spaced two pointer
// events by. A high-poll mouse (or any synthetic event stream) can put them 1ms
// apart, which turns a 30px swipe into ~400 rad/sec — sixty turns a second off
// one gesture. The floor bounds the divisor and the cap bounds the result at
// two turns a second, which is already faster than anything readable.
const MOVE_DT_FLOOR = 4 // ms
const MAX_FLICK = 12 // rad/sec
// Camera offset is a fraction of the radius and must stay strictly inside the
// wall, or every claim in the header about occlusion stops holding.
const DIST_MAX = 0.9
// How far a panel seen edge-on is dimmed. Frozen (rule 8b: no decoration dial) —
// at Distance 0 every point of the wall faces the eye and this does nothing, so
// it only ever fires as the camera backs off, which is when it is wanted.
const GRAZE_DIM = 0.42
// Fallback antialias width for the rounded corner, in panel units (height = 1),
// used only where OES_standard_derivatives is missing.
const AA_FALLBACK = 0.004
// Stock photography, so the component is a rotunda the moment it lands on the
// canvas instead of eight coloured plates. Remote by nature: they are meant to
// be replaced, they are served with Access-Control-Allow-Origin: *, and an
// empty slot still falls back to its placeholder tint if one ever fails.
const UNSPLASH = (id: string) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`
const DEFAULT_ITEMS: ItemProp[] = [
    { image: UNSPLASH("1506905925346-21bda4d32df4") },
    { image: UNSPLASH("1470071459604-3b5ec3a7fe05") },
    { image: UNSPLASH("1441974231531-c6227db76b6e") },
    { image: UNSPLASH("1501785888041-af3ef285b470") },
    { image: UNSPLASH("1418065460487-3e41a6c84dc5") },
    { image: UNSPLASH("1519681393784-d120267933ba") },
    { image: UNSPLASH("1497436072909-60f360e1d4b1") },
    { image: UNSPLASH("1433086966358-54859d0ed716") },
]

/* ------------------------------------------------------------------ shaders */

// All of the 3D is here: the bend around the ring, the camera-relative
// transform, the projection and the grazing shade. The CPU hands over two
// angles per panel and one camera offset.
const VERT = `
precision highp float;

attribute vec2 aCell;   // (s across the panel arc 0..1, v down the panel 0..1)

uniform float uArc0;    // where this panel starts, radians
uniform float uSpan;    // how much of the ring it covers, radians
uniform float uYaw;
uniform float uHeight;  // panel height, world units
uniform float uPitch;
uniform float uDist;    // camera offset along +z, world units, always < RADIUS
uniform float uRadius;
uniform float uFocal;   // in NDC units: 1 / tan(fov / 2)
uniform float uAspect;

varying vec2  vUv;
varying float vFace;

void main() {
    float th = uArc0 + aCell.x * uSpan + uYaw;
    vec3 p = vec3(uRadius * sin(th), (0.5 - aCell.y) * uHeight, uRadius * cos(th));

    // Camera-relative FIRST, then pitch. The other order rotates the eye around
    // the world origin instead of turning it in place, which walks it up out of
    // the ring at large Tilt and reintroduces occlusion.
    vec3 rel = p - vec3(0.0, 0.0, uDist);
    float c = cos(uPitch);
    float s = sin(uPitch);
    vec3 q = vec3(rel.x, rel.y * c - rel.z * s, rel.y * s + rel.z * c);

    // The eye looks down -z. Positive uPitch lifts the wall in front of you,
    // which is the camera looking DOWN — the same sign convention the outside
    // band uses, so the two components do not disagree about what Tilt means.
    //
    // CLIP SPACE, NOT A PRE-DIVIDE. Standing inside the ring, part of the wall
    // is always BEHIND the eye, so every frame has panels straddling the camera
    // plane. Dividing here and parking the bad vertex off-screen does not clip
    // anything: the triangle simply stretches from its valid vertex to the
    // parked one and paints a wedge across the whole frame. Handing the GPU
    // w = depth lets the hardware clip the triangle at w = 0, which is the only
    // thing that cuts it in the right place. z is 0 for every vertex — the
    // depth test is off and there is nothing on the wall to sort against.
    float w = -q.z;
    gl_Position = vec4(q.x * uFocal / uAspect, q.y * uFocal, 0.0, w);

    // MIRRORED OTHERWISE. Increasing theta moves LEFT across the screen when
    // you are inside the ring looking out at it, so u has to run the other way
    // or every picture is flipped and text on it reads backwards.
    vUv = vec2(1.0 - aCell.x, aCell.y);

    // Grazing shade. The wall's inward normal and the direction to the eye are
    // both taken pre-pitch: pitch is a rigid rotation of the pair, so the dot
    // product is identical and there is no reason to pay for it twice.
    vec3 n = -vec3(sin(th), 0.0, cos(th));
    vec3 toCam = normalize(vec3(0.0, 0.0, uDist) - p);
    vFace = clamp(dot(n, toCam), 0.0, 1.0);
}
`

// deriv: whether OES_standard_derivatives is available. The extension pragma has
// to precede every non-preprocessor token, so it is prepended to the whole
// source rather than dropped in beside the precision line.
const FRAG = (deriv: boolean) =>
    `${deriv ? "#extension GL_OES_standard_derivatives : enable\n" : ""}precision highp float;

${deriv ? "#define AAW(x) fwidth(x)" : `#define AAW(x) ${AA_FALLBACK.toFixed(4)}`}

uniform sampler2D uTex;
uniform float uHas;         // 1 = a picture is loaded, 0 = placeholder
uniform vec3  uTint;        // placeholder colour, one hue per slot
uniform float uTexAspect;   // the picture's own w/h
uniform float uPanelAspect; // the panel's world w/h
uniform float uRound;       // 0..1, fraction of half the panel's short side
uniform float uGraze;

varying vec2  vUv;
varying float vFace;

void main() {
    // COVER, never contain: a letterboxed picture would put the rounded corner
    // around empty space instead of around the image.
    vec2 uv = vUv - 0.5;
    float ra = uTexAspect / uPanelAspect;
    if (ra > 1.0) uv.x /= ra; else uv.y *= ra;
    uv += 0.5;

    vec3 pic = texture2D(uTex, uv).rgb;
    vec3 hold = uTint * (1.0 - 0.28 * vUv.y);
    vec3 rgb = mix(hold, pic, uHas);

    // Rounded rect, measured in panel units where the height is 1 and the width
    // is the panel's true world aspect — so the corner is a circle on the wall,
    // not an ellipse, at every item count.
    vec2 hs = vec2(uPanelAspect, 1.0) * 0.5;
    vec2 pp = (vUv - 0.5) * vec2(uPanelAspect, 1.0);
    float r = uRound * min(hs.x, hs.y);
    vec2 d = abs(pp) - hs + r;
    float sd = min(max(d.x, d.y), 0.0) + length(max(d, vec2(0.0))) - r;
    float w = max(AAW(sd), 1e-5);
    float a = 1.0 - smoothstep(-w, w, sd);

    float shade = mix(uGraze, 1.0, vFace);
    gl_FragColor = vec4(rgb * shade * a, a);
}
`

/* ------------------------------------------------------------------ helpers */

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("RotundaCarousel shader:", gl.getShaderInfoLog(sh))
    }
    return sh
}

// Nearest power of two, clamped. Resampling to POT is what makes mipmaps legal
// on WebGL1; because the picture is drawn full-bleed into it, normalized UVs
// still address exactly the same content and only the texel density changes.
function potFit(n: number, cap: number): number {
    let p = 64
    while (p * 2 <= Math.min(n, cap)) p *= 2
    const up = Math.min(p * 2, cap)
    return Math.abs(up - n) < Math.abs(n - p) ? up : p
}

// Muted, so an unfilled slot reads as a waiting panel rather than as an error.
function slotTint(i: number, n: number): [number, number, number] {
    const h = ((i / Math.max(1, n)) * 360 + 210) % 360
    const s = 0.3
    const l = 0.42
    const k = (m: number) => (m + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (m: number) =>
        l - a * Math.max(-1, Math.min(Math.min(k(m) - 3, 9 - k(m)), 1))
    return [f(0), f(8), f(4)]
}

// Shortest signed way from a to b, so the yaw accumulator never jumps a turn
// when the grabbed angle crosses the atan2 seam.
function wrapPi(x: number): number {
    const t = Math.PI * 2
    return ((((x + Math.PI) % t) + t) % t) - Math.PI
}

/* --------------------------------------------------------------------- props */

interface ItemProp {
    image?: string
}
interface CursorGroup {
    damping: number
    hover: number
}

interface Props {
    images?: ItemProp[]
    background?: string
    gap?: number
    panelWidth?: number
    panelHeight?: number
    rounded?: number
    distance?: number
    tilt?: number
    speed?: number
    cursor?: Partial<CursorGroup>
    width?: number
    height?: number
    style?: React.CSSProperties
}

/* ----------------------------------------------------------------- component */

export default function RotundaCarousel(props: Props) {
    const {
        images = [{"image":"https://plus.unsplash.com/premium_photo-1664438942574-e56510dc5ce5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8dmlicmFudCUyMGNvbG9yfGVufDB8fDB8fHww"},{"image":"https://images.unsplash.com/photo-1580566176138-daa588058b59?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dmlicmFudCUyMGNvbG9yfGVufDB8fDB8fHww"},{"image":"https://images.unsplash.com/photo-1737834495647-f60b20534b22?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHZpYnJhbnQlMjBjb2xvcnxlbnwwfHwwfHx8MA%3D%3D"},{"image":"https://images.unsplash.com/photo-1650250497866-e0161cc55248?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mjd8fHZpYnJhbnQlMjBjb2xvcnxlbnwwfHwwfHx8MA%3D%3D"},{"image":"https://images.unsplash.com/photo-1677297680558-df5641e505ee?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzJ8fHZpYnJhbnQlMjBjb2xvcnxlbnwwfHwwfHx8MA%3D%3D"},{"image":"https://images.unsplash.com/photo-1771814565091-d615660dc4a4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTV8fHZpYnJhbnQlMjBjb2xvcnxlbnwwfHwwfHx8MA%3D%3D"},{"image":"https://images.unsplash.com/photo-1761063198805-83ad61ebc827?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjAzfHx2aWJyYW50JTIwY29sb3J8ZW58MHx8MHx8fDA%3D"},{"image":"https://images.unsplash.com/photo-1636690513351-0af1763f6237?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjQxfHx2aWJyYW50JTIwY29sb3J8ZW58MHx8MHx8fDA%3D"}],
        background = "#0B0A10",
        gap = 0,
        panelWidth = 2000,
        panelHeight = 1340,
        rounded = 3,
        distance = 90,
        tilt = 0,
        speed = 100,
        cursor = {"hover":200,"damping":100},
        style,
    } = props

    const { damping = 45, hover = 70 } = cursor

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Flattened, so the loop can spot a content change by comparing a string.
    // A useEffect dep on `images` would see a fresh array every render.
    const srcKey = JSON.stringify(
        (Array.isArray(images) ? images : []).map((i) => i?.image ?? "")
    )

    const live = useRef({
        images,
        srcKey,
        gap,
        panelWidth,
        panelHeight,
        rounded,
        distance,
        tilt,
        speed,
        damping,
        hover,
    })
    live.current = {
        images,
        srcKey,
        gap,
        panelWidth,
        panelHeight,
        rounded,
        distance,
        tilt,
        speed,
        damping,
        hover,
    }

    // Drag state. `vel` is yaw radians per second, carried out of the gesture as
    // inertia; `hoverAmt` eases so entering the wall does not snap the drift.
    const drag = useRef({
        down: 0,
        over: 0,
        grab: 0,
        vel: 0,
        lastT: 0,
        hoverAmt: 0,
    })

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        const gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            depth: false,
        }) as WebGLRenderingContext | null
        if (!gl) return

        const deriv = !!gl.getExtension("OES_standard_derivatives")

        /* ---- program ---- */
        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG(deriv))
        const prog = gl.createProgram()
        if (!vs || !fs || !prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.warn("RotundaCarousel link:", gl.getProgramInfoLog(prog))
            return
        }
        gl.useProgram(prog)

        const aCell = gl.getAttribLocation(prog, "aCell")
        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            arc0: U("uArc0"),
            span: U("uSpan"),
            yaw: U("uYaw"),
            height: U("uHeight"),
            pitch: U("uPitch"),
            dist: U("uDist"),
            radius: U("uRadius"),
            focal: U("uFocal"),
            aspect: U("uAspect"),
            tex: U("uTex"),
            has: U("uHas"),
            tint: U("uTint"),
            texAspect: U("uTexAspect"),
            panelAspect: U("uPanelAspect"),
            round: U("uRound"),
            graze: U("uGraze"),
        }

        /* ---- one unit panel, reused by every draw. Its arc and height are
               uniforms, so adding an image never touches this buffer. ---- */
        const verts = new Float32Array((SEG + 1) * 4)
        for (let i = 0; i <= SEG; i++) {
            const t = i / SEG
            verts[i * 4] = t
            verts[i * 4 + 1] = 0
            verts[i * 4 + 2] = t
            verts[i * 4 + 3] = 1
        }
        const cellBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf)
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
        const vertCount = (SEG + 1) * 2

        /* ---- textures ---- */
        const maxTex = Math.max(
            256,
            Math.min(TEX_CAP, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
        )
        const anisoExt = gl.getExtension("EXT_texture_filter_anisotropic") as {
            TEXTURE_MAX_ANISOTROPY_EXT: number
            MAX_TEXTURE_MAX_ANISOTROPY_EXT: number
        } | null
        const aniso = anisoExt
            ? {
                  pname: anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
                  max: Math.min(
                      8,
                      gl.getParameter(
                          anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT
                      ) as number
                  ),
              }
            : null

        // A 1x1 transparent texture, bound for every placeholder panel. Sampling
        // an unbound unit is undefined and shows up as noise on some drivers.
        const blank = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, blank)
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 0])
        )
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        const cache = new Map<string, { tex: WebGLTexture; aspect: number }>()
        const pending = new Set<string>()

        const ensure = (src: string) => {
            if (!src || cache.has(src) || pending.has(src)) return
            pending.add(src)
            const im = new Image()
            im.crossOrigin = "anonymous"
            im.onerror = () => {
                pending.delete(src)
            }
            im.onload = () => {
                pending.delete(src)
                if (!im.naturalWidth || !im.naturalHeight) return
                const w = potFit(im.naturalWidth, maxTex)
                const h = potFit(im.naturalHeight, maxTex)
                const c = document.createElement("canvas")
                c.width = w
                c.height = h
                const cx = c.getContext("2d")
                if (!cx) return
                cx.drawImage(im, 0, 0, w, h)
                const t = gl.createTexture()
                if (!t) return
                gl.bindTexture(gl.TEXTURE_2D, t)
                // v = 0 is the panel's TOP and, with no flip, the canvas's first
                // uploaded row — which is the picture's top. Flipping here would
                // hang every image upside down.
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    c
                )
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_S,
                    gl.CLAMP_TO_EDGE
                )
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_T,
                    gl.CLAMP_TO_EDGE
                )
                // Mipmaps for the panels the camera has backed away from, and
                // anisotropy for the ones near the silhouette, where a trilinear
                // sample alone smears the picture into a streak.
                gl.generateMipmap(gl.TEXTURE_2D)
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR_MIPMAP_LINEAR
                )
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MAG_FILTER,
                    gl.LINEAR
                )
                if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.pname, aniso.max)
                cache.set(src, {
                    tex: t,
                    aspect: im.naturalWidth / im.naturalHeight,
                })
            }
            im.src = src
        }

        gl.disable(gl.DEPTH_TEST)
        // No face culling. From inside a convex cylinder every wall point is hit
        // by exactly one ray, so a panel's outer face is never in front of
        // anything and culling would only add a winding assumption to get wrong.
        gl.disable(gl.CULL_FACE)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) // shader premultiplies

        /* ---- sizing: measure the ELEMENT, not the width/height props. Those
               are not numeric in the Framer preview (only on the canvas). ---- */
        let cssW = 0
        let cssH = 0
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            cssW = canvas.clientWidth || host.clientWidth || 0
            cssH = canvas.clientHeight || host.clientHeight || 0
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, w, h)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        /* ---- drag: the inverse projection, so the wall stays under the pointer
               ---- */
        // What the last frame actually rendered with. The pointer maths needs
        // the same numbers or the grabbed point drifts as the dials move.
        const view = { focal: 1, aspect: 1, dist: 0, pitch: 0 }
        let yaw = 0

        // Screen point -> the ring angle its ray lands on, or null if the ray is
        // degenerate. offsetX/offsetY, never getBoundingClientRect: the rect
        // carries the Framer canvas zoom and the wall would scrub at the wrong
        // rate on a zoomed canvas.
        const screenTheta = (ox: number, oy: number): number | null => {
            const w = host.offsetWidth || 1
            const h = host.offsetHeight || 1
            const nx = (ox / w) * 2 - 1
            const ny = 1 - (oy / h) * 2

            // Camera-space ray, looking down -z.
            const dx = (nx * view.aspect) / view.focal
            const dy = ny / view.focal
            const dz = -1
            // Un-pitch it. The vertex shader applies Rx(pitch) last, so it comes
            // off first (rule 8: peel transforms in reverse order).
            const c = Math.cos(view.pitch)
            const s = Math.sin(view.pitch)
            const wz = -dy * s + dz * c

            // Intersect r = RADIUS with the ray from (0, 0, dist). The constant
            // term is negative for every dist < RADIUS, so the roots straddle
            // zero and exactly one is forward — the invariant this whole
            // component rests on.
            const a = dx * dx + wz * wz
            const b = 2 * view.dist * wz
            const cc = view.dist * view.dist - RADIUS * RADIUS
            if (a <= 1e-9) return null
            const disc = b * b - 4 * a * cc
            if (disc < 0) return null
            const t = (-b + Math.sqrt(disc)) / (2 * a)
            if (!(t > 0)) return null
            return Math.atan2(t * dx, view.dist + t * wz)
        }

        const onDown = (e: PointerEvent) => {
            const th = screenTheta(e.offsetX, e.offsetY)
            if (th == null) return
            const d = drag.current
            d.down = 1
            d.vel = 0
            d.lastT = e.timeStamp
            // The GEOMETRIC angle grabbed. Holding it fixed is what pins the
            // picture to the pointer.
            d.grab = th - yaw
            host.style.cursor = "grabbing"
            try {
                // Capture, so a drag that wanders off the component keeps
                // arriving here. A second window listener would double-count
                // every event that also hits the host.
                host.setPointerCapture(e.pointerId)
            } catch {
                /* no capture here: the drag simply ends at the edge */
            }
        }
        const onMove = (e: PointerEvent) => {
            const d = drag.current
            d.over = 1
            if (!d.down) return
            const th = screenTheta(e.offsetX, e.offsetY)
            if (th == null) return
            const delta = wrapPi(th - d.grab - yaw)
            yaw += delta
            const dt = Math.max(MOVE_DT_FLOOR, e.timeStamp - d.lastT) / 1000
            d.lastT = e.timeStamp
            // Blended, so one stuttering event does not decide the whole flick.
            const v = d.vel * 0.4 + (delta / dt) * 0.6
            d.vel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v))
        }
        const onUp = () => {
            drag.current.down = 0
            host.style.cursor = "grab"
        }
        const onLeave = () => {
            drag.current.over = 0
            drag.current.down = 0
            host.style.cursor = "grab"
        }
        host.addEventListener("pointerdown", onDown)
        host.addEventListener("pointermove", onMove)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointercancel", onUp)
        // On window, not host: a flick that releases outside must still let go.
        window.addEventListener("pointerup", onUp)

        /* ---- loop ---- */
        let raf = 0
        let last = performance.now()

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now

            if (cssW <= 0 || cssH <= 0) {
                resize()
                if (cssW <= 0 || cssH <= 0) return
            }

            const L = live.current
            const list =
                Array.isArray(L.images) && L.images.length
                    ? L.images
                    : DEFAULT_ITEMS
            const n = list.length

            const d = drag.current
            // Hover eases in so the slow-down reads as the wall noticing the
            // pointer, not as a jump cut.
            const target = d.over ? 1 : 0
            d.hoverAmt += (target - d.hoverAmt) * Math.min(1, dt * 6)

            if (!d.down) {
                // Damping: higher settles faster (rule 8b). Frame-rate
                // independent, so a 120Hz display does not decay twice as fast.
                yaw += d.vel * dt
                d.vel *= Math.exp(-dt * (0.5 + (L.damping / 100) * 7))
                // Autonomous drift, scaled down by however much the pointer is
                // resting on the wall. Hover 0 is off, 100 stops it, above that
                // it backs up.
                const slow = 1 - (L.hover / 100) * d.hoverAmt
                yaw += (L.speed / 50) * SPIN_AT_50 * slow * dt
            }
            // Bounded: unbounded it eventually costs float32 precision inside
            // the shader's sin/cos.
            yaw = yaw % (Math.PI * 2)

            /* ---- geometry from the item count ---- */
            // The ring closes around n panels and n gaps, so the circumference
            // IS n * (Width + Gap) and the radius falls out of it. Everything
            // below is that circumference normalised to RADIUS = 1, which is
            // what keeps the pointer solver and its round-trip proof unchanged.
            const itemArc = (Math.PI * 2) / n
            const pw = Math.max(1, L.panelWidth)
            const ph = Math.max(1, L.panelHeight)
            const circum = Math.max(1, n * (pw + Math.max(0, L.gap)))
            const span = Math.min(itemArc, (Math.PI * 2 * pw) / circum)
            const worldW = RADIUS * span
            const worldH = Math.max(1e-4, (Math.PI * 2 * ph) / circum)
            // Exactly the ratio the designer typed: the arc and the height came
            // off the same circumference, so the divisions cancel.
            const panelAspect = worldW / worldH

            const vAspect = Math.max(0.05, cssW / Math.max(1, cssH))
            const focal = 1 / Math.tan(((FOV / 2) * Math.PI) / 180)
            // Strictly inside the wall. Everything above depends on it.
            const dist = Math.max(
                0,
                Math.min(DIST_MAX, L.distance / 100) * RADIUS
            )
            const pitch = (L.tilt * Math.PI) / 180

            view.focal = focal
            view.aspect = vAspect
            view.dist = dist
            view.pitch = pitch

            gl.useProgram(prog)
            gl.uniform1f(u.yaw, yaw)
            gl.uniform1f(u.height, worldH)
            gl.uniform1f(u.pitch, pitch)
            gl.uniform1f(u.dist, dist)
            gl.uniform1f(u.radius, RADIUS)
            gl.uniform1f(u.focal, focal)
            gl.uniform1f(u.aspect, vAspect)
            gl.uniform1f(u.span, span)
            gl.uniform1f(u.panelAspect, panelAspect)
            gl.uniform1f(u.round, Math.max(0, Math.min(100, L.rounded)) / 100)
            gl.uniform1f(u.graze, GRAZE_DIM)
            gl.uniform1i(u.tex, 0)
            gl.activeTexture(gl.TEXTURE0)

            gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf)
            gl.enableVertexAttribArray(aCell)
            gl.vertexAttribPointer(aCell, 2, gl.FLOAT, false, 0, 0)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            for (let i = 0; i < n; i++) {
                const src = list[i]?.image ?? ""
                if (src) ensure(src)
                const hit = src ? cache.get(src) : undefined
                gl.uniform1f(u.arc0, i * itemArc + (itemArc - span) * 0.5)
                if (hit) {
                    gl.bindTexture(gl.TEXTURE_2D, hit.tex)
                    gl.uniform1f(u.has, 1)
                    gl.uniform1f(u.texAspect, hit.aspect)
                    gl.uniform3f(u.tint, 0, 0, 0)
                } else {
                    // A slot with no picture yet still draws, so the rotunda is
                    // never an empty frame on a fresh drop-in.
                    gl.bindTexture(gl.TEXTURE_2D, blank)
                    gl.uniform1f(u.has, 0)
                    gl.uniform1f(u.texAspect, panelAspect)
                    const t = slotTint(i, n)
                    gl.uniform3f(u.tint, t[0], t[1], t[2])
                }
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertCount)
            }
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            host.removeEventListener("pointerdown", onDown)
            host.removeEventListener("pointermove", onMove)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointercancel", onUp)
            window.removeEventListener("pointerup", onUp)
            cache.forEach((v) => gl.deleteTexture(v.tex))
            cache.clear()
            gl.deleteTexture(blank)
            gl.deleteBuffer(cellBuf)
            // No loseContext(): getContext() hands back the SAME force-lost
            // context on the next StrictMode mount and renders black.
        }
    }, [])

    return (
        <div
            ref={hostRef}
            style={{
                // Floor BEFORE the style spread: the canvas is absolutely
                // positioned, so the root has no in-flow content and collapses
                // to a dot under Framer's Fit Content sizing.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                cursor: "grab",
                touchAction: "pan-y",
                userSelect: "none",
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
                }}
            />
        </div>
    )
}
