"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * A playable pixel endless-runner, sized and coloured off the runner in the
 * footer of notion.com/product/dev.
 *
 * PROVENANCE — worth reading before changing any constant.
 *
 * The scrape recovered NO game code. `canvasCalls`, `writesOnTarget`,
 * `loopSources` and `sourceFiles` all came back 0, because the original sits
 * idle until you press SPACE and the scraper only clicked it. The one "recovered
 * source" hit was a CSS-modules class map — {shell, canvas, overlayButton,
 * placeholder} — which matched purely on the class name and contains no logic.
 * So the SIMULATION below (physics, spawning, scoring, collision) is written
 * here, not ported. Treat those numbers as chosen.
 *
 * What IS measured, off a decoded capture of the real canvas (2880x1026 backing
 * for 1440x512 CSS, so DPR 2):
 *
 *   background      #1313ba          94.7% of all pixels
 *   ink             #ffffff          every sprite is white at some alpha over
 *                                    the background — there is no second hue
 *   alphas          0.331 horizon and sprites, 0.199 near dashes
 *   art pixel       4.8 CSS px       sprite run lengths were all multiples of
 *                                    9.6 backing px, and 154/16 = 9.625, so
 *                                    sprites are 16-px bitmaps on a 300-unit
 *                                    wide world
 *   horizon         y = 0.767 h      CSS 393 of 512; 393/4.8 = 81.9 units
 *   near dashes     y = 0.825 h      45 on / 83 off, period 128 CSS
 *   far dashes      y = 0.875 h      23 on / 105 off, same 128 period
 *   player          16 art px wide   measured sprite was 77 CSS; 16 * 4.8 = 76.8
 *
 * The two dash rows share a period but differ in dash length, which is how the
 * original gets depth out of one colour. Reading them as parallax — near row
 * faster than far — is an inference, not a measurement: a single still cannot
 * show relative speed. It is exposed as `farDashSpeed` so it can be corrected.
 *
 * The sprite ART is original. Nothing was recoverable to copy, and the brief's
 * instruction is to port the mechanism rather than the assets.
 *
 * AUTOPILOT — read before touching the spawner or `jumpWindow`.
 * Self-play used to die about a minute in and then stand still in front of
 * obstacle one for the rest of the session. Four separate causes:
 *
 *   1. The jump test measured to the player's 16-px SPRITE edge and required
 *      `dx > 0`, so the frame after a landing that put a block inside one
 *      player width, the autopilot refused to jump at all. It now measures the
 *      collision boxes.
 *   2. Flight time is 2v/g and CONSTANT, but the gap was a fixed 430-850. At
 *      the 980 speed cap the jump spans 1223 px against a 468 px minimum gap,
 *      so the player came down inside the next block. The gap is now derived
 *      from the flight distance and can never be overtaken by the ramp.
 *   3. `played` was a one-way latch. One pointerdown — selecting the component
 *      on the canvas is one — ended self-play permanently, and the runner then
 *      crashed on obstacle one, respawned, and crashed again, forever. Control
 *      now returns after IDLE_RESUME seconds of silence.
 *   4. A flat "jump at 0.42 of the flight" lead knows nothing about how tall or
 *      wide the block is; it cleared the front of a 3-stack and clipped the
 *      back corner. `jumpWindow` solves the lead per block, and the spawner
 *      refuses to emit a block the current dials cannot clear.
 *
 * Verified with a headless harness that mounts the component against stub
 * hooks and a virtual clock: 11 sizes x 4 frame-timing seeds x 30 simulated
 * minutes = 44 runs, 0 autopilot deaths. Extreme dial corners and a stored
 * legacy jump/gravity pair are covered too.
 *
 * DEFAULTS CHANGED: `jump` 1810 -> 1480 and `gravity` 2900 -> 4780. The old
 * pair put the apex at 565 CSS px against 393 px of headroom, so 66% of every
 * jump happened above the top edge with the player out of frame. The new pair
 * gives a 229 px apex and a 0.62 s hang. A LIVE INSTANCE KEEPS ITS STORED
 * NUMBERS — a default change cannot migrate one — but the derived gap above
 * means the old pair still plays correctly, just with a sparser field and the
 * same off-screen arc. Reset those two dials on an existing instance to pick
 * the new framing up. `Start speed` / `Max speed` minimums also rose (120->240,
 * 200->300): below that the block cannot finish passing under the player
 * within one hang time, which is unplayable for a human too.
 *
 * COLOUR OWNERSHIP — read before touching `inkAt` / `bgAt`.
 * The rAF loop is created once in a `[]` effect, so it holds render #0's
 * closure forever. EVERY live prop the loop reads must come from `propsRef`,
 * never from the destructured value. `ink` used to be read from the closure and
 * so the Ink control moved nothing after first paint.
 */

/* ------------------------------------------------------------------ measured */

const REF_W = 1440;
const REF_H = 512;
/** CSS px per art pixel at S = 1. Derived from 9.625 backing / DPR 2. */
const ART = 4.8;
const GROUND_RATIO = 393 / REF_H;
const NEAR_DASH_RATIO = 422.5 / REF_H;
const FAR_DASH_RATIO = 448 / REF_H;
const HORIZON_THICK = 4.5;
const DASH_THICK = 5;
const DASH_PERIOD = 128;
const NEAR_DASH_ON = 45;
const FAR_DASH_ON = 23;
const A_HORIZON = 0.331;
const A_NEAR = 0.199;
const A_FAR = 0.15;
const A_SPRITE = 0.331;
const A_CLOUD = 0.26;
/** Obstacle blocks measure ~50 CSS px against the runner's 77 — 11 art px. */
const BLOCK_UNITS = 11;
/** Seconds of no input before the autopilot takes the wheel back. A single
    stray click — selecting the component on the canvas is one — used to end
    self-play for the lifetime of the mount. */
const IDLE_RESUME = 4;
const A_HUD_LABEL = 0.33;
const A_HUD_VALUE = 0.42;

/* ---------------------------------------------------------------------- colour

   Framer's Color control does NOT only emit hex. It emits, in the wild:
     #rgb  #rgba  #rrggbb  #rrggbbaa
     rgb(19, 19, 186)      rgba(19, 19, 186, 0.5)
     hsl(240, 81%, 40%)    hsla(...)
     var(--token-abc-123, rgb(19, 19, 186))   <- any shared colour style
   A hex-only reader turns every one of the last three into NaN. */

type RGBA = [number, number, number, number];

const INK_FALLBACK: RGBA = [255, 255, 255, 1];
const BG_FALLBACK: RGBA = [0, 0, 0, 1];

const COLOR_CACHE = new Map<string, RGBA>();

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function parseColorRaw(raw: string, fallback: RGBA): RGBA {
  let s = raw.trim();

  // Shared colour styles arrive wrapped: var(--token-id, rgb(19, 19, 186)).
  // The literal fallback inside is the only part canvas can use.
  const varMatch = s.match(/^var\(\s*--[^,]+,\s*([\s\S]+)\)\s*$/i);
  if (varMatch) s = varMatch[1].trim();

  if (s.charAt(0) === "#") {
    let h = s.slice(1).trim();
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length !== 6 && h.length !== 8) return fallback;
    const ch = (i: number) => parseInt(h.slice(i, i + 2), 16);
    const r = ch(0);
    const g = ch(2);
    const b = ch(4);
    // NOTE: no `|| 255`. A channel of 0 is a real channel — the old fallback
    // turned #ff0000 into #ffff00 and #000000 into white.
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
      return fallback;
    }
    const a = h.length === 8 ? ch(6) / 255 : 1;
    return [r, g, b, clamp01(Number.isFinite(a) ? a : 1)];
  }

  const fn = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/i);
  if (fn) {
    const name = fn[1].toLowerCase();
    const parts = fn[2].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return fallback;
    const num = (t: string) => parseFloat(t);
    const alphaTok = parts[3];
    const alpha =
      alphaTok === undefined
        ? 1
        : alphaTok.endsWith("%")
          ? num(alphaTok) / 100
          : num(alphaTok);
    if (!Number.isFinite(alpha)) return fallback;

    if (name.charAt(0) === "r") {
      const chan = (t: string) =>
        t.endsWith("%") ? Math.round((num(t) * 255) / 100) : Math.round(num(t));
      const r = chan(parts[0]);
      const g = chan(parts[1]);
      const b = chan(parts[2]);
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        return fallback;
      }
      return [r, g, b, clamp01(alpha)];
    }

    const hue = num(parts[0]);
    const sat = num(parts[1]) / 100;
    const lig = num(parts[2]) / 100;
    if (!Number.isFinite(hue) || !Number.isFinite(sat) || !Number.isFinite(lig)) {
      return fallback;
    }
    const [r, g, b] = hslToRgb(hue, clamp01(sat), clamp01(lig));
    return [r, g, b, clamp01(alpha)];
  }

  return fallback;
}

function parseColor(input: string | undefined, fallback: RGBA): RGBA {
  if (!input) return fallback;
  const hit = COLOR_CACHE.get(input);
  if (hit) return hit;
  const out = parseColorRaw(input, fallback);
  COLOR_CACHE.set(input, out);
  return out;
}

/* --------------------------------------------------------------------- sprites
   '#' paints ink, anything else is transparent. All 16 wide so they share the
   art-pixel grid the measurements established. */

const RUNNER_BODY = [
  "....########....",
  "..############..",
  ".##############.",
  "################",
  "################",
  "###..######..###",
  "###..######..###",
  "################",
  "################",
  "################",
  "###..........###",
  ".##############.",
  "..############..",
  "....########....",
];
const RUNNER_LEGS_A = ["...##......##...", "..###......###.."];
const RUNNER_LEGS_B = ["..###......###..", "...##......##..."];
const RUNNER_LEGS_AIR = ["..###......###..", ".###........###."];

const CLOUD = [
  "....#####.......",
  "..########..##..",
  "################",
  ".##############.",
];

/** Obstacle: a filled block with a glyph knocked back out of it. */
const BLOCK = [
  "..############..",
  ".##############.",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  ".##############.",
  "..############..",
];
const GLYPHS = [
  ["..####..", "..####..", "..####..", "..####..", "...##...", ".######.", "........", "........"],
  ["........", ".#....#.", ".#....#.", ".######.", ".#....#.", ".#....#.", "........", "........"],
  ["........", ".######.", "....#...", "...#....", "..#.....", ".######.", "........", "........"],
  ["........", "..####..", ".#....#.", ".#....#.", ".#....#.", "..####..", "........", "........"],
];

/** 3x5 font, enough for the HUD. */
const FONT: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  S: ["###", "#..", "###", "..#", "###"],
  C: ["###", "#..", "#..", "#..", "###"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  R: ["###", "#.#", "###", "#.#", "#.#"],
  E: ["###", "#..", "###", "#..", "###"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  " ": ["...", "...", "...", "...", "..."],
};

/* ----------------------------------------------------------------------- sim */

type Obstacle = { x: number; stack: number; glyph: number };
type Cloud = { x: number; y: number; scale: number; depth: number };

type World = {
  t: number;
  dist: number;
  speed: number;
  playerY: number;
  playerV: number;
  grounded: boolean;
  obstacles: Obstacle[];
  clouds: Cloud[];
  dead: boolean;
  deadAt: number;
  score: number;
  best: number;
  nextGap: number;
  seed: number;
  played: boolean;
};

/** Deterministic PRNG — a still capture of this component should be repeatable. */
function rng(w: World) {
  w.seed = (w.seed * 1664525 + 1013904223) >>> 0;
  return w.seed / 4294967296;
}

export type PixelRunGameProps = {
  background?: string;
  ink?: string;
  /** World px/sec at the reference size, before the run speeds up. */
  startSpeed?: number;
  maxSpeed?: number;
  gravity?: number;
  jump?: number;
  showHud?: boolean;
  /** Plays itself until the first real input, so it is never sitting dead. */
  attract?: boolean;
  /** Far dash row scroll rate as a percent of the near row. */
  farDashSpeed?: number;
  style?: React.CSSProperties;
};

function __BaseImpl_PixelRunGame(props: PixelRunGameProps) {
  const {
    background = "#00164C",
    ink = "#ffffff",
    startSpeed = 420,
    maxSpeed = 980,
    gravity = 4780,
    jump = 1480,
    showHud = true,
    attract = true,
    farDashSpeed = 100,
    style,
  } = props;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  /** Seconds since the last human input. Starts huge so frame zero self-plays. */
  const idleRef = useRef<number>(1e9);
  const hoverRef = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  function fresh(best: number, played: boolean): World {
    return {
      t: 0,
      dist: 0,
      // propsRef, not the closure: fresh() is also called from the rAF loop on
      // respawn, where the destructured value is render #0's.
      speed: propsRef.current.startSpeed ?? startSpeed,
      playerY: 0,
      playerV: 0,
      grounded: true,
      obstacles: [],
      clouds: [],
      dead: false,
      deadAt: 0,
      score: 0,
      best,
      nextGap: 180,
      seed: 20260818,
      played,
    };
  }

  if (worldRef.current === null) worldRef.current = fresh(0, false);

  /** Ink at an alpha, as a canvas colour string. Reads the LIVE prop — the rAF
   *  loop closes over render #0, so a destructured read here is what made the
   *  Ink control appear dead. The picked colour's own alpha multiplies in, so a
   *  translucent swatch dims the whole sprite set instead of being ignored. */
  const inkAt = (a: number) => {
    const [r, g, b, ia] = parseColor(propsRef.current.ink ?? ink, INK_FALLBACK);
    return `rgba(${r},${g},${b},${a * ia})`;
  };

  /** Background as a canvas colour string. Same live-prop rule; also normalises
   *  a `var(--token, …)` value, which canvas fillStyle cannot resolve at all. */
  const bgFill = () => {
    const [r, g, b, a] = parseColor(
      propsRef.current.background ?? background,
      BG_FALLBACK
    );
    return `rgba(${r},${g},${b},${a})`;
  };

  /** One full repaint. Pure function of the world + the measured box. */
  function paint(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const world = worldRef.current!;
    const p = propsRef.current;
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    const px = ART * S;
    const groundY = h * GROUND_RATIO;
    const playerX = w * 0.08;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bgFill();
    ctx.fillRect(0, 0, w, h);

    /** Paints a bitmap on an exact integer grid. Cell bounds are rounded to
     *  shared edges and horizontal runs are merged into one rect, so cells abut
     *  instead of overlapping — an overlap would composite the alpha twice and
     *  print a bright grid over every sprite. */
    const stamp = (rows: string[], ox: number, oy: number, unit: number) => {
      for (let r = 0; r < rows.length; r++) {
        const y0 = Math.round(oy + r * unit);
        const y1 = Math.round(oy + (r + 1) * unit);
        let c = 0;
        while (c < rows[r].length) {
          if (rows[r][c] !== "#") { c++; continue; }
          let e = c;
          while (e < rows[r].length && rows[r][e] === "#") e++;
          const x0 = Math.round(ox + c * unit);
          const x1 = Math.round(ox + e * unit);
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          c = e;
        }
      }
    };

    const blit = (
      rows: string[],
      ox: number,
      oy: number,
      unit: number,
      alpha: number,
      knock?: string[]
    ) => {
      ctx.fillStyle = inkAt(alpha);
      stamp(rows, ox, oy, unit);
      if (knock) {
        // Knock the glyph OUT rather than painting the background over it.
        // Painting bg only worked while bg was opaque; destination-out is
        // correct for any Background, alpha included.
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000";
        const kx = ox + ((rows[0].length - knock[0].length) / 2) * unit;
        const ky = oy + ((rows.length - knock.length) / 2) * unit;
        stamp(knock, kx, ky, unit);
        ctx.globalCompositeOperation = prev;
      }
    };

    // Clouds sit behind everything.
    for (const cl of world.clouds) {
      blit(CLOUD, cl.x, cl.y * h, px * cl.scale, A_CLOUD * (0.7 + 0.3 * cl.depth));
    }

    // Horizon, then the two dash rows. Both rows share DASH_PERIOD; only the
    // dash length and the scroll rate differ.
    ctx.fillStyle = inkAt(A_HORIZON);
    ctx.fillRect(0, Math.round(groundY), w, Math.max(1, Math.round(HORIZON_THICK * S)));

    const dashRow = (ratio: number, on: number, alpha: number, phase: number) => {
      const period = DASH_PERIOD * S;
      const len = on * S;
      const y = Math.round(h * ratio);
      const th = Math.max(1, Math.round(DASH_THICK * S));
      ctx.fillStyle = inkAt(alpha);
      const start = -((phase % period) + period) % period;
      for (let x = start; x < w; x += period) {
        ctx.fillRect(Math.round(x), y, Math.round(len), th);
      }
    };
    dashRow(NEAR_DASH_RATIO, NEAR_DASH_ON, A_NEAR, world.dist);
    // Whole-number percent control (rule 3), divided back to a multiplier here.
    const farMul = (p.farDashSpeed ?? farDashSpeed) / 100;
    dashRow(FAR_DASH_RATIO, FAR_DASH_ON, A_FAR, world.dist * farMul);

    // Obstacles.
    for (const ob of world.obstacles) {
      const bu = BLOCK_UNITS * px;
      for (let i = 0; i < ob.stack; i++) {
        blit(
          BLOCK,
          ob.x,
          groundY - (i + 1) * bu,
          bu / 16,
          A_SPRITE,
          GLYPHS[(ob.glyph + i) % GLYPHS.length]
        );
      }
    }

    // Runner. Legs swap on distance so the cadence tracks speed, not wall time.
    const bodyH = RUNNER_BODY.length * px;
    const feet = groundY - world.playerY;
    blit(RUNNER_BODY, playerX, feet - bodyH - 2 * px, px, A_SPRITE);
    const legs = !world.grounded
      ? RUNNER_LEGS_AIR
      : Math.floor(world.dist / (28 * S)) % 2
        ? RUNNER_LEGS_A
        : RUNNER_LEGS_B;
    blit(legs, playerX, feet - 2 * px, px, A_SPRITE);

    if (!(p.showHud ?? showHud)) return;

    // HUD, right aligned. Font pixel measured at ~2.85 CSS px against the
    // 4.8 CSS art pixel.
    const fpx = 2.85 * S;
    const text = (s: string, rightX: number, y: number, alpha: number) => {
      const cw = 4 * fpx;
      const total = s.length * cw - fpx;
      let x = rightX - total;
      ctx.fillStyle = inkAt(alpha);
      for (const ch of s) {
        const g = FONT[ch] ?? FONT[" "];
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 3; c++) {
            if (g[r][c] === "#") {
              ctx.fillRect(
                Math.round(x + c * fpx),
                Math.round(y + r * fpx),
                Math.round(x + (c + 1) * fpx) - Math.round(x + c * fpx),
                Math.round(y + (r + 1) * fpx) - Math.round(y + r * fpx)
              );
            }
          }
        }
        x += cw;
      }
    };
    const pad = (n: number) => String(Math.floor(n)).padStart(5, "0").slice(-5);
    const rightBest = w - 77 * S;
    const rightScore = rightBest - 190 * S;
    const labelY = h * 0.07;
    const valueY = h * 0.133;
    text("SCORE", rightScore, labelY, A_HUD_LABEL);
    text(pad(world.score), rightScore, valueY, A_HUD_VALUE);
    text("BEST", rightBest, labelY, A_HUD_LABEL);
    text(pad(world.best), rightBest, valueY, A_HUD_VALUE);
  }

  /** When is the player high enough to be over a `stack`-tall block, and how
   *  long do the two collision boxes overlap in x?
   *
   *  A fixed "jump at 0.42 of the flight" lead cannot answer that: it knows
   *  nothing about how TALL or how WIDE the block is. It cleared the front
   *  face of a 3-stack and then came down 0.6 px into the back corner — a
   *  crash that reads as the autopilot simply failing, one frame from fine.
   *
   *  y(t) = v t - g t^2 / 2, so the player is above the block between the two
   *  roots of y(t) = stack * bu. The boxes overlap in x while the block travels
   *  the player's box width plus its own. Clearable iff that window fits inside
   *  those roots with margin. */
  function jumpWindow(stack: number, sp: number, S: number) {
    const p = propsRef.current;
    const px = ART * S;
    const v = (p.jump ?? jump) * S;
    const g = (p.gravity ?? gravity) * S;
    const top = stack * BLOCK_UNITS * px;
    const disc = v * v - 2 * g * top;
    // Overlap runs from box.x === pl.x + pl.w to box.x + box.w === pl.x.
    const tX = (10 * px + BLOCK_UNITS * px * 0.76) / sp;
    if (disc <= 0) return { ok: false, lead: 0 };
    const root = Math.sqrt(disc);
    const t1 = (v - root) / g;
    const t2 = (v + root) / g;
    // Centre the crossing in the window, so a late frame at either end still
    // has room. Needs 25% headroom to count as clearable at all.
    return { ok: t2 - t1 > tX * 1.25, lead: t1 + (t2 - t1 - tX) / 2 };
  }

  function step(dt: number, w: number, h: number) {
    const world = worldRef.current!;
    const p = propsRef.current;
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    const px = ART * S;
    const groundY = h * GROUND_RATIO;
    const playerX = w * 0.08;

    world.t += dt;
    idleRef.current += dt;

    if (world.dead) {
      // Freeze on the crash, then pick straight back up. No overlay: the brief
      // for this port is the game only, no chrome text.
      if (world.t - world.deadAt > 0.9) {
        const best = Math.max(world.best, world.score);
        const played = world.played;
        worldRef.current = fresh(best, played);
        seed(worldRef.current, w, h);
      }
      return;
    }

    const base = p.startSpeed ?? startSpeed;
    const cap = Math.max(base, p.maxSpeed ?? maxSpeed);
    const sp = Math.min(cap, base + world.dist / 260) * S;
    world.speed = sp;
    world.dist += sp * dt;
    world.score = world.dist / 24;

    // Player.
    if (!world.grounded) {
      world.playerV -= (p.gravity ?? gravity) * S * dt;
      world.playerY += world.playerV * dt;
      if (world.playerY <= 0) {
        world.playerY = 0;
        world.playerV = 0;
        world.grounded = true;
      }
    }

    // Obstacles in, obstacles out.
    for (const ob of world.obstacles) ob.x -= sp * dt;
    world.obstacles = world.obstacles.filter((o) => o.x > -20 * px);
    const last = world.obstacles.length
      ? Math.max(...world.obstacles.map((o) => o.x))
      : -Infinity;
    // The gap is DERIVED, not a constant. Flight time is 2v/g and does not
    // shorten as the run speeds up, so a fixed 430-850 gap gets overtaken:
    // at the 980 cap the jump spans 1223 px against a 468 px minimum gap, and
    // the player comes down inside the next block's column. Nothing standing
    // on the ground can survive that, autopilot or not. Ask the physics how
    // far the jump actually travels and leave room to land clear of it.
    const flight = 2 * (p.jump ?? jump) / (p.gravity ?? gravity);
    const clear = (sp / S) * flight + (BLOCK_UNITS + 20) * ART;
    if (last < w - (clear + world.nextGap) * S) {
      const r = rng(world);
      let stack = r < 0.55 ? 1 : r < 0.87 ? 2 : 3;
      // Never spawn what the current Jump / Gravity / speed cannot clear. The
      // dials reach combinations where a 3-stack — or at the slowest speeds
      // any stack — is geometrically unjumpable, and spawning one is a
      // guaranteed crash dressed up as gameplay. Step down instead; if even a
      // single block is impossible, spawn nothing and let the dials show it.
      while (stack > 0 && !jumpWindow(stack, sp, S).ok) stack--;
      if (stack > 0) {
        world.obstacles.push({
          x: w + 8 * px,
          stack,
          glyph: Math.floor(rng(world) * GLYPHS.length),
        });
      }
      // Random EXTRA on top of the derived clearance, not the whole gap.
      world.nextGap = rng(world) * 380;
    }

    // Clouds.
    for (const cl of world.clouds) cl.x -= sp * dt * (0.12 + 0.22 * cl.depth);
    world.clouds = world.clouds.filter((c) => c.x > -30 * px);
    if (world.clouds.length < 5 && rng(world) < 0.012) {
      world.clouds.push({
        x: w + 10 * px,
        y: 0.1 + rng(world) * 0.42,
        scale: 0.75 + rng(world) * 0.9,
        depth: rng(world),
      });
    }

    // Autopilot. On until a human takes over, and BACK ON once they stop:
    // `played` alone was a one-way latch, so a single pointerdown — selecting
    // the component on the canvas is one — ended self-play for good and the
    // runner then stood still and died on obstacle one, every life, forever.
    const auto =
      (p.attract ?? attract) &&
      (!world.played || idleRef.current > IDLE_RESUME);
    if (auto && world.grounded) {
      // Measure against the COLLISION boxes below, never the 16-px sprite.
      // The old test was `next.x - (playerX + 16 * px) > 0`, i.e. the block had
      // to clear the player's whole sprite width before a jump was allowed —
      // so on the frame after a landing that put a block inside one player
      // width, the autopilot refused to jump at all and walked into it.
      const bu = BLOCK_UNITS * px;
      const plFront = playerX + 13 * px; // pl.x + pl.w, see collision below
      let next: Obstacle | null = null;
      let gap = Infinity;
      for (const ob of world.obstacles) {
        const left = ob.x + bu * 0.12;
        if (left + bu * 0.76 <= plFront) continue; // already behind
        if (left - plFront < gap) {
          gap = left - plFront;
          next = ob;
        }
      }
      // Lead is solved for THIS block's height and width (see jumpWindow), not
      // a flat fraction of the flight time, so the crossing sits in the middle
      // of the interval the player is actually above it.
      if (next) {
        const win = jumpWindow(next.stack, sp, S);
        if (win.ok && gap <= sp * win.lead) doJump();
      }
    }

    // Collision, in the art-pixel boxes actually drawn. Insets keep the round
    // sprite from clipping on its transparent corners.
    const pl = {
      x: playerX + 3 * px,
      y: groundY - world.playerY - 16 * px + 2 * px,
      w: 10 * px,
      h: 14 * px,
    };
    for (const ob of world.obstacles) {
      const bu = BLOCK_UNITS * px;
      const box = {
        x: ob.x + bu * 0.12,
        y: groundY - ob.stack * bu,
        w: bu * 0.76,
        h: ob.stack * bu,
      };
      if (
        pl.x < box.x + box.w &&
        pl.x + pl.w > box.x &&
        pl.y < box.y + box.h &&
        pl.y + pl.h > box.y
      ) {
        world.dead = true;
        world.deadAt = world.t;
        world.best = Math.max(world.best, world.score);
        break;
      }
    }
  }

  /** Pre-populate so the very first painted frame is a live scene, not an
   *  empty field — a still capture has no time to fill itself in. */
  function seed(world: World, w: number, h: number) {
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    const px = ART * S;
    world.clouds = [
      { x: w * 0.17, y: 0.18, scale: 1.15, depth: 0.2 },
      { x: w * 0.44, y: 0.11, scale: 0.85, depth: 0.7 },
      { x: w * 0.78, y: 0.26, scale: 1.35, depth: 0.45 },
    ];
    // Through the same clamp the spawner uses. Hard-coding the opening pair
    // meant that at any dial setting they were unjumpable, the seeded blocks
    // killed the runner, the respawn laid down the SAME two, and the whole
    // component became a crash loop on obstacle one.
    const sp = (propsRef.current.startSpeed ?? startSpeed) * S;
    world.obstacles = [];
    for (const [at, want, glyph] of [
      [0.62, 2, 0],
      [1.02, 1, 2],
    ] as [number, number, number][]) {
      let stack = want;
      while (stack > 0 && !jumpWindow(stack, sp, S).ok) stack--;
      if (stack > 0) world.obstacles.push({ x: w * at, stack, glyph });
    }
    world.dist = 40 * px;
  }

  function doJump() {
    const world = worldRef.current;
    if (!world || world.dead || !world.grounded) return;
    const p = propsRef.current;
    const host = hostRef.current;
    const h = host ? host.clientHeight || REF_H : REF_H;
    const w = host ? host.clientWidth || REF_W : REF_W;
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    world.playerV = (p.jump ?? jump) * S;
    world.grounded = false;
  }

  useLayoutEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    /** Framer spreads its own width/height over the element, so a declared
     *  aspect-ratio would lose. The box is measured, never assumed.
     *
     *  Measured in clientWidth/clientHeight, which are UNSCALED layout pixels.
     *  getBoundingClientRect is post-transform, and the builder stage renders
     *  the component under a CSS scale — feeding that rect back as the canvas
     *  CSS size shrinks the canvas by the scale factor (measured 590 against a
     *  1100 layout box at 54%), leaving the game drawn into half its container. */
    const measure = () => {
      const r = host.getBoundingClientRect();
      const cw = Math.max(1, Math.round(host.clientWidth || r.width || REF_W));
      const ch = Math.max(1, Math.round(host.clientHeight || r.height || REF_H));
      if (cw === w && ch === h) return false;
      w = cw;
      h = ch;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };

    measure();
    if (!worldRef.current!.obstacles.length) seed(worldRef.current!, w, h);

    // Paint frame zero BEFORE anything decides whether to animate. A static
    // render never runs the loop, and this is the difference between a correct
    // still and an empty one.
    paint(ctx, w, h);

    const ro = new ResizeObserver(() => {
      if (measure()) paint(ctx, w, h);
    });
    ro.observe(host);

    lastRef.current = 0;
    const frame = (now: number) => {
      const prev = lastRef.current || now;
      lastRef.current = now;
      const dt = Math.min(0.05, (now - prev) / 1000);
      if (dt > 0) step(dt, w, h);
      paint(ctx, w, h);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Input. Space/up/click/tap all jump and hand control over from the autopilot
  // — but only for as long as someone keeps playing. `IDLE_RESUME` seconds of
  // silence and the autopilot takes it back, so a stray click cannot leave the
  // runner standing in front of obstacle one for the rest of the session.
  useEffect(() => {
    const host = hostRef.current;

    const play = () => {
      const world = worldRef.current;
      if (world) world.played = true;
      idleRef.current = 0;
    };

    // Space and ArrowUp are the page's scroll keys. Claiming them on `window`
    // for a component nobody is looking at breaks scrolling on the whole site
    // AND silently steals the wheel from the autopilot. Only answer when the
    // pointer is over this component or it holds focus.
    const onKey = (e: KeyboardEvent) => {
      const mine =
        hoverRef.current ||
        (host !== null && typeof document !== "undefined" && document.activeElement === host);
      if (!mine) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        play();
        doJump();
      }
    };
    const onPointer = (e: Event) => {
      e.preventDefault();
      play();
      doJump();
    };
    const onEnter = () => {
      hoverRef.current = true;
    };
    const onLeave = () => {
      hoverRef.current = false;
    };

    window.addEventListener("keydown", onKey, { passive: false });
    host?.addEventListener("pointerdown", onPointer);
    host?.addEventListener("pointerenter", onEnter);
    host?.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      host?.removeEventListener("pointerdown", onPointer);
      host?.removeEventListener("pointerenter", onEnter);
      host?.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 120,
        overflow: "hidden",
        background,
        touchAction: "manipulation",
        cursor: "pointer",
        outline: "none",
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

const __presetProps = {
  "background": "#00164C",
  "ink": "#ffffff",
  "startSpeed": 420,
  "maxSpeed": 980,
  "gravity": 4780,
  "jump": 1480,
  "farDashSpeed": 100,
  "showHud": true,
  "attract": true
};

export default function PixelRunGame(props: Record<string, unknown>) {
  return <__BaseImpl_PixelRunGame {...(__presetProps as Record<string, unknown>)} {...props} />;
}
