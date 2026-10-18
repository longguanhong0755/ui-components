"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { PulsingBorder } from "https://esm.sh/@paper-design/shaders-react@0.0.61?external=react,react-dom&deps=@paper-design/shaders@0.0.61";

interface PulsatingBorderProps {
  colors?: string[];
  colorBack?: string;
  speed?: number;
  radius?: number;
  thickness?: number;
  softness?: number;
  intensity?: number;
  bloom?: number;
  spotSize?: number;
  spread?: number;
  style?: React.CSSProperties;
}

const DEFAULT_COLORS = ["#F2244F", "#4DA6E6", "#379590"];

// Panel values are whole numbers; the shader's own 0–1 ranges are mapped from
// them at the call below.
const DEFAULTS = {
  // Transparent, so the border composites over whatever it is placed on.
  colorBack: "rgba(0, 0, 0, 0)",
  speed: 1,
  radius: 35,
  thickness: 5,
  softness: 75,
  intensity: 30,
  bloom: 50,
  spotSize: 60,
  // Room for the glow past the frame, in pixels.
  spread: 31,
};

const SPOTS = 3;
const PULSE = 0;
const SMOKE = 0.35;
const SMOKE_SIZE = 0.63;

/*
 * Free canvas kept past the glow's own world, as a fraction of that world's
 * short side.
 *
 * The glow's reach is proportional to the world it is drawn in, so the room it
 * needs is too — a fixed pixel padding is either wasteful on small frames or
 * too tight on large ones. Measured against the shader at its heaviest
 * settings (thickness 10, softness 100, bloom 100, intensity 100), the glow is
 * fully faded well inside this.
 */
const GLOW_ROOM = 0.4;

// The canvas is a real WebGL surface, so the room is capped rather than left to
// scale without limit on very large frames.
const MAX_ROOM = 480;

function __BaseImpl_PulsatingBorder(props: PulsatingBorderProps) {
  const {
    colorBack = DEFAULTS.colorBack,
    speed = DEFAULTS.speed,
    radius = DEFAULTS.radius,
    thickness = DEFAULTS.thickness,
    softness = DEFAULTS.softness,
    intensity = DEFAULTS.intensity,
    bloom = DEFAULTS.bloom,
    spotSize = DEFAULTS.spotSize,
    spread = DEFAULTS.spread,
    style,
  } = props;

  const colors =
    Array.isArray(props.colors) && props.colors.length
      ? props.colors
      : DEFAULT_COLORS;

  // The glow needs to paint outside the frame, and two separate things clip it.
  //
  // The shader stops at its canvas edge, so the canvas is grown past the frame
  // on every side and shifted back by the same amount, leaving that band free
  // for the glow.
  //
  // The overhang is still a descendant of the frame, though, so any ancestor
  // that clips — a section with overflow hidden, a rounded parent, a scroll
  // container — trims it straight back off. The layer is therefore portalled
  // to document.body and positioned fixed against the frame's viewport rect,
  // which no ancestor's overflow can reach.
  const hostRef = React.useRef<HTMLDivElement>(null);
  // left/top come from the bounding rect because a fixed layer is placed in
  // viewport pixels, but the size comes from clientWidth/clientHeight.
  const [rect, setRect] = React.useState({ left: 0, top: 0, w: 0, h: 0 });
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(
    null
  );

  // Deferred to an effect so the server render and the first client render
  // agree — document does not exist during the former.
  React.useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = host.getBoundingClientRect();
      const w = host.clientWidth;
      const h = host.clientHeight;
      setRect((prev) =>
        prev.left === r.left &&
        prev.top === r.top &&
        prev.w === w &&
        prev.h === h
          ? prev
          : { left: r.left, top: r.top, w, h }
      );
    };
    // Coalesced: scrolling fires far faster than the layer needs to move, and
    // every read here forces a layout.
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    // Capturing, so scrolling inside any container moves the layer too, not
    // just scrolling the page.
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  /*
   * Spread grows the shader's world, and the margins put the ring back on the
   * frame inside it.
   *
   * The glow's size is set by the world it is drawn in, so this is what makes
   * Spread mean something: a wider world is a wider glow. The ring would grow
   * with it, which is what the margins are for — inset by exactly the spread on
   * each side, the ring's rect lands back on the frame at every value.
   */
  const worldW = rect.w + spread * 2;
  const worldH = rect.h + spread * 2;
  const marginX = worldW > 0 ? spread / worldW : 0;
  const marginY = worldH > 0 ? spread / worldH : 0;

  // Room for the glow past that world, so it always fades out inside the canvas
  // rather than being cut off square at its edge.
  const room = Math.min(
    MAX_ROOM,
    Math.ceil(GLOW_ROOM * Math.min(worldW, worldH))
  );
  const bleed = spread + room;
  const canvasW = rect.w + bleed * 2;
  const canvasH = rect.h + bleed * 2;
  const measured = rect.w > 0 && rect.h > 0;

  // Portalled once the body is known.
  const escapes = portalTarget !== null;

  const layer = measured ? (
    <PulsingBorder
      colors={colors}
      colorBack={colorBack}
      speed={speed}
      roundness={radius / 100}
      thickness={thickness / 100}
      softness={softness / 100}
      intensity={intensity / 100}
      bloom={bloom / 100}
      spots={SPOTS}
      // The panel spends 0–100 over the shader's usable 0–0.5, so the slider
      // covers the whole useful range instead of stopping halfway.
      spotSize={(spotSize / 100) * 0.5}
      pulse={PULSE}
      smoke={SMOKE}
      smokeSize={SMOKE_SIZE}
      /*
       * The world is given in pixels and drawn at that size.
       *
       * Left at 0 the shader takes its world from the canvas, which tied the
       * glow to the padding: making room for the glow made a bigger glow, so
       * the ring never fit and came out cut off square below about 50px of
       * Spread. Sized here instead, the world is the frame plus the spread,
       * the margins below hold the ring on the frame, and the canvas is grown
       * past both — three separate numbers instead of one doing all three jobs.
       */
      worldWidth={worldW}
      worldHeight={worldH}
      fit="none"
      marginLeft={marginX}
      marginRight={marginX}
      marginTop={marginY}
      marginBottom={marginY}
      scale={1}
      rotation={0}
      offsetX={0}
      offsetY={0}
      originX={0.5}
      originY={0.5}
      frame={0}
      style={{
        position: escapes ? "fixed" : "absolute",
        left: escapes ? rect.left - bleed : -bleed,
        top: escapes ? rect.top - bleed : -bleed,
        width: canvasW,
        height: canvasH,
        // Once portalled the layer sits over the whole page, so it must never
        // take a click.
        pointerEvents: "none",
      }}
    />
  ) : null;

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        flexShrink: 0,
        // Matters only for the in-flow branch; the portalled layer is not a
        // descendant of this box at all.
        overflow: "visible",
        ...style,
      }}
    >
      {escapes ? createPortal(layer, portalTarget) : layer}
    </div>
  );
}

PulsatingBorder.displayName = "Pulsating Border";

PulsatingBorder.defaultProps = {
  ...DEFAULTS,
  colors: DEFAULT_COLORS,
};

const __presetProps = {
  "bloom": 50,
  "speed": 1,
  "radius": 35,
  "spread": 31,
  "softness": 75,
  "spotSize": 60,
  "colorBack": "rgba(0, 0, 0, 0)",
  "intensity": 30,
  "thickness": 5
};

export default function PulsatingBorder(props: Record<string, unknown>) {
  return <__BaseImpl_PulsatingBorder {...(__presetProps as Record<string, unknown>)} {...props} />;
}
