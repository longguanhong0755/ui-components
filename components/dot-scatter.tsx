"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  type Transition,
} from "framer-motion";

export type Target = {
  x: number;
  y: number;
  w: number;
  s: number;
  letterIndex: number;
};

export type TextTargetOptions = {
  cellScale: number;
  fillRatio: number;
  letterGap: number;
  maxWidth: number;
};

export type ScatterMode = "word" | "cursorRadius";

type Props = {
  text?: string;
  color?: string;
  background?: string;
  letterGap?: number;
  variant?: ScatterMode;
  cursorRadius?: number;
  style?: React.CSSProperties;
};

type Size = { width: number; height: number };

type ActiveScatter = {
  variant: ScatterMode;
  markIndices: Set<number>;
};

type Mark = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Glyph = {
  width: number;
  marks: Mark[];
};

const PAPER_CELL_SIZE = 13;
const PAPER_DOT_SIZE = 9;
const PAPER_GLYPH_HEIGHT = 132;
const REFERENCE_WIDTH = 720;
const REFERENCE_HEIGHT = 405;
const REFERENCE_DOT_SIZE = 8.6;

const DEFAULT_TEXT_OPTIONS: TextTargetOptions = {
  cellScale: 1.65,
  fillRatio: 0.56,
  letterGap: 0.9,
  maxWidth: 0.94,
};

const mark = (
  x: number,
  y: number,
  width = PAPER_DOT_SIZE,
  height = PAPER_DOT_SIZE
): Mark => ({ x, y, width, height });

const glyph = (marks: Mark[]): Glyph => {
  const width = Math.max(...marks.map((item) => item.x + item.width));
  return { width, marks };
};

const GLYPHS: Record<string, Glyph> = {
  " ": { width: PAPER_CELL_SIZE * 2, marks: [] },

  a: glyph([
    mark(10, 27, 28, 9),
    mark(0, 41, 10, 9),
    mark(38, 41, 10, 9),
    mark(29, 54, 18, 9),
    mark(38, 67, 9, 10),
    mark(10, 68, 19, 9),
    mark(0, 81, 10, 10),
    mark(38, 81, 9, 10),
    mark(9, 95, 29, 9),
    mark(47, 95, 10, 9),
  ]),

  b: glyph([
    mark(0, 0, 9, 9),
    mark(0, 13, 9, 10),
    mark(0, 27, 9, 10),
    mark(19, 27, 28, 9),
    mark(0, 41, 19, 9),
    mark(47, 41, 10, 9),
    mark(0, 54, 9, 10),
    mark(47, 54, 10, 10),
    mark(0, 68, 9, 9),
    mark(47, 68, 10, 9),
    mark(0, 81, 19, 10),
    mark(47, 81, 10, 10),
    mark(0, 95, 9, 9),
    mark(19, 95, 28, 9),
  ]),

  c: glyph([
    mark(10, 27, 28, 9),
    mark(0, 41, 9, 9),
    mark(38, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(0, 68, 9, 9),
    mark(0, 81, 9, 10),
    mark(38, 81, 9, 10),
    mark(10, 95, 27, 9),
  ]),

  d: glyph([
    mark(48, 0, 9, 9),
    mark(48, 13, 9, 10),
    mark(48, 27, 9, 10),
    mark(10, 27, 28, 9),
    mark(38, 41, 19, 9),
    mark(0, 41, 10, 9),
    mark(48, 54, 9, 10),
    mark(0, 54, 10, 10),
    mark(48, 68, 9, 9),
    mark(0, 68, 10, 9),
    mark(38, 81, 19, 10),
    mark(0, 81, 10, 10),
    mark(48, 95, 9, 9),
    mark(10, 95, 28, 9),
  ]),

  e: glyph([
    mark(9, 27, 38, 9),
    mark(0, 41, 9, 9),
    mark(47, 41, 10, 9),
    mark(0, 54, 56, 9),
    mark(0, 68, 9, 9),
    mark(0, 81, 9, 10),
    mark(47, 81, 10, 10),
    mark(10, 95, 37, 9),
  ]),

  f: glyph([
    mark(10, 0, 28, 9),
    mark(0, 13, 9, 9),
    mark(0, 27, 9, 9),
    mark(10, 27, 38, 9),
    mark(0, 41, 9, 9),
    mark(0, 54, 38, 9),
    mark(0, 67, 9, 9),
    mark(0, 81, 9, 9),
    mark(0, 95, 9, 9),
  ]),

  g: glyph([
    mark(10, 27, 38, 9),
    mark(0, 41, 9, 9),
    mark(48, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(48, 54, 9, 9),
    mark(0, 67, 9, 9),
    mark(48, 67, 9, 9),
    mark(10, 81, 38, 9),
    mark(48, 95, 9, 9),
    mark(48, 108, 9, 9),
    mark(20, 122, 28, 9),
  ]),

  h: glyph([
    mark(0, 0, 9, 9),
    mark(0, 13, 9, 9),
    mark(0, 27, 9, 9),
    mark(19, 27, 28, 9),
    mark(0, 41, 9, 9),
    mark(47, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(47, 54, 9, 9),
    mark(0, 67, 9, 9),
    mark(47, 67, 9, 9),
    mark(0, 81, 9, 9),
    mark(47, 81, 9, 9),
    mark(0, 95, 9, 9),
    mark(47, 95, 9, 9),
  ]),

  i: glyph([
    mark(0, 0, 19, 9),
    mark(0, 27, 19, 9),
    mark(10, 41, 9, 9),
    mark(10, 54, 9, 9),
    mark(10, 67, 9, 10),
    mark(10, 81, 9, 10),
    mark(10, 95, 9, 9),
  ]),

  j: glyph([
    mark(0, 0, 19, 9),
    mark(0, 27, 19, 9),
    mark(10, 41, 9, 9),
    mark(10, 54, 9, 9),
    mark(10, 67, 9, 10),
    mark(10, 81, 9, 10),
    mark(10, 95, 9, 9),
    mark(0, 108, 9, 9),
    mark(0, 122, 19, 9),
  ]),

  k: glyph([
    mark(0, 0, 9, 9),
    mark(0, 13, 9, 9),
    mark(0, 27, 9, 9),
    mark(0, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(0, 67, 9, 9),
    mark(0, 81, 9, 9),
    mark(0, 95, 9, 9),
    mark(38, 27, 9, 9),
    mark(19, 41, 19, 9),
    mark(0, 54, 28, 9),
    mark(19, 67, 19, 9),
    mark(38, 81, 9, 9),
    mark(57, 95, 9, 9),
  ]),

  l: glyph([
    mark(0, 0, 10, 9),
    mark(1, 13, 9, 10),
    mark(0, 27, 10, 10),
    mark(1, 41, 9, 9),
    mark(0, 54, 10, 9),
    mark(0, 67, 10, 10),
    mark(0, 81, 10, 10),
    mark(10, 95, 10, 9),
  ]),

  m: glyph([
    mark(19, 27, 9, 10),
    mark(38, 27, 18, 10),
    mark(66, 27, 28, 9),
    mark(19, 41, 19, 9),
    mark(57, 41, 19, 9),
    mark(94, 41, 10, 9),
    mark(18, 54, 10, 9),
    mark(56, 54, 10, 10),
    mark(94, 54, 10, 9),
    mark(18, 67, 10, 10),
    mark(56, 67, 10, 10),
    mark(95, 67, 9, 10),
    mark(18, 81, 10, 10),
    mark(56, 81, 10, 10),
    mark(95, 81, 9, 10),
    mark(18, 95, 10, 9),
    mark(56, 95, 10, 9),
    mark(94, 95, 10, 9),
  ]),

  n: glyph([
    mark(0, 27, 9, 9),
    mark(19, 27, 28, 9),
    mark(0, 41, 9, 9),
    mark(47, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(47, 54, 9, 9),
    mark(0, 67, 9, 9),
    mark(47, 67, 9, 9),
    mark(0, 81, 9, 9),
    mark(47, 81, 9, 9),
    mark(0, 95, 9, 9),
    mark(47, 95, 9, 9),
  ]),

  o: glyph([
    mark(10, 27, 38, 9),
    mark(0, 41, 10, 9),
    mark(48, 41, 10, 9),
    mark(0, 54, 10, 9),
    mark(48, 54, 10, 10),
    mark(1, 67, 9, 10),
    mark(48, 67, 10, 10),
    mark(0, 81, 10, 10),
    mark(48, 81, 10, 10),
    mark(10, 95, 38, 9),
  ]),

  p: glyph([
    mark(0, 27, 9, 10),
    mark(19, 27, 28, 9),
    mark(0, 41, 19, 9),
    mark(47, 41, 10, 9),
    mark(0, 54, 9, 10),
    mark(47, 54, 10, 10),
    mark(0, 68, 9, 9),
    mark(47, 68, 10, 9),
    mark(0, 81, 19, 10),
    mark(47, 81, 10, 10),
    mark(0, 95, 9, 9),
    mark(19, 95, 28, 9),
    mark(0, 108, 9, 9),
    mark(0, 122, 9, 9),
  ]),

  q: glyph([
    mark(48, 27, 9, 10),
    mark(10, 27, 28, 9),
    mark(38, 41, 19, 9),
    mark(0, 41, 10, 9),
    mark(48, 54, 9, 10),
    mark(0, 54, 10, 10),
    mark(48, 68, 9, 9),
    mark(0, 68, 10, 9),
    mark(38, 81, 19, 10),
    mark(0, 81, 10, 10),
    mark(48, 95, 9, 9),
    mark(10, 95, 28, 9),
    mark(48, 108, 9, 9),
    mark(48, 122, 9, 9),
  ]),

  r: glyph([
    mark(1, 27, 9, 10),
    mark(20, 27, 18, 10),
    mark(1, 41, 18, 9),
    mark(1, 54, 9, 10),
    mark(0, 67, 10, 10),
    mark(1, 81, 9, 10),
    mark(0, 95, 10, 9),
  ]),

  s: glyph([
    mark(10, 27, 28, 10),
    mark(0, 40, 10, 10),
    mark(38, 40, 10, 10),
    mark(10, 54, 19, 10),
    mark(29, 67, 19, 10),
    mark(0, 81, 10, 10),
    mark(38, 81, 10, 10),
    mark(10, 95, 28, 9),
  ]),

  t: glyph([
    mark(19, 0, 9, 9),
    mark(19, 13, 9, 9),
    mark(0, 27, 57, 9),
    mark(19, 41, 9, 9),
    mark(19, 54, 9, 9),
    mark(19, 67, 9, 9),
    mark(19, 81, 9, 9),
    mark(19, 95, 28, 9),
    mark(57, 95, 9, 9),
  ]),

  u: glyph([
    mark(0, 27, 10, 10),
    mark(48, 27, 9, 9),
    mark(0, 40, 10, 10),
    mark(48, 41, 9, 9),
    mark(0, 54, 10, 9),
    mark(48, 54, 9, 9),
    mark(48, 67, 9, 10),
    mark(0, 68, 10, 9),
    mark(0, 81, 10, 10),
    mark(38, 81, 19, 10),
    mark(10, 95, 28, 9),
    mark(48, 95, 9, 9),
  ]),

  v: glyph([
    mark(0, 27, 9, 9),
    mark(48, 27, 9, 9),
    mark(0, 41, 9, 9),
    mark(48, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(48, 54, 9, 9),
    mark(0, 67, 9, 9),
    mark(48, 67, 9, 9),
    mark(10, 81, 9, 9),
    mark(38, 81, 9, 9),
    mark(19, 95, 19, 9),
  ]),

  w: glyph([
    mark(0, 27, 9, 9),
    mark(76, 27, 9, 9),
    mark(0, 41, 9, 9),
    mark(76, 41, 9, 9),
    mark(0, 54, 9, 9),
    mark(38, 54, 9, 9),
    mark(76, 54, 9, 9),
    mark(0, 67, 9, 9),
    mark(19, 67, 9, 9),
    mark(57, 67, 9, 9),
    mark(76, 67, 9, 9),
    mark(10, 81, 28, 9),
    mark(48, 81, 28, 9),
    mark(19, 95, 9, 9),
    mark(57, 95, 9, 9),
  ]),

  x: glyph([
    mark(0, 27, 9, 9),
    mark(57, 27, 9, 9),
    mark(10, 41, 9, 9),
    mark(47, 41, 9, 9),
    mark(19, 54, 28, 9),
    mark(10, 67, 9, 9),
    mark(47, 67, 9, 9),
    mark(0, 81, 9, 9),
    mark(57, 81, 9, 9),
    mark(0, 95, 9, 9),
    mark(57, 95, 9, 9),
  ]),

  y: glyph([
    mark(0, 27, 10, 10),
    mark(48, 27, 10, 10),
    mark(0, 40, 10, 10),
    mark(48, 40, 9, 10),
    mark(0, 54, 10, 10),
    mark(48, 54, 10, 10),
    mark(0, 67, 10, 10),
    mark(48, 67, 10, 10),
    mark(10, 81, 9, 10),
    mark(38, 81, 10, 10),
    mark(19, 95, 19, 9),
    mark(19, 108, 10, 10),
    mark(0, 122, 19, 9),
  ]),

  z: glyph([
    mark(10, 27, 28, 9),
    mark(38, 41, 9, 9),
    mark(29, 54, 19, 9),
    mark(10, 67, 19, 9),
    mark(0, 81, 9, 9),
    mark(10, 95, 28, 9),
  ]),

  ".": glyph([mark(0, 95)]),
  ",": glyph([mark(0, 95), mark(3, 108)]),
  "-": glyph([mark(0, 54, 19)]),
  "!": glyph([
    mark(0, 27),
    mark(0, 41),
    mark(0, 54),
    mark(0, 67),
    mark(0, 95),
  ]),
  "?": glyph([
    mark(10, 27, 28),
    mark(0, 41),
    mark(38, 41),
    mark(29, 54, 19),
    mark(19, 67),
    mark(19, 95),
  ]),
};

export const SUPPORTED_GLYPHS = Object.keys(GLYPHS).sort((a, b) => {
  if (a === " ") return -1;
  if (b === " ") return 1;
  return a.localeCompare(b);
});

const FALLBACK_GLYPH = glyph([
  mark(10, 27, 28),
  mark(38, 41),
  mark(29, 54, 19),
  mark(19, 81),
]);

const markToTarget = (
  mark: Mark,
  originX: number,
  originY: number,
  cellSize: number,
  dotSize: number,
  letterIndex: number
): Target => {
  const positionScale = cellSize / PAPER_CELL_SIZE;
  const markScale = dotSize / PAPER_DOT_SIZE;

  return {
    x: originX + (mark.x + mark.width / 2) * positionScale,
    y: originY + (mark.y + mark.height / 2) * positionScale,
    w: mark.width * markScale,
    s: mark.height * markScale,
    letterIndex,
  };
};

export const generateTextTargets = (
  word: string,
  width: number,
  height: number,
  options: Partial<TextTargetOptions> = {}
): Target[] => {
  if (!word) return [];

  const config = { ...DEFAULT_TEXT_OPTIONS, ...options };
  const characters = [...word.toLowerCase()];
  const glyphs = characters.map((ch) => GLYPHS[ch] ?? FALLBACK_GLYPH);

  const containerScale = Math.min(
    width / REFERENCE_WIDTH,
    height / REFERENCE_HEIGHT
  );
  const rawDotSize = REFERENCE_DOT_SIZE * containerScale;
  const totalColumns = glyphs.reduce((sum, glyph, index) => {
    return (
      sum +
      glyph.width / PAPER_CELL_SIZE +
      (index === glyphs.length - 1 ? 0 : config.letterGap)
    );
  }, 0);

  const totalRows = PAPER_GLYPH_HEIGHT / PAPER_CELL_SIZE;
  const maxTextWidth = width * config.maxWidth;
  const maxTextHeight = height * 0.72;

  const cellFromWidth = maxTextWidth / Math.max(1, totalColumns);
  const cellFromHeight = maxTextHeight / totalRows;
  const cellSize = Math.min(
    rawDotSize * config.cellScale,
    cellFromWidth,
    cellFromHeight
  );

  const fillRatio = Math.min(0.72, Math.max(0.28, config.fillRatio));
  const dotSize = Math.min(rawDotSize, cellSize * fillRatio);

  const targets: Target[] = [];
  let cursorColumn = 0;

  for (let letterIndex = 0; letterIndex < glyphs.length; letterIndex++) {
    const glyph = glyphs[letterIndex]!;
    for (const mark of glyph.marks) {
      targets.push(
        markToTarget(mark, cursorColumn * cellSize, 0, cellSize, dotSize, letterIndex)
      );
    }
    cursorColumn += glyph.width / PAPER_CELL_SIZE + config.letterGap;
  }

  if (targets.length === 0) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const t of targets) {
    minX = Math.min(minX, t.x - t.w / 2);
    maxX = Math.max(maxX, t.x + t.w / 2);
    minY = Math.min(minY, t.y - t.s / 2);
    maxY = Math.max(maxY, t.y + t.s / 2);
  }

  const textCx = (minX + maxX) / 2;
  const textCy = (minY + maxY) / 2;

  return targets.map((t) => ({
    x: t.x - textCx + width / 2,
    y: t.y - textCy + height / 2,
    w: t.w,
    s: t.s,
    letterIndex: t.letterIndex,
  }));
};

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type ScatterBand = {
  left: number;
  top: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

const SCATTER_BAND_DVH = 0.2;
const CURSOR_RADIUS_PX = 20;

const RETURN_SPRING: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
  mass: 0.65,
};

type WordInfo = {
  letterIndices: number[];
  cx: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const WORD_HIT_SLOP_PX = 12;

const buildWords = (text: string, targets: Target[]): WordInfo[] => {
  const characters = [...text.toLowerCase()];
  const words: WordInfo[] = [];
  let current: number[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const letterSet = new Set(current);
    let sumX = 0;
    let count = 0;
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    for (const t of targets) {
      if (!letterSet.has(t.letterIndex)) continue;
      sumX += t.x;
      count += 1;
      left = Math.min(left, t.x - t.w / 2);
      right = Math.max(right, t.x + t.w / 2);
      top = Math.min(top, t.y - t.s / 2);
      bottom = Math.max(bottom, t.y + t.s / 2);
    }

    if (count === 0) {
      current = [];
      return;
    }

    words.push({
      letterIndices: current,
      cx: sumX / count,
      left,
      right,
      top,
      bottom,
    });
    current = [];
  };

  for (let i = 0; i < characters.length; i++) {
    if (/\s/.test(characters[i]!)) {
      flush();
      continue;
    }
    current.push(i);
  }
  flush();
  return words;
};

const getWordMarkIndices = (
  words: WordInfo[],
  targets: Target[],
  pointerX: number,
  pointerY: number
): Set<number> => {
  if (words.length === 0) return new Set();

  const hoveredWords = words.filter((word) => {
    const verticalSlop = Math.max(WORD_HIT_SLOP_PX, (word.bottom - word.top) * 0.12);

    return (
      pointerX >= word.left - WORD_HIT_SLOP_PX &&
      pointerX <= word.right + WORD_HIT_SLOP_PX &&
      pointerY >= word.top - verticalSlop &&
      pointerY <= word.bottom + verticalSlop
    );
  });

  if (hoveredWords.length === 0) return new Set();

  let nearest = hoveredWords[0]!;
  let best = Infinity;
  for (const word of hoveredWords) {
    const d = Math.abs(word.cx - pointerX);
    if (d < best) {
      best = d;
      nearest = word;
    }
  }

  const letters = new Set(nearest.letterIndices);
  const active = new Set<number>();
  for (let i = 0; i < targets.length; i++) {
    if (letters.has(targets[i]!.letterIndex)) active.add(i);
  }
  return active;
};

const getRadiusMarkIndices = (
  targets: Target[],
  pointerX: number,
  pointerY: number,
  radius = CURSOR_RADIUS_PX
): Set<number> => {
  const r2 = radius * radius;
  const active = new Set<number>();
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    const dx = t.x - pointerX;
    const dy = t.y - pointerY;
    if (dx * dx + dy * dy <= r2) active.add(i);
  }
  return active;
};

const setsEqual = (a: Set<number>, b: Set<number>): boolean => {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
};

const getMaxBandHeightPx = (stageHeight: number): number => {
  if (typeof window === "undefined") return stageHeight * SCATTER_BAND_DVH;
  return Math.min(window.innerHeight * SCATTER_BAND_DVH, stageHeight * 0.9);
};

const buildScatterBand = (
  height: number,
  targets: Target[],
  activeMarkIndices: Set<number>
): ScatterBand => {
  const bandHeight = Math.max(40, getMaxBandHeightPx(height));

  const activeMarks = targets.filter((_, i) => activeMarkIndices.has(i));
  if (activeMarks.length === 0) {
    const cy = height / 2;
    return {
      left: 0,
      top: cy - bandHeight / 2,
      width: 1,
      height: bandHeight,
      cx: 0,
      cy,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const t of activeMarks) {
    minX = Math.min(minX, t.x - t.w / 2);
    maxX = Math.max(maxX, t.x + t.w / 2);
    minY = Math.min(minY, t.y - t.s / 2);
    maxY = Math.max(maxY, t.y + t.s / 2);
  }

  const pad = Math.max(6, (maxX - minX) * 0.04);
  const left = minX - pad;
  const width = Math.max(1, maxX - minX + pad * 2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const top = Math.max(0, Math.min(height - bandHeight, cy - bandHeight / 2));

  return {
    left,
    top,
    width,
    height: bandHeight,
    cx,
    cy,
  };
};

const pickScatterDestination = (
  target: Target,
  band: ScatterBand,
  markW: number,
  markH: number,
  rng: () => number
): { x: number; y: number } => {
  const u1 = Math.max(1e-6, rng());
  const u2 = rng();
  const gx = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let gy = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

  if (target.y <= band.cy) gy -= 0.35;
  else gy += 0.35;

  const spreadX = Math.max(10, markH * 4.8);
  const spreadY = Math.max(10, markH * 6.5);

  let dx = gx * spreadX;
  let dy = gy * spreadY;

  const maxRx = spreadX * 2.15;
  const maxRy = Math.min(band.height * 0.48, spreadY * 2.35);
  const nx = dx / maxRx;
  const ny = dy / maxRy;
  const r2 = nx * nx + ny * ny;
  if (r2 > 1) {
    const s = 1 / Math.sqrt(r2);
    dx *= s;
    dy *= s;
  }

  return {
    x: target.x - markW / 2 + dx,
    y: target.y - markH / 2 + dy,
  };
};

type GlyphMarkProps = {
  target: Target;
  index: number;
  scattered: boolean;
  band: ScatterBand;
  color: string;
  reducedMotion: boolean;
};

const GlyphMark = ({ target, index, scattered, band, color, reducedMotion }: GlyphMarkProps) => {
  const isDot = target.w <= target.s * 1.15;
  const w = isDot ? target.s : target.w;
  const h = target.s;
  const radius = target.s / 2;

  const homeX = target.x - w / 2;
  const homeY = target.y - h / 2;

  const x = useMotionValue(homeX);
  const y = useMotionValue(homeY);
  const velRef = useRef({ vx: 0, vy: 0 });
  const anchorRef = useRef({ x: homeX, y: homeY });
  const brownianRef = useRef(false);
  const wasScatteredRef = useRef(false);
  const animGenRef = useRef(0);
  const animRef = useRef<{ stop: () => void }[]>([]);

  const stopAnims = () => {
    for (const anim of animRef.current) anim.stop();
    animRef.current = [];
  };

  useEffect(() => {
    if (wasScatteredRef.current) return;
    x.set(homeX);
    y.set(homeY);
  }, [homeX, homeY, x, y]);

  useEffect(() => {
    if (reducedMotion) {
      stopAnims();
      animGenRef.current += 1;
      brownianRef.current = false;
      wasScatteredRef.current = false;
      x.set(homeX);
      y.set(homeY);
      return;
    }

    if (scattered && !wasScatteredRef.current) {
      stopAnims();
      brownianRef.current = false;
      wasScatteredRef.current = true;
      const gen = ++animGenRef.current;
      const rng = mulberry32((Date.now() ^ (index * 10007)) >>> 0);
      const dest = pickScatterDestination(target, band, w, h, rng);
      anchorRef.current = { x: dest.x, y: dest.y };

      velRef.current = {
        vx: (rng() - 0.5) * 0.035,
        vy: (rng() - 0.5) * 0.035,
      };

      const ax = animate(x, dest.x, RETURN_SPRING);
      let finished = 0;
      const enableBrownian = () => {
        if (gen !== animGenRef.current) return;
        finished += 1;
        if (finished >= 2) brownianRef.current = true;
      };
      const ay = animate(y, dest.y, {
        ...RETURN_SPRING,
        onComplete: enableBrownian,
      });
      void ax.then(enableBrownian);
      animRef.current = [ax, ay];
    } else if (!scattered && wasScatteredRef.current) {
      stopAnims();
      animGenRef.current += 1;
      brownianRef.current = false;
      wasScatteredRef.current = false;
      velRef.current = { vx: 0, vy: 0 };
      const ax = animate(x, homeX, RETURN_SPRING);
      const ay = animate(y, homeY, RETURN_SPRING);
      animRef.current = [ax, ay];
    }
  }, [scattered, reducedMotion, band, homeX, homeY, index, w, h, x, y, target]);

  useAnimationFrame((_, delta) => {
    if (!brownianRef.current || !scattered || reducedMotion) return;

    const dt = Math.min(delta, 34);
    let { vx, vy } = velRef.current;
    const anchor = anchorRef.current;

    const noise = 0.00045;
    vx += (Math.random() - 0.5) * noise * dt;
    vy += (Math.random() - 0.5) * noise * dt;

    if (Math.random() < 0.03) {
      vx += (Math.random() - 0.5) * 0.06;
      vy += (Math.random() - 0.5) * 0.06;
    }

    let nx = x.get();
    let ny = y.get();
    vx += (anchor.x - nx) * 0.0018 * dt;
    vy += (anchor.y - ny) * 0.0018 * dt;

    const friction = Math.pow(0.9, dt / 16);
    vx *= friction;
    vy *= friction;

    const maxSpeed = 0.12;
    const speed = Math.hypot(vx, vy);
    if (speed > maxSpeed) {
      vx = (vx / speed) * maxSpeed;
      vy = (vy / speed) * maxSpeed;
    }

    nx += vx * dt;
    ny += vy * dt;

    const leashX = Math.max(10, h * 5.2);
    const leashY = Math.max(10, Math.min(band.height * 0.48, h * 7));
    let ox = nx - anchor.x;
    let oy = ny - anchor.y;
    const er = (ox * ox) / (leashX * leashX) + (oy * oy) / (leashY * leashY);
    if (er > 1) {
      const s = 1 / Math.sqrt(er);
      ox *= s;
      oy *= s;
      nx = anchor.x + ox;
      ny = anchor.y + oy;
      vx *= 0.5;
      vy *= 0.5;
    }

    velRef.current = { vx, vy };
    x.set(nx);
    y.set(ny);
  });

  return (
    <motion.rect
      fill={color}
      height={h}
      rx={radius}
      ry={radius}
      style={{ x, y }}
      width={w}
    />
  );
};

export default function ScatterText({
  text = "Scatter",
  color = "#FFFFFF",
  background = "transparent",
  letterGap = 0.9,
  variant = "word",
  cursorRadius = 20,
  style,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 720, height: 405 });
  const [activeScatter, setActiveScatter] = useState<ActiveScatter>(() => ({
    variant,
    markIndices: new Set(),
  }));
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const nextWidth = Math.max(1, element.clientWidth);
      const nextHeight = Math.max(1, element.clientHeight);
      setSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const targets = useMemo(
    () => generateTextTargets(text, size.width, size.height, { letterGap }),
    [text, size.width, size.height, letterGap]
  );

  const activeMarkIndices = useMemo(
    () =>
      activeScatter.variant === variant
        ? activeScatter.markIndices
        : new Set<number>(),
    [activeScatter, variant]
  );

  const words = useMemo(() => buildWords(text, targets), [text, targets]);

  const band = useMemo(
    () => buildScatterBand(size.height, targets, activeMarkIndices),
    [size.height, targets, activeMarkIndices]
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const next =
      variant === "word"
        ? getWordMarkIndices(words, targets, pointerX, pointerY)
        : getRadiusMarkIndices(targets, pointerX, pointerY, Math.max(1, cursorRadius));

    setActiveScatter((previousScatter) => {
      if (previousScatter.variant === variant && setsEqual(previousScatter.markIndices, next)) {
        return previousScatter;
      }

      return { variant, markIndices: next };
    });
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(event);
  };

  const handlePointerLeave = () => {
    setActiveScatter({ variant, markIndices: new Set() });
  };

  return (
    <div
      ref={containerRef}
      aria-label={text}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      role="img"
      style={{
        position: "relative",
        isolation: "isolate",
        height: "100%",
        minHeight: 200,
        width: "100%",
        touchAction: "manipulation",
        overflow: "hidden",
        background,
        cursor: reducedMotion ? "default" : "pointer",
        ...style,
      }}
    >
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        width={size.width}
      >
        {targets.map((target, index) => (
          <GlyphMark
            key={index}
            band={band}
            color={color}
            index={index}
            reducedMotion={reducedMotion}
            scattered={activeMarkIndices.has(index)}
            target={target}
          />
        ))}
      </svg>
    </div>
  );
}
