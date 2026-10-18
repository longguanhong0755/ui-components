"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * MirrorShards — a word suspended in a field of slowly turning mirrored slabs,
 * each one reflecting copies of that word arranged on an icosahedron the main
 * camera never sees.
 *
 * Ported from the Codrops "Awesome Mirror Effect" demo, scene 1 (`#/panna`) by
 * Marco Ludovico Perego and Gianmarco Simone —
 * https://tympanus.net/Tutorials/Mirrors/#/panna. The original is
 * react-three-fiber v5 + three (r119-era) + @react-three/drei. This is one file of raw
 * WebGL2 with no dependency: rule 10's "self-contained beats convenient".
 *
 * WHAT THE SCENE ACTUALLY IS — the trick is layers, and it is worth stating
 * because nothing about the picture gives it away:
 *
 *   - The MAIN camera sees exactly two things: the word, and ten slabs.
 *     Everything else in the scene is on three's layer 11, which the main
 *     camera is not looking at.
 *   - A cube camera parked at (0, 0, 5) renders ONLY layer 11: a matcap shell
 *     of radius 20 turned inside out, and twelve more copies of the word placed
 *     on the vertices of an icosahedron of radius 10, each turned to face the
 *     origin.
 *   - The slabs' ±Z faces sample that cube map. So the reflections are of a
 *     scene that does not exist as far as the viewer is concerned, and the
 *     black space between the slabs is genuinely empty.
 *
 * The four side faces of each slab take a different material: a thin-film
 * interference LUT, ported verbatim from David Lenaerts' ThinFilmFresnelMap.
 * It is built by integrating the two-interface reflectance over 64 spectral
 * bands and projecting through the CIE 1931 fits — that is where the magenta
 * and green edges come from, and no gradient stop can be substituted for it.
 * The original samples it by UV, not by dot(N,V), so it reads as an iridescent
 * ramp ACROSS each face rather than as a Fresnel term. Reproduced as-is.
 *
 * THINGS THE PORT REPRODUCES ON PURPOSE, because they are what the reference
 * renders, not what a fresh build would do:
 *
 *   - The cube pass draws only the FOUR SIDE faces of each slab. In the
 *     original the mirror faces sample the very cube map being written, and
 *     Chrome refuses the draw outright — the live demo logs
 *     "GL_INVALID_OPERATION: glDrawElements: Feedback loop formed between
 *     Framebuffer and active Texture". The mirror groups are therefore skipped,
 *     so slabs never appear mirror-side in their own reflections. A ping-pong
 *     pair of cube maps would "fix" it into recursive reflections, which is a
 *     different component.
 *   - The cube sample negates X (three's `flipEnvMap` is -1 for any
 *     CubeTexture, and a cube render target's texture is one). Reflections are
 *     handed left-for-right on top of the mirror flip.
 *   - The reflection vector is computed PER VERTEX, not per fragment: lambert
 *     with no bump or normal map takes three's `vReflect` varying path. On
 *     slabs this large the difference is visible, so it is kept.
 *   - Lighting is one 0.4 ambient and nothing else, and three's lambert folds
 *     `irradiance *= PI` against `BRDF_Lambert`'s `1/PI`, so the whole scene is
 *     literally `color * film * 0.4`, then multiplied by the env for the mirror
 *     faces (`ENVMAP_BLENDING_MULTIPLY`). That is why it is so dark.
 *   - r3f v5 set `toneMapping = ACESFilmic` and `outputEncoding = sRGB` by
 *     default, so both are applied at the end of main(). Material colours are
 *     NOT converted on the way in — three of that era predates colour management and
 *     treats a hex as linear. The text sets `toneMapped={false}` in the
 *     original, so it takes the sRGB encode and skips ACES.
 *   - The background colour is a GL clear, which three writes with no encoding
 *     conversion at all — a third path, and the reason a mid-grey background
 *     does not match a mid-grey slab.
 *   - THE CUBE PASS IS WRITTEN LINEAR AND READ AS sRGB. three takes the output
 *     encoding from the bound render target's texture, not from the renderer,
 *     so the cube map is stored ACES-graded but NOT sRGB-encoded; the slabs
 *     then decode that sample as if it were sRGB. It is an encoding mismatch,
 *     and it is not optional: it is most of the difference between a scene of
 *     black shards with a bright reflection in them and a scene of grey plates.
 *
 *     This one is measured, not derived — the mismatch is not visible in
 *     three's own source, so the numbers carry it. The demo's live cube map was
 *     read back out of its WebGL context (hooking `framebufferTexture2D` to
 *     recover the FBO, then `readPixels` per face) and compared with this
 *     component's, block-mean for block-mean: the six faces agree to a ratio of
 *     0.87-0.94, so both write LINEAR. Its frame then pins the read: the
 *     brightest slab pixel in the demo is 179/255, which is exactly
 *     `film * 0.4 * 1.0` graded and encoded (predicted 184 at film 1.0), so a
 *     reflected white letter samples 1.0 — and its shell-lit faces sit at 1-11
 *     where an undecoded 57/255 shell would give 50-73 and an sRGB-decoded one
 *     gives 5-10. Two anchors, one at each end, and only the decode fits both.
 *     With it in, the fraction of the frame above 8/255 is 0.0458 against the
 *     demo's 0.0464; without it, 0.109.
 *
 * WHAT CHANGED, and why:
 *
 *   - Text is a canvas-drawn quad rather than troika's SDF glyphs. drei's
 *     `<Text>` is already a flat plane of glyphs; one quad per word carries the
 *     same picture without an atlas builder, and it makes Label and Font plain
 *     property controls.
 *   - The matcap is inlined as a 64x64 luminance table (the original fetches a
 *     1024px PNG from a GitHub raw URL at runtime, which is a network
 *     dependency inside a Framer component and a blank frame when it fails).
 *     It is near-neutral, so the chroma is restored as one constant vector.
 *     Sampled unconverted, matching three's LinearEncoding default on a
 *     TextureLoader texture.
 *   - Slab spin and the pointer slerp are dt-correct. The original advances a
 *     fixed increment per FRAME, which runs at a different rate on a 120Hz
 *     display.
 *   - `Density` and `Size` are ADDITIONS, not reproductions — the reference
 *     ships exactly ten hand-placed slabs at fixed extents and has no dial for
 *     either. Density 10 and Size 100% are that scene, slab for slab; the
 *     table above is only ever appended to, and Size is a uniform multiply, so
 *     neither dial touches the authored ten.
 *   - Copies `Radius` stops at 14, not at the shell. The shell is a radius-20
 *     sphere centred at z = -5, so it only reaches z = +15, and it writes
 *     depth — a copy pushed past that is simply occluded. At 18 the frame is
 *     identical to Count 0, which is a dial that has quietly stopped meaning
 *     anything (rule F).
 *   - The scene is built in the tilt group's LOCAL space, with the group
 *     rotation folded into the view matrix instead. Every layer-11 object is
 *     inside that group, so a world-oriented cube of the rotated scene and a
 *     local-oriented cube of the still one are the same cube — and this way the
 *     cube pass has no rotation in it at all.
 */

/* ---------------------------------------------------------------- types --- */

interface FontValue {
    fontFamily?: string
    fontSize?: number | string
    fontWeight?: number | string
    fontStyle?: string
    letterSpacing?: number | string
    variant?: string
}

interface MirrorsGroup {
    count?: number
    size?: number
    color?: string
    film?: number
}

interface CopiesGroup {
    count?: number
    radius?: number
}

interface ShellGroup {
    color?: string
    opacity?: number
}

interface MirrorShardsProps {
    label?: string
    font?: FontValue
    textColor?: string
    background?: string
    speed?: number
    hover?: number
    distance?: number
    mirrors?: MirrorsGroup
    copies?: CopiesGroup
    shell?: ShellGroup
    style?: CSSProperties
}

type Vec3 = [number, number, number]

/* ------------------------------------------------------------ constants --- */

/**
 * The ten slabs, verbatim from the demo's data.js: half-extents in `args`,
 * world position, and the Euler (XYZ) the slab starts at before the per-frame
 * spin is added.
 */
const SLABS: { args: Vec3; position: Vec3; rotation: Vec3 }[] = [
    {
        args: [2.87483173052424, 2.920755196190408, 0.05],
        position: [3.116376203948097, -2.1742814140991196, -7.998859699752443],
        rotation: [1.2536197471688286, -1.6683567077395978, -2.8428053193736256],
    },
    {
        args: [1.799233278635274, 1.9642524560408021, 0.05],
        position: [-3.325473394997085, 3.5307542721423446, -6.530151273151705],
        rotation: [1.3951213133257898, -0.2888432911308304, 0.7178380971731012],
    },
    {
        args: [2.8780801433198553, 2.9065216543855974, 0.05],
        position: [1.2839348832937714, 2.888947614684322, -6.467835086028824],
        rotation: [-1.3341775957580109, 2.8031736269533125, -0.18771283594857274],
    },
    {
        args: [2.2175936863874006, 1.3820832190972703, 0.05],
        position: [4.552400557892, 0.9814639517113943, -5.836395383986279],
        rotation: [-2.3299625953354437, 0.6139693063561498, -0.3902201705507059],
    },
    {
        args: [1.7446126775638997, 2.6211835436253392, 0.05],
        position: [-2.826056860647832, -3.0308788716782042, -5.4685371584057485],
        rotation: [-1.4052581815125296, 3.002812728418492, 2.54202362440499],
    },
    {
        args: [1.139549518339333, 1.8007363020629232, 0.05],
        position: [-0.041834072623521124, -1.351281881742426, -2.40411451302583],
        rotation: [1.284839439661856, -0.310029190116405, -2.107987000676972],
    },
    {
        args: [2.2021865186914007, 2.610358395964105, 0.05],
        position: [-4.154292737578202, -0.349560252979882, -2.489538720961452],
        rotation: [1.4401104979160235, 1.8179123712769851, -2.2157249608220475],
    },
    {
        args: [2.0964670262303393, 1.5750930602784585, 0.05],
        position: [6.571372497652996, -2.6457284555412066, -6.252562745592483],
        rotation: [1.1870955922970219, 0.5335941225301444, 0.4523391139946649],
    },
    {
        args: [1.3270056676441064, 1.5169873297208318, 0.05],
        position: [3.6761316187794724, -4.141729519755186, -4.39063863430271],
        rotation: [-0.7690386626408349, 1.4093151276977962, 2.0252977680762476],
    },
    {
        args: [5.142610544045821, 4.416201863189162, 0.05],
        position: [0.646982562789564, 7.09096733026142, -8.351518200349155],
        rotation: [-0.0692356415822184, 1.918047448701773, 0.5268942683942657],
    },
]

/**
 * How many slabs `Density` can reach. The reference has exactly ten, and they
 * are hand-placed; the rest are drawn from the distribution those ten describe
 * — an annulus of radius 2.5-7.3 around the word, depth -2.2 to -8.6, sides
 * 1.1-3.0 by 1.3-3.0, free rotation. Seeded, so the table is the same table
 * every mount and raising Density only ever ADDS: at 10 the scene is the
 * reference's, slab for slab.
 */
const MAX_SLABS = 40

function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const SLAB_TABLE: { args: Vec3; position: Vec3; rotation: Vec3 }[] = (() => {
    const out = SLABS.slice()
    const rand = mulberry32(0x5eed)
    while (out.length < MAX_SLABS) {
        const angle = rand() * Math.PI * 2
        const radius = 2.5 + rand() * 4.8
        out.push({
            args: [1.1 + rand() * 1.9, 1.3 + rand() * 1.7, 0.05],
            position: [Math.cos(angle) * radius, Math.sin(angle) * radius, -2.2 - rand() * 6.4],
            rotation: [(rand() * 2 - 1) * Math.PI, (rand() * 2 - 1) * Math.PI, (rand() * 2 - 1) * Math.PI],
        })
    }
    return out
})()

/** The twelve icosahedron vertices, three's own list, normalized at use. */
const PHI = (1 + Math.sqrt(5)) / 2
const ICO_DIRS: Vec3[] = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
]

/** The one ambient light, three's `ambientLightColor` after intensity. */
const AMBIENT = 0.4

/** Where the cube camera sits, in the tilt group's local space. */
const CUBE_EYE: Vec3 = [0, 0, 5]
const CUBE_SIZE = 512

/** Slab spin per frame at 60fps, straight from the reference's useFrame. */
const SPIN_Y = 0.001
const SPIN_Z = 0.01

/** The reference's mouse slerp: 0.1 of the way per frame at 60fps. */
const SLERP = 0.1

/** The em size the canvas glyphs are rasterised at, and the px-to-world scale
 *  that turns the Font control's size into troika's `fontSize: 2.5` at 50px. */
const TEXT_EM = 160
const PX_PER_WORLD_UNIT = 20

/** Cut controls, frozen at the value the reference shipped (rule 11b). */
const SHELL_RADIUS = 20
const SHELL_DETAIL = 4
const SHELL_Z = -5
const TITLE_Z = -10
const CAMERA_FOV = 70
const MAX_DPR = 2

/**
 * The matcap, `C8D1DC_575B62_818892_6E747B` from emmelleppi/matcaps, reduced to
 * a 64x64 luminance table. Its mean RGB is (195.6, 203.6, 212.4) — a cool
 * near-neutral — so the chroma comes back as one multiply and the per-pixel
 * shape is what is stored.
 */
const MATCAP_TINT: Vec3 = [195.6 / 203.9, 203.6 / 203.9, 212.4 / 203.9]
const MATCAP_N = 64
const MATCAP_B64 = "5+Hi3t7f2tva1tbW1tTX2N3l7fP09O/lzrSqpKKioqmpoqOnrbfC2+/1+PPv4tLNx8XGxcTFyMjNz9PV2+Hj5eXk4d7f4eHe2tva2djc4ev3+vr247uloLHG09rd39zb29ra3dvWzListdHy9fb26tvOz8nJzMzKz9DR1Nrc3+Xm5ePh4OHh4Nzd3d/j7/j8/PXXqqTB1d7b1MvGwcC+wL27vcHHz9Xd39zGq73o9vb17eTU1dDR0M7S0tTX2t7h6eLh4+Pj4+Hh4ePw+vz9+dqostvn49HEu7m3t7S1tbi2sra1trm8wMXR3uHTs7nn+fj08unb1dTR0tLS19vb4+fm4+Hm5uTl5+z5/f786a+04u/p1cO6trW1srCxr6+opaWqrrOzsrKyt73L3OjXs8H1+fn38eXb1tXU1NbY2+Hn5ubj5Ojs7Pb9/v77zqjc9vLezcK5uLSxqqCUkYuJiIuGgYaQmqerr7CzuL7N5ObSsN/7+/n37+La2dfX1trh5ubo5ebt8/r+//72tsDx+enUy8K5tLCkjn11a2ppaGlta290d3d7h5qqrbG3vsPY6uW9yfv8+vn16+Hc2dvb3ufm6Onq9vz+/v7wrdj5+ePSy8W6s6KCbWdlYmBfXl1fXV9hYWdsb29ufpetsba/w9bs79G79/38+/rx5d7f3OHm5unt+P7+/v/rrub8+OHTzsnCr4luZmFeXltbXFxaXFxfYFtbWFliZGdthKeyub/G2e/z3rf0/fv7+/fv6eXm5erw+f7+//7rq+79+eLX1c7GqHlnYl5bXFlSU1JRUFFVWVteYGBjZ3J4dXaBpbe9xcvX8PXmtvX9/fz8+vbw7ebq+f7+///7s+v+/e3h29rVrnNlXV1aVVJRU1JTVWFncHdxbGhnZ2pqa2x6h4yRpc3Vz8/Q4ff347/8/f39/v787vv+/v/+vuD9/vTi393dwH5rZGFcVldUVFBTV2JvcnF1b21qamlpampsbn2HjJOq2eHX0NXs+fjczf7+/v7+/vX+///+2Mv9/vnk4d/l6bihoKCZkIRzYVhUWmFlbnBxcnBvbm1tamtramtygIqMl7bl4tvU2vb7+Mzl/v7+/v77/v//9bj5/f3r4eLs++e/s7GyrLKwrZyFb2JlZm5vcnJycXBvcG5va2tuc32IiYyXyeXg2tjt/Pz2v/r////+/v///sDs/f7y4eHo/PvNtrS1s7K2tK+qo5qGbmlsc3J0dXNzdXd9foB+fX2Gh4mJj6jj4uHe5/r9/OnO/v///////+nI/f734dzd8/7jvbW1tLays7Oyr6ynnIVram9vc3eElqm1tLK1uLWrmY+Mh4qY0Orm6Of2/v39zfH///////6/9v785t/e6f77y7q3uLa9vLi3tbGvrqONa2hrboemtry8vLy6u73AwbuxlomHjsHs7u7v8fz+/vXM/v/////s0P7+8OTi5Pn+4L+3uL7K5u7q3cy5sqyjgmZrf562u7m6vr+9vby/vL6/t5+Mhouy6vTz9PP6/v790vH/////yPb++urn5u395b+4ur/H9f/////++OTEnHRuiqi2vby/vcC9vL69ubu8uq+ai4mPrOb19fT19/z//vXS/v//+sr+/vLq6ur26cC2t7rC4f///////////teKhp2wvb7AvsHAvru7vLq8t7Wplo2KkqTN8fX19fj6/v/9z/v//9ru//3v7Ozv9sS8s7e9yfj////////////+8r2hsLu+vL+9vri9urm2trOuqJeNjJCdt+Dy9fX2+f7//uzh///N/f/88e3t9d65t7e6v9f//////////////v74v6y4vry9urm5uLe4tbCvqaGTi4qNl6jE6Pb39/n8///81P/9zv7//PPv8fjZuLW1vMPp///////////////++smcrba1uLa1t7W3srSuq6WdkYiEhY6cstz39/j4/P///9T95+T///rz8/T75cC6t7/M+//////////////+/fOfkZ+ssLOxs7Gwsq6vqKmjnY+EgX+Dj6bJ7vf4+fz+///n7NX2//707/P1/uvHv77E0P7//////////////v7XhYqWoKmrq62pq66qqaajnpiQgnt6eoSZuuH1+vn7/v//993Q/f/87Ovt8/vPwsDDxdL+//////////////79rX2Fjpedo6SkpaWnpqOgm5WQi395d3yBiafU9/v5+/3///3bzf7+9+no6+zmu7i6vsfd/v//////////////8YV4fIGJk5ecn56eoJ+cmZKKhYJ/gIWGg4aZxPH7+Pj7/v/+2s7//vLl5eLcv7Oxs7i/2/7//////////////tp1cHN2eYGLj5WWlpeXlpOPiYSBiI6PjIiLl7Ld+Pj2+v7//9rT/v7q4uHYv6CvsbK2tsj5/////////////v22fHFqZGZweoGJkJGWmZ2koqCcmpmXlpGOjZep0fX49vn+///e2P/96OHfy6KPq7GwsrS88f////////////74i3pyYlRTXm5+kqCqr7GytbGup6OfmpaUk5KYrM32+fj6/v//4tz//Ojg3sWPhaapra2vtN3///////////7+5H54blZIR1JvhJmhqK6xs7GysKulnpSTkZWSk67O+vv4+/7//+jd//vp4N/HhHaZoqarrK/C9/////////78+MR6dGhSRUNQaHuMm6Spra+vrqynoZuUj5GSkJOry+329PT8/v7j1f786+PgzoJkdpGeoqSqrLjT2+Dq8enY0cKMeHFkUktJTVpxgpGepqqrrbCsrKukn52amqKsuMHK2Ofv+vz90tD+/Ofj4tGFXFNdZnB9j5eTjYiIiHd0hJGSjYdyXlJKRktYZniGlp+jpKanssbLyMS/u7q7u8HGy9DY6/T4+sjJ/v3p5N/Ti19QTEpOS09XWF9kZGZvj6eloJaKeVxWTkxQX258kJqdm5+fpLzM0c3MxsLAwc3Q1NXX1tzo9fO/xv3+7eLe251mUE1JTEpISk1YY2JlirXV4N7Rwa6gmpOUlJWaoaGim5OWm6TB0M/NzMfExszS1tXW1dTb5fPwvsf7/u7h392ybFRLSUlLSU5aZmxtgKKsvM7VzsnGu7KtqKOfoJ+doJidqK6yyM3Mz8jHw8vR0dbU2dXW2uHw7MDL8v7z4d7cxH5aUEtKVGaHrMrZ1svJytPU2NTDwLy1rKinn5qbnaGnsLu8wcvLx8nIw8fS0tPS19bV19jg7d7J3t3++ePa1MSqiXp6i6e+2er1+vr69vj29PLp3dTQy8XAwLq1srO2u7vAx9DJyMjKzcrO19fV09HW2Nja4OzJ2/m8/fzr2NLGu7Wyubm/zt/q8vj6+vv7+/z68+3m4NnY087Lx8G8u7y3uMfOzMrM0M/N0dva1dfW293b3+bpsfT+uPj6+Ovi4+Df3uLf2d7l6PH1+Pr6+vv6+vbu6eXc1tTSzsvGwr60srvNz8vO09TW0Nrd3dXX2trb3uTu6bL6/sjf+/r39vXu7e3t7u7u7e7x+Pj7+/v6+ffw7Ojk4d3X09TMx8C8t7O9ys3P09TY2drg39zX1drb3uDq7NLF/P3ysfn59/j28u3v8vPw7/Dy8vf4+fr6+fbz7Ovl49/c09HPzMe9urmzvcPO0tPX2dvf3uDe39vd4eTm6uqv6/n9/bDs+ff29PPx8fHy9PHy9PT29fX39vLx7urq5eHa2tfRzMvKwb26uLvBy9LU1dvb39/g4d7d4OLk5ejdrPj3/P7avvj39/by8O/x8fHz8vLx9PL08vHw6Orm5d/d2NXWz8zIycjEvry6vcTR0tLX3tzh4t/d3uHj5uXps9X59Pz9/KXr+fj28u/v8PP08/Py7/Ly8e/u5ufk4d/b19PU0NHNzMjIy8zEvLu/x87Q3N7g3d/g3+Dj5eTn2aL09vH6/P7Vtvj39PTw6+3u8vT09fDz7vDw6uXm4N7d29fR0dLPztDRys7PysC7u7/L2tzf4ePl4t3f5uPm5q7Q9/Lt+vr9/aPj9/Tz8u3r7u/y8vTx8PDv7Ojm4t/a29fU08/P0M/P0M/PzsnEvLu8xtjb4OHj4+Dg4+bn69Oj8/Tt6/r5/P3koPD18vLw7u3u7e7t7/Dw7urn4+Hf3djY1NTS09HS0NPTzczJwbzAu8DT3OHi5ePi5OXp6OKf3Pfw6+v4+Pn7/bi89PPx7+3r7Ovr6e3t6+vq6OPj4Nnb2NjW1NXU0tTU0c/NycS/wb3Cztvg4uTj4+br7Om1t/f16+vq+Pj3+fz4mNP38/Hs7uvr6uro6+zp5+bj5ODd29jX1tjX1dXV1NPPzMzHwsLCxMzX3uTi5uft8OzLm/H27uvo6vj39vb5/euN3/fx7uzp6+vp5uzq6Obk4ePh3d7Y2NXa29bT1NXRz8vJycXGyczQ1dze5Obs7/DYkeT68+3s6uv19Pbz9/v91o/i9PHs6ujq6Ovo6Ojn5N/i4t3d3NnW2djX1NfWz9DQz87Ny8rOztHX3Obp7+7akdf59vLs6ufp9fX19fT4/PzKjt7z8u7t6ujm6ebm5+Lk4OHf3Nnb3NzY1dbX1tTS0tTWz87RzdDS0d3l6ezYj8b6+Pbv7Ofm5/Pz8vP19ff6/ceJ2fDz8vDt6+zp5uXi4t/g2dna29jW19fX1tXW1NPV1dTR0MzP0dbg6erQi8H49/bz8Ozp5uTy8fPz9PL09/n7yYDH7vHx8PDr6ejm5OLh397c3ODa29jZ2Nna2dXV1dfZ1M/S0tbf4uPBhMn2+Pbz8u7q5+bn8e/y8fHx8PP2+vrVf63j8fDt7ern6Onm4OHe39nc2trZ3t3a29zY2tnd29XV0dfd4teng9b29fTz7+3s6Obi5fHw8O7t8e7w9Pf6+emQiM7r7+/t6ufp6Ojk4OHe397e3t/e3N/b29/a29vZ1tnf3cKHlOP28/Hw7+3o5+Xl5Obw7u3u8O/u7/H09/j59Lp2ntXs7+3r6ujp6ufn5eXj5eHf4uHi3tzg3N3d297eypp6t+7y8O/t6ezr5+Xm5+Xl8O3t7e/t7uvu8/X0+Pn545lzodDm7enp5unp5eTo4+Pk4ePl5OPf3d3h4d/InHSb3vDv6uTl6Orp5+bm5+bm5O/t7u/s7urt7fHz8/b09/j225Ryi7vW5ejm6OXk5+Lk4+Tk4uHf4eLez7aIc5XV7uzq5ePf3d7h4+Tm6Ofk4uXu7e3s6+rs7uzw8fXz8/Xz9/j036h2b4isxtTa4ebi5eLi4t/YzsCphHB4p9jw8Onm4t/b29fZ3Nzh4ubj5OTl7+7r6u3t7u/r7e/y8fPx8vPz9vf27dOrf2tsc36Nk56clYx/cWtufqnQ6fDw6uLf3djZ1dbX2NfZ2+Df4+Xn5Q=="

/* -------------------------------------------------------------- helpers --- */

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

function num(v: unknown, fallback: number): number {
    const n = typeof v === "number" ? v : parseFloat(String(v))
    return Number.isFinite(n) ? n : fallback
}

/**
 * Framer's Color control does not hand back a hex. It emits rgb(), rgba(),
 * hsl() and `var(--token, #fallback)`, so a hex-only parse makes the dial look
 * dead. Returns sRGB 0..1 — the caller decides what space that means, because
 * three r119 means three different things by it in this one scene.
 */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    let str = String(input).trim()

    if (str.startsWith("var(")) {
        const comma = str.indexOf(",")
        if (comma < 0) return fallback
        str = str.slice(comma + 1, str.lastIndexOf(")")).trim()
    }

    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fallback
    }

    const parts = str.match(/-?[\d.]+/g)
    if (!parts || parts.length < 3) return fallback

    if (str.startsWith("hsl")) {
        const h = ((parseFloat(parts[0]) % 360) + 360) / 360
        const s = clamp(parseFloat(parts[1]) / 100, 0, 1)
        const l = clamp(parseFloat(parts[2]) / 100, 0, 1)
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
        const m = l - c / 2
        const seg = Math.floor(h * 6) % 6
        const rgb: Vec3 =
            seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x]
            : seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x]
        return [rgb[0] + m, rgb[1] + m, rgb[2] + m]
    }

    return [
        clamp(parseFloat(parts[0]), 0, 255) / 255,
        clamp(parseFloat(parts[1]), 0, 255) / 255,
        clamp(parseFloat(parts[2]), 0, 255) / 255,
    ]
}

/* ------------------------------------------------------------ mat4 (GL) --- */
/* Column-major, the order WebGL wants, so nothing is transposed on upload.   */

function mat4Identity(): Float32Array {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
}

function mat4Multiply(a: Float32Array, b: Float32Array, out: Float32Array): Float32Array {
    for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3]
        out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
    }
    return out
}

function mat4Perspective(fovDeg: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 360)
    const m = new Float32Array(16)
    m[0] = f / aspect
    m[5] = f
    m[10] = (far + near) / (near - far)
    m[11] = -1
    m[14] = (2 * far * near) / (near - far)
    return m
}

/**
 * three's Matrix4.lookAt basis, inverted into a view matrix. Forward is -Z, so
 * `z = normalize(eye - target)` exactly as three writes it, degenerate-up
 * nudge included — an icosahedron vertex is never straight up, but the Radius
 * control does not promise that forever.
 */
function lookAtBasis(eye: Vec3, target: Vec3, up: Vec3): { x: Vec3; y: Vec3; z: Vec3 } {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2]
    let len = Math.hypot(zx, zy, zz)
    if (len === 0) { zz = 1; len = 1 }
    zx /= len; zy /= len; zz /= len

    let xx = up[1] * zz - up[2] * zy
    let xy = up[2] * zx - up[0] * zz
    let xz = up[0] * zy - up[1] * zx
    if (xx * xx + xy * xy + xz * xz === 0) {
        if (Math.abs(up[2]) === 1) zx += 0.0001
        else zz += 0.0001
        const l = Math.hypot(zx, zy, zz)
        zx /= l; zy /= l; zz /= l
        xx = up[1] * zz - up[2] * zy
        xy = up[2] * zx - up[0] * zz
        xz = up[0] * zy - up[1] * zx
    }
    const xl = Math.hypot(xx, xy, xz) || 1
    xx /= xl; xy /= xl; xz /= xl

    return {
        x: [xx, xy, xz],
        y: [zy * xz - zz * xy, zz * xx - zx * xz, zx * xy - zy * xx],
        z: [zx, zy, zz],
    }
}

function mat4View(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
    const b = lookAtBasis(eye, target, up)
    const m = new Float32Array(16)
    m[0] = b.x[0]; m[4] = b.x[1]; m[8] = b.x[2]
    m[1] = b.y[0]; m[5] = b.y[1]; m[9] = b.y[2]
    m[2] = b.z[0]; m[6] = b.z[1]; m[10] = b.z[2]
    m[12] = -(b.x[0] * eye[0] + b.x[1] * eye[1] + b.x[2] * eye[2])
    m[13] = -(b.y[0] * eye[0] + b.y[1] * eye[1] + b.y[2] * eye[2])
    m[14] = -(b.z[0] * eye[0] + b.z[1] * eye[1] + b.z[2] * eye[2])
    m[15] = 1
    return m
}

/** Object3D.lookAt for a non-camera: three flips the arguments, so the object's
 *  +Z ends up pointing AT the target rather than away from it. */
function mat4FaceTarget(position: Vec3, target: Vec3, sx: number, sy: number): Float32Array {
    const b = lookAtBasis(target, position, [0, 1, 0])
    const m = new Float32Array(16)
    m[0] = b.x[0] * sx; m[1] = b.x[1] * sx; m[2] = b.x[2] * sx
    m[4] = b.y[0] * sy; m[5] = b.y[1] * sy; m[6] = b.y[2] * sy
    m[8] = b.z[0]; m[9] = b.z[1]; m[10] = b.z[2]
    m[12] = position[0]; m[13] = position[1]; m[14] = position[2]
    m[15] = 1
    return m
}

function mat4FromQuat(x: number, y: number, z: number, w: number): Float32Array {
    const m = new Float32Array(16)
    const x2 = x + x, y2 = y + y, z2 = z + z
    const xx = x * x2, xy = x * y2, xz = x * z2
    const yy = y * y2, yz = y * z2, zz = z * z2
    const wx = w * x2, wy = w * y2, wz = w * z2
    m[0] = 1 - (yy + zz); m[1] = xy + wz; m[2] = xz - wy
    m[4] = xy - wz; m[5] = 1 - (xx + zz); m[6] = yz + wx
    m[8] = xz + wy; m[9] = yz - wx; m[10] = 1 - (xx + yy)
    m[15] = 1
    return m
}

/* ------------------------------------------------------------ quaternion --- */

type Quat = { x: number; y: number; z: number; w: number }

function quatFromEulerXYZ(ex: number, ey: number, ez: number, out: Quat): Quat {
    const c1 = Math.cos(ex / 2), c2 = Math.cos(ey / 2), c3 = Math.cos(ez / 2)
    const s1 = Math.sin(ex / 2), s2 = Math.sin(ey / 2), s3 = Math.sin(ez / 2)
    out.x = s1 * c2 * c3 + c1 * s2 * s3
    out.y = c1 * s2 * c3 - s1 * c2 * s3
    out.z = c1 * c2 * s3 + s1 * s2 * c3
    out.w = c1 * c2 * c3 - s1 * s2 * s3
    return out
}

/** three's Quaternion.slerp, shortest arc, with the linear fallback near 1. */
function quatSlerp(q: Quat, target: Quat, t: number): void {
    if (t === 0) return
    if (t === 1) { q.x = target.x; q.y = target.y; q.z = target.z; q.w = target.w; return }

    const { x, y, z, w } = q
    let cosHalf = w * target.w + x * target.x + y * target.y + z * target.z
    let tx = target.x, ty = target.y, tz = target.z, tw = target.w
    if (cosHalf < 0) { cosHalf = -cosHalf; tx = -tx; ty = -ty; tz = -tz; tw = -tw }

    if (cosHalf >= 1) return

    const sqrSin = 1 - cosHalf * cosHalf
    if (sqrSin <= Number.EPSILON) {
        const s = 1 - t
        q.w = s * w + t * tw
        q.x = s * x + t * tx
        q.y = s * y + t * ty
        q.z = s * z + t * tz
        const len = Math.hypot(q.x, q.y, q.z, q.w) || 1
        q.x /= len; q.y /= len; q.z /= len; q.w /= len
        return
    }

    const sinHalf = Math.sqrt(sqrSin)
    const half = Math.atan2(sinHalf, cosHalf)
    const ratioA = Math.sin((1 - t) * half) / sinHalf
    const ratioB = Math.sin(t * half) / sinHalf
    q.w = w * ratioA + tw * ratioB
    q.x = x * ratioA + tx * ratioB
    q.y = y * ratioA + ty * ratioB
    q.z = z * ratioA + tz * ratioB
}

/* -------------------------------------------------------------- geometry --- */

interface Geometry {
    position: Float32Array
    normal: Float32Array
    uv: Float32Array
    count: number
}

/**
 * three's BoxBufferGeometry at 1x1x1, one segment per side, expanded to 36
 * non-indexed vertices. Built at unit size and scaled per instance in the
 * vertex shader — the per-face UV direction is what steers the thin film ramp,
 * so buildPlane's `udir`/`vdir` signs are reproduced rather than guessed.
 */
function buildUnitBox(): Geometry {
    const position: number[] = []
    const normal: number[] = []
    const uv: number[] = []

    const plane = (u: number, v: number, w: number, udir: number, vdir: number, depth: number) => {
        const corners: { p: Vec3; uv: [number, number] }[] = []
        for (let iy = 0; iy < 2; iy++) {
            for (let ix = 0; ix < 2; ix++) {
                const p: Vec3 = [0, 0, 0]
                p[u] = (ix - 0.5) * udir
                p[v] = (iy - 0.5) * vdir
                p[w] = depth / 2
                corners.push({ p, uv: [ix, 1 - iy] })
            }
        }
        const n: Vec3 = [0, 0, 0]
        n[w] = depth > 0 ? 1 : -1
        // buildPlane's index order: (a, b, d) then (b, c, d).
        for (const i of [0, 2, 1, 2, 3, 1]) {
            position.push(corners[i].p[0], corners[i].p[1], corners[i].p[2])
            normal.push(n[0], n[1], n[2])
            uv.push(corners[i].uv[0], corners[i].uv[1])
        }
    }

    plane(2, 1, 0, -1, -1, 1)  // +X
    plane(2, 1, 0, 1, -1, -1)  // -X
    plane(0, 2, 1, 1, 1, 1)    // +Y
    plane(0, 2, 1, 1, -1, -1)  // -Y
    plane(0, 1, 2, 1, -1, 1)   // +Z
    plane(0, 1, 2, -1, -1, -1) // -Z

    return {
        position: new Float32Array(position),
        normal: new Float32Array(normal),
        uv: new Float32Array(uv),
        count: position.length / 3,
    }
}

/**
 * three's PolyhedronBufferGeometry over the octahedron. Above detail 0 three
 * takes the smooth branch — normals are the normalized position, not per-face —
 * so this shell reads as a sphere and not as eight plates.
 */
function buildOctahedron(radius: number, detail: number): Geometry {
    const base: Vec3[] = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ]
    const faces = [
        [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
        [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2],
    ]

    const position: number[] = []
    const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ]

    for (const f of faces) {
        const a = base[f[0]], b = base[f[1]], c = base[f[2]]
        const cols = detail + 1
        const grid: Vec3[][] = []
        for (let i = 0; i <= cols; i++) {
            grid[i] = []
            const aj = lerp(a, c, i / cols)
            const bj = lerp(b, c, i / cols)
            const rows = cols - i
            for (let j = 0; j <= rows; j++) {
                grid[i][j] = rows === 0 ? aj : lerp(aj, bj, j / rows)
            }
        }
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < 2 * (cols - i) - 1; j++) {
                const k = Math.floor(j / 2)
                const tri = j % 2 === 0
                    ? [grid[i][k + 1], grid[i + 1][k], grid[i][k]]
                    : [grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]]
                for (const p of tri) position.push(p[0], p[1], p[2])
            }
        }
    }

    const pos = new Float32Array(position.length)
    const nrm = new Float32Array(position.length)
    for (let i = 0; i < position.length; i += 3) {
        const l = Math.hypot(position[i], position[i + 1], position[i + 2]) || 1
        nrm[i] = position[i] / l
        nrm[i + 1] = position[i + 1] / l
        nrm[i + 2] = position[i + 2] / l
        pos[i] = nrm[i] * radius
        pos[i + 1] = nrm[i + 1] * radius
        pos[i + 2] = nrm[i + 2] * radius
    }

    return { position: pos, normal: nrm, uv: new Float32Array(0), count: pos.length / 3 }
}

/* ------------------------------------------------------------- thin film --- */

/**
 * ThinFilmFresnelMap by David Lenaerts, ported from the demo's own copy with
 * the three types swapped out for plain numbers. A 128x1 RGBA LUT of the
 * reflectance of a film over a base, integrated across 64 spectral bands and
 * projected through the CIE 1931 curve fits.
 *
 * Two details that are easy to lose and change the colours if lost: the output
 * is stored gamma-approximated (sqrt), and the film index enters as
 * `refrRatioSqr` so a thickness dial moves the bands without touching either
 * index. `refractiveIndexFilm` 2 and `refractiveIndexBase` 3 are the demo's
 * defaults and are frozen here (rule 11b) — thickness alone spans the palette.
 */
function buildThinFilmLUT(filmThickness: number, size = 128): Uint8Array {
    const nFilm = 2
    const nBase = 3
    const data = new Uint8Array(size * 4)

    const xFit = (l: number) => {
        const t1 = (l - 442.0) * (l < 442.0 ? 0.0624 : 0.0374)
        const t2 = (l - 599.8) * (l < 599.8 ? 0.0264 : 0.0323)
        const t3 = (l - 501.1) * (l < 501.1 ? 0.049 : 0.0382)
        return 0.362 * Math.exp(-0.5 * t1 * t1) + 1.056 * Math.exp(-0.5 * t2 * t2) - 0.065 * Math.exp(-0.5 * t3 * t3)
    }
    const yFit = (l: number) => {
        const t1 = (l - 568.8) * (l < 568.8 ? 0.0213 : 0.0247)
        const t2 = (l - 530.9) * (l < 530.9 ? 0.0613 : 0.0322)
        return 0.821 * Math.exp(-0.5 * t1 * t1) + 0.286 * Math.exp(-0.5 * t2 * t2)
    }
    const zFit = (l: number) => {
        const t1 = (l - 437.0) * (l < 437.0 ? 0.0845 : 0.0278)
        const t2 = (l - 459.0) * (l < 459.0 ? 0.0385 : 0.0725)
        return 1.217 * Math.exp(-0.5 * t1 * t1) + 0.681 * Math.exp(-0.5 * t2 * t2)
    }

    // Amplitudinal reflectance and phase shift for p and s polarisation.
    const fresnel = (n1: number, n2: number, cos1: number, cos2: number, R: number[], phi: number[]) => {
        const sin1Sqr = 1.0 - cos1 * cos1
        const ratio = n1 / n2
        if (ratio * ratio * sin1Sqr > 1.0) {
            R[0] = 1.0
            R[1] = 1.0
            const sqrRatio = ratio * ratio
            phi[0] = 2.0 * Math.atan((-sqrRatio * Math.sqrt(sin1Sqr - 1.0 / sqrRatio)) / cos1)
            phi[1] = 2.0 * Math.atan(-Math.sqrt(sin1Sqr - 1.0 / sqrRatio) / cos1)
        } else {
            const rp = (n2 * cos1 - n1 * cos2) / (n2 * cos1 + n1 * cos2)
            const rs = (n1 * cos1 - n2 * cos2) / (n1 * cos1 + n2 * cos2)
            phi[0] = rp < 0.0 ? Math.PI : 0.0
            phi[1] = rs < 0.0 ? Math.PI : 0.0
            R[0] = rp * rp
            R[1] = rs * rs
        }
    }

    const R12 = [0, 0], phi12 = [0, 0], R23 = [0, 0], phi23 = [0, 0]
    const refrRatioSqr = 1.0 / (nFilm * nFilm)
    const refrRatioSqrBase = (nFilm * nFilm) / (nBase * nBase)
    const numBands = 64
    const waveLenRange = 780 - 380

    for (let i = 0; i < size; ++i) {
        const cosThetaI = i / size
        const cosThetaT = Math.sqrt(1 - refrRatioSqr * (1.0 - cosThetaI * cosThetaI))
        const cosThetaT2 = Math.sqrt(1 - refrRatioSqrBase * (1.0 - cosThetaT * cosThetaT))
        const pathDiff2PI = 2.0 * Math.PI * (2.0 * nFilm * filmThickness * cosThetaT)

        fresnel(1.0, nFilm, cosThetaI, cosThetaT, R12, phi12)
        const T12 = [1.0 - R12[0], 1.0 - R12[1]]
        const phi21 = [Math.PI - phi12[0], Math.PI - phi12[1]]

        fresnel(nFilm, nBase, cosThetaT, cosThetaT2, R23, phi23)
        const Rbi = [Math.sqrt(R23[0] * R12[0]), Math.sqrt(R23[1] * R12[1])]
        const Ttot = [Math.sqrt(T12[0] * T12[0]), Math.sqrt(T12[1] * T12[1])]
        const Rstar = [
            (T12[0] * T12[0] * R23[0]) / (1.0 - R23[0] * R12[0]),
            (T12[1] * T12[1] * R23[1]) / (1.0 - R23[1] * R12[1]),
        ]
        const RbiSqr = [Rbi[0] * Rbi[0], Rbi[1] * Rbi[1]]
        const R12Star = [R12[0] + Rstar[0], R12[1] + Rstar[1]]
        const RstarTtot = [Rstar[0] - Ttot[0], Rstar[1] - Ttot[1]]

        let x = 0, y = 0, z = 0, totX = 0, totY = 0, totZ = 0
        for (let j = 0; j < numBands; ++j) {
            const waveLen = 380 + (j / (numBands - 1)) * waveLenRange
            const deltaPhase = pathDiff2PI / waveLen
            const cosPhiX = Math.cos(deltaPhase + phi23[0] + phi21[0])
            const cosPhiY = Math.cos(deltaPhase + phi23[1] + phi21[1])
            const valX = R12Star[0] + ((2.0 * (Rbi[0] * cosPhiX - RbiSqr[0])) / (1.0 - 2 * Rbi[0] * cosPhiX + RbiSqr[0])) * RstarTtot[0]
            const valY = R12Star[1] + ((2.0 * (Rbi[1] * cosPhiY - RbiSqr[1])) / (1.0 - 2 * Rbi[1] * cosPhiY + RbiSqr[1])) * RstarTtot[1]
            const v = 0.5 * (valX + valY)
            const wx = xFit(waveLen), wy = yFit(waveLen), wz = zFit(waveLen)
            totX += wx; totY += wy; totZ += wz
            x += wx * v; y += wy * v; z += wz * v
        }
        x /= totX; y /= totY; z /= totZ

        const r = Math.sqrt(clamp(3.2406 * x - 1.5372 * y - 0.4986 * z, 0, 1))
        const g = Math.sqrt(clamp(-0.9689 * x + 1.8758 * y + 0.0415 * z, 0, 1))
        const b = Math.sqrt(clamp(0.0557 * x - 0.204 * y + 1.057 * z, 0, 1))

        const k = i << 2
        data[k] = Math.floor(r * 0xff)
        data[k + 1] = Math.floor(g * 0xff)
        data[k + 2] = Math.floor(b * 0xff)
        data[k + 3] = 0xff
    }

    return data
}

/**
 * three's Texture.flipY defaults to TRUE, so an image uploaded through three has
 * its first row at v = 1. The table here is stored top-down out of the canvas,
 * and UNPACK_FLIP_Y_WEBGL does nothing for a typed-array upload, so the rows are
 * reversed here instead. Getting this wrong flips the matcap's light source
 * top-for-bottom and it is not obvious from a still.
 */
function decodeMatcap(): Uint8Array {
    const bin = atob(MATCAP_B64)
    const out = new Uint8Array(bin.length)
    for (let row = 0; row < MATCAP_N; row++) {
        const src = (MATCAP_N - 1 - row) * MATCAP_N
        for (let x = 0; x < MATCAP_N; x++) out[row * MATCAP_N + x] = bin.charCodeAt(src + x)
    }
    return out
}

/* --------------------------------------------------------------- shaders --- */

/**
 * r119's ACES (the full matrix version with the subjective 1/0.6 lift, not the
 * Narkowicz curve) followed by the sRGB encode, because r3f v5's Canvas set
 * toneMapping and outputEncoding and every material in the scene went through
 * both. Leaving them off renders the whole thing about 2.2x too dark.
 */
const COLOR_TAIL = /* glsl */ `
vec3 acesFilmic(vec3 color) {
    const mat3 ACESInputMat = mat3(
        vec3(0.59719, 0.07600, 0.02840),
        vec3(0.35458, 0.90834, 0.13383),
        vec3(0.04823, 0.01566, 0.83777));
    const mat3 ACESOutputMat = mat3(
        vec3( 1.60475, -0.10208, -0.00327),
        vec3(-0.53108,  1.10813, -0.07276),
        vec3(-0.07367, -0.00605,  1.07602));
    color *= 1.0 / 0.6;
    color = ACESInputMat * color;
    vec3 a = color * (color + 0.0245786) - 0.000090537;
    vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
    color = ACESOutputMat * (a / b);
    return clamp(color, 0.0, 1.0);
}

vec3 sRGBToLinear(vec3 v) {
    return mix(pow((v + 0.055) / 1.055, vec3(2.4)), v / 12.92, vec3(lessThanEqual(v, vec3(0.04045))));
}

vec3 linearToSRGB(vec3 v) {
    return mix(pow(v, vec3(0.41666)) * 1.055 - 0.055, v * 12.92, vec3(lessThanEqual(v, vec3(0.0031308))));
}
`

const SLAB_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec3 iPos;
layout(location = 4) in vec3 iSize;
layout(location = 5) in vec3 iRot;

uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uPhase;
uniform float uSize;

out vec2 vUv;
out vec3 vReflect;
out float vMirror;

// three's Matrix4.makeRotationFromEuler, order XYZ: R = Rx * Ry * Rz.
mat3 eulerXYZ(vec3 e) {
    float a = cos(e.x), b = sin(e.x);
    float c = cos(e.y), d = sin(e.y);
    float g = cos(e.z), f = sin(e.z);
    float ae = a * g, af = a * f, be = b * g, bf = b * f;
    return mat3(
        vec3(c * g,        af + be * d,  bf - ae * d),
        vec3(-c * f,       ae - bf * d,  be + af * d),
        vec3(d,           -b * c,        a * c));
}

void main() {
    // The reference adds a fixed increment per FRAME; uPhase is that frame
    // count made continuous, so the spin does not double on a 120Hz display.
    mat3 R = eulerXYZ(vec3(iRot.x, iRot.y + uPhase * 0.001, iRot.z + uPhase * 0.01));
    // Uniform, so the slab keeps its proportions and the 0.05 edge stays a
    // proportional band rather than turning into a plank at 300%. A uniform
    // scale also leaves the axis-aligned face normals alone.
    vec3 world = R * (aPos * iSize * uSize) + iPos;

    // Axis-aligned face normals under a diagonal scale: the inverse-transpose
    // reduces to R * n once renormalized, so the 0.05-thick slabs are safe.
    vec3 n = normalize(R * aNormal);

    vUv = aUv;
    vMirror = step(0.5, abs(aNormal.z));

    // Lambert with no bump or normal map takes three's PER-VERTEX reflect
    // path. On slabs this size the varying is visibly not the per-fragment
    // answer, and the reference's look depends on that.
    vReflect = reflect(normalize(world - uCamPos), n);

    gl_Position = uViewProj * vec4(world, 1.0);
}
`

const SLAB_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vReflect;
in float vMirror;

uniform sampler2D uFilm;
uniform samplerCube uEnv;
uniform vec3 uSideColor;
uniform vec3 uMirrorColor;
uniform float uAmbient;
uniform float uSkipMirror;
uniform float uEncode;

out vec4 fragColor;
${COLOR_TAIL}
void main() {
    // In the cube pass the mirror faces would sample the cube map they are
    // being drawn into. Chrome refuses that draw outright, so the reference
    // never renders them there either.
    if (vMirror > 0.5 && uSkipMirror > 0.5) discard;

    // The LUT is 128x1 and is sampled by UV, not by dot(N,V) — the map is a
    // ramp across the face in the original, and that is the look.
    vec3 film = texture(uFilm, vec2(vUv.x, 0.5)).rgb;

    // Ambient only. three folds irradiance * PI against BRDF_Lambert's 1/PI,
    // so the whole diffuse term is exactly colour * film * intensity.
    vec3 outgoing = mix(uSideColor, uMirrorColor, vMirror) * film * uAmbient;

    if (vMirror > 0.5) {
        // ENVMAP_BLENDING_MULTIPLY at reflectivity 1, and flipEnvMap is -1 for
        // any CubeTexture — a cube render target's texture included.
        outgoing *= sRGBToLinear(texture(uEnv, vec3(-vReflect.x, vReflect.y, vReflect.z)).rgb);
    }

    vec3 graded = acesFilmic(outgoing);
    fragColor = vec4(uEncode > 0.5 ? linearToSRGB(graded) : graded, 1.0);
}
`

const SHELL_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;

uniform mat4 uView;
uniform mat4 uProj;
uniform vec3 uOffset;

out vec3 vViewPos;
out vec3 vNormal;

void main() {
    vec4 mv = uView * vec4(aPos + uOffset, 1.0);
    vViewPos = -mv.xyz;
    // The view matrix is a pure rotate-translate, so its upper 3x3 is already
    // the normal matrix.
    vNormal = mat3(uView) * aNormal;
    gl_Position = uProj * mv;
}
`

const SHELL_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 vViewPos;
in vec3 vNormal;

uniform sampler2D uMatcap;
uniform vec3 uTint;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEncode;

out vec4 fragColor;
${COLOR_TAIL}
void main() {
    // BackSide, so FLIP_SIDED: the camera is inside a radius-20 shell and is
    // looking at the far wall from within.
    vec3 n = -normalize(vNormal);

    vec3 viewDir = normalize(vViewPos);
    vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
    vec3 y = cross(viewDir, x);
    vec2 uv = vec2(dot(x, n), dot(y, n)) * 0.495 + 0.5;

    // Stored as luminance; the matcap's own chroma comes back as one multiply.
    // Sampled unconverted, matching TextureLoader's LinearEncoding default.
    vec3 matcap = texture(uMatcap, uv).r * uTint;

    vec3 graded = acesFilmic(uColor * matcap);
    fragColor = vec4(uEncode > 0.5 ? linearToSRGB(graded) : graded, uOpacity);
}
`

const TEXT_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aUv;
layout(location = 2) in mat4 iModel;

uniform mat4 uViewProj;

out vec2 vUv;

void main() {
    vUv = aUv;
    gl_Position = uViewProj * iModel * vec4(aPos, 0.0, 1.0);
}
`

const TEXT_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uText;
uniform vec3 uColor;
uniform float uEncode;

out vec4 fragColor;
${COLOR_TAIL}
void main() {
    // material-toneMapped is false on the title in the reference, so the text
    // takes the sRGB encode and skips ACES. At #FFFFFF that is the identity,
    // which is exactly why the word stays pure white against a graded scene.
    fragColor = vec4(uEncode > 0.5 ? linearToSRGB(uColor) : uColor, texture(uText, vUv).a);
}
`

/* ------------------------------------------------------------- component --- */

/**
 * `depthTest={false}` in the reference lands on the MESH, not on its material —
 * r3f v5 assigns an unprefixed prop straight onto the instance, and troika's
 * TextMesh has no such property, so the flag is inert and the word depth-tests
 * like everything else. It sits at z = -10, behind every slab, and is only
 * unoccluded because nothing happens to cross it.
 */
const TEXT_DEPTH_TEST = true

interface TextState {
    canvas: HTMLCanvasElement | null
    worldW: number
    worldH: number
    dirty: boolean
}

export default function MirrorShards(props: MirrorShardsProps) {
    const { label = "BREAK", font, background = "#000000", style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed every render so the loop reads live props without the effect
    // depending on them and tearing the context down.
    const propsRef = useRef(props)
    propsRef.current = props

    const pointerRef = useRef({ ndcX: 0, ndcY: 0 })
    const textRef = useRef<TextState>({ canvas: null, worldW: 1, worldH: 1, dirty: false })

    // Extracted primitives, never the font object: Framer hands back a fresh
    // object every render, and the effect would rebuild on every prop change.
    const fontFamily = font?.fontFamily ?? "Syncopate, Inter, system-ui, sans-serif"
    const fontWeight = String(font?.fontWeight ?? 700)
    const fontStyle = font?.fontStyle ?? "normal"
    const fontSizePx = num(font?.fontSize, 50)
    const letterSpacing =
        font?.letterSpacing == null
            ? "0px"
            : typeof font.letterSpacing === "number"
              ? `${font.letterSpacing}px`
              : String(font.letterSpacing)

    useEffect(() => {
        const state = textRef.current
        if (!state.canvas) state.canvas = document.createElement("canvas")
        const canvas = state.canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        const text = label && label.length > 0 ? label : " "
        const fontString = `${fontStyle} ${fontWeight} ${TEXT_EM}px ${fontFamily}`

        const draw = () => {
            ctx.font = fontString
            if ("letterSpacing" in spaced) spaced.letterSpacing = letterSpacing
            const measured = ctx.measureText(text).width
            const w = clamp(Math.ceil(measured + TEXT_EM * 0.25), 8, 4096)
            const h = Math.ceil(TEXT_EM * 1.35)

            // Resizing the backing store resets every context property, so the
            // font has to be set again after it, not before.
            canvas.width = w
            canvas.height = h
            ctx.clearRect(0, 0, w, h)
            ctx.font = fontString
            if ("letterSpacing" in spaced) spaced.letterSpacing = letterSpacing
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = "#ffffff"
            ctx.fillText(text, w / 2, h / 2)

            // The Font control's size already carries the type scale (rule 2),
            // so it is what sets the world size — 50px reproduces troika's
            // fontSize 2.5 in the reference.
            const worldEm = Math.max(0.01, fontSizePx) / PX_PER_WORLD_UNIT
            state.worldW = (w / TEXT_EM) * worldEm
            state.worldH = (h / TEXT_EM) * worldEm
            state.dirty = true
        }

        draw()

        // The hidden span is what makes Framer request the face at all; this
        // redraws once it has actually arrived, so the first paint is never
        // stuck on the fallback family.
        let cancelled = false
        const fonts = (document as unknown as {
            fonts?: { load?: (f: string, t?: string) => Promise<unknown> }
        }).fonts
        if (fonts && fonts.load) {
            fonts.load(fontString, text).then(() => { if (!cancelled) draw() }).catch(() => {})
        }
        return () => { cancelled = true }
    }, [label, fontFamily, fontWeight, fontStyle, fontSizePx, letterSpacing])

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const probe = Boolean((window as unknown as { __FRAMER_GL_PROBE__?: boolean }).__FRAMER_GL_PROBE__)
        const gl = canvas.getContext("webgl2", {
            antialias: true,
            alpha: false,
            depth: true,
            preserveDrawingBuffer: probe,
        })
        if (!gl) {
            console.error("MirrorShards: WebGL2 unavailable")
            return
        }

        /* ---- programs ---- */

        const shaders: WebGLShader[] = []
        const programs: WebGLProgram[] = []

        const compile = (type: number, src: string, name: string): WebGLShader | null => {
            const sh = gl.createShader(type)
            if (!sh) return null
            gl.shaderSource(sh, src)
            gl.compileShader(sh)
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error(`MirrorShards ${name}:`, gl.getShaderInfoLog(sh))
                gl.deleteShader(sh)
                return null
            }
            shaders.push(sh)
            return sh
        }

        const link = (vsSrc: string, fsSrc: string, name: string): WebGLProgram | null => {
            const vs = compile(gl.VERTEX_SHADER, vsSrc, `${name} vert`)
            const fs = compile(gl.FRAGMENT_SHADER, fsSrc, `${name} frag`)
            if (!vs || !fs) return null
            const prog = gl.createProgram()
            if (!prog) return null
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.linkProgram(prog)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                console.error(`MirrorShards ${name} link:`, gl.getProgramInfoLog(prog))
                return null
            }
            programs.push(prog)
            return prog
        }

        const slabProg = link(SLAB_VERT, SLAB_FRAG, "slab")
        const shellProg = link(SHELL_VERT, SHELL_FRAG, "shell")
        const textProg = link(TEXT_VERT, TEXT_FRAG, "text")
        if (!slabProg || !shellProg || !textProg) return

        // A typo'd name resolves to null and the draw silently loses that
        // input, so every location is checked once rather than never.
        const uniforms = (prog: WebGLProgram, names: string[], tag: string) => {
            const map: Record<string, WebGLUniformLocation | null> = {}
            for (const n of names) {
                map[n] = gl.getUniformLocation(prog, n)
                if (map[n] === null) console.warn(`MirrorShards: ${tag}.${n} has no location`)
            }
            return map
        }

        const slabU = uniforms(slabProg,
            ["uViewProj", "uCamPos", "uPhase", "uSize", "uFilm", "uEnv", "uSideColor", "uMirrorColor", "uAmbient", "uSkipMirror", "uEncode"], "slab")
        const shellU = uniforms(shellProg,
            ["uView", "uProj", "uOffset", "uMatcap", "uTint", "uColor", "uOpacity", "uEncode"], "shell")
        const textU = uniforms(textProg, ["uViewProj", "uText", "uColor", "uEncode"], "text")

        /* ---- geometry ---- */

        const box = buildUnitBox()
        const shell = buildOctahedron(SHELL_RADIUS, SHELL_DETAIL)

        const buffers: WebGLBuffer[] = []
        const arrayBuffer = (data: Float32Array, usage: number): WebGLBuffer | null => {
            const buf = gl.createBuffer()
            if (!buf) return null
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.bufferData(gl.ARRAY_BUFFER, data, usage)
            buffers.push(buf)
            return buf
        }

        const attrib = (buf: WebGLBuffer, loc: number, size: number, stride = 0, offset = 0, divisor = 0) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf)
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset)
            gl.vertexAttribDivisor(loc, divisor)
        }

        const boxPos = arrayBuffer(box.position, gl.STATIC_DRAW)
        const boxNrm = arrayBuffer(box.normal, gl.STATIC_DRAW)
        const boxUv = arrayBuffer(box.uv, gl.STATIC_DRAW)

        // One interleaved instance record per slab: position, half-extents,
        // starting Euler. The WHOLE table is uploaded once and static — Density
        // is the instance count and Size is a uniform, so neither dial ever
        // rewrites a buffer, let alone rebuilds the context.
        const slabData = new Float32Array(SLAB_TABLE.length * 9)
        SLAB_TABLE.forEach((s, i) => {
            slabData.set(s.position, i * 9)
            slabData.set(s.args, i * 9 + 3)
            slabData.set(s.rotation, i * 9 + 6)
        })
        const slabBuf = arrayBuffer(slabData, gl.STATIC_DRAW)

        const shellPos = arrayBuffer(shell.position, gl.STATIC_DRAW)
        const shellNrm = arrayBuffer(shell.normal, gl.STATIC_DRAW)

        // A unit quad, centred, with v running up so the flipY upload lands the
        // canvas the right way round.
        const quad = new Float32Array([
            -0.5, -0.5, 0, 0, 0.5, -0.5, 1, 0, 0.5, 0.5, 1, 1,
            -0.5, -0.5, 0, 0, 0.5, 0.5, 1, 1, -0.5, 0.5, 0, 1,
        ])
        const quadBuf = arrayBuffer(quad, gl.STATIC_DRAW)

        const titleModel = new Float32Array(16)
        const copyModels = new Float32Array(ICO_DIRS.length * 16)
        const titleBuf = arrayBuffer(titleModel, gl.DYNAMIC_DRAW)
        const copyBuf = arrayBuffer(copyModels, gl.DYNAMIC_DRAW)

        if (!boxPos || !boxNrm || !boxUv || !slabBuf || !shellPos || !shellNrm || !quadBuf || !titleBuf || !copyBuf) return

        const vaos: WebGLVertexArrayObject[] = []
        const makeVao = (): WebGLVertexArrayObject | null => {
            const vao = gl.createVertexArray()
            if (!vao) return null
            gl.bindVertexArray(vao)
            vaos.push(vao)
            return vao
        }

        const slabVao = makeVao()
        if (!slabVao) return
        attrib(boxPos, 0, 3)
        attrib(boxNrm, 1, 3)
        attrib(boxUv, 2, 2)
        attrib(slabBuf, 3, 3, 36, 0, 1)
        attrib(slabBuf, 4, 3, 36, 12, 1)
        attrib(slabBuf, 5, 3, 36, 24, 1)

        const shellVao = makeVao()
        if (!shellVao) return
        attrib(shellPos, 0, 3)
        attrib(shellNrm, 1, 3)

        // A mat4 attribute is four consecutive locations, one per column.
        const textVao = (modelBuf: WebGLBuffer): WebGLVertexArrayObject | null => {
            const vao = makeVao()
            if (!vao) return null
            attrib(quadBuf, 0, 2, 16, 0)
            attrib(quadBuf, 1, 2, 16, 8)
            for (let c = 0; c < 4; c++) attrib(modelBuf, 2 + c, 4, 64, c * 16, 1)
            return vao
        }
        const titleVao = textVao(titleBuf)
        const copyVao = textVao(copyBuf)
        if (!titleVao || !copyVao) return

        gl.bindVertexArray(null)

        /* ---- textures ---- */

        const textures: WebGLTexture[] = []
        const newTexture = (): WebGLTexture | null => {
            const t = gl.createTexture()
            if (t) textures.push(t)
            return t
        }

        const filmTex = newTexture()
        const matcapTex = newTexture()
        const textTex = newTexture()
        const cubeTex = newTexture()
        const dummyCube = newTexture()
        if (!filmTex || !matcapTex || !textTex || !cubeTex || !dummyCube) return

        // RepeatWrapping and LinearFilter, as the reference's DataTexture asks
        // for. No mipmaps: a 128x1 LUT read at v = 0.5 never needs one.
        let filmThicknessBuilt = -1
        const uploadFilm = (thickness: number) => {
            gl.bindTexture(gl.TEXTURE_2D, filmTex)
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildThinFilmLUT(thickness))
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            filmThicknessBuilt = thickness
        }
        uploadFilm(500)

        gl.bindTexture(gl.TEXTURE_2D, matcapTex)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, MATCAP_N, MATCAP_N, 0, gl.RED, gl.UNSIGNED_BYTE, decodeMatcap())
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        gl.bindTexture(gl.TEXTURE_2D, textTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]))
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        const CUBE_FACES = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        ]

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTex)
        for (const face of CUBE_FACES) {
            gl.texImage2D(face, 0, gl.RGBA, CUBE_SIZE, CUBE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        // Bound in place of the real cube map while the real one is the render
        // target. The mirror faces are discarded in that pass, but a feedback
        // loop is decided by BINDINGS, not by which branch the shader takes.
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, dummyCube)
        for (const face of CUBE_FACES) {
            gl.texImage2D(face, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
        }
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        const cubeFbo = gl.createFramebuffer()
        const cubeDepth = gl.createRenderbuffer()
        if (!cubeFbo || !cubeDepth) return
        gl.bindRenderbuffer(gl.RENDERBUFFER, cubeDepth)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, CUBE_SIZE, CUBE_SIZE)
        gl.bindFramebuffer(gl.FRAMEBUFFER, cubeFbo)
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, cubeDepth)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        /* ---- cameras ---- */

        // three's CubeCamera orientations, verbatim. The upside-down `up` on
        // four of the six is what makes the framebuffer's bottom-up rows land
        // as the cube face's top-down texels.
        const CUBE_DIRS: { forward: Vec3; up: Vec3 }[] = [
            { forward: [1, 0, 0], up: [0, -1, 0] },
            { forward: [-1, 0, 0], up: [0, -1, 0] },
            { forward: [0, 1, 0], up: [0, 0, 1] },
            { forward: [0, -1, 0], up: [0, 0, -1] },
            { forward: [0, 0, 1], up: [0, -1, 0] },
            { forward: [0, 0, -1], up: [0, -1, 0] },
        ]
        const cubeViews = CUBE_DIRS.map((d) =>
            mat4View(CUBE_EYE, [CUBE_EYE[0] + d.forward[0], CUBE_EYE[1] + d.forward[1], CUBE_EYE[2] + d.forward[2]], d.up)
        )
        const cubeProj = mat4Perspective(90, 1, 0.1, 100)
        const cubeViewProj = cubeViews.map((v) => mat4Multiply(cubeProj, v, new Float32Array(16)))

        const mainView = new Float32Array(16)
        const mainViewProj = new Float32Array(16)
        const camView = mat4Identity()

        /* ---- loop state ---- */

        let raf = 0
        let last = performance.now()
        let phase = 0
        let width = 1
        let height = 1
        let dpr = 1

        const current: Quat = { x: 0, y: 0, z: 0, w: 1 }
        const targetQuat: Quat = { x: 0, y: 0, z: 0, w: 1 }
        const copyOrder = ICO_DIRS.map((_, i) => i)

        const resize = () => {
            // offsetWidth, not getBoundingClientRect: the rect carries the
            // Framer canvas zoom and the buffer would drift with it.
            const w = Math.max(1, root.offsetWidth)
            const h = Math.max(1, root.offsetHeight)
            dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bw = Math.round(w * dpr)
            const bh = Math.round(h * dpr)
            if (bw !== canvas.width || bh !== canvas.height) {
                canvas.width = bw
                canvas.height = bh
            }
            width = bw
            height = bh
        }
        resize()

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(root)

        const drawSlabs = (viewProj: Float32Array, camPos: Vec3, skipMirror: boolean, count: number, side: Vec3, size: number, encode: boolean) => {
            gl.useProgram(slabProg)
            gl.bindVertexArray(slabVao)
            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.depthMask(true)
            gl.disable(gl.BLEND)
            gl.enable(gl.CULL_FACE)
            gl.cullFace(gl.BACK)

            gl.uniformMatrix4fv(slabU.uViewProj, false, viewProj)
            gl.uniform3f(slabU.uCamPos, camPos[0], camPos[1], camPos[2])
            gl.uniform1f(slabU.uPhase, phase)
            gl.uniform1f(slabU.uSize, size)
            gl.uniform3f(slabU.uSideColor, side[0], side[1], side[2])
            // reflectionMaterial is #FFFFFF in the reference and is not a dial:
            // the mirror face's colour is whatever it reflects.
            gl.uniform3f(slabU.uMirrorColor, 1, 1, 1)
            gl.uniform1f(slabU.uAmbient, AMBIENT)
            gl.uniform1f(slabU.uSkipMirror, skipMirror ? 1 : 0)
            gl.uniform1f(slabU.uEncode, encode ? 1 : 0)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, filmTex)
            gl.uniform1i(slabU.uFilm, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, skipMirror ? dummyCube : cubeTex)
            gl.uniform1i(slabU.uEnv, 1)

            gl.drawArraysInstanced(gl.TRIANGLES, 0, box.count, count)
        }

        const drawShell = (view: Float32Array, proj: Float32Array, color: Vec3, opacity: number, encode: boolean) => {
            gl.useProgram(shellProg)
            gl.bindVertexArray(shellVao)
            gl.enable(gl.DEPTH_TEST)
            gl.depthMask(true)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.enable(gl.CULL_FACE)
            // BackSide: the shell is a room, seen from inside.
            gl.cullFace(gl.FRONT)

            gl.uniformMatrix4fv(shellU.uView, false, view)
            gl.uniformMatrix4fv(shellU.uProj, false, proj)
            gl.uniform3f(shellU.uOffset, 0, 0, SHELL_Z)
            gl.uniform3f(shellU.uTint, MATCAP_TINT[0], MATCAP_TINT[1], MATCAP_TINT[2])
            gl.uniform3f(shellU.uColor, color[0], color[1], color[2])
            gl.uniform1f(shellU.uOpacity, opacity)
            gl.uniform1f(shellU.uEncode, encode ? 1 : 0)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, matcapTex)
            gl.uniform1i(shellU.uMatcap, 0)

            gl.drawArrays(gl.TRIANGLES, 0, shell.count)
        }

        const drawText = (viewProj: Float32Array, vao: WebGLVertexArrayObject, count: number, color: Vec3, encode: boolean) => {
            if (count <= 0) return
            gl.useProgram(textProg)
            gl.bindVertexArray(vao)
            if (TEXT_DEPTH_TEST) gl.enable(gl.DEPTH_TEST)
            else gl.disable(gl.DEPTH_TEST)
            gl.depthMask(true)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            // troika's default material is DoubleSide, which is why a copy on
            // the far side of the icosahedron is still in the reflection.
            gl.disable(gl.CULL_FACE)

            gl.uniformMatrix4fv(textU.uViewProj, false, viewProj)
            gl.uniform3f(textU.uColor, color[0], color[1], color[2])
            gl.uniform1f(textU.uEncode, encode ? 1 : 0)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, textTex)
            gl.uniform1i(textU.uText, 0)

            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count)
        }

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            const p = propsRef.current
            const dt = clamp((now - last) / 1000, 0, 0.1)
            last = now

            const mirrorsGroup = p.mirrors ?? {}
            const copiesGroup = p.copies ?? {}
            const shellGroup = p.shell ?? {}

            const speed = clamp(num(p.speed, 100), 0, 100) / 50
            // 2000pi is the shortest wrap that is a whole number of turns for
            // BOTH the 0.001 and the 0.01 term, so the reset is invisible and
            // the phase never grows large enough to cost float precision.
            phase = (phase + dt * 60 * speed) % (2000 * Math.PI)

            const thickness = Math.round(clamp(num(mirrorsGroup.film, 1000), 100, 1000))
            if (thickness !== filmThicknessBuilt) uploadFilm(thickness)

            const textState = textRef.current
            if (textState.dirty && textState.canvas && textState.canvas.width > 0) {
                gl.bindTexture(gl.TEXTURE_2D, textTex)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textState.canvas)
                gl.generateMipmap(gl.TEXTURE_2D)
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
                textState.dirty = false
            }

            const aspect = width / Math.max(1, height)
            const distance = clamp(num(p.distance, 2), 2, 20)

            // r3f's viewport: the world size of the frame at the camera's own
            // distance. The reference divides by 100, which is what keeps the
            // tilt down to a few degrees.
            const viewportH = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * distance
            const viewportW = viewportH * aspect
            const hover = clamp(num(p.hover, 200), 0, 200) / 100
            const pointer = pointerRef.current
            quatFromEulerXYZ(
                (pointer.ndcY * viewportH) / 100 * hover,
                (pointer.ndcX * viewportW) / 100 * hover,
                0,
                targetQuat
            )
            // The reference slerps 0.1 per frame; this is the same curve read
            // off a clock instead of off a frame counter.
            quatSlerp(current, targetQuat, 1 - Math.pow(1 - SLERP, dt * 60))

            const groupRot = mat4FromQuat(current.x, current.y, current.z, current.w)
            camView[12] = 0
            camView[13] = 0
            camView[14] = -distance
            mat4Multiply(camView, groupRot, mainView)
            mat4Multiply(mat4Perspective(CAMERA_FOV, aspect, 0.1, 1000), mainView, mainViewProj)

            // The camera lives outside the tilt group, so in the group's own
            // frame it is the INVERSE rotation applied to (0, 0, distance).
            const camLocal: Vec3 = [groupRot[2] * distance, groupRot[6] * distance, groupRot[10] * distance]

            const bg = parseColor(p.background, [0, 0, 0])
            const sideColor = parseColor(mirrorsGroup.color, [1, 1, 1])
            const textColor = parseColor(p.textColor, [1, 1, 1])
            const shellColor = parseColor(shellGroup.color, [1, 1, 1])
            const shellOpacity = clamp(num(shellGroup.opacity, 100), 0, 100) / 100
            const slabCount = Math.round(clamp(num(mirrorsGroup.count, 40), 1, SLAB_TABLE.length))
            const slabSize = clamp(num(mirrorsGroup.size, 100), 25, 300) / 100
            const copyCount = Math.round(clamp(num(copiesGroup.count, 12), 0, ICO_DIRS.length))
            const copyRadius = clamp(num(copiesGroup.radius, 14), 2, 14)

            /* -- the word, and its copies -- */

            titleModel.set(mat4FaceTarget([0, 0, TITLE_Z], [0, 0, 0], textState.worldW, textState.worldH))
            gl.bindBuffer(gl.ARRAY_BUFFER, titleBuf)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, titleModel)

            const positions: Vec3[] = ICO_DIRS.map((d) => {
                const l = Math.hypot(d[0], d[1], d[2]) || 1
                return [(d[0] / l) * copyRadius, (d[1] / l) * copyRadius, (d[2] / l) * copyRadius]
            })
            // Back-to-front, as three sorts its transparent pass — the copies
            // are alpha-blended and their overlaps are order-dependent.
            copyOrder.sort((a, b) => {
                const da = Math.hypot(positions[b][0] - CUBE_EYE[0], positions[b][1] - CUBE_EYE[1], positions[b][2] - CUBE_EYE[2])
                const db = Math.hypot(positions[a][0] - CUBE_EYE[0], positions[a][1] - CUBE_EYE[1], positions[a][2] - CUBE_EYE[2])
                return da - db
            })
            for (let i = 0; i < copyCount; i++) {
                copyModels.set(
                    mat4FaceTarget(positions[copyOrder[i]], [0, 0, 0], textState.worldW, textState.worldH),
                    i * 16
                )
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, copyBuf)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, copyModels)

            /* -- the cube pass: layer 11 only -- */

            gl.bindFramebuffer(gl.FRAMEBUFFER, cubeFbo)
            gl.viewport(0, 0, CUBE_SIZE, CUBE_SIZE)
            for (let f = 0; f < 6; f++) {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, CUBE_FACES[f], cubeTex, 0)
                gl.clearColor(bg[0], bg[1], bg[2], 1)
                gl.depthMask(true)
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
                drawSlabs(cubeViewProj[f], CUBE_EYE, true, slabCount, sideColor, slabSize, false)
                drawShell(cubeViews[f], cubeProj, shellColor, shellOpacity, false)
                drawText(cubeViewProj[f], copyVao, copyCount, textColor, false)
            }
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTex)
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP)

            /* -- the main pass: layer 0 only -- */

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, width, height)
            gl.clearColor(bg[0], bg[1], bg[2], 1)
            gl.depthMask(true)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
            drawSlabs(mainViewProj, camLocal, false, slabCount, sideColor, slabSize, true)
            drawText(mainViewProj, titleVao, 1, textColor, true)
        }

        const onMove = (event: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            // The rect only turns a viewport coordinate into a fraction of the
            // host here, which is scale-invariant.
            const pointer = pointerRef.current
            pointer.ndcX = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1
            pointer.ndcY = -(clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1)
        }
        const onLeave = () => {
            // r3f's mouse starts at (0, 0) and the group is upright there.
            pointerRef.current.ndcX = 0
            pointerRef.current.ndcY = 0
        }

        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)
        window.addEventListener("blur", onLeave)

        raf = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("blur", onLeave)
            for (const v of vaos) gl.deleteVertexArray(v)
            for (const b of buffers) gl.deleteBuffer(b)
            for (const t of textures) gl.deleteTexture(t)
            for (const pr of programs) gl.deleteProgram(pr)
            for (const s of shaders) gl.deleteShader(s)
            gl.deleteFramebuffer(cubeFbo)
            gl.deleteRenderbuffer(cubeDepth)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black from then on.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins. A percentage root collapses to 0x0 under Fit
                // Content, and the canvas is absolutely positioned, so nothing
                // in flow holds the box open.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background,
                touchAction: "none",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
            {/* Nothing draws this. It exists so Framer's font machinery sees
                the family in use and requests it — a family that is only ever
                named in a 2D canvas context is never loaded. */}
            <span
                aria-hidden
                style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                    opacity: 0,
                    pointerEvents: "none",
                    fontFamily,
                    fontWeight: fontWeight as CSSProperties["fontWeight"],
                    fontStyle,
                }}
            >
                {label}
            </span>
        </div>
    )
}
