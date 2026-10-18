"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ *
 *  CipherReach
 *
 *  Two arms written in code reach across a dark dot grid, the Creation
 *  of Adam drawn as a terminal: bright glyphs and white squares on the
 *  lit back of each hand, dim `$ s /` in the shadow underneath, a few
 *  blue cells drifting through. A spark runs down the right arm, jumps
 *  the gap between the fingertips and climbs the left.
 *
 *  Built after a still of an ASCII "Creation of Adam" and the
 *  TwoReachingHands code component that first imitated it. Our
 *  component is called CipherReach.
 *
 *  WHAT THE STILL SHOWS, AND WHAT IS DONE HERE
 *
 *    Hands.    The earlier build drew the hands as a handful of
 *              capsules, so they read as sausages with stubs. Here the
 *              still itself is the shape: it was sampled cell by cell
 *              on its own 96-column grid and transcribed into MAP below
 *              -- each cell's peak brightness (tone) and how much of the
 *              cell that brightness fills (a square fills it, a glyph
 *              does not). Silhouette, knuckles, hanging fingers and the
 *              light-from-above shading are all the still's, not ours.
 *              Other column counts resample the same map.
 *    Depth.    Tone drives everything: which glyphs a cell may show,
 *              how bright it is and whether it may be a square, cell for
 *              cell as in the still. Nothing is added on top: an earlier
 *              pass drew a uniform rim of squares round each hand and
 *              dropped the still's specks, and the hands lost the
 *              still's own variation along every edge.
 *    Pointer.  A torch: glyphs within reach brighten, scramble and shy
 *              away from it, and the dot grid underneath lights up.
 *              Hovering the gap draws the fingertips together until
 *              they nearly touch and keeps the spark arcing between
 *              them. A press sends a ring of light through both hands;
 *              nothing moves.
 *    Arrival.  On first sight the arms assemble from the shoulders out
 *              to the fingertips, each cell flashing in.
 *
 *  The earlier build's Advanced settings are all here. Columns, Scale
 *  and Offset Y sit on the panel; the rest are sorted into Fill, Look,
 *  Spark and Shimmer. Its Hover and Hover Radius became Response > Light
 *  and Response > Reach.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * ------------------------------------------------------------------ */

export interface CipherReachFill {
    /** Which cells are glyphs, squares and blue. */
    seed: number
    /** Share of the still's lit cells drawn, in %. */
    density: number
    /** Share of the cells on the silhouette's edge drawn, in %. */
    edgeDensity: number
    /** Share of the finger cells drawn, in %. */
    fingerDensity: number
}

export interface CipherReachLook {
    /** Glyph font size, in % of a cell. */
    glyphSize: number
    /** Filled square side, in % of a cell. */
    squareSize: number
    /** Brightness of the mid tones, in %. */
    midLevel: number
    /** Brightness of the shadow tones, in %. */
    darkLevel: number
    /** Background dot side, in % of a cell. */
    dotSize: number
    dotColor: string
    /** Halo round white squares, in %. */
    glow: number
    /** Dark lower-right edge on squares, in %. */
    bevel: number
    /** Edge darkening, in %. */
    vignette: number
    /** Film grain over everything, in %. */
    grain: number
}

export interface CipherReachResponse {
    /** How far the pointer's light and push reach, 0–10. */
    reach: number
    /** How much the pointer lights and scrambles the glyphs it passes, 0–10. */
    light: number
    /** How hard the glyphs shy away from the pointer, 0–10. */
    repel: number
    /** Cells each hand reaches in while the pointer holds the gap. */
    gapPull: number
    /** Brightness of the ring of light a press sends, 0–10; 0 = none. */
    ripple: number
}

export interface CipherReachSpark {
    /** Spark down the right arm, ms at Speed 5. */
    rightMs: number
    /** Spark crossing the gap, ms. */
    gapMs: number
    /** Spark up the left arm, ms. */
    leftMs: number
    /** Pause before the next cycle, ms. */
    restMs: number
    /** Width of the travelling band, in cells. */
    bandCells: number
    /** Brightness added inside the band, in %. */
    bandBoost: number
    /** How far the band turns cells to the accent, in %. */
    bandBlue: number
    /** Cells that light across the gap. */
    gapCells: number
    /** Delay between gap cells, ms. */
    gapStaggerMs: number
    /** Fade of each gap cell, ms. */
    gapFadeMs: number
    /** Cells the hands drift toward each other each cycle; 0 keeps them still. */
    breath: number
}

export interface CipherReachShimmer {
    /** How often glyphs swap characters, 0–10. */
    flicker: number
    /** Least time a glyph shows before it may swap, ms. */
    holdMs: number
    /** Shortest time a cell stays blue, ms. */
    lifeMin: number
    /** Longest time a cell stays blue, ms. */
    lifeMax: number
    /** Colour step into and out of blue, ms. */
    fadeMs: number
}

export interface CipherReachProps {
    background?: string
    /** Cells across the art. 96 is the still's own grid; above it there is no more detail to draw. */
    columns?: number
    /** Size of the hands against the frame, in %. Below 100 the arms carry on off the sides. */
    scale?: number
    /** Vertical shift of the hands, in % of the frame's height. */
    offsetY?: number
    fill?: Partial<CipherReachFill>
    /** Colour of the lit glyphs and squares; the greys are shades of it. */
    glyphColor?: string
    /** Blue cells, the spark and the shock ring. */
    accent?: string
    /** Share of lit cells glowing in the accent at any moment, in %. */
    accentAmount?: number
    look?: Partial<CipherReachLook>
    /** The arms assemble from the shoulders out when first scrolled into view. */
    buildIn?: boolean
    /** Seconds the arms take to assemble. */
    buildTime?: number
    response?: Partial<CipherReachResponse>
    /** Spark cycle rate, 0–10. 5 = one 6 s cycle, 0 = still. */
    speed?: number
    spark?: Partial<CipherReachSpark>
    shimmer?: Partial<CipherReachShimmer>
    style?: CSSProperties
}

const DEFAULTS = {
    background: "#0A090B",
    columns: 79,
    scale: 90,
    offsetY: 0,
    glyphColor: "#F2F2F2",
    accent: "#2A78F0",
    accentAmount: 30,
    buildIn: true,
    buildTime: 1,
    speed: 10,
}

const DEFAULT_FILL: CipherReachFill = { seed: 7, density: 100, edgeDensity: 100, fingerDensity: 100 }

// Sizes and levels matched to the still by eye, side by side.
const DEFAULT_LOOK: CipherReachLook = {
    glyphSize: 125,
    squareSize: 72,
    midLevel: 74,
    darkLevel: 22,
    dotSize: 18,
    dotColor: "#303036",
    glow: 20,
    bevel: 20,
    vignette: 15,
    grain: 0,
}

const DEFAULT_RESPONSE: CipherReachResponse = { reach: 5, light: 5, repel: 4, gapPull: 2, ripple: 5 }

// Timings from the earlier build's tuned values.
const DEFAULT_SPARK: CipherReachSpark = {
    rightMs: 3500,
    gapMs: 600,
    leftMs: 1500,
    restMs: 400,
    bandCells: 6,
    bandBoost: 40,
    bandBlue: 85,
    gapCells: 8,
    gapStaggerMs: 60,
    gapFadeMs: 300,
    breath: 0,
}

const DEFAULT_SHIMMER: CipherReachShimmer = { flicker: 3, holdMs: 400, lifeMin: 1200, lifeMax: 3000, fadeMs: 120 }

/* ---------------------------- the still ---------------------------- */

// The still's grid. Art is drawn on ART_COLS x ART_ROWS cells; MAP holds
// rows MAP_TOP onward (the rows above and below are empty sky).
const ART_COLS = 96
const ART_ROWS = 48
const MAP_TOP = 12
// One character per cell: "." is unlit, otherwise a base-36 digit
// v = 4 * tone + finish, tone 1–8 the cell's peak brightness in the still,
// finish 0–3 how much of the cell that brightness fills.
const MAP = [
    "..........................................................................................okc8k8",
    "........................................................................................48okgkl9",
    "........................................................................................hecookcd",
    "..................................................................................vulckgir.oogdd",
    "................................................................................vqilgg.kihgg8c9g",
    "...........................................................................wtskppmvphcggh.d44gca",
    "........................................................................xpgkkkppmvvl555678754.gd",
    "......................................................................okskkhkslhmvi95444a854..4g",
    "........v8.4cg.k.ccy................................................ys.ksxxskokkkpako5889a5654g.",
    ".....8uppk.89gpdhpklk.c8g8cggokx.................................yklyyloolkhkko9d.9bk448kl.c8845",
    "....4c.hvktokokkakpplkohdgkkkklqx.........................xxkcgoymmmmmlhl8kokks8d....c545855..5.",
    "..qg8.hvu.ggkoptkdo.sshkklok5klkgx......................kskmpklmmmtddchxlk8wwok9c...95599.54444.",
    "cdkg8kpppoockghpmptkkkhkhkopwoppkkggk.................gophgpppisthtdcgtms8kklogcc....888.9544.4.",
    "qqk8.c88a8cccoilullpokhkdkokpllltodgkcck............okmggkdhf8k8ollpdxplo8kgdgk99......44.984..5",
    "dlcc8g5868gck8cpzyyxlkokkcggkolmxlcsokgoc..........cplk5.xx88...ooodlypoogkgkoc8d9.8.cg.4.tg..45",
    "h8c..469a88...oovvmyxsggcgk8lsplllkltmokgo.........4lix..kk......e8lmmdgcggddc8c88.89c4...kc....",
    "c..4.5546844..clutyyyxphkc88kgdkkkkgdkgplpx.........k8o.........xpsyppddcccc9d88c..s4...........",
    "g.44.48.54....8hlpxyuxxwkkcccgc8.c..dc5klppx...................xplktdockocc888c.c.gs............",
    "c5.4.44.4..c8..klllttxttsgcsw.c..8cc8g.ghlpk..................kxkllgedolso8kk8c..8g.............",
    ".644......okc..kpiplhslssggoswc.dwdd.cc.xpldc.................yi8mmdh9kkoo8kk88g.8..............",
    "4.7544...gso....kospokkkkgooos..dsxd..d.y8oldx................tkookotc.csg848gwo................",
    "4554.4..8t8.......cg88ssggkkoo8c88o8..g.o.4ydq................kkpcchcd.os4ss.gw.................",
    "..44...4u.............wscgswgoggc...8cc....sck.................lp8cl.w5kk4ss....................",
    ".....4.k..................swkkkhdc..8g.c.w.....................plccldwwg84......................",
    "46..........................48gdolc..c.d.o.....................lk8kkd.wkd8......................",
    "...5..........................8dgkc..wcgd8.....................yg.pd9..kk84.....................",
    "..5.5.........................cc.kc..wxxc......................xp8occ..oog8.....................",
    "...d..........................os.g...4ws.......................gl9c8s4.wwsk.....................",
    "..............................os................................l98cw4..........................",
    "g...............................................................kc.9............................",
]
// Columns left of this belong to the left hand (Adam), the rest to the right.
const SPLIT_COL = 48
// Finger boxes [col0, row0, col1, row1), read off MAP: each hand's
// index finger and the fingers hanging under its palm.
const FINGERS = [
    [38, 29, 47, 35],
    [20, 34, 47, 42],
    [50, 24, 60, 30],
    [60, 29, 82, 42],
]

// Arm centrelines in the still's cells, read off MAP. The right runs
// shoulder → fingertip (the spark's way in); the left fingertip →
// shoulder (its way out).
const PATH_R = [[97, 18], [78, 22], [63, 24], [51.5, 27]]
const PATH_L = [[45.5, 33.5], [33, 28], [16, 27], [-2, 31]]
const TIP_R = PATH_R[PATH_R.length - 1]
const TIP_L = PATH_L[0]
const GAP_X = (TIP_R[0] + TIP_L[0]) / 2
const GAP_Y = (TIP_R[1] + TIP_L[1]) / 2

// Characters by tone band: the shadow is written in thin marks, the lit
// back of the hand in dense ones -- as in the still.
const GLYPHS = ["0", "1", "X", "x", ">", "$", "s", "S", "-", ".", "/"]
const SETS = [
    [5, 6, 10, 4, 9, 8],
    [5, 6, 4, 0, 1, 3, 7],
    [0, 1, 2, 1, 0, 4, 2],
]
// Chance a tone-6+ cell is a white square, by how much of its cell the still filled.
const SQUARE_CHANCE = [0.1, 0.4, 0.75, 0.95]

/* ----------------------------- fixed ----------------------------- */

// Cells across the frame's height at the least, so on a tall, narrow frame
// the arms run off the sides instead of the hands shrinking to specks.
const MIN_ROWS_TALL = 66
const GAP_LOOP_MS = 900 // spark repeat while the pointer holds the gap
const GAP_RADIUS = 9 // still's cells round the gap that count as hovering it

// Pointer press: a ring through the hands.
const WAVE_SPEED = 55 // still's cells/s
const WAVE_LIFE = 1.2 // s
const WAVE_WIDTH = 1.6 // still's cells

// Arrival, seconds from first sight.
const BUILD_DELAY = 0.1
const BUILD_JITTER = 0.35
const BUILD_FLASH = 0.22

/* ----------------------------- helpers ----------------------------- */

interface Cell {
    /** Render-grid indices. */
    i: number
    j: number
    /** Centre in the still's cells. */
    ax: number
    ay: number
    hand: 0 | 1
    tone: number
    level: number
    square: boolean
    glyph: number
    /** Distance along the spark's path, still's cells. */
    s: number
    /** 0 at the shoulder, 1 at the fingertip. */
    out: number
    jitter: number
    hold: number
    blue: boolean
    blueAmt: number
    life: number
}

interface Wave {
    x: number
    y: number
    t: number
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const smooth = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
}
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// Alpha per tone 0–8: dark at tone 1, mid at tone 4.5, full at tone 8, on
// one eased curve so the lit tops read near-white as in the still.
function toneTable(dark: number, mid: number) {
    const d = clamp(dark, 0, 0.99)
    const ratio = clamp((mid - d) / (1 - d), 0.001, 0.999)
    const g = Math.log(ratio) / Math.log(0.5)
    const out = [0]
    for (let t = 1; t <= 8; t++) out.push(d + (1 - d) * Math.pow((t - 1) / 7, g))
    return out
}

function hash(i: number, j: number, s: number, k: number) {
    let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(((s | 0) + k * 7919) | 0, 982451653)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    h = Math.imul(h, 2246822519)
    h ^= h >>> 13
    return (h >>> 0) / 4294967296
}

function mapAt(c: number, r: number) {
    const row = MAP[r - MAP_TOP]
    if (!row || c < 0 || c >= row.length || row[c] === ".") return -1
    return parseInt(row[c], 36)
}

function pathLen(p: number[][]) {
    let l = 0
    for (let k = 1; k < p.length; k++) l += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1])
    return l
}
const LEN_R = pathLen(PATH_R)
const LEN_L = pathLen(PATH_L)

function pathParam(p: number[][], px: number, py: number) {
    let best = 1e9
    let s = 0
    let acc = 0
    for (let k = 1; k < p.length; k++) {
        const ax = p[k - 1][0]
        const ay = p[k - 1][1]
        const dx = p[k][0] - ax
        const dy = p[k][1] - ay
        const len = Math.hypot(dx, dy)
        const t = clamp(((px - ax) * dx + (py - ay) * dy) / (len * len), 0, 1)
        const d = Math.hypot(px - ax - dx * t, py - ay - dy * t)
        if (d < best) {
            best = d
            s = acc + t * len
        }
        acc += len
    }
    return s
}

// The still stops at its own edges, but the arms do not: past them each
// arm carries on along its slope, re-using the texture of its last
// EDGE_BAND columns mirrored, so a scaled-down frame never shows a stump.
// Slopes read off MAP: the left arm drops 4 rows over its last 18 columns
// going left, the right climbs 4 over its last 19 going right.
const EDGE_BAND = 6
const DROP_L = 4 / 18
const RISE_R = 4 / 19

function mapExt(c: number, r: number) {
    if (c < 0) return mapAt((-c - 1) % EDGE_BAND, Math.round(r - DROP_L * -c))
    if (c >= ART_COLS) return mapAt(ART_COLS - 1 - ((c - ART_COLS) % EDGE_BAND), Math.round(r + RISE_R * (c - ART_COLS + 1)))
    return mapAt(c, r)
}

// A render cell's value from the still. At or above the still's 96 columns a
// cell lies inside one of the still's, so it takes that; below, it covers
// several and keeps the brightest, so a thin finger is not stepped over.
function sample(ax: number, ay: number, k: number) {
    if (k <= 1) return mapExt(Math.floor(ax), Math.floor(ay))
    const c0 = Math.floor(ax - k / 2)
    const c1 = Math.ceil(ax + k / 2) - 1
    const r0 = Math.floor(ay - k / 2)
    const r1 = Math.ceil(ay + k / 2) - 1
    let best = -1
    for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
            const v = mapExt(c, r)
            if (v >> 2 > best >> 2) best = v
        }
    }
    return best
}

// Cells for render columns i0..i1 and rows j0..j1 -- the frame's view of
// the art, which runs past the still wherever the arms carry on.
function buildCells(
    cols: number,
    fill: CipherReachFill,
    shimmer: CipherReachShimmer,
    accent: number,
    i0: number,
    i1: number,
    j0: number,
    j1: number
): Cell[] {
    const out: Cell[] = []
    const k = ART_COLS / cols
    const seed = Math.round(fill.seed)
    const density = clamp(fill.density, 0, 100) / 100
    const edge = clamp(fill.edgeDensity, 0, 100) / 100
    const finger = clamp(fill.fingerDensity, 0, 100) / 100
    const lifeMax = Math.max(shimmer.lifeMin, shimmer.lifeMax)
    for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
            const ax = (i + 0.5) * k
            const ay = (j + 0.5) * k
            const v = sample(ax, ay, k)
            if (v < 0) continue
            const tone = v >> 2
            if (tone < 1) continue
            const mc = Math.floor(ax)
            const mr = Math.floor(ay)
            const isEdge = mapExt(mc - 1, mr) < 0 || mapExt(mc + 1, mr) < 0 || mapExt(mc, mr - 1) < 0 || mapExt(mc, mr + 1) < 0
            const isFinger = FINGERS.some((b) => mc >= b[0] && mc < b[2] && mr >= b[1] && mr < b[3])
            const keep = density * (isEdge ? edge : 1) * (isFinger ? finger : 1)
            if (hash(i, j, seed, 1) >= keep) continue
            const level = tone <= 2 ? 0 : tone <= 4 ? 1 : 2
            const hand: 0 | 1 = mc < SPLIT_COL ? 0 : 1
            // Past a shoulder the path keeps counting, so the spark runs on off-frame.
            const s =
                hand === 0
                    ? pathParam(PATH_L, ax, ay) + Math.max(0, PATH_L[PATH_L.length - 1][0] - ax)
                    : pathParam(PATH_R, ax, ay) - Math.max(0, ax - PATH_R[0][0])
            const set = SETS[level]
            // Shade prefers the accent, as in the still: its blue sits in the shadow.
            const blue = hash(i, j, seed, 4) < accent * (level === 0 ? 1.3 : level === 1 ? 1 : 0.6)
            out.push({
                i,
                j,
                ax,
                ay,
                hand,
                tone,
                level,
                square: tone >= 6 && hash(i, j, seed, 3) < SQUARE_CHANCE[v & 3],
                glyph: set[Math.floor(hash(i, j, seed, 5) * set.length)],
                s,
                out: clamp(hand === 1 ? s / LEN_R : 1 - s / LEN_L, 0, 1),
                jitter: hash(i, j, seed, 7),
                hold: 0,
                blue,
                blueAmt: blue ? 1 : 0,
                life: shimmer.lifeMin + hash(i, j, seed, 6) * (lifeMax - shimmer.lifeMin),
            })
        }
    }
    return out
}

function buildAtlas(S: number, fontPx: number, colA: string, colB: string) {
    const cv = document.createElement("canvas")
    cv.width = S * GLYPHS.length
    cv.height = S * 2
    const g = cv.getContext("2d")
    if (!g) return cv
    g.font = `700 ${fontPx}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
    g.textAlign = "center"
    g.textBaseline = "middle"
    for (let r = 0; r < 2; r++) {
        g.fillStyle = r === 0 ? colA : colB
        for (let k = 0; k < GLYPHS.length; k++) g.fillText(GLYPHS[k], k * S + S / 2, r * S + S / 2 + S * 0.04)
    }
    return cv
}

function makeGrain() {
    const cv = document.createElement("canvas")
    cv.width = 128
    cv.height = 128
    const g = cv.getContext("2d")
    if (!g) return cv
    const img = g.createImageData(128, 128)
    for (let k = 0; k < img.data.length; k += 4) {
        img.data[k] = 255
        img.data[k + 1] = 255
        img.data[k + 2] = 255
        img.data[k + 3] = Math.floor(Math.random() * 255)
    }
    g.putImageData(img, 0, 0)
    return cv
}

/* ---------------------------- component ---------------------------- */

export default function CipherReach({
    background = DEFAULTS.background,
    columns = DEFAULTS.columns,
    scale = DEFAULTS.scale,
    offsetY = DEFAULTS.offsetY,
    fill = {"seed":999,"density":76,"edgeDensity":100,"fingerDensity":100},
    glyphColor = DEFAULTS.glyphColor,
    accent = DEFAULTS.accent,
    accentAmount = DEFAULTS.accentAmount,
    look = {"glow":20,"bevel":20,"grain":0,"dotSize":18,"dotColor":"#303036","midLevel":74,"vignette":15,"darkLevel":22,"glyphSize":92,"squareSize":67},
    buildIn = DEFAULTS.buildIn,
    buildTime = DEFAULTS.buildTime,
    response = {"light":5,"reach":5,"repel":4,"ripple":5,"gapPull":0},
    speed = DEFAULTS.speed,
    spark = {"gapMs":600,"breath":0,"leftMs":1500,"restMs":400,"rightMs":3500,"bandBlue":85,"gapCells":8,"bandBoost":40,"bandCells":6,"gapFadeMs":300,"gapStaggerMs":60},
    shimmer = {"fadeMs":120,"holdMs":400,"flicker":3,"lifeMax":3000,"lifeMin":1200},
    style,
}: CipherReachProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const live = {
        columns,
        scale,
        offsetY,
        fill: { ...DEFAULT_FILL, ...fill },
        glyphColor,
        accent,
        accentAmount,
        look: { ...DEFAULT_LOOK, ...look },
        buildIn,
        buildTime,
        response: { ...DEFAULT_RESPONSE, ...response },
        speed,
        spark: { ...DEFAULT_SPARK, ...spark },
        shimmer: { ...DEFAULT_SHIMMER, ...shimmer },
    }
    const propsRef = useRef(live)
    propsRef.current = live

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let W = 0
        let H = 0
        let dpr = 1
        const measure = () => {
            W = root.offsetWidth
            H = root.offsetHeight
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.max(1, Math.round(W * dpr))
            canvas.height = Math.max(1, Math.round(H * dpr))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(root)

        let visible = false
        let buildStart = -1
        const io = new IntersectionObserver((entries) => {
            visible = entries[entries.length - 1].isIntersecting
        })
        io.observe(root)

        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
        let seedState = 0x2f6b1d37
        const rng = () => {
            seedState = (seedState + 0x6d2b79f5) | 0
            let t = seedState
            t = Math.imul(t ^ (t >>> 15), t | 1)
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }

        let cells: Cell[] = []
        let cellKey = ""
        let atlas: HTMLCanvasElement | null = null
        let atlasKey = ""
        let dots: HTMLCanvasElement | null = null
        let dotKey = ""
        const grainPattern = ctx.createPattern(makeGrain(), "repeat")
        let cycT = 0
        let gapT = 0
        let last = -1
        let raf = 0
        const waves: Wave[] = []
        // Pointer in CSS px; `sx/sy` trail it.
        const ptr = { x: 0, y: 0, sx: 0, sy: 0, inside: false, over: 0, gap: 0, press: false }

        const locate = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            // Framer's canvas scales the frame; map back to its own px.
            ptr.x = ((e.clientX - r.left) * W) / Math.max(1, r.width)
            ptr.y = ((e.clientY - r.top) * H) / Math.max(1, r.height)
            if (!ptr.inside) {
                ptr.sx = ptr.x
                ptr.sy = ptr.y
            }
            ptr.inside = true
        }
        const onLeave = () => {
            ptr.inside = false
        }
        const onDown = (e: PointerEvent) => {
            locate(e)
            ptr.press = true
        }
        root.addEventListener("pointermove", locate)
        root.addEventListener("pointerenter", locate)
        root.addEventListener("pointerleave", onLeave)
        root.addEventListener("pointerdown", onDown)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            if (!visible || W < 2 || H < 2) {
                last = -1
                return
            }
            let dt = last < 0 ? 0 : (now - last) / 1000
            last = now
            if (dt > 1 / 20) dt = 1 / 20

            const p = propsRef.current
            const look = p.look
            const rsp = p.response
            const sp = p.spark
            const dr = p.shimmer
            const reduce = !!(mq && mq.matches)
            const sdt = reduce ? 0 : dt * (Math.max(0, p.speed) / 5)

            const cols = clamp(Math.round(p.columns), 20, 200)
            const k = ART_COLS / cols // still's cells per render cell

            // Layout: the still spans the width, centred; see MIN_ROWS_TALL.
            // `unit` is one of the still's cells in px, `cell` one render cell.
            const unit = (Math.max(W / ART_COLS, H / MIN_ROWS_TALL) * clamp(p.scale, 10, 400)) / 100
            const cell = unit * k
            const ox = W / 2 - (ART_COLS * unit) / 2
            const oy = H / 2 - (ART_ROWS * unit) / 2 + (p.offsetY / 100) * H

            // Cells for what the frame shows, plus a margin for the hands'
            // reach and the pointer's push; rebuilt only when that changes.
            const margin = 6
            const i0 = Math.floor(-ox / cell) - margin
            const i1 = Math.ceil((W - ox) / cell) + margin
            const j0 = Math.floor(-oy / cell) - margin
            const j1 = Math.ceil((H - oy) / cell) + margin
            const fl = p.fill
            const key = [cols, i0, i1, j0, j1, fl.seed, fl.density, fl.edgeDensity, fl.fingerDensity].join("|")
            if (key !== cellKey) {
                cellKey = key
                cells = buildCells(cols, fl, dr, clamp(p.accentAmount, 0, 100) / 100, i0, i1, j0, j1)
            }

            // Arrival clock.
            const span = Math.max(0.05, p.buildTime)
            const buildEnd = BUILD_DELAY + span + BUILD_JITTER + BUILD_FLASH
            if (buildStart < 0) buildStart = now
            const bt = p.buildIn && !reduce ? (now - buildStart) / 1000 : buildEnd
            const building = bt < buildEnd

            // Pointer: presence in ~250 ms, out in ~400 ms; position trails a little.
            const ease = (tau: number) => 1 - Math.exp(-dt / tau)
            ptr.over += ((ptr.inside ? 1 : 0) - ptr.over) * ease(ptr.inside ? 0.083 : 0.133)
            ptr.sx += (ptr.x - ptr.sx) * ease(0.06)
            ptr.sy += (ptr.y - ptr.sy) * ease(0.06)

            // Pointer in the still's cells.
            const pu = (ptr.sx - ox) / unit
            const pv = (ptr.sy - oy) / unit
            const rad = 2 + clamp(rsp.reach, 0, 10) * 1.2
            const lightK = (clamp(rsp.light, 0, 10) / 10) * ptr.over
            const repelK = reduce ? 0 : (clamp(rsp.repel, 0, 10) / 10) * 2.2 * ptr.over
            const ripK = clamp(rsp.ripple, 0, 10) / 5
            const pointerOn = ptr.over > 0.002

            // Hovering the gap draws the fingertips together.
            const inGap = ptr.inside && Math.hypot(pu - GAP_X, pv - GAP_Y) < GAP_RADIUS
            ptr.gap += ((inGap && !reduce ? 1 : 0) - ptr.gap) * ease(0.2)
            gapT = ptr.gap > 0.5 ? gapT + dt * 1000 : 0

            // Timeline.
            const R = Math.max(100, sp.rightMs)
            const G = Math.max(0, sp.gapMs)
            const L = Math.max(100, sp.leftMs)
            const cyc = R + G + L + Math.max(0, sp.restMs)
            if (ptr.press) {
                ptr.press = false
                // Light only. Restarting the spark here used to snap the
                // hands' breath offset, so a press nudged them sideways.
                if (!reduce && ripK > 0) {
                    waves.push({ x: pu, y: pv, t: now })
                    if (waves.length > 5) waves.shift()
                }
            }
            if (building) cycT = 0
            else cycT = (cycT + sdt * 1000) % cyc
            for (let w = waves.length - 1; w >= 0; w--) if ((now - waves[w].t) / 1000 > WAVE_LIFE) waves.splice(w, 1)

            const bw = Math.max(0.5, sp.bandCells) * k * 0.5
            let posR = 0
            let ampR = 0
            let posL = 0
            let ampL = 0
            if (building) {
                // no spark while the arms assemble
            } else if (cycT < R) {
                posR = -2.5 * bw + easeInOutCubic(cycT / R) * (LEN_R + 2.5 * bw)
                ampR = 1
            } else if (cycT < R + G) {
                posR = LEN_R
                ampR = 1 - (cycT - R) / Math.max(1, G)
            } else if (cycT < R + G + L) {
                const lt = cycT - R - G
                posL = easeOutCubic(lt / L) * (LEN_L + 3 * bw)
                ampL = Math.min(1, lt / 150)
            }
            const closeness = 0.5 + 0.5 * Math.cos((2 * Math.PI * (cycT - R - G / 2)) / cyc)
            const off = reduce
                ? 0
                : Math.round(Math.max(closeness * Math.max(0, sp.breath), ptr.gap * Math.max(0, rsp.gapPull)))
            const offA = off * k

            // Atlas and dot layer, rebuilt only when their inputs change.
            const slot = Math.ceil(cell * dpr) + 2
            const fontPx = Math.max(4, (cell * dpr * look.glyphSize) / 100)
            const aKey = [slot, fontPx.toFixed(2), p.glyphColor, p.accent].join("|")
            if (aKey !== atlasKey || !atlas) {
                atlasKey = aKey
                atlas = buildAtlas(slot, fontPx, p.glyphColor, p.accent)
            }
            const dotPx = Math.max(1, Math.round(((cell * look.dotSize) / 100) * dpr))
            const dKey = [canvas.width, canvas.height, cell.toFixed(4), ox.toFixed(2), oy.toFixed(2), look.dotColor, dotPx, dpr].join("|")
            if (dKey !== dotKey || !dots) {
                dotKey = dKey
                dots = document.createElement("canvas")
                dots.width = canvas.width
                dots.height = canvas.height
                const g = dots.getContext("2d")
                if (g) {
                    g.fillStyle = look.dotColor
                    const gi0 = Math.floor(-ox / cell) - 1
                    const gi1 = Math.ceil((W - ox) / cell) + 1
                    const gj0 = Math.floor(-oy / cell) - 1
                    const gj1 = Math.ceil((H - oy) / cell) + 1
                    for (let j = gj0; j <= gj1; j++) {
                        const cy = Math.round((oy + (j + 0.5) * cell) * dpr - dotPx / 2)
                        for (let i = gi0; i <= gi1; i++) {
                            g.fillRect(Math.round((ox + (i + 0.5) * cell) * dpr - dotPx / 2), cy, dotPx, dotPx)
                        }
                    }
                }
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.globalAlpha = 1
            ctx.clearRect(0, 0, W, H)
            ctx.drawImage(dots, 0, 0, W, H)

            // The dot grid lights up under the pointer.
            if (pointerOn && lightK > 0) {
                ctx.fillStyle = p.glyphColor
                const ds = (dotPx * 1.6) / dpr
                const rc = Math.ceil(rad / k)
                const ci = Math.floor(pu / k)
                const cj = Math.floor(pv / k)
                for (let j = cj - rc; j <= cj + rc; j++) {
                    for (let i = ci - rc; i <= ci + rc; i++) {
                        const pr = smooth(rad, 0, Math.hypot((i + 0.5) * k - pu, (j + 0.5) * k - pv))
                        if (pr <= 0) continue
                        ctx.globalAlpha = 0.8 * pr * lightK
                        ctx.fillRect(ox + (i + 0.5) * cell - ds / 2, oy + (j + 0.5) * cell - ds / 2, ds, ds)
                    }
                }
            }

            const alphaOf = toneTable(look.darkLevel / 100, look.midLevel / 100)
            const sz = Math.max(1, Math.round(((cell * look.squareSize) / 100) * dpr)) / dpr
            const half = sz / 2
            const bevW = Math.max(1, Math.round(sz * 0.14 * dpr)) / dpr
            const bevel = new Path2D()
            const glowA = clamp(look.glow, 0, 100) / 100
            const glowPad = Math.max(1 / dpr, cell * 0.12)
            const boost = sp.bandBoost / 100
            const bandBlue = clamp(sp.bandBlue, 0, 100) / 100
            const rate = clamp(dr.flicker, 0, 10) / 100
            const hold = Math.max(0, dr.holdMs)
            const blueStep = sdt > 0 ? (sdt * 1000) / Math.max(1, dr.fadeMs) : 0
            const lifeMin = dr.lifeMin
            const lifeMax = Math.max(lifeMin, dr.lifeMax)
            const slotCss = slot / dpr
            const snap = (v: number) => Math.round(v * dpr) / dpr
            let blueCount = 0

            for (let n = 0; n < cells.length; n++) {
                const c = cells[n]
                const age = bt - (BUILD_DELAY + c.out * span + c.jitter * BUILD_JITTER)
                if (age < 0) continue

                // Where the cell sits, in the still's cells: home, plus the hands' reach.
                const homeX = c.ax + (c.hand === 0 ? offA : -offA)
                const homeY = c.ay
                let cx = homeX
                let cy = homeY

                let prox = 0
                if (pointerOn) {
                    const ex = homeX - pu
                    const ey = homeY - pv
                    const d = Math.hypot(ex, ey)
                    prox = smooth(rad, 0, d)
                    if (repelK > 0 && prox > 0 && d > 1e-3) {
                        const push = (repelK * prox * prox) / d
                        cx += ex * push
                        cy += ey * push
                    }
                }

                let wave = 0
                for (let w = 0; w < waves.length; w++) {
                    const wv = waves[w]
                    const t = (now - wv.t) / 1000
                    const ex = homeX - wv.x
                    const ey = homeY - wv.y
                    const d = Math.hypot(ex, ey)
                    const z = (d - t * WAVE_SPEED) / WAVE_WIDTH
                    const hit = Math.exp(-z * z) * (1 - t / WAVE_LIFE) * ripK
                    if (hit > 0.01) wave += hit
                }

                // Glyph flicker: hard cuts, each held at least `hold`. Faster under the torch.
                if (rate > 0 && sdt > 0) {
                    if (c.hold > 0) c.hold -= sdt * 1000
                    else if (rng() < rate * (1 + 6 * prox * lightK + 30 * wave) * sdt) {
                        const set = SETS[c.level]
                        if (c.tone >= 6 && rng() < 0.3) c.square = !c.square
                        else c.glyph = set[Math.floor(rng() * set.length)]
                        c.hold = hold
                    }
                }
                // Blue drift.
                if (c.blue && sdt > 0) {
                    c.life -= sdt * 1000
                    if (c.life <= 0) c.blue = false
                }
                if (sdt > 0) c.blueAmt = c.blue ? Math.min(1, c.blueAmt + blueStep) : Math.max(0, c.blueAmt - blueStep)
                if (c.blue) blueCount++

                const x = ox + cx * unit
                const y = oy + cy * unit
                if (x < -cell || x > W + cell || y < -cell || y > H + cell) continue

                let band = 0
                if (c.hand === 1 && ampR > 0) {
                    const z = (c.s - posR) / bw
                    band = ampR * Math.exp(-z * z)
                } else if (c.hand === 0 && ampL > 0) {
                    const z = (c.s - posL) / bw
                    band = ampL * Math.exp(-z * z)
                }
                let a = Math.min(1, alphaOf[c.tone] * (1 + boost * band) + 0.7 * lightK * prox + 0.6 * wave)
                let m = Math.max(c.blueAmt, band * bandBlue, Math.min(1, wave) * 0.9)
                let glyph = c.glyph
                let square = c.square
                // Arrival: each cell flashes in bright and scrambling, then settles.
                if (age < BUILD_FLASH) {
                    const f = 1 - age / BUILD_FLASH
                    a = Math.max(a, f)
                    m = Math.max(m, 0.6 * f)
                    glyph = SETS[2][Math.floor(rng() * SETS[2].length)]
                    square = false
                }
                const aB = Math.max(a, c.blueAmt)

                if (square || c.blueAmt > 0.01) {
                    const x0 = snap(x - half)
                    const y0 = snap(y - half)
                    if (glowA > 0 && c.level === 2 && m < 0.5) {
                        ctx.globalAlpha = glowA * 0.6 * a * (1 - m)
                        ctx.fillStyle = p.glyphColor
                        ctx.fillRect(x0 - glowPad, y0 - glowPad, sz + glowPad * 2, sz + glowPad * 2)
                    }
                    if (m < 0.999) {
                        ctx.globalAlpha = a * (1 - m)
                        ctx.fillStyle = p.glyphColor
                        ctx.fillRect(x0, y0, sz, sz)
                    }
                    if (m > 0.001) {
                        ctx.globalAlpha = aB * m
                        ctx.fillStyle = p.accent
                        ctx.fillRect(x0, y0, sz, sz)
                    }
                    bevel.rect(x0, y0 + sz - bevW, sz, bevW)
                    bevel.rect(x0 + sz - bevW, y0, bevW, sz - bevW)
                } else if (atlas) {
                    const dx = snap(x - slotCss / 2)
                    const dy = snap(y - slotCss / 2)
                    const sx = glyph * slot
                    if (m < 0.999) {
                        ctx.globalAlpha = a * (1 - m)
                        ctx.drawImage(atlas, sx, 0, slot, slot, dx, dy, slotCss, slotCss)
                    }
                    if (m > 0.001) {
                        ctx.globalAlpha = a * m
                        ctx.drawImage(atlas, sx, slot, slot, slot, dx, dy, slotCss, slotCss)
                    }
                }
            }

            const bevA = clamp(look.bevel, 0, 100) / 100
            if (bevA > 0) {
                ctx.globalAlpha = bevA
                ctx.fillStyle = "#000000"
                ctx.fill(bevel)
            }

            // Keep the blue share steady: a blue cell that expires hands its colour on, shade first.
            if (cells.length) {
                const want = Math.round((cells.length * clamp(p.accentAmount, 0, 100)) / 100)
                let guard = 0
                while (blueCount < want && guard++ < 60) {
                    let c = cells[Math.floor(rng() * cells.length)]
                    const c2 = cells[Math.floor(rng() * cells.length)]
                    if (c2.tone < c.tone) c = c2
                    if (c.blue) continue
                    c.blue = true
                    c.life = lifeMin + rng() * (lifeMax - lifeMin)
                    if (sdt === 0) c.blueAmt = 1
                    blueCount++
                }
                guard = 0
                while (blueCount > want && guard++ < 60) {
                    const c = cells[Math.floor(rng() * cells.length)]
                    if (!c.blue) continue
                    c.blue = false
                    if (sdt === 0) c.blueAmt = 0
                    blueCount--
                }
            }

            // Spark across the gap: once per cycle, and on a loop while the gap is hovered.
            const nGap = Math.max(0, Math.round(sp.gapCells))
            const stag = Math.max(0, sp.gapStaggerMs)
            const fade = Math.max(1, sp.gapFadeMs)
            const drawGap = (gt: number) => {
                if (gt < 0 || gt >= nGap * stag + fade + 60) return
                const rx = TIP_R[0] - offA
                const lx = TIP_L[0] + offA
                ctx.fillStyle = p.accent
                for (let g = 0; g < nGap; g++) {
                    const tt = gt - g * stag
                    if (tt < 0) continue
                    const inten = tt < 60 ? 1 : Math.max(0, 1 - (tt - 60) / fade)
                    if (inten <= 0) continue
                    const f = (g + 1) / (nGap + 1)
                    const gi = Math.floor((rx + (lx - rx) * f) / k)
                    const gj = Math.floor((TIP_R[1] + (TIP_L[1] - TIP_R[1]) * f) / k)
                    ctx.globalAlpha = inten
                    ctx.fillRect(snap(ox + (gi + 0.5) * cell - half), snap(oy + (gj + 0.5) * cell - half), sz, sz)
                }
            }
            if (!reduce && !building && nGap > 0) {
                drawGap(cycT - R)
                if (ptr.gap > 0.5) drawGap(gapT % GAP_LOOP_MS)
            }

            // Grain.
            const grain = clamp(look.grain, 0, 100) / 100
            if (grain > 0 && grainPattern) {
                const rx = sdt > 0 ? Math.floor(rng() * 128) : 0
                const ry = sdt > 0 ? Math.floor(rng() * 128) : 0
                ctx.save()
                ctx.globalAlpha = grain * 0.3
                ctx.translate(-rx, -ry)
                ctx.fillStyle = grainPattern
                ctx.fillRect(rx, ry, W, H)
                ctx.restore()
            }
            // Vignette.
            const vig = clamp(look.vignette, 0, 100) / 100
            if (vig > 0) {
                const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2)
                vg.addColorStop(0, "rgba(0,0,0,0)")
                vg.addColorStop(1, `rgba(0,0,0,${Math.min(1, vig * 1.2)})`)
                ctx.globalAlpha = 1
                ctx.fillStyle = vg
                ctx.fillRect(0, 0, W, H)
            }
            ctx.globalAlpha = 1
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointermove", locate)
            root.removeEventListener("pointerenter", locate)
            root.removeEventListener("pointerleave", onLeave)
            root.removeEventListener("pointerdown", onDown)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            role="img"
            aria-label="Two hands written in code reaching toward each other"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
                overflow: "hidden",
                background,
            }}
        >
            <canvas
                ref={canvasRef}
                aria-hidden
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

const pct = (title: string, defaultValue: number, min = 0, max = 100) => ({
    type: ControlType.Number,
    title,
    unit: "%",
    min,
    max,
    step: 1,
    defaultValue,
})
const ms = (title: string, defaultValue: number, min: number, max: number) => ({
    type: ControlType.Number,
    title,
    unit: "ms",
    min,
    max,
    step: 10,
    defaultValue,
})
const scale10 = (title: string, defaultValue: number) => ({
    type: ControlType.Number,
    title,
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue,
})
