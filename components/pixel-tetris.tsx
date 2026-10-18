"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Fallback swatches when the colors list is left empty.
const FALLBACK_COLORS = ["#F9731A", "#FFFFFF"];
// A cleared row flashes white this many times before it collapses away.
const CLEAR_BLINKS = 2;
const BLINK_MS = 90;

// The seven tetromino shapes, each a list of [col, row] cells in its spawn
// rotation. Rotation is computed on the fly, so only the base form lives here.
const SHAPES: Array<Array<[number, number]>> = [
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ], // I
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // J
  [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // L
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ], // S
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ], // Z
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], // T
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ], // O
];

// Seeded PRNG so a board of a given size always plays out the same way.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Colors arrive as hex or rgb/rgba; fold either to [r, g, b, a]. */
function parseColor(color: string): [number, number, number, number] {
  const value = (color ?? "").trim();
  const hex = value.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      1,
    ];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(",").map((p) => parseFloat(p));
    return [
      parts[0] || 0,
      parts[1] || 0,
      parts[2] || 0,
      parts[3] === undefined ? 1 : parts[3],
    ];
  }
  return [255, 255, 255, 1];
}

const rgba = (c: [number, number, number, number], alpha: number) =>
  `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] * alpha})`;

interface TetrisProps {
  boardColor?: string;
  colors?: string[];
  movement?: number;
  cellSize?: number;
  gap?: number;
  rounded?: number;
  dropSpeed?: number;
  style?: CSSProperties;
}

interface Piece {
  shape: number; // index into SHAPES
  cells: Array<[number, number]>; // rotated cells, offset by [col, row]
  color: number; // index into the parsed colour list
  col: number;
  row: number;
  // The piece glides from a spawn column/row to the resting cell the AI chose.
  startCol: number;
  startRow: number;
  targetCol: number;
  targetRow: number;
}

/**
 * A self-playing tetris board that fills the frame it is given, gridded from its
 * top-left corner at whatever Cell Size works out to. Pieces spawn at the top, an AI
 * picks the column and rotation that packs the stack tightest, and the piece
 * slides down into place. Whenever a row fills across, it flashes and breaks
 * away, and everything above it drops down. When the stack tops out, the board
 * clears and play starts over.
 */
function __BaseImpl_Tetris(props: TetrisProps) {
  const {
    boardColor = "rgba(255, 255, 255, 0.06)",
    colors = ["#F9731A", "#FFFFFF"],
    movement = 4,
    cellSize = 29,
    gap = 1,
    rounded = 20,
    dropSpeed = 2,
    style,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    const boardRGB = parseColor(boardColor);
    // Every block colour, parsed once. Empty list falls back to defaults.
    const source = colors && colors.length ? colors : FALLBACK_COLORS;
    const blockRGB = source.map(parseColor);

    const rand = mulberry32(0x7e7415);
    const pitch = cellSize + gap;
    // How often a settling piece steps down one row, in ms.
    const dropEvery = 1000 / Math.max(1, dropSpeed * 4);
    // 0 → drop straight into place; 10 → spawn a full board-width away and
    // glide over. Scales the random horizontal offset the piece starts from.
    const wander = Math.min(10, Math.max(0, movement)) / 10;

    let alive = true;
    let raf = 0;
    let last = 0;
    let dropAcc = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    // Cell size the board actually draws at. Whole cells rarely divide the
    // board exactly at the requested size, so the count is taken first and
    // the cells are then sized to fill what is there — every cell identical,
    // none half-drawn, nothing past the edge.
    let cellW = 0;
    let cellH = 0;
    let pitchX = 0;
    let pitchY = 0;
    let cellRadius = 0;
    // Locked cells: colour index into blockRGB if filled, -1 if empty.
    let grid: number[] = [];
    let piece: Piece | null = null;
    // Rows currently flashing before they collapse. Empty when nothing clears.
    let clearing: number[] = [];
    let clearMs = 0;

    const at = (col: number, row: number) => grid[row * cols + col];

    /** Rotate a base shape 0-3 quarter-turns inside its bounding box. */
    function rotate(shape: number, turns: number): Array<[number, number]> {
      let cells = SHAPES[shape].map(([c, r]) => [c, r] as [number, number]);
      for (let t = 0; t < turns; t++) {
        let maxRow = 0;
        for (const [, r] of cells) maxRow = Math.max(maxRow, r);
        // (c, r) -> (maxRow - r, c) turns the box a quarter clockwise.
        cells = cells.map(([c, r]) => [maxRow - r, c] as [number, number]);
      }
      // Re-seat against the top-left so col/row offsets stay clean.
      let minC = Infinity;
      let minR = Infinity;
      for (const [c, r] of cells) {
        minC = Math.min(minC, c);
        minR = Math.min(minR, r);
      }
      return cells.map(([c, r]) => [c - minC, r - minR] as [number, number]);
    }

    /** Does a set of cells sit on empty, in-bounds squares? */
    function fits(cells: Array<[number, number]>, col: number, row: number) {
      for (const [c, r] of cells) {
        const gc = col + c;
        const gr = row + r;
        if (gc < 0 || gc >= cols || gr >= rows) return false;
        if (gr >= 0 && at(gc, gr) !== -1) return false;
      }
      return true;
    }

    /** Lowest row a shape can rest at from a given column. -1 if it can't. */
    function landing(cells: Array<[number, number]>, col: number): number {
      if (!fits(cells, col, 0)) return -1;
      let row = 0;
      while (fits(cells, col, row + 1)) row++;
      return row;
    }

    /** Score a resting placement — higher is a tighter, flatter pack. */
    function score(cells: Array<[number, number]>, col: number, row: number) {
      // Drop the piece into a scratch copy and read the stack back.
      const test = grid.slice();
      for (const [c, r] of cells) {
        const gr = row + r;
        if (gr >= 0) test[gr * cols + (col + c)] = 1;
      }

      let lines = 0;
      for (let r = 0; r < rows; r++) {
        let full = true;
        for (let c = 0; c < cols; c++) {
          if (test[r * cols + c] === -1) {
            full = false;
            break;
          }
        }
        if (full) lines++;
      }

      let aggHeight = 0;
      let holes = 0;
      let bump = 0;
      let prevTop = -1;
      for (let c = 0; c < cols; c++) {
        let top = rows;
        for (let r = 0; r < rows; r++) {
          if (test[r * cols + c] !== -1) {
            top = r;
            break;
          }
        }
        const height = rows - top;
        aggHeight += height;
        for (let r = top + 1; r < rows; r++) {
          if (test[r * cols + c] === -1) holes++;
        }
        if (prevTop >= 0) bump += Math.abs(top - prevTop);
        prevTop = top;
      }

      // Weights are the well-worn Dellacherie-style set: reward clears,
      // punish height, holes, and a jagged surface.
      return lines * 4.0 - aggHeight * 0.5 - holes * 3.5 - bump * 0.3;
    }

    /** Pick the best column + rotation for the next shape and spawn it. */
    function spawn() {
      const shape = Math.floor(rand() * SHAPES.length);
      let bestCells: Array<[number, number]> | null = null;
      let bestCol = 0;
      let bestRow = 0;
      let bestScore = -Infinity;

      for (let turn = 0; turn < 4; turn++) {
        const cells = rotate(shape, turn);
        let width = 0;
        for (const [c] of cells) width = Math.max(width, c);
        for (let col = 0; col + width < cols; col++) {
          const row = landing(cells, col);
          if (row < 0) continue;
          const s = score(cells, col, row);
          if (s > bestScore) {
            bestScore = s;
            bestCells = cells;
            bestCol = col;
            bestRow = row;
          }
        }
      }

      // Nowhere to land — the stack has reached the ceiling. Wipe and restart.
      if (!bestCells) {
        grid = new Array(cols * rows).fill(-1);
        piece = null;
        return;
      }

      // Spawn fully above the board so the fall reads as motion. Wander
      // pushes the spawn column sideways off the target, and the piece
      // glides back to it on the way down — bigger Movement, farther swing.
      let startRow = 0;
      let width = 0;
      for (const [c, r] of bestCells) {
        startRow = Math.max(startRow, r);
        width = Math.max(width, c);
      }
      startRow = -1 - startRow;
      // Keep the whole piece inside the walls: the spawn column can range
      // from 0 to cols-1-width, so no cell ever starts or glides off-board.
      const maxCol = cols - 1 - width;
      const swing = Math.round((rand() * 2 - 1) * wander * cols);
      const startCol = Math.min(maxCol, Math.max(0, bestCol + swing));
      const color =
        blockRGB.length > 1 ? Math.floor(rand() * blockRGB.length) : 0;
      piece = {
        shape,
        cells: bestCells,
        color,
        col: startCol,
        row: startRow,
        startCol,
        startRow,
        targetCol: bestCol,
        targetRow: bestRow,
      };
    }

    function lock() {
      if (!piece) return;
      for (const [c, r] of piece.cells) {
        const gr = piece.row + r;
        const gc = piece.col + c;
        if (gr >= 0 && gr < rows && gc >= 0 && gc < cols) {
          grid[gr * cols + gc] = piece.color;
        }
      }
      piece = null;

      // Collect any rows that filled all the way across.
      const full: number[] = [];
      for (let r = 0; r < rows; r++) {
        let solid = true;
        for (let c = 0; c < cols; c++) {
          if (grid[r * cols + c] === -1) {
            solid = false;
            break;
          }
        }
        if (solid) full.push(r);
      }
      if (full.length) {
        clearing = full;
        clearMs = CLEAR_BLINKS * BLINK_MS * 2;
      }
    }

    /** Remove the flashing rows and drop everything above them down. */
    function collapse() {
      const gone = new Set(clearing);
      const next = new Array(cols * rows).fill(-1);
      let write = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        if (gone.has(r)) continue;
        for (let c = 0; c < cols; c++) {
          next[write * cols + c] = grid[r * cols + c];
        }
        write--;
      }
      grid = next;
      clearing = [];
    }

    function build() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      // The board is whatever size the frame gives it — clientWidth, not
      // the bounding rect, so a zoomed canvas doesn't shrink the grid.
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // How many WHOLE cells fit at the requested size: n cells span
      // n * cellSize + (n - 1) * gap, so n = (w + gap) / pitch, rounded down.
      cols = Math.max(4, Math.floor((w + gap) / pitch));
      rows = Math.max(6, Math.floor((h + gap) / pitch));
      // Then size the cells to that count, so the grid runs from the
      // top-left corner to the far edge exactly. The remainder is spread
      // across every cell instead of left over as a strip or a half cell,
      // and the clamp keeps a board that is too small for its cells sane.
      cellW = Math.max(1, (w - gap * (cols - 1)) / cols);
      cellH = Math.max(1, (h - gap * (rows - 1)) / rows);
      pitchX = cellW + gap;
      pitchY = cellH + gap;
      // Rounded is 0-20, mapped rather than raw pixels: 20 means half the
      // cell, a full circle, whatever the cell size happens to be.
      cellRadius =
        (Math.min(cellW, cellH) / 2) *
        (Math.min(20, Math.max(0, rounded)) / 20);
      grid = new Array(cols * rows).fill(-1);
      piece = null;
      clearing = [];
      clearMs = 0;
      spawn();
    }

    function tilePath(col: number, row: number) {
      const x = col * pitchX;
      const y = row * pitchY;
      if (cellRadius > 0 && typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, cellW, cellH, cellRadius);
      } else {
        ctx.rect(x, y, cellW, cellH);
      }
    }

    /** The parsed colour for a colour index, clamped to the list. */
    function colorFor(index: number): [number, number, number, number] {
      return blockRGB[index] ?? blockRGB[0];
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // Resting board: every empty square at its base colour. Gaps stay
      // clear so the component sits over whatever is behind it.
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) tilePath(c, r);
      }
      ctx.fillStyle = rgba(boardRGB, 1);
      ctx.fill();

      const flashing = new Set(clearing);
      const lit = clearMs > 0 && Math.floor(clearMs / BLINK_MS) % 2 === 0;

      // Locked stack. Flashing rows strobe white on the lit half-beat.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const color = grid[r * cols + c];
          if (color === -1) continue;
          ctx.beginPath();
          tilePath(c, r);
          if (flashing.has(r) && lit) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          } else {
            ctx.fillStyle = rgba(colorFor(color), 1);
          }
          ctx.fill();
        }
      }

      // The falling piece, full strength.
      if (piece) {
        ctx.fillStyle = rgba(colorFor(piece.color), 1);
        for (const [c, r] of piece.cells) {
          const gr = piece.row + r;
          if (gr < 0) continue;
          ctx.beginPath();
          tilePath(piece.col + c, gr);
          ctx.fill();
        }
      }
    }

    function loop(time: number) {
      if (!alive) return;
      const dt = last ? Math.min(time - last, 200) : 0;
      last = time;

      if (clearMs > 0) {
        // Hold the board while the full rows strobe, then collapse them.
        clearMs -= dt;
        if (clearMs <= 0) {
          clearMs = 0;
          collapse();
          spawn();
        }
        draw();
        raf = requestAnimationFrame(loop);
        return;
      }

      if (piece) {
        dropAcc += dt;
        while (dropAcc >= dropEvery && piece) {
          dropAcc -= dropEvery;
          if (piece.row < piece.targetRow) {
            piece.row++;
            // Glide the column toward the target in step with the
            // fall, so the piece lands exactly where the AI chose.
            const span = piece.targetRow - piece.startRow;
            const prog = span > 0 ? (piece.row - piece.startRow) / span : 1;
            piece.col = Math.round(
              piece.startCol + (piece.targetCol - piece.startCol) * prog
            );
          } else {
            piece.col = piece.targetCol;
            lock();
          }
        }
      } else {
        // Nothing falling — start the next piece straight away.
        spawn();
      }

      draw();
      raf = requestAnimationFrame(loop);
    }

    build();

    // A new size is a new grid, so the board is rebuilt and play starts
    // over. Also covers the first layout, which can land after this effect
    // with the canvas still measuring nothing.
    let built = `${canvas.clientWidth}x${canvas.clientHeight}`;
    const ro = new ResizeObserver(() => {
      const size = `${canvas.clientWidth}x${canvas.clientHeight}`;
      if (size === built) return;
      built = size;
      build();
    });
    ro.observe(canvas);

    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [
    boardColor,
    // Array identity changes each render; key on contents instead.
    (colors ?? []).join(","),
    movement,
    cellSize,
    gap,
    rounded,
    dropSpeed,
  ]);

  return (
    <div
      style={{
        ...style,
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

const __presetProps = {
  "backgroundColor": "#000000",
  "boardColor": "rgba(255, 255, 255, 0.06)",
  "colors": [
    "#F9731A",
    "#FFFFFF"
  ],
  "movement": 4,
  "cellSize": 29,
  "gap": 1,
  "rounded": 20,
  "dropSpeed": 2
};

export default function Tetris(props: Record<string, unknown>) {
  return <__BaseImpl_Tetris {...(__presetProps as Record<string, unknown>)} {...props} />;
}
