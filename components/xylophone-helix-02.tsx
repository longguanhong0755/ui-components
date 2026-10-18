"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/**
 * Xylophone Helix — Next.js port of the Framer code component.
 *
 * WHAT CHANGED FROM THE FRAMER VERSION (nothing else did — the WebGL path,
 * the picker, the fluid solve and every shader are byte-identical):
 *  - `"use client"`. The whole thing is a `useEffect` over a canvas ref, so it
 *    is client-only by construction; nothing touches `window` during render
 *    and the server pass emits just the root div, which carries the background
 *    colour so SSR/hydration paint the same pixels.
 *  - `import { addPropertyControls, ControlType } from "framer"` is gone, and
 *    with it the `addPropertyControls(...)` block. The panel is plain props.
 *  - THE DEFAULTS ARE THE PANEL'S, NOT THE CODE'S. In Framer the property
 *    control's `defaultValue` wins over the destructuring default, so the two
 *    disagreed in this file (code said camera 25/30, the panel said 47/0).
 *    The exported defaults here are the PANEL values, so a bare
 *    `<XylophoneHelix />` in Next renders what the Framer instance rendered.
 *    The old code-side values survive as the *_FALLBACK constants.
 *  - `minWidth: 1200 / minHeight: 800` are gone. Those floors existed because
 *    a Framer canvas frame collapses under Fit Content; in a Next layout they
 *    force a horizontal scrollbar on every phone. The component fills its
 *    parent instead, so GIVE THE PARENT A HEIGHT (`h-screen`, `aspect-video`,
 *    an explicit px) or it renders 1px tall. `width`/`height` props are there
 *    for the common case.
 *  - `className` added alongside `style`, so Tailwind/CSS modules can size it.
 *  - Two shadowed bindings renamed for readability under ESLint's no-shadow:
 *    the gesture object (`drag` -> `gesture`, which shadowed the `drag` prop)
 *    and the splat force (`scale` -> `force`, which shadowed the `scale` prop).
 *  - THE MESH'S INDEX BUFFER WAS REBUILT, and this is the one thing in the file
 *    that is not a byte-for-byte carry-over. The 640 vertex positions and the
 *    640 normals are the original's, unchanged and verified (positions decode
 *    to a bbox of exactly +/-32767 per axis; 639 of 640 normals are unit to
 *    within 1e-2). The 1024-triangle index list was regenerated as the CONVEX
 *    HULL of those vertices, which is exact rather than approximate here: the
 *    bar is a convex rounded box, all 514 distinct vertex positions lie ON the
 *    hull, and the hull comes out at exactly 1024 triangles — the count the
 *    original declares. It is a closed manifold (1536 edges, each shared by
 *    exactly two triangles; V - E + F = 2), each corner resolves to whichever
 *    of its duplicate vertices has the normal best matching the face (mean
 *    agreement 0.991), and winding is outward — which the render does not even
 *    depend on, since it runs with CULL_FACE disabled and flips the normal on
 *    back faces. Verified by rendering: see the geometry note below.
 *
 * ------------------------------------------------------------------------
 *
 * An orbiting ring of chrome blades that swing as the pointer sweeps them.
 *
 * Ported into this repo's standard from github.com/Sujenphea/xylophone (MIT,
 * Codrops). The reference is a Vite app: three.js + pmndrs/postprocessing, a
 * .glb bar, a .wav sample, ~2600 lines across 34 files. This is one
 * self-contained file, raw WebGL2, no npm dependency and no fetch.
 *
 * THE FIGURE AND THE MATERIAL WERE CHANGED ON PURPOSE, after the port. The
 * reference is a scrolling HELIX of frosted glass bars; the default here is a
 * lattice of radial chrome spikes. The lines that differ:
 *  - SCROLL ORBITS THE FIGURE; it does not stream a column. Same input path,
 *    same lerp, same drag axis lock: the phase is the figure's angle.
 *  - THE FIGURE IS CENTRED IN SCREEN SPACE. Its geometric centre projects to
 *    (0,0) already, but under perspective a tilted ring's near half magnifies
 *    more than its far half shrinks, so the SILHOUETTE hangs low (11.7% of the
 *    half-frame at the default tilt). Each frame the CPU projects all eight
 *    corners of every blade and sends the negated centre of that bounding box
 *    to the vertex shader as an NDC offset applied AFTER the perspective
 *    divide. Not a world-space nudge — moving the geometry would change the
 *    camera's true elevation and re-aim Tilt — and the picker subtracts the
 *    same offset, or every hit box sits off its blade.
 *  - THE IDLE SPIN IS ON THE CPU, as a phase advance, so the rotation is
 *    rigid. The reference spun each bar about its own centre, which on radial
 *    blades is every blade pivoting in place and reads as the figure pulsing.
 *    The picker therefore tests the pose that was drawn — there is no spin
 *    term for it to reconstruct and stay in step with.
 *  - THE BLADES DO NOT TRANSMIT. The material is a metal. The blurred backdrop
 *    buffer is still built and still used — as the environment a metal
 *    reflects, not the image glass refracts.
 *
 * NOT PORTED, deliberately, so it is not re-litigated as a bug:
 *  - SSAO. The reference runs a second full-scene pass into a view-space
 *    normal buffer for bar-on-bar contact shadows; in raw WebGL that is a
 *    depth pass, a normal pass, a 16-sample kernel and a bilateral blur for a
 *    term that is subtle on bodies this bright. The blades read very slightly
 *    flatter where they overlap.
 *  - SMAA. With no post chain left the bars draw straight to the default
 *    framebuffer, so the context's own MSAA covers it.
 *  - SOUND. The reference strikes a note per bar. The strike itself is intact
 *    — hovering a new blade still stamps its strike time and still swings it.
 *  - The backdrop is rendered AT quarter resolution rather than rendered full
 *    and blurred at quarter: it is a two-stop gradient, so there is no detail
 *    for the full-res step to keep.
 *
 * WHEEL IS CAPTURED over the component (the reference owns the page and
 * suppresses <body> scrolling), so a wheel here does not scroll the page past
 * it. That is the reference interaction; it is a real cost and it is stated.
 *
 * DEGRADES rather than fails: without WebGL2 the root keeps its CSS background
 * and nothing else runs. With WebGL2 but no EXT_color_buffer_float there is no
 * float target to solve a fluid in, so the wake is skipped and the blades stay
 * untinted — everything else renders.
 *
 * Fluid solver adapted from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT).
 */

/* -------------------------------------------------------------------------- */
/*                              embedded bar mesh                             */
/* -------------------------------------------------------------------------- */
// 640 vertices, 1024 triangles, from xylophone-09.glb. A Next app could ship a
// .glb in /public and fetch it, but the component then has a network
// dependency and a loading state for 18KB, so it stays inlined. Layout:
//   int16  position[640 * 3]   normalised by BAR_EXTENT per axis
//   int16  normal[640 * 3]     normalised by 32767
//   uint16 index[3072]
const BAR_VERTEX_COUNT = 640
const BAR_INDEX_COUNT = 3072

/** Per-axis symmetric scale the int16 positions were quantised against. */
const BAR_EXTENT = [0.09999996423721313, 0.19999998807907104, 1.2510347366333008] as const

/**
 * Blade proportion, applied to the mesh once at decode: slimmer across the
 * ring (x) and a little deeper (y), so a blade reads as a slat rather than a
 * rod. Baked into the vertices rather than carried as an instance attribute —
 * the whole field shares one proportion, so an attribute would upload the same
 * three floats per bar and be multiplied every frame for nothing.
 */
const BLADE_PROPORTION = [0.8, 1.1, 1.0] as const
const BAR_MESH_B64 =
    "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" +
    "CwEaAQwBCwEMAf0ACwH9ADMACwEZARoBCwEzADEADQEMARwBDQH9AAwBDQH/AP0AEAEBATkAHQEcASsBEADsAPMA6wDqAPMA6wDzAOwA6wDbAOoA5wDoANkA5wDxAOgAdABzAH0A7wAWAPUA7QAQABIA7QDsABAA9QH0AQMCMgIzAiQCrwGuAb0BCQEtAAgBZAFUAWMBZAFzAHQADgDzAOoADgDqAAwAmwFHAIsBmwGLAYkBmAFDAEEAmAGZAUMAmAGoAZkBZwJmAmAAZwJgAGIAZwJiAGQAXgBgAGYCKgI6AisCKQD5AAUBKQAFASsABgErAAUBBgH7ACsAFgEGARUBcgB9AHMAcgBzAGQBcgBkAWMBlgFBAD8AKgErARwBLAEdASsBDgENARwBDgEcAR0BDgE1AP8ADgH/AA0B2gDqANsA2gDZAOgARQBDAJkBRQCZAYkBZQFWAWQBZQFkAXQAfgB0AH0AfgB9AI0A3ADbAOsA3AC7ANsA3QDsAO0A3QC7ANwA3QDrAOwA3QDcAOsAFwImAicC5QH0AfUBQwI0AjMCcQJjAmICcQJuAHwCcQJsAG4AYQJiAlICbgJtAmgAagBuAmgAagBvAm4CnwGPAUsAnwGuAa8BnwFLAEkAvgGwAa8BvgGvAb0BvgHMAc0BvgG9AcwBCgExAAkBCgEJARkBCgELATEACgEZAQsBOAE5ASoBJgE1ATYBSAE5ATgBvAG9Aa4BvAHMAb0BuQG4AcgBuQGqAbgBuQGrAaoBuQG6AasBqQGoAbgBqQG4AaoBnAGqAasBnAGbAaoBnAFHAJsBnAGNAUcAnAGdAY0BlwGYAUEAlwGmAZgBlwFBAJYBlwGWAaYBpwGoAZgBpwGYAaYBEAIAAg8CAgIRAgMCDgIAAv8BDgIPAgACGwIqAisCSAJJAjoCswHCAbQBswG0AaQBowGzAaQB0AHRAcIB0AHCAcEB/gEOAv8B/gENAg4CBwEWAQgBBwEtAPsABwEIAS0ABwH7AAYBBwEGARYB" +
    "BAH5APcABAEFAfkABAETAQUBEgETAQQBFAEFARMBFAEiASMBFAETASIBFAEjASQBFAEkARUBFAEGAQUBFAEVAQYBMgEkASMBMgEzASQBMgFCATMBMgFBAUIB5AACAAQA5AAEAAYApQGWAaQBpQGkAbQBpQGmAZYBpQG0AaYBGwEcAQwBGwEqARwBGwEMARoBGwEaASoBPAEtASwBPAEsATsBPAE9AS0BPAFLAT0BHgEOAR0BHgEsAS0BHgEdASwBTQE+AT0BTQEYAD4BTAE9AUsBTAFbAU0BTAFNAT0B6QDoAAwA6QDaAOgA6QAMAOoA6QDqANoACgDoAPEACgAMAOgA2ADnANkA2ADZALcAuAC3ANkAuADZANoAuADaALkAZgF0AHABZgFlAXQAZgFwAXUAZgFWAWUBnQCNAJwAnQCcAKsAWgFbAUwBWgFMAUsBggByAYEA7gDfAO0A7gASABQA7gDtABIA7gAUABYA7gAWAO8AugDbALsAugC7AKsAugCrALkAugDaANsAugC5ANoA3gDtAN8A3gDdAO0AvAC7AN0AvADdAN4AcgJjAnECcgJxAnwCZAJUAmMCZAJjAnICZAJyAnMCZAJzAk0AfgJNAHMCfgJyAnwCfgJzAnICGAIXAicCJQIkAjMCJQIzAjQCJQImAhcCFgIlAhcCFgIVAiQCFgIkAiUCFAIkAhUCyQHIAdgByQG5AcgByQG6AbkB1gHGAdUB1gHVAeQB1gHkAeUB5gHlAfUB5gHWAeUBMQIwAkACMQJAAjICPwJAAjACQQIyAkACQQIzAjICZgBoAG0CZgBtAnoCTgJAAj8CbAJcAmsCbAJrAnoCbAJ6Am0CagJ2AmsCagJ0AnYCagJpAnQCagJrAlwCeAJ6AmsCeAJrAnYCQgJRAlICQgJSAkMCQgJDAjMCQgIzAkECQgJBAlECUwJSAmICUwJiAmMCUwJjAlQCRAI0AkMCRAJDAlICRAJSAlMCRAJFAjYCRAJUAkUCRAJTAlQCcAJxAmIC" +
    "cAJiAmECcAJsAHECcAJqAGwAcAJvAmoAYAJRAl8CYAJvAnACYAJwAmECYAJSAlECYAJhAlICYAJfAm4CYAJuAm8CoQFNAJEBoQGwAU0AoAGPAZ8BoAGfAa8BoAGRAY8BoAGhAZEBoAGvAbABoAGwAaEBRAE2ATUBRAFFATYBRAFUAUUBVQFUAWQBVQFkAVYBRgE2AUUBRgFFAVQBRgFUAVUBRgFVAVYBKQEqARoBKQE4ASoBKQEoATgBKQEZASgBKQEaARkBJwE2ASgBJwEmATYBJwEoARkBgACBAHUAcQF1AIEAcQGBAHIBaAFZAVgBaAF1AHEBaAFaAVkBaAFxAXIBSQFYAVkBSQE5AUgBngGfAUkAngGuAZ8BngFJAI0BngGNAZ0BuwGrAboBuwHKAbwBuwHJAcoBuwG6AckBywHMAbwBywG8AcoBmgGbAYkBmgGJAZkBmgGqAZsBmgGpAaoBmgGZAagBmgGoAakB1AHVAcYB1AHGAcUB1AHkAdUB8AH+Af8B8AHvAf4B8AH/AQAC8QEAAvIB8QHyAeIB8QHwAQAC8QHiAfABAQLyAQACAQIAAhACAQIQAhECAQIRAgICLAIrAjoCHwIRAhACDAL9AfwBDAIbAg0CDAL+Af0BDAINAv4BHAIbAisCHAINAhsCVwJmAmcCVwJnAlgCVwJYAkkCVwJJAkgCVgJmAlcCVgJXAkgCGgIbAgwCGgIqAhsCOQI6AioCOQJIAjoClQE9AIcBlQGjAaQBlQGkAZYBlQE/AD0AlQGWAT8A7gH9Af4B7gH+Ae8B7gH8Af0BzwHQAcEBJQEWARUBJQEVASQBJQEmARYBAwEEAfcAAwESAQQBAwH3AMEAAwHBABIBbAHBAHYAUAFBAUABUAFRAUIBUAFCAUEBYgFyAGMBYgFjAVQB0gHCAdEBDwEOAR4BDwE3ADUADwE1AA4BDwE5ADcADwEQATkALgEtAT0BLgEeAS0BdAEYAGsBdAGEABgAEQEBARABEQEQASABEQEYAAEB" +
    "EQEgARgALwE+ARgALwEYACABLwE9AT4BLwEuAT0BXAFNAVsBXAFrARgAXAEYAE0BqgC5AKsAZwFYAWYBZwFmAXUAZwFoAVgBZwF1AGgBVwFIAVYBVwFWAWYBVwFmAVgBVwFYAUkBVwFJAUgBrACrALsArACdAKsArACeAJ0AaQFoAXIBaQFaAWgBkACeAJ8AvQDeAN8AvQC8AN4AVQJUAmQCVQJGAkUCVQJFAlQCVQJNAEYCVQJkAk0A6wH6AewB6wHbAeoB6wH5AfoB6wHqAfkBCAL6AfkBCAIXAhgCCAIWAhcCBAL1AQMC6QH5AeoB6QHqAdsBBQL1AQQC8wHyAQEC8wEBAgIC8wEDAvQB8wECAgMC8wH0AeUB8wHlAeQBxwHWAcgBxwHGAdYBxwHIAbgBxwG4AcYB5wHoAdgB5wHYAeYB5wHmAfUB1wHYAcgB1wHmAdgB1wHIAdYB1wHWAeYBIgIxAjICIgIhAjACIgIwAjECPgJOAj8CPgI/AjACUAJfAlECUAJRAkECTwJfAlACTwJAAk4CTwJBAkACTwJQAkECXQJOAlwCXQJcAmwCWwJqAlwCLwAtAAkBLwAJATEANQI0AkQCNQImAiUCNQIlAjQCNQJEAjYCNQInAiYCNQI2AicCQwFEATUBQwFRAVIBQwFCAVEBNwE2AUYBNwFGATgBNwEoATYBNwE4ASgBRwFGAVYBRwE4AUYBRwFWAUgBRwFIATgBGAEmAScBGAEJAQgBGAEZAQkBGAEnARkBfwB+AI0AfwBwAXQAfwB0AH4AfwB1AHABfwCAAHUASgFJAVkBSgFZAVoBSgFaAUsBSgE8ATsBSgFLATwBOgEsASsBOgE7ASwBOgE5AUkBOgFKATsBOgFJAUoBOgErASoBOgEqATkBrQG8Aa4BrQGuAZ4B2QHLAcoB2QHYAegB2QHoAekB2QHKAckB2QHJAdgBtQGnAaYBtQG2AacBtQGmAbQBtQG0AcQBtQHEAcUBtQHFAbYBtwHFAcYBtwG2AcUB" +
    "twG4AagBtwHGAbgBtwGoAacBtwGnAbYB0wHiAdQB0wHFAcQB0wHUAcUB4wHkAdQB4wHyAfMB4wHzAeQB4wHiAfIB4wHUAeIBOwIsAjoCaAJYAmcCaAJZAlgCaAJnAmQAaAJkAHQCaAJ0AmkCHgIPAg4CHgIQAg8CHgIfAhACIAIhAhECIAIRAh8CIAIwAiECHQIeAg4CHQIOAg0CHQINAhwCHQIrAiwCHQIcAisCZQJ1AV4AZQJWAnUBZQJeAGYCZQJmAlYCRwI4AnUBRwJ1AVYCRwJWAkgCRwJIAjkCRwI5AjgCCwL8AXUBCwJ1ARoCCwIMAvwBCwIaAgwCKQJ1ATgCKQIaAnUBKQIqAhoCKQI5AioCKQI4AjkClAGVAYcBlAGjAZUBOwB1AZMBOwCUAYcBOwCTAZQB3wHRAdAB3wHgAdEB3wHvAeAB3wHuAe8BNAEkATMBNAElASQBNAEzAUIBNAFCAUMBNAFDATUBNAE1ASYBNAEmASUBPwHBAE4BPwEwAcEAIQESAcEAIQHBADABIQEiARMBIQETARIBMQEiASEBMQEhATABMQE/AUABMQEwAT8BMQEjASIBMQEyASMBMQFBATIBMQFAAUEBXQFOAcEAXQHBAGwBYAFRAVABYAFSAVEB5QDkAAYA5QAGAAgAtQDWALYA1QDUAOQA1QC1ALQA1QDWALUA1QDkAOUA1QDlANYAswC0AKQAswDVALQAswDUANUA4wACAOQA4wDkANQA4wAAAAIA4wDUANMApQCkALQApQCWAKQApQC0ALUApQCXAJYAbwFyAGIBUwFSAWIBUwFDAVIBUwFEAUMBUwFUAUQBUwFiAVQB4QHwAeIB4QHiAdMB4QHTAdIB4QHvAfAB4QHgAe8B4QHRAeAB4QHSAdEBwwHEAbQBwwG0AcIBwwHCAdIBwwHTAcQBwwHSAdMBHwEeAS4BHwEQAQ8BHwEPAR4BHwEgARABHwEvASABHwEuAS8BogCxABgAsACxAKIAcwFyAYIAcwFpAXIB" +
    "qQC3ALgAqQC4ALkAqQC5AKoArQCeAKwArQC8AL0ArQC7ALwArQCsALsAjwCeAJAAjwCAAH8AjwCBAIAAjwCQAIEA3QHOAc0B3QHsAU0A3QFNAM4BvwG+Ac0BvwHNAc4BvwGwAb4BvwFNALABvwHOAU0A+wHsAfoB+wH6AQoC+wFNAOwB+wEKAk0ANwJGAk0ANwJFAkYCNwI2AkUCKAIYAicCKAInAjYCKAI2AjcCKAI3Ak0ACQL6AQgCCQIIAhgCCQIKAvoBCQIYAgoCBgIVAhYCBgIUAhUCBgIFAhQC+AEIAvkB+AH5AekB+AHpAegB2gHpAdsB2gHbAcwB2gHMAcsB2gHLAdkB2gHZAekB9gHoAecB9gEFAgYC9gH1AQUC9gHnAfUBIwIiAjICIwIyAiQCIwIkAhQCEwIUAgUCEwIFAgQCEwIjAhQCEwIiAiMCEwIEAgMCEwIhAiICTQJcAk4CTQJOAj4CTQJbAlwCLgIfAh4CLgIgAh8CXgJsAm0CXgJdAmwCXgJfAk8CXgJPAk4CXgJOAl0CXgJuAl8CXgJtAm4CWgJpAmoCWgJqAlsCWgJoAmkCWgJZAmgCFwEYAQgBFwEmARgBFwEIARYBFwEWASYBjgCNAJ0AjgB/AI0AjgCPAH8AjgCdAJ4AjgCeAI8ArAGeAZ0BrAGtAZ4BrAGrAbsBrAG7AbwBrAG8Aa0BrAGcAasBrAGdAZwBsgGxAcEBsgGzAaMBsgHBAcIBsgHCAbMBogGjAZQBogGUAZMBogGyAaMBogGxAbIBogGTAXUBogF1AbEBwAHPAcEBwAHBAbEBwAF1Ac8BwAGxAXUB3gHQAc8B3gHfAdAB3gHPAXUB3gHuAd8BTwFQAUABTwE/AU4BTwFAAT8B5gDlAAgA5gAIAPEA5gDxAOcApwC1ALYApwC2ALcAlADBAKMAlACjAKQAsgDBANMAsgCjAMEAsgDTANQAsgDUALMAsgCkAKMAsgCzAKQA4gAAAOMA4gDjANMA4gDBAAAA4gDTAMEA" +
    "pgCXAKUApgClALUApgC1AKcAYQFiAVIBYQFSAWAB8AD1ABgA8AAYAOEA8ADvAPUA8ADhAO8AwAAYALEAwADhABgAwACxALAAkQCQAJ8AkQCCAIEAkQCBAJAAoACRAJ8AagFcAVsBagFrAVwBagFpAXMBagF0AWsBagFzAXQBagFbAVoBagFaAWkBkwAYAIQAkwCiABgAfAB9AHIA3AHrAewB3AHsAd0B3AHdAc0B3AHbAesB3AHNAcwB3AHMAdsBGQIKAhgCGQIYAigCGQJNAAoCGQIoAk0ABwIWAggCBwIIAvgBBwIGAhYCBwL4AQYC9wH4AegB9wEGAvgB9wHoAfYB9wH2AQYCEgIDAhECEgITAgMCEgIRAiECEgIhAhMCPQJNAj4CPQI+Ai4CLQIuAh4CLQI8Aj0CLQI9Ai4CLQI7AjwCLQIsAjsCLQIdAiwCLQIeAh0CLwIuAj4CLwIgAi4CLwI+AjACLwIwAiACSgI8AjsCSgJZAloCSgJJAlgCSgJYAlkCSgI6AkkCSgI7AjoC7QF1AfwB7QHeAXUB7QH8Ae4B7QHuAd4BXgFdAWwBXgFOAV0BXgFPAU4BXgFQAU8B1wDnANgA1wDmAOcA1wDYALcA1wC3ALYA1wC2ANYA1wDWAOUA1wDlAOYAhQCUAIYAhQB2AMEAhQDBAJQAlQCUAKQAlQCGAJQAlQCkAJYAhwCVAJYAhwCGAJUAhwCWAJcAhwCXAIgAhwCIAHkAhwB5AHgAcAB5AG4BcAB4AHkAcABuAWABcQBgAW4BcQBhAWABcQB5AHoAcQBuAXkAcQBvAWIBcQBiAWEB4ADvAOEA4ADhAMAA4ADuAO8A4ADfAO4AkgCiAJMArgCtAL0ArgCfAJ4ArgCeAK0ArwCwAKAArwCuAL0ArwCgAJ8ArwCfAK4AjACNAH0ATAJbAk0CTAJNAj0CdwBsAXYAdwB2AIUAdwCFAIYAdwCGAIcAdwCHAHgAmACXAKYAmACmAKcAmACZAIoAmACIAJcAqAC3AKkA" +
    "qACpAJkAqACnALcAqACYAKcAqACZAJgAXwFgAVABXwFwAGABXwFQAV4BvwDAALAAvwDgAMAAvwDfAOAAoQCgALAAoQCwAKIAoQCiAJIAoQCRAKAAoQCSAJEAgwBzAYIAgwCCAJEAgwCRAJIAgwCEAHQBgwB0AXMBgwCTAIQAgwCSAJMAvgC9AN8AvgCvAL0AvgDfAL8AvgCwAK8AvgC/ALAAmwCcAI0AmwCNAIwAmwCrAJwAmwCqAKsAmwCpAKoASwJaAlsCSwJbAkwCSwI8AkoCSwJKAloCSwI9AjwCSwJMAj0CbQF4AHAAbQF3AHgAbQFfAV4BbQFwAF8BbQFeAWwBbQFsAXcAewBxAHoAewBvAXEAewByAG8BewB8AHIAiwB9AHwAiwCMAH0AiwB8AHsAiwB7AIoAiwCKAJkAiwCbAIwAiQCYAIoAiQB7AHoAiQCKAHsAiQCIAJgAiQB6AHkAiQB5AIgAmgCZAKkAmgCLAJkAmgCpAJsAmgCbAIsASwAUABIASwASAEkASwAWABQASwCPARYA+wB0AmQA+wBkACsA+wB2AnQC+wAtAHYCiwEMAIkBiwEOAAwAiwFHAPMAiwHzAA4AXgDBAPcAXgB1AcEAXgD3APkAXgD5AGAAKQBgAPkAKQBiAGAAKQArAGQAKQBkAGIAPQAGAAQAPQA/AAYAPQAEAAIAPQACAIcBCAAGAD8ACAA/AEEACABBAEMACABDAPEAagBoAP0AagD9AP8AagA1AGwAagD/ADUAkQEWAI8BkQH1ABYAkQFNABgAkQEYAPUAjQHzAEcAjQEQAPMAjQFJABIAjQESABAANwBsADUANwBuAGwANwA5AHwCNwB8Am4ACgDxAEMACgBDAEUACgCJAQwACgBFAIkBfgJ8AjkAfgI5AAEBfgIYAE0AfgIBARgAZgD9AGgAZgAzAP0AZgB6AjEAZgAxADMALwB2Ai0ALwB4AnYCLwAxAHoCLwB6AngCOwCHAQIAOwACAAAAOwDBAHUBOwAAAMEA"

type BarMesh = {
    positions: Float32Array
    normals: Float32Array
    indices: Uint16Array
    /** Local-space bounding box — the box the CPU picker tests one of per bar. */
    boxMin: [number, number, number]
    boxMax: [number, number, number]
    /** Blade width across the ring. This IS the ring's tangential pitch. */
    width: number
    /** Half the blade's length, along its own +Z. The ring's radial reach. */
    halfLength: number
}

function decodeBarMesh(): BarMesh {
    const binary = atob(BAR_MESH_B64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const vec3Count = BAR_VERTEX_COUNT * 3
    const qPos = new Int16Array(bytes.buffer, 0, vec3Count)
    const qNor = new Int16Array(bytes.buffer, vec3Count * 2, vec3Count)
    const indices = new Uint16Array(
        bytes.buffer.slice(vec3Count * 4, vec3Count * 4 + BAR_INDEX_COUNT * 2)
    )

    const positions = new Float32Array(vec3Count)
    const normals = new Float32Array(vec3Count)
    const boxMin: [number, number, number] = [Infinity, Infinity, Infinity]
    const boxMax: [number, number, number] = [-Infinity, -Infinity, -Infinity]

    for (let i = 0; i < BAR_VERTEX_COUNT; i++) {
        for (let k = 0; k < 3; k++) {
            const v = (qPos[i * 3 + k] / 32767) * BAR_EXTENT[k] * BLADE_PROPORTION[k]
            positions[i * 3 + k] = v
            if (v < boxMin[k]) boxMin[k] = v
            if (v > boxMax[k]) boxMax[k] = v
        }

        // The proportion is non-uniform, so a normal takes the inverse
        // transpose of it — the reciprocal per axis, renormalised. Scaling a
        // normal by the same factor as the position tilts every one of them,
        // and on a metal every highlight then lands in the wrong place.
        let nx = qNor[i * 3] / 32767 / BLADE_PROPORTION[0]
        let ny = qNor[i * 3 + 1] / 32767 / BLADE_PROPORTION[1]
        let nz = qNor[i * 3 + 2] / 32767 / BLADE_PROPORTION[2]
        const length = Math.hypot(nx, ny, nz) || 1
        nx /= length
        ny /= length
        nz /= length
        normals[i * 3] = nx
        normals[i * 3 + 1] = ny
        normals[i * 3 + 2] = nz
    }

    return {
        positions,
        normals,
        indices,
        boxMin,
        boxMax,
        width: boxMax[0] - boxMin[0],
        halfLength: Math.max(Math.abs(boxMin[2]), boxMax[2]),
    }
}

/* -------------------------------------------------------------------------- */
/*                          frozen reference constants                        */
/* -------------------------------------------------------------------------- */
// Every value a cut control used to set, at the default it was cut at.

const RING = {
    /** tangential gap between blades, as a multiple of a blade's own width */
    spacing: 2.2,
    /** blade lean about its own radial axis, radians */
    pitch: 0.62,
    /**
     * Gap between two blades AT THEIR INNER TIPS, as a multiple of a blade's
     * own width, measured along the blade's width axis. Sets the minimum inner
     * radius in ringRadius — see there for why the tangent is the wrong axis.
     */
    innerClearance: 1.1,
    thetaOffset: Math.PI,
    /**
     * The figure is normalised to this world radius, so the Bars dial changes
     * the ring's density and not its framing.
     */
    fit: 1.9,
    /**
     * Tint gradient repeats every this many bars. MUST be a whole number: on a
     * ring bar `count - 1` is adjacent to bar 0, and `fract(i / count * wrap)`
     * only returns to its starting value there when `wrap` is an integer.
     * Interpolated into BAR_VERT, so the two cannot drift apart.
     */
    tintWrap: 10,
} as const

const SCROLL = { sensitivity: 0.005, lerp: 5 } as const

/** 50 on the Speed dial is the reference's idle rotation, in radians/second. */
const SPIN_AT_FIFTY = 0.3

const CAMERA_FOV_DEG = 45

/**
 * Camera pullback, frozen at what the `Distance` dial shipped at. `Scale` is a
 * pure group scale at this fixed camera, so the perspective is identical at
 * every setting.
 */
const CAMERA_DISTANCE = 5

/** Corners beyond this NDC cannot frame anything; see ringNdcOffset. */
const NDC_FRAMING_LIMIT = 8

const FLUID = {
    simRes: 128,
    curlStrength: 0.2,
    splatRadius: 0.6,
    splatForce: 20,
    pressureIterations: 1,
    velocityDissipation: 0.93,
    pressureDissipation: 0.97,
    /** seconds of pointer stillness before the solve is skipped entirely */
    idleSleepAfter: 2.5,
} as const

/**
 * Autoplay wake driver: with no real pointer over the canvas, a synthetic
 * point circles the ring at this radius (screen-space, 0..1) and speed
 * (radians/second), so the wake is visible without interaction.
 */
const AUTOPLAY_RADIUS = 0.28
const AUTOPLAY_SPEED = 0.6

/**
 * Backdrop blur, frozen at the Frost dial's default of 90%. Cut because it
 * mapped to nothing measurable: the buffer it blurs is a two-stop gradient,
 * and a gaussian over a linear ramp is the identity everywhere but the border.
 */
const BACKDROP_BLUR_SPREAD = 0.9 * 1.5
const FROST_ITERATIONS = 3
const BACKDROP_SCALE = 0.25

/** clamp long frames (tab restore) so nothing integrates a huge step */
const MAX_DELTA = 1 / 20

const MAX_SCROLL_PER_EVENT = 200
const DRAG_AXIS_LOCK_PX = 8
const DRAG_SCALE = 3

/**
 * Laps the ring turns for a drag across the component's full width, at a Drag
 * setting of 50. In LAPS, not blades: a lap is `count` blades, so one drag
 * means the same rotation whatever the Bars dial says.
 */
const DRAG_TURNS_AT_FIFTY = 0.5

/**
 * Fresnel exponent, frozen at the dial's default. A micro-physics exponent,
 * and of everything in the Metal group the row a designer reaches for least.
 */
const FRESNEL_POWER = 3

/* -------------------------------------------------------------------------- */
/*                                   shaders                                  */
/* -------------------------------------------------------------------------- */
// GLSL ES 1.00 throughout. WebGL2 accepts it, and it is what the reference's
// shaders are written in — instancing comes from the WebGL2 API, not the
// shader version, so nothing has to be rewritten to get it.

const SRGB_GLSL = `
vec3 srgbToLinear(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
vec3 linearToSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
}
`

/** Fullscreen quad. Used by the backdrop and the blur — no neighbour taps. */
const QUAD_VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

/**
 * Backdrop gradient. The reference's diagonal ramp, RESHAPED for the metal:
 * both ends are SCALES of the colour rather than mixes toward white, so black
 * stays black (a mix toward white put a 28% grey floor under the dial) and no
 * corner clips. This buffer is the environment the blades reflect, so a
 * blown-out corner in it becomes a blown-out blade.
 */
const BACKDROP_FRAG = `
precision highp float;
uniform vec3 u_color;
varying vec2 vUv;
${SRGB_GLSL}
void main() {
    // diagonal ramp, bottom-left -> top-right
    float t = smoothstep(0.0, 1.0, vUv.y * 0.5 + (1.0 - vUv.x) * 0.5);
    vec3 floorColor = u_color * 0.35;
    vec3 topColor = min(u_color * 1.9, vec3(1.0));
    vec3 color = mix(floorColor, topColor, t);
    gl_FragColor = vec4(linearToSrgb(color), 1.0);
}
`

/** Separable gaussian, 5 linear-sampled taps = a 9-tap kernel. */
const BLUR_FRAG = `
precision highp float;
uniform sampler2D u_tSource;
uniform vec2 u_step;
varying vec2 vUv;
void main() {
    vec4 sum = texture2D(u_tSource, vUv) * 0.2270270270;
    sum += (texture2D(u_tSource, vUv + u_step * 1.3846153846)
          + texture2D(u_tSource, vUv - u_step * 1.3846153846)) * 0.3162162162;
    sum += (texture2D(u_tSource, vUv + u_step * 3.2307692308)
          + texture2D(u_tSource, vUv - u_step * 3.2307692308)) * 0.0702702703;
    gl_FragColor = sum;
}
`

/**
 * The reference's xylophoneVert, with the four matrices three used to inject
 * declared explicitly. Nothing else differs.
 */
const BAR_VERT = `
precision highp float;

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec3 aPos;
attribute vec4 aRot;
attribute float aTintOffset;
attribute float aStrikeTime;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform mat3 u_normalMatrix;

uniform vec2 u_ndcOffset;
uniform float u_time;
uniform float u_swingScale;
uniform vec3 u_swingAxis;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vScreenUv;
varying float vTintU;
varying vec3 vTangent;

// tint gradient repeats every this many bars — from RING.tintWrap, so the
// shader and the CPU-side ring seam check cannot disagree
const float TINT_WRAP = ${RING.tintWrap.toFixed(1)};

// strike swing — damped pendulum
const float SWING_AMP = 0.58;
const float SWING_FREQ = 16.0;
const float SWING_DECAY = 4.5;

vec3 rotateByQuat(vec3 v, vec4 q) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec4 qmul(vec4 a, vec4 b) {
    return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz));
}

void main() {
    // The idle spin is NOT here. The reference spun each bar about its own
    // centre, which on a ring of radial blades is every blade pivoting in
    // place, swinging broadside to edge-on in unison, and the whole figure
    // appears to pulse in size. The figure orbits on the CPU instead, as a
    // phase advance, so the rotation is rigid — and the pose the picker tests
    // is then the pose that was drawn.
    vec4 rot = aRot;

    // decaying since aStrikeTime. at rest (never struck) dt is huge, so env -> 0.
    float dt = u_time - aStrikeTime;
    float env = step(0.0, dt) * exp(-dt * SWING_DECAY);
    float ang = env * SWING_AMP * sin(dt * SWING_FREQ) * u_swingScale;
    float halfAng = ang * 0.5;
    vec4 swing = vec4(normalize(u_swingAxis) * sin(halfAng), cos(halfAng));
    rot = qmul(rot, swing);

    vec3 transformedPos = aPos + rotateByQuat(aVertexPosition, rot);
    vec4 worldPos = u_modelMatrix * vec4(transformedPos, 1.0);
    vec3 rotatedNormal = rotateByQuat(aVertexNormal, rot);

    gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;

    // Centre the FIGURE, in screen space, after the divide. Multiplying by w
    // applies a constant NDC shift through the perspective divide. It must NOT
    // be done by moving the geometry in world space: that changes the camera's
    // true elevation over the ring and quietly re-aims Tilt.
    gl_Position.xy += u_ndcOffset * gl_Position.w;

    vWorldPos = worldPos.xyz;
    vNormal = normalize(u_normalMatrix * rotatedNormal);
    // taken after the centring shift, so the fluid wake and the reflected
    // backdrop are sampled where the blade actually lands on screen
    vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;

    // The blade's own long axis, in the same space as vNormal. The brushed
    // metal term needs it: streaks run along the blade.
    vTangent = normalize(u_normalMatrix * rotateByQuat(vec3(0.0, 0.0, 1.0), rot));

    // The wrap is taken HERE, not in the fragment shader. fract() per fragment
    // is exact only while the product stays off a whole number, and bar 32 of
    // 64 lands on exactly 5.0, so fract flipped between 0.0 and 1.0 per pixel
    // and that bar rendered as noise alternating between the two ENDS of the
    // ramp. Per vertex it lands inside [0,1), and the ramp is CLAMP_TO_EDGE.
    vTintU = fract(aTintOffset * TINT_WRAP);
}
`

/**
 * Chrome. The reference's xylophoneFrag was frosted glass — a transmission mix
 * of the blurred backdrop with an iridescent film over it — and this is the
 * one shader that is NOT a faithful port: the material was changed on purpose.
 *
 * What that costs: there is no transmission term, so nothing shows THROUGH a
 * blade. The blurred backdrop is still sampled, and still earns its three blur
 * passes, but as the environment a metal reflects. A screen-space env only
 * knows the directions the frame happens to cover, so it is mixed with an
 * analytic studio ramp that supplies the rest.
 */
const BAR_FRAG = `
precision highp float;

uniform sampler2D u_tFluid;
uniform sampler2D u_tGradient;
uniform sampler2D u_tBackdrop;

uniform vec3 u_cameraPos;
uniform float u_fluidStrength;
uniform float u_tintStrength;
uniform float u_tintGlow;
uniform vec3 u_baseColor;
uniform float u_reflectStrength;
uniform float u_polish;
uniform float u_fresnelPower;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vScreenUv;
varying float vTintU; // already wrapped, per vertex — see BAR_VERT
varying vec3 vTangent;

// Dialled in once and left alone.
const vec3 KEY_DIR = vec3(0.35, 1.0, 0.45);
/** Height of the soft-box strip, in the same 0..1 the horizon uses. */
const float STRIP_Y = 0.68;
/**
 * Velocity that counts as a full wake. The reference's 0.2 was tuned against
 * white frosted glass; a 10% mix over bright chrome does not read, and a
 * measured pointer sweep only ever put ~0.05 into this buffer.
 */
const float FLUID_GATE_MAX = 0.08;
const float BODY_AMBIENT = 0.10;
const float BODY_SKY = 0.30;
const float RIM_LIFT = 0.35;
const float FRESNEL_ENV = 0.55;
/** How far a reflection bends the backdrop tap. Not a dial: it reads as one
 *  feel with Reflect, and two dials for one look is one dial too many. */
const float REFLECT_DISTORT = 0.22;
/**
 * The screen-space env is the WHOLE frame — a large, nearly flat, fairly
 * bright field. Weighted much above this it flattens every blade to one value
 * and the metal reads as painted ceramic.
 */
const float SCREEN_ENV_MIX = 0.3;
/**
 * How much the wake lifts the REFLECTION, not just the base colour. A wake is
 * light arriving: tinting only the albedo reads as paint applied to metal.
 */
const float WAKE_ENV_GAIN = 0.9;
/**
 * Anisotropic streak strength, frozen at the Brush dial's default of 55%.
 * The cap is 0.85, not 1.0: a normal fully projected off its own tangent is
 * degenerate at every vertex where the normal IS the tangent.
 */
const float BRUSH = 0.55 * 0.85;

${SRGB_GLSL}

/**
 * Stands in for an HDR studio.
 *
 * A blade's outer face is close to flat, so it mirrors ONE direction of the
 * environment and is exactly as interesting as whatever is in that direction.
 * A smooth floor-to-sky ramp renders the whole ring one value and reads as
 * painted plastic — the studio has to have STRUCTURE for a flat face to catch.
 * Polish sharpens the horizon, tightens the strip and tightens the key
 * together, which is what separates a mirror from a satin finish.
 */
vec3 studioEnv(vec3 dir, float polish) {
    float y = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    float edge = mix(0.30, 0.02, polish);
    float horizon = smoothstep(0.5 - edge, 0.5 + edge, y);
    vec3 base = mix(vec3(0.015, 0.017, 0.022), vec3(0.30, 0.32, 0.38), horizon);

    // soft-box strip: the band a flat face sweeps across as the ring turns
    float strip = exp(-pow((y - STRIP_Y) / mix(0.20, 0.045, polish), 2.0));
    base += strip * mix(0.35, 0.95, polish);

    float key = pow(max(dot(dir, normalize(KEY_DIR)), 0.0), mix(4.0, 120.0, polish));
    return base + key * mix(0.5, 2.4, polish);
}

void main() {
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;

    vec3 V = normalize(u_cameraPos - vWorldPos);
    vec3 T = normalize(vTangent);

    // Brushed metal: pull the normal off the blade's long axis, so a highlight
    // stretches ALONG the blade instead of pooling into a point.
    vec3 Nb = N - T * dot(N, T) * BRUSH;
    float nbLen = max(length(Nb), 1e-4);
    Nb /= nbLen;

    vec3 R = reflect(-V, Nb);

    // environment: the blurred backdrop where the reflection points, plus the
    // analytic studio for the directions the frame cannot supply
    vec2 euv = clamp(vScreenUv + R.xy * REFLECT_DISTORT, 0.0, 1.0);
    vec3 screenEnv = srgbToLinear(texture2D(u_tBackdrop, euv).rgb);
    vec3 env = mix(studioEnv(R, u_polish), screenEnv, SCREEN_ENV_MIX);

    float velocity = smoothstep(0.0, FLUID_GATE_MAX, length(texture2D(u_tFluid, vScreenUv).xy));
    float reveal = clamp(velocity * u_fluidStrength, 0.0, 1.0);
    vec3 tint = srgbToLinear(texture2D(u_tGradient, vec2(clamp(vTintU, 0.0, 1.0), 0.5)).rgb);

    // A metal's albedo multiplies its REFLECTION, which is what makes a tinted
    // one read as gold or copper rather than as grey metal under a coloured
    // light. So this one colour drives body, environment and rim together.
    vec3 albedo = mix(u_baseColor, tint, reveal * u_tintStrength);
    env *= 1.0 + reveal * u_tintStrength * WAKE_ENV_GAIN;

    // A metal has no diffuse lobe. With Reflect at 0 the body is this: albedo
    // under a sky-weighted ambient, so the dial fades between a matte plate
    // and a mirror rather than between something and black.
    vec3 body = albedo * (BODY_AMBIENT + BODY_SKY * (Nb.y * 0.5 + 0.5));
    vec3 color = mix(body, env * albedo, u_reflectStrength);

    float fres = pow(clamp(1.0 - max(dot(Nb, V), 0.0), 0.0, 1.0), u_fresnelPower);
    color = mix(color, env, fres * FRESNEL_ENV * u_reflectStrength);
    color += fres * RIM_LIFT * albedo;

    color += tint * reveal * u_tintGlow;

    gl_FragColor = vec4(linearToSrgb(color), 1.0);
}
`

/* ------------------------------ fluid shaders ----------------------------- */
// Verbatim from the reference, which took them from PavelDoGreat's
// WebGL-Fluid-Simulation (MIT). The shared vertex shader precomputes the four
// neighbour coordinates so the finite-difference passes get them interpolated
// for free instead of recomputing four offsets per fragment.

const FLUID_VERT = `
precision highp float;
attribute vec2 aPosition;
uniform vec2 u_texelSize;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(u_texelSize.x, 0.0);
    vR = vUv + vec2(u_texelSize.x, 0.0);
    vT = vUv + vec2(0.0, u_texelSize.y);
    vB = vUv - vec2(0.0, u_texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FLUID_SPLAT_FRAG = `
precision highp float;
uniform sampler2D u_tTarget;
uniform float u_aspectRatio;
uniform vec3 u_splatColor;
uniform vec2 u_splatPosition;
uniform vec2 u_prevPoint;
uniform float u_splatRadius;
varying vec2 vUv;
void main() {
    // Splat along the swipe segment, so fast strokes read as a continuous
    // brush rather than a dotted trail. A zero-length segment collapses to a
    // point.
    vec2 uv = vUv;
    vec2 a = u_prevPoint;
    vec2 b = u_splatPosition;

    uv.x *= u_aspectRatio;
    a.x *= u_aspectRatio;
    b.x *= u_aspectRatio;

    vec2 ab = b - a;
    float t = clamp(dot(uv - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    vec2 p = uv - (a + t * ab);

    vec3 splat = exp(-dot(p, p) / (u_splatRadius / 50.0)) * u_splatColor;
    gl_FragColor = vec4(texture2D(u_tTarget, vUv).xyz + splat, 1.0);
}
`

const FLUID_CURL_FRAG = `
precision highp float;
uniform sampler2D u_tVelocity;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(u_tVelocity, vL).y;
    float R = texture2D(u_tVelocity, vR).y;
    float T = texture2D(u_tVelocity, vT).x;
    float B = texture2D(u_tVelocity, vB).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`

const FLUID_VORTICITY_FRAG = `
precision highp float;
uniform sampler2D u_tVelocity;
uniform sampler2D u_tCurl;
uniform float u_curl;
uniform float u_dt;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(u_tCurl, vL).x;
    float R = texture2D(u_tCurl, vR).x;
    float T = texture2D(u_tCurl, vT).x;
    float B = texture2D(u_tCurl, vB).x;
    float C = texture2D(u_tCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= u_curl * C;
    force.y *= -1.0;

    vec2 vel = texture2D(u_tVelocity, vUv).xy + force * u_dt;

    // A frame hitch must not spike the field to a value that overflows the
    // half-float target to Inf, which would poison the sim permanently.
    gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}
`

const FLUID_DIVERGENCE_FRAG = `
precision highp float;
uniform sampler2D u_tVelocity;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(u_tVelocity, vL).x;
    float R = texture2D(u_tVelocity, vR).x;
    float T = texture2D(u_tVelocity, vT).y;
    float B = texture2D(u_tVelocity, vB).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`

const FLUID_CLEAR_FRAG = `
precision highp float;
uniform sampler2D u_tTexture;
uniform float u_value;
uniform float u_dt;
varying vec2 vUv;
void main() {
    // per-second dissipation, normalised by dt so the decay is refresh-rate
    // independent (the exponent is 1 at 60fps, matching the tuned value)
    gl_FragColor = vec4(pow(u_value, u_dt * 60.0) * texture2D(u_tTexture, vUv).rgb, 1.0);
}
`

const FLUID_PRESSURE_FRAG = `
precision highp float;
uniform sampler2D u_tPressure;
uniform sampler2D u_tDivergence;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    // Neighbour taps need no clamping: the targets are CLAMP_TO_EDGE, so
    // sampling past an edge repeats it — the free-slip boundary this wants.
    float L = texture2D(u_tPressure, vL).x;
    float R = texture2D(u_tPressure, vR).x;
    float T = texture2D(u_tPressure, vT).x;
    float B = texture2D(u_tPressure, vB).x;
    float divergence = texture2D(u_tDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`

const FLUID_GRADIENT_SUBTRACT_FRAG = `
precision highp float;
uniform sampler2D u_tPressure;
uniform sampler2D u_tVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
void main() {
    float L = texture2D(u_tPressure, vL).x;
    float R = texture2D(u_tPressure, vR).x;
    float T = texture2D(u_tPressure, vT).x;
    float B = texture2D(u_tPressure, vB).x;
    vec2 velocity = texture2D(u_tVelocity, vUv).xy - vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`

const FLUID_ADVECTION_FRAG = `
precision highp float;
uniform sampler2D u_tVelocity;
uniform sampler2D u_tSource;
uniform vec2 u_texelSize;
uniform float u_dt;
uniform float u_dissipation;
varying vec2 vUv;

// Explicit bilinear fetch rather than the hardware's: the reference forces
// this path on rather than probing for float-filtering support, and so does
// this.
vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
    // Semi-Lagrangian: trace backwards along the velocity to find where this
    // texel's contents came from, and sample there.
    vec2 coord = vUv - u_dt * bilerp(u_tVelocity, vUv, u_texelSize).xy * u_texelSize;
    vec4 result = bilerp(u_tSource, coord, u_texelSize);
    gl_FragColor = vec4(result.rgb * pow(u_dissipation, u_dt * 60.0), 1.0);
}
`

/* -------------------------------------------------------------------------- */
/*                                    maths                                   */
/* -------------------------------------------------------------------------- */
// Column-major 4x4, the layout GL wants, so nothing is transposed on upload.

function mat4Perspective(
    fovDeg: number,
    aspect: number,
    near: number,
    far: number,
    m: Float32Array
): Float32Array {
    const f = 1 / Math.tan((fovDeg * Math.PI) / 360)
    const nf = 1 / (near - far)
    m.fill(0)
    m[0] = f / aspect
    m[5] = f
    m[10] = (far + near) * nf
    m[11] = -1
    m[14] = 2 * far * near * nf
    return m
}

/** Camera sits on +Z looking down -Z, so the view matrix is one translation. */
function mat4TranslationZ(z: number, m: Float32Array): Float32Array {
    m.fill(0)
    m[0] = m[5] = m[10] = m[15] = 1
    m[14] = z
    return m
}

/**
 * The reference's group transform: Euler XYZ (tilt, 0, roll) then a uniform
 * scale. three's XYZ order composes as Rx * Ry * Rz, so with no Y term the
 * rotation is Rx(tilt) * Rz(roll).
 */
function mat4TiltRollScale(
    tiltRad: number,
    rollRad: number,
    scale: number,
    m: Float32Array
): Float32Array {
    const cx = Math.cos(tiltRad)
    const sx = Math.sin(tiltRad)
    const cz = Math.cos(rollRad)
    const sz = Math.sin(rollRad)

    m.fill(0)
    // R = Rx * Rz, written straight in as basis columns
    m[0] = cz * scale
    m[1] = cx * sz * scale
    m[2] = sx * sz * scale
    m[4] = -sz * scale
    m[5] = cx * cz * scale
    m[6] = sx * cz * scale
    m[8] = 0
    m[9] = -sx * scale
    m[10] = cx * scale
    m[15] = 1
    return m
}

/** mat3 of a mat4's upper-left, for the normal transform. */
function mat3FromMat4(m: Float32Array, out: Float32Array): Float32Array {
    for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) out[c * 3 + r] = m[c * 4 + r]
    }
    return out
}

/** three's Quaternion.setFromEuler, order YXZ — the order the poses use. */
function quatFromEulerYXZ(
    x: number,
    y: number,
    z: number,
    out: Float32Array,
    offset: number
) {
    const c1 = Math.cos(x / 2)
    const c2 = Math.cos(y / 2)
    const c3 = Math.cos(z / 2)
    const s1 = Math.sin(x / 2)
    const s2 = Math.sin(y / 2)
    const s3 = Math.sin(z / 2)

    out[offset] = s1 * c2 * c3 + c1 * s2 * s3
    out[offset + 1] = c1 * s2 * c3 - s1 * c2 * s3
    out[offset + 2] = c1 * c2 * s3 - s1 * s2 * c3
    out[offset + 3] = c1 * c2 * c3 + s1 * s2 * s3
}

function wrap(a: number, n: number): number {
    return ((a % n) + n) % n
}

/**
 * Ring radius, in mesh units, for a blade count and the blade's own box.
 *
 * Derived rather than dialled, from whichever of two constraints is larger:
 *
 *  1. TANGENTIAL SPACING AT THE BLADE CENTRE — the reference's rule. A gap of
 *     `RING.spacing` blade widths, so the Bars dial reads as density and not
 *     as a zoom.
 *
 *  2. A MINIMUM INNER RADIUS. Constraint 1 alone is a half-truth: the blades
 *     are radial spokes that reach `halfLength` INWARD, and a radius that only
 *     spaces their centres sends their inner ends through the axis the moment
 *     the count drops. At 8 bars constraint 1 gives R = 0.448 against a
 *     half-length of 1.251, so every blade overshoots the centre by 0.80.
 *
 *     The clearance is measured where the blades are closest — at the inner
 *     tips — across the CHORD between two of them, along the axis that
 *     actually separates two LEANED slats: the blade's own width axis, not the
 *     tangent. A slat pitched by `RING.pitch` presents `width / cos(pitch)` of
 *     tangential extent but is still only `width` thick across itself.
 *
 * Constraint 2 binds at 57 bars and below and is inert from 58 up.
 */
function ringRadius(count: number, bladeWidth: number, halfLength: number): number {
    const spaced = (count * bladeWidth * RING.spacing) / (2 * Math.PI)
    const innerFloor =
        (bladeWidth * RING.innerClearance) /
        (2 * Math.sin(Math.PI / count) * Math.cos(RING.pitch))
    return Math.max(1e-3, spaced, halfLength + innerFloor)
}

/**
 * Writes the ring pose for every blade at a given scroll `phase`.
 *
 * The blades are radial spokes on a flat ring and the phase is the ring's own
 * angle, so scroll orbits the figure. There is no conveyor — theta goes to
 * cos/sin, which are periodic — but the phase is still wrapped into
 * [0, count): theta would otherwise grow without bound and lose angular
 * resolution, and the pose quaternion is built from a HALF angle, so every lap
 * would flip its sign. The flipped quaternion is the same rotation and renders
 * identically, which is exactly why it would go unnoticed.
 *
 * `PI/2 - theta` is the angle that takes a blade's local +Z onto the outward
 * radial direction. The pitch goes in the Euler Z slot, which YXZ order
 * applies FIRST — about the blade's own long axis, before it is swung outward
 * — so it is a turbine-blade lean and not a wobble in world space.
 */
function writeRingTransforms(
    phase: number,
    count: number,
    radius: number,
    positions: Float32Array,
    rotations: Float32Array
) {
    const step = (2 * Math.PI) / count

    for (let i = 0; i < count; i++) {
        const theta = wrap(i + phase, count) * step + RING.thetaOffset

        positions[i * 3] = radius * Math.cos(theta)
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = radius * Math.sin(theta)

        quatFromEulerYXZ(0, Math.PI / 2 - theta, RING.pitch, rotations, i * 4)
    }
}

/* -------------------------------------------------------------------------- */
/*                              blade arrangements                            */
/* -------------------------------------------------------------------------- */
/**
 * `shape` picks how the bars are ARRANGED, not what one bar is made of. Every
 * arrangement writes the same two instance buffers — a position and a pose
 * quaternion per blade — so the picker, the framing pass and the strike are
 * untouched by the choice, and adding one is a table entry rather than a
 * branch through the renderer.
 *
 * Each arrangement supplies:
 *  - `extent`, the world radius the group scale fits into RING.fit, so Bars
 *    and Shape both read as density and neither is secretly a zoom;
 *  - `write(phase)`, the pose for every blade. `phase` is in BLADE UNITS, and
 *    advancing it by `count` is exactly one cycle in every arrangement — that
 *    is what lets Speed, Drag and the wheel mean the same thing across all.
 *
 * EVERY ARRANGEMENT IS RIGID UNDER PHASE. The wheel orbits, the helix turns,
 * the sphere spins; nothing translates and nothing wraps. That keeps the rest
 * of the component honest: the bounding radius does not depend on phase, so
 * `extent` is measured once at build time; and there is no conveyor seam to
 * hide, so no arrangement has to be taller than the frame, so no blade ever
 * lands a few centimetres in front of the camera where the perspective divide
 * explodes. An earlier build ran the columns as cropped conveyors and that is
 * exactly what went wrong: at Tilt 35 the near end of a 17-unit column sat ON
 * the camera, the framing pass was fed NDC values in the hundreds, and the
 * frame came back blank.
 */

const LAYOUT = {
    /**
     * Helix — the reference's own figure, in the reference's own numbers
     * (XylophoneConfig.XYLOPHONE): radius 1 on a bar of half-length 1.251, a
     * bar height of rise per step, thetaStep 0.175 rad, tiltFalloff 2. Each is
     * expressed against THIS mesh so the figure survives the blade proportion.
     */
    helixRadius: 1 / 1.2510347366333008,
    /** vertical rise per bar, as a multiple of the blade's own depth */
    helixRise: 1,
    /** twist per bar before the seam quantisation, radians */
    helixTwist: 0.175,
    /**
     * The reference's `tiltX = atan2(geometryHeight, radius * tiltFalloff)` —
     * the lean along the helix, about the bar's own RADIAL axis, which is what
     * makes a tangential bar follow the climb instead of sitting level.
     */
    helixTiltFalloff: 2,
    /** golden angle, radians */
    golden: Math.PI * (3 - Math.sqrt(5)),
} as const

export const SHAPE_OPTIONS = ["wheel", "helix", "sphere", "ribbon"] as const
export type ShapeName = (typeof SHAPE_OPTIONS)[number]

type PoseWriter = (
    phase: number,
    positions: Float32Array,
    rotations: Float32Array
) => void

interface BladeLayout {
    extent: number
    write: PoseWriter
}

/**
 * Twist per bar, rounded so `count` bars close a whole number of turns.
 *
 * Without it the pose set is not periodic in `count`: a phase advance of one
 * cycle would leave every blade rotated by the remainder, so the wheel's
 * `wrap(i + phase, count)` and the columns' own periodicity would disagree,
 * and Speed would slowly desynchronise from Drag.
 */
function seamlessTwist(count: number, target: number): number {
    const turns = Math.max(1, Math.round((count * target) / (2 * Math.PI)))
    return (turns * 2 * Math.PI) / count
}

/**
 * The eight corners of a blade's local bounding box, as one flat array. Built
 * once: the framing pass transforms all of them for every blade, every frame.
 */
function boxCorners(
    boxMin: [number, number, number],
    boxMax: [number, number, number]
): Float32Array {
    const out = new Float32Array(8 * 3)
    let o = 0
    for (let i = 0; i < 8; i++) {
        out[o++] = i & 1 ? boxMax[0] : boxMin[0]
        out[o++] = i & 2 ? boxMax[1] : boxMin[1]
        out[o++] = i & 4 ? boxMax[2] : boxMin[2]
    }
    return out
}

/**
 * Exact bounding radius of a written figure: every corner of every blade's
 * box, posed. Measured rather than derived, because a hand-written extent
 * formula is a second definition of the geometry that can drift from the first
 * — and the symptom, a figure fitted slightly wrong, is one nobody would look
 * for.
 *
 * The wheel does NOT use this. Its analytic `radius + halfLength` is what the
 * component shipped with, and the measured value differs by 0.12% — a real but
 * pointless reframing of every existing instance.
 */
function measureExtent(count: number, mesh: BarMesh, write: PoseWriter): number {
    const positions = new Float32Array(count * 3)
    const rotations = new Float32Array(count * 4)
    write(0, positions, rotations)

    const corners = boxCorners(mesh.boxMin, mesh.boxMax)
    let maxSq = 0
    for (let i = 0; i < count; i++) {
        const px = positions[i * 3]
        const py = positions[i * 3 + 1]
        const pz = positions[i * 3 + 2]
        const qx = rotations[i * 4]
        const qy = rotations[i * 4 + 1]
        const qz = rotations[i * 4 + 2]
        const qw = rotations[i * 4 + 3]
        for (let c = 0; c < 8; c++) {
            const lx = corners[c * 3]
            const ly = corners[c * 3 + 1]
            const lz = corners[c * 3 + 2]
            // the shader's rotateByQuat, verbatim
            const tx = qy * lz - qz * ly + qw * lx
            const ty = qz * lx - qx * lz + qw * ly
            const tz = qx * ly - qy * lx + qw * lz
            const x = px + lx + 2 * (qy * tz - qz * ty)
            const y = py + ly + 2 * (qz * tx - qx * tz)
            const z = pz + lz + 2 * (qx * ty - qy * tx)
            const d = x * x + y * y + z * z
            if (d > maxSq) maxSq = d
        }
    }
    return Math.max(1e-3, Math.sqrt(maxSq))
}

function buildLayout(name: string, count: number, mesh: BarMesh): BladeLayout {
    const half = mesh.halfLength
    const depth = mesh.boxMax[1] - mesh.boxMin[1]

    if (name === "helix") {
        // The reference's figure, from writeHelixTransforms: TANGENTIAL bars on
        // a cylinder, climbing one bar-depth per step and twisting by
        // thetaStep, each leaning along the climb. `PI/2 - theta` aims a
        // blade's +Z outward, so the reference's `-theta` yaw is a tangent; the
        // tilt rides the Euler X slot, which after that yaw is the RADIAL axis.
        //
        // ONE DEVIATION, the same one the whole component makes: the
        // reference's phase is a CONVEYOR — its `s` drives height as well as
        // angle, so bars stream up the column and wrap to the bottom, off the
        // edges of a page-sized canvas. Here the figure is fitted whole into
        // frame, where a wrapping bar would be a visible teleport, so height
        // comes from `i` alone and only the angle reads the phase. Every other
        // number is the reference's.
        const radius = half * LAYOUT.helixRadius
        const rise = depth * LAYOUT.helixRise
        const twist = seamlessTwist(count, LAYOUT.helixTwist)
        const tiltX = Math.atan2(rise, radius * LAYOUT.helixTiltFalloff)
        const write: PoseWriter = (phase, positions, rotations) => {
            for (let i = 0; i < count; i++) {
                // The angle wraps into [0, count) and the height does not.
                // Wrapping is exact because `count * twist` is a whole number
                // of turns, and it is what keeps the angle bounded.
                const theta = wrap(i + phase, count) * twist + RING.thetaOffset
                positions[i * 3] = radius * Math.cos(theta)
                positions[i * 3 + 1] = (i - (count - 1) / 2) * rise
                positions[i * 3 + 2] = radius * Math.sin(theta)
                quatFromEulerYXZ(tiltX, -theta, 0, rotations, i * 4)
            }
        }
        return { extent: measureExtent(count, mesh, write), write }
    }

    if (name === "ribbon") {
        // Ribbon: bars arranged tangentially along a sine wave ribbon that oscillates vertically,
        // forming a continuous ribbon-like band that undulates as it advances around the loop.
        const radius = ringRadius(count, mesh.width, half)
        const ribbonAmplitude = depth * 0.8
        const ribbonFrequency = 3.0 // number of waves around the loop

        const write: PoseWriter = (phase, positions, rotations) => {
            const step = (2 * Math.PI) / count
            for (let i = 0; i < count; i++) {
                const theta = wrap(i + phase, count) * step + RING.thetaOffset
                const y = Math.sin(theta * ribbonFrequency) * ribbonAmplitude

                positions[i * 3] = radius * Math.cos(theta)
                positions[i * 3 + 1] = y
                positions[i * 3 + 2] = radius * Math.sin(theta)

                // Tangential alignment with a slight tilt matching the derivative of the sine wave
                const dy = ribbonFrequency * Math.cos(theta * ribbonFrequency) * ribbonAmplitude
                const tiltX = Math.atan2(dy, radius)
                quatFromEulerYXZ(tiltX, Math.PI / 2 - theta, RING.pitch, rotations, i * 4)
            }
        }
        return { extent: measureExtent(count, mesh, write), write }
    }

    if (name === "sphere") {
        // Fibonacci lattice, spikes pointing outward. The core is sized so the
        // INNER TIPS clear each other — ringRadius's minimum-inner-radius rule
        // again, and the failure without it is identical: a knot at the centre.
        //
        // Two differences from the wheel, both of which cost intersections when
        // they were got wrong:
        //  - the clearance is the cross-section's CIRCUMSCRIBED diameter, not
        //    the blade's width. A spike has no roll, so its 0.44-deep axis
        //    points wherever the aim happened to leave it, and a neighbour can
        //    sit along that axis just as easily as along the 0.16 one. Sizing
        //    off `width` alone left 248 interpenetrating pairs at 64 bars.
        //  - the spacing is MEASURED off the lattice, not the asymptotic
        //    3.809/sqrt(N). That estimate is a limit and is loose at the counts
        //    this dial reaches.
        const dirs = new Float64Array(count * 3)
        for (let i = 0; i < count; i++) {
            const y = 1 - (2 * (i + 0.5)) / count
            const r = Math.sqrt(Math.max(0, 1 - y * y))
            const azimuth = i * LAYOUT.golden
            dirs[i * 3] = r * Math.cos(azimuth)
            dirs[i * 3 + 1] = y
            dirs[i * 3 + 2] = r * Math.sin(azimuth)
        }
        let maxDot = -1
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const d =
                    dirs[i * 3] * dirs[j * 3] +
                    dirs[i * 3 + 1] * dirs[j * 3 + 1] +
                    dirs[i * 3 + 2] * dirs[j * 3 + 2]
                if (d > maxDot) maxDot = d
            }
        }
        const minAngle = Math.acos(Math.min(1, Math.max(-1, maxDot)))
        const clearChord = Math.hypot(mesh.width, depth) * RING.innerClearance
        const centre =
            clearChord / Math.max(2 * Math.sin(minAngle / 2), 1e-4) + half

        const write: PoseWriter = (phase, positions, rotations) => {
            const spin = (phase / count) * 2 * Math.PI
            const cs = Math.cos(spin)
            const sn = Math.sin(spin)
            for (let i = 0; i < count; i++) {
                const y = dirs[i * 3 + 1]
                // the stored direction, spun about Y
                const dx = dirs[i * 3] * cs + dirs[i * 3 + 2] * sn
                const dz = -dirs[i * 3] * sn + dirs[i * 3 + 2] * cs
                positions[i * 3] = dx * centre
                positions[i * 3 + 1] = y * centre
                positions[i * 3 + 2] = dz * centre
                // Ry(yaw) * Rx(pitch) takes +Z onto (cos p sin yaw, -sin p,
                // cos p cos yaw), so pitch = -asin(dy) and yaw = atan2(dx, dz).
                quatFromEulerYXZ(
                    -Math.asin(Math.max(-1, Math.min(1, y))),
                    Math.atan2(dx, dz),
                    0,
                    rotations,
                    i * 4
                )
            }
        }
        return { extent: measureExtent(count, mesh, write), write }
    }

    // wheel — the flat ring of radial spokes the component shipped as
    const radius = ringRadius(count, mesh.width, half)
    return {
        extent: radius + half,
        write: (phase, positions, rotations) =>
            writeRingTransforms(phase, count, radius, positions, rotations),
    }
}

/**
 * NDC offset that centres the figure's projected SILHOUETTE.
 *
 * Projects all eight corners of every blade and returns the negated centre of
 * their bounding box. Blade centres alone are not enough — under perspective
 * the near blades are magnified, and it is their extent, not their centres,
 * that hangs off the bottom of the frame.
 *
 * 512 point transforms a frame at the default blade count, which is nothing
 * beside the fluid solve, and it has to be per-frame because Tilt, Side Tilt
 * and Scale all move the answer. The spin does not: the silhouette is rigid
 * under it (measured at 0.05% over a lap), so this cannot introduce jitter.
 *
 * Writes into `out` and returns it, so a frame allocates nothing.
 */
function ringNdcOffset(
    positions: Float32Array,
    rotations: Float32Array,
    count: number,
    scale: number,
    tiltRad: number,
    rollRad: number,
    distance: number,
    aspect: number,
    corners: Float32Array,
    out: Float32Array
): Float32Array {
    const tanHalf = Math.tan((CAMERA_FOV_DEG * Math.PI) / 360)
    const cx = Math.cos(tiltRad)
    const sx = Math.sin(tiltRad)
    const cz = Math.cos(rollRad)
    const sz = Math.sin(rollRad)

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (let i = 0; i < count; i++) {
        const px = positions[i * 3]
        const py = positions[i * 3 + 1]
        const pz = positions[i * 3 + 2]
        const qx = rotations[i * 4]
        const qy = rotations[i * 4 + 1]
        const qz = rotations[i * 4 + 2]
        const qw = rotations[i * 4 + 3]

        for (let c = 0; c < 8; c++) {
            const lx = corners[c * 3]
            const ly = corners[c * 3 + 1]
            const lz = corners[c * 3 + 2]

            // v + 2 * q.xyz x (q.xyz x v + q.w v) — the shader's rotateByQuat
            const tx = qy * lz - qz * ly + qw * lx
            const ty = qz * lx - qx * lz + qw * ly
            const tz = qx * ly - qy * lx + qw * lz
            const rx = lx + 2 * (qy * tz - qz * ty)
            const ry = ly + 2 * (qz * tx - qx * tz)
            const rz = lz + 2 * (qx * ty - qy * tx)

            // group matrix: Rx(tilt) * Rz(roll) * S
            const gx = (px + rx) * scale
            const gy = (py + ry) * scale
            const gz = (pz + rz) * scale
            const x1 = cz * gx - sz * gy
            const y1 = sz * gx + cz * gy
            const wy = cx * y1 - sx * gz
            const wz = sx * y1 + cx * gz

            // view: the camera sits at +distance looking down -Z
            const viewZ = wz - distance
            // at or behind the camera the divide is meaningless; a corner there
            // is off-frame anyway, so it cannot define the framing
            if (viewZ > -0.05) continue

            const ndcX = x1 / (-viewZ * aspect * tanHalf)
            const ndcY = wy / (-viewZ * tanHalf)
            // A corner this far out cannot bound anything the frame will show,
            // and near the camera the divide inflates it without limit.
            if (
                Math.abs(ndcX) > NDC_FRAMING_LIMIT ||
                Math.abs(ndcY) > NDC_FRAMING_LIMIT
            )
                continue
            if (ndcX < minX) minX = ndcX
            if (ndcX > maxX) maxX = ndcX
            if (ndcY < minY) minY = ndcY
            if (ndcY > maxY) maxY = ndcY
        }
    }

    if (minX > maxX || minY > maxY) {
        out[0] = 0
        out[1] = 0
        return out
    }

    out[0] = -(minX + maxX) / 2
    out[1] = -(minY + maxY) / 2
    return out
}

/* -------------------------------------------------------------------------- */
/*                                   picking                                  */
/* -------------------------------------------------------------------------- */
/**
 * Nearest bar under the pointer, or -1.
 *
 * The bars only exist on the GPU (one instanced draw), so there is nothing to
 * walk. The reference rebuilds each instance's world matrix and inverts it;
 * this does the same transform without ever forming a matrix — the group has
 * only a rotation and a uniform scale, so the ray is pushed into group space
 * once, and each instance's inverse is a subtraction plus a conjugate
 * rotation. One box test per bar, no per-triangle work, no allocation.
 *
 * The group scale arrives as an argument rather than being read from a module
 * constant: it is derived from the live blade count, so a stale copy here
 * would put every hit box at a different size from the blades on screen.
 *
 * There is no spin to reconstruct: the figure orbits as a phase advance on the
 * CPU, so the pose arrays already carry it and this tests exactly what was
 * drawn. The strike swing is deliberately not modelled: it decays in a few
 * hundred ms, and picking a ringing blade should hit where it rests.
 */
function hitBarIndex(
    ndcX: number,
    ndcY: number,
    aspect: number,
    distance: number,
    tiltRad: number,
    rollRad: number,
    scale: number,
    positions: Float32Array,
    rotations: Float32Array,
    count: number,
    boxMin: [number, number, number],
    boxMax: [number, number, number]
): number {
    const tanHalf = Math.tan((CAMERA_FOV_DEG * Math.PI) / 360)

    // world ray: camera on +Z, no rotation
    let ox = 0
    let oy = 0
    let oz = distance
    let dx = ndcX * aspect * tanHalf
    let dy = ndcY * tanHalf
    let dz = -1

    // into group space: inverse(Rx * Rz * S) = S^-1 * Rz^T * Rx^T
    const cx = Math.cos(tiltRad)
    const sx = Math.sin(tiltRad)
    const cz = Math.cos(rollRad)
    const sz = Math.sin(rollRad)
    const inv = 1 / scale

    // Rx^T, then Rz^T, then the uniform scale. Written out rather than called
    // through a helper so the picker allocates nothing per frame, which is the
    // whole point of testing boxes instead of triangles.
    {
        const y1 = cx * oy + sx * oz
        const z1 = -sx * oy + cx * oz
        const x2 = cz * ox + sz * y1
        const y2 = -sz * ox + cz * y1
        ox = x2 * inv
        oy = y2 * inv
        oz = z1 * inv
    }
    {
        const y1 = cx * dy + sx * dz
        const z1 = -sx * dy + cx * dz
        const x2 = cz * dx + sz * y1
        const y2 = -sz * dx + cz * y1
        dx = x2 * inv
        dy = y2 * inv
        dz = z1 * inv
    }

    let hitIndex = -1
    let hitT = Infinity

    for (let i = 0; i < count; i++) {
        // the blade's own pose, conjugated to push the ray into blade space
        const qx = rotations[i * 4]
        const qy = rotations[i * 4 + 1]
        const qz = rotations[i * 4 + 2]
        const qw = rotations[i * 4 + 3]

        const cxq = -qx
        const cyq = -qy
        const czq = -qz

        // v + 2 * c x (c x v + qw * v), with c the conjugate's vector part
        let vx = ox - positions[i * 3]
        let vy = oy - positions[i * 3 + 1]
        let vz = oz - positions[i * 3 + 2]
        let tx = cyq * vz - czq * vy + qw * vx
        let ty = czq * vx - cxq * vz + qw * vy
        let tz = cxq * vy - cyq * vx + qw * vz
        const lox = vx + 2 * (cyq * tz - czq * ty)
        const loy = vy + 2 * (czq * tx - cxq * tz)
        const loz = vz + 2 * (cxq * ty - cyq * tx)

        vx = dx
        vy = dy
        vz = dz
        tx = cyq * vz - czq * vy + qw * vx
        ty = czq * vx - cxq * vz + qw * vy
        tz = cxq * vy - cyq * vx + qw * vz
        const ldx = vx + 2 * (cyq * tz - czq * ty)
        const ldy = vy + 2 * (czq * tx - cxq * tz)
        const ldz = vz + 2 * (cxq * ty - cyq * tx)

        // slab test
        let tmin = -Infinity
        let tmax = Infinity
        let miss = false

        for (let k = 0; k < 3; k++) {
            const origin = k === 0 ? lox : k === 1 ? loy : loz
            const dir = k === 0 ? ldx : k === 1 ? ldy : ldz
            const lowBound = boxMin[k]
            const highBound = boxMax[k]

            if (Math.abs(dir) < 1e-12) {
                if (origin < lowBound || origin > highBound) {
                    miss = true
                    break
                }
                continue
            }

            const invD = 1 / dir
            let t1 = (lowBound - origin) * invD
            let t2 = (highBound - origin) * invD
            if (t1 > t2) {
                const tmp = t1
                t1 = t2
                t2 = tmp
            }
            if (t1 > tmin) tmin = t1
            if (t2 < tmax) tmax = t2
            if (tmin > tmax) {
                miss = true
                break
            }
        }

        if (miss || tmax < 0) continue

        // the direction is the same length for every bar (rotation preserves
        // it), so comparing the ray parameter IS comparing distance
        const t = tmin >= 0 ? tmin : 0
        if (t < hitT) {
            hitT = t
            hitIndex = i
        }
    }

    return hitIndex
}

/* -------------------------------------------------------------------------- */
/*                                  gl helpers                                */
/* -------------------------------------------------------------------------- */
function compile(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("[XylophoneHelix] shader compile failed:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

type Program = {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation | null>
    attribs: Record<string, number>
}

function createProgram(
    gl: WebGL2RenderingContext,
    vertSource: string,
    fragSource: string,
    uniformNames: string[],
    attribNames: string[]
): Program | null {
    const vs = compile(gl, gl.VERTEX_SHADER, vertSource)
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragSource)
    if (!vs || !fs) return null

    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    // Bound before the link rather than queried after it: the quad VAO is built
    // once and reused by three programs, so the locations have to be the same
    // number in each of them, and GL only guarantees that if it is asked.
    for (let i = 0; i < attribNames.length; i++) gl.bindAttribLocation(program, i, attribNames[i])
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("[XylophoneHelix] link failed:", gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    for (const name of uniformNames) {
        const location = gl.getUniformLocation(program, name)
        // A typo'd name fails silently and the effect just never appears, so it
        // is reported rather than left to be found by looking at the render.
        if (location === null) console.warn(`[XylophoneHelix] no uniform location for ${name}`)
        uniforms[name] = location
    }

    const attribs: Record<string, number> = {}
    for (const name of attribNames) attribs[name] = gl.getAttribLocation(program, name)
    for (const name of attribNames) {
        if (attribs[name] < 0) console.warn(`[XylophoneHelix] attribute ${name} was optimised out`)
    }

    return { program, uniforms, attribs }
}

type Target = {
    fbo: WebGLFramebuffer
    texture: WebGLTexture
    width: number
    height: number
}

function createTarget(
    gl: WebGL2RenderingContext,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
): Target {
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return { fbo, texture, width, height }
}

/** Texels in the wake ramp. */
const RAMP_WIDTH = 256

/**
 * Empty texture for the wake ramp. The colours are written into it by
 * writeRampTexture, which runs again whenever the Colors array changes — the
 * texture OBJECT is created once, so a colour edit re-uploads 1KB rather than
 * rebuilding anything.
 */
function createRampTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return texture
}

/**
 * Builds the Colors array into a 256x1 sRGB ramp.
 *
 * THE ARRAY IS A CYCLE, NOT A GRADIENT WITH TWO ENDS. Stop `k` sits at `k / n`
 * and the ramp closes back onto stop 0 at 1.0, so whatever goes in it, the
 * first and last texel match. That is not a nicety: the ring closes on itself,
 * so blade `count - 1` is adjacent to blade 0, and a ramp whose ends differ
 * paints a hard seam down one blade.
 *
 * Interpolated in sRGB, byte by byte, which is what the canvas gradient this
 * replaced did — the shader decodes on sample, so the maths downstream is
 * still linear.
 */
function buildRampBytes(colors: string[]): Uint8Array {
    const source = colors.length > 0 ? colors : HOVER_COLOR_DEFAULTS
    const encode = (c: number) => {
        const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
        return Math.max(0, Math.min(255, Math.round(v * 255)))
    }

    const stops = source.map((color) => {
        const linear = parseColorToLinear(color, [0, 0, 0])
        return [encode(linear[0]), encode(linear[1]), encode(linear[2])]
    })

    const n = stops.length
    const bytes = new Uint8Array(RAMP_WIDTH * 4)
    for (let i = 0; i < RAMP_WIDTH; i++) {
        // t runs 0..n over the texture, so the last texel lands exactly on the
        // wrap back to stop 0
        const t = (i / (RAMP_WIDTH - 1)) * n
        const k = Math.min(n - 1, Math.floor(t))
        const f = t - k
        const a = stops[k]
        const b = stops[(k + 1) % n]
        bytes[i * 4] = a[0] + (b[0] - a[0]) * f
        bytes[i * 4 + 1] = a[1] + (b[1] - a[1]) * f
        bytes[i * 4 + 2] = a[2] + (b[2] - a[2]) * f
        bytes[i * 4 + 3] = 255
    }

    return bytes
}

/** Uploads a built ramp. Split from buildRampBytes so the closure the ring
 *  depends on can be asserted without a GL context. */
function writeRampTexture(
    gl: WebGL2RenderingContext,
    texture: WebGLTexture,
    colors: string[]
): void {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        RAMP_WIDTH,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        buildRampBytes(colors)
    )
}

/**
 * Colours may arrive as hex, rgb(), hsl() or a var() with a fallback, so a
 * hex-only parser would make the prop look dead. Returns LINEAR components,
 * because three's Color did the sRGB decode on construction and the shader
 * maths here is the same maths.
 */
function parseColorToLinear(
    input: string | undefined,
    fallback: [number, number, number]
): [number, number, number] {
    if (!input) return fallback

    const toLinear = (c: number) =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    const value = input.trim()

    const hex = value.match(/^#([0-9a-f]{3,8})$/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        }
        const r = parseInt(h.slice(0, 2), 16) / 255
        const g = parseInt(h.slice(2, 4), 16) / 255
        const b = parseInt(h.slice(4, 6), 16) / 255
        return [toLinear(r), toLinear(g), toLinear(b)]
    }

    const rgb = value.match(/^rgba?\(([^)]+)\)$/i)
    if (rgb) {
        const parts = rgb[1].split(/[,/\s]+/).filter(Boolean)
        const channel = (s: string) =>
            s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s) / 255
        if (parts.length >= 3) {
            return [
                toLinear(channel(parts[0])),
                toLinear(channel(parts[1])),
                toLinear(channel(parts[2])),
            ]
        }
    }

    const hsl = value.match(/^hsla?\(([^)]+)\)$/i)
    if (hsl) {
        const parts = hsl[1].split(/[,/\s]+/).filter(Boolean)
        if (parts.length >= 3) {
            const h = (((parseFloat(parts[0]) % 360) + 360) % 360) / 360
            const s = parseFloat(parts[1]) / 100
            const l = parseFloat(parts[2]) / 100
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s
            const p = 2 * l - q
            const hue = (t: number) => {
                let x = t
                if (x < 0) x += 1
                if (x > 1) x -= 1
                if (x < 1 / 6) return p + (q - p) * 6 * x
                if (x < 1 / 2) return q
                if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
                return p
            }
            return [toLinear(hue(h + 1 / 3)), toLinear(hue(h)), toLinear(hue(h - 1 / 3))]
        }
    }

    // A var(--token, #fallback) form still carries a usable colour.
    const fallbackInVar = value.match(/var\([^,]+,\s*(.+)\)$/i)
    if (fallbackInVar) return parseColorToLinear(fallbackInVar[1].trim(), fallback)

    return fallback
}

/* -------------------------------------------------------------------------- */
/*                                    props                                   */
/* -------------------------------------------------------------------------- */
export type MetalProps = {
    /** env mix, 0 = matte plate, 100 = mirror */
    reflect?: number
    /** highlight sharpness: horizon edge, soft-box width and key tightness */
    polish?: number
}

export type HoverProps = {
    /** the ramp the wake sweeps across the metal; read as a CYCLE, not a
     *  two-ended gradient — see buildRampBytes */
    colors?: string[]
    strength?: number
    tint?: number
    glow?: number
}

export type CameraProps = {
    tilt?: number
    sideTilt?: number
}

export interface XylophoneHelixProps {
    background?: string
    /** the blades' own metal colour */
    baseColor?: string
    bars?: number
    shape?: ShapeName
    speed?: number
    /** drag-to-spin gain; 50 turns the figure half a lap per full-width drag */
    drag?: number
    /** group scale at a FIXED camera, so perspective is identical at every
     *  setting (unlike the Framer build's earlier `Distance`, which dollied) */
    scale?: number
    metal?: MetalProps
    hover?: HoverProps
    camera?: CameraProps
    /** convenience sizing — the component otherwise fills its parent */
    width?: number | string
    height?: number | string
    className?: string
    style?: CSSProperties
}

// Typed so an omitted group cannot narrow the prop type into an error at the
// read site, and so one missed key cannot silently pin a control.
export const METAL_DEFAULTS: Required<MetalProps> = {
    reflect: 85,
    polish: 100,
}

/**
 * The steel sweep the Framer instance shipped with. The ramp is a CYCLE, so
 * the closing stop is the opening one and writing it twice would put a flat
 * run at the seam.
 */
export const HOVER_COLOR_DEFAULTS = ["#1d2740", "#7f93b5", "#ffffff", "#c9a97f"]

/** The rainbow the code-side default used before the panel overrode it. */
export const HOVER_COLOR_RAINBOW = [
    "#ff0000",
    "#ff9900",
    "#ffee00",
    "#33ff00",
    "#0099ff",
    "#9900ff",
]

export const HOVER_DEFAULTS: Required<HoverProps> = {
    colors: HOVER_COLOR_DEFAULTS,
    strength: 100,
    tint: 100,
    glow: 30,
}

export const CAMERA_DEFAULTS: Required<CameraProps> = { tilt: 47, sideTilt: 0 }

/**
 * The chrome the component shipped as, written as the colour that decodes to
 * the linear (0.55, 0.57, 0.62) that used to be a constant in the shader. The
 * round trip through an 8-bit hex is not exact — it decodes to
 * (0.5520, 0.5711, 0.6172) — so a default render differs from the hard-coded
 * material by at most 1/255 on a channel. That quantisation is the cost of the
 * colour being a prop at all.
 */
export const BASE_COLOR_DEFAULT = "#c4c7ce"
const BASE_COLOR_FALLBACK_LINEAR: [number, number, number] = [0.55, 0.57, 0.62]

export const BACKGROUND_DEFAULT = "#000000"
const BACKGROUND_FALLBACK_LINEAR: [number, number, number] = [0, 0, 0]

/** Every top-level default in one place, so a page can spread it. */
export const XYLOPHONE_HELIX_DEFAULTS = {
    background: BACKGROUND_DEFAULT,
    baseColor: BASE_COLOR_DEFAULT,
    bars: 44,
    shape: "sphere" as ShapeName,
    speed: 100,
    drag: 100,
    scale: 55,
    metal: METAL_DEFAULTS,
    hover: HOVER_DEFAULTS,
    camera: CAMERA_DEFAULTS,
}

/* -------------------------------------------------------------------------- */
/*                                  component                                 */
/* -------------------------------------------------------------------------- */
export default function XylophoneHelix(props: XylophoneHelixProps) {
    const {
        background = "#000000",
        baseColor = "#c4c7ce",
        bars = 44,
        shape = "wheel",
        speed = 100,
        drag = 100,
        scale = 143,
        metal = {"polish":100,"reflect":100},
        hover = {"glow":48,"tint":47,"colors":["#FF0000","#FF0000"],"strength":184},
        camera = {"tilt":0,"sideTilt":0},
        width = "100%",
        height = "100%",
        className,
        style,
    } = props

    const metalResolved = { ...METAL_DEFAULTS, ...(metal ?? {}) }
    const hoverResolved = { ...HOVER_DEFAULTS, ...(hover ?? {}) }
    const cameraResolved = { ...CAMERA_DEFAULTS, ...(camera ?? {}) }

    const rootRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Every live input the loop reads. In a ref, never a dep: a colour change
    // must not rebuild the context or recompile a shader.
    const live = useRef({
        backgroundLinear: BACKGROUND_FALLBACK_LINEAR,
        baseColorLinear: BASE_COLOR_FALLBACK_LINEAR,
        bars: 44,
        shape: "sphere" as string,
        spinSpeed: SPIN_AT_FIFTY,
        dragTurns: DRAG_TURNS_AT_FIFTY,
        scaleFactor: 1,
        tiltRad: 0,
        rollRad: 0,
        reflect: 0.85,
        polish: 1,
        fluidStrength: 1,
        tintStrength: 1,
        tintGlow: 0.3,
        hoverColors: HOVER_COLOR_DEFAULTS,
    })

    // Written on every render, read inside the loop. Plain assignment rather
    // than an effect: the loop only ever reads these between frames, so there
    // is nothing to tear, and an effect would add a frame of lag to every dial.
    live.current.backgroundLinear = parseColorToLinear(background, BACKGROUND_FALLBACK_LINEAR)
    live.current.baseColorLinear = parseColorToLinear(baseColor, BASE_COLOR_FALLBACK_LINEAR)
    live.current.bars = Math.max(2, Math.round(bars))
    live.current.shape = shape
    live.current.spinSpeed = (speed / 50) * SPIN_AT_FIFTY
    // Input gain, kept a separate prop from Speed on purpose: an input gain and
    // an autonomous rate are two meanings.
    live.current.dragTurns = (drag / 50) * DRAG_TURNS_AT_FIFTY
    // A pure multiplier on the group scale. It is the escape hatch for the
    // column: a Helix of many bars IS long, and the fit shrinks it to keep the
    // whole figure in frame, so Bars and apparent size are coupled by geometry
    // rather than by a bug. Scale overrides the fit.
    live.current.scaleFactor = Math.max(1, scale) / 100
    live.current.tiltRad = (cameraResolved.tilt * Math.PI) / 180
    live.current.rollRad = (cameraResolved.sideTilt * Math.PI) / 180
    live.current.reflect = metalResolved.reflect / 100
    live.current.polish = metalResolved.polish / 100
    live.current.fluidStrength = hoverResolved.strength / 100
    live.current.tintStrength = hoverResolved.tint / 100
    live.current.tintGlow = hoverResolved.glow / 100
    live.current.hoverColors = hoverResolved.colors

    useEffect(() => {
        const canvas = canvasRef.current
        const root = rootRef.current
        if (!canvas || !root) return

        const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: true,
            depth: true,
            stencil: false,
            premultipliedAlpha: false,
            powerPreference: "high-performance",
        })
        if (!gl) {
            // No WebGL2: the CSS background on the root is already the
            // gradient's base colour, so the component reads as a flat backdrop
            // rather than a hole in the page.
            console.warn("[XylophoneHelix] WebGL2 unavailable — rendering the backdrop only")
            return
        }

        const floatColorBuffer = gl.getExtension("EXT_color_buffer_float")
        const fluidEnabled = floatColorBuffer !== null
        if (!fluidEnabled) {
            console.warn("[XylophoneHelix] EXT_color_buffer_float unavailable — hover wake disabled")
        }

        const isMobile =
            (window.matchMedia?.("(pointer: coarse)").matches ?? false) &&
            Math.min(window.innerWidth, window.innerHeight) < 900
        const maxDpr = isMobile ? 1.5 : 2
        const dpr = Math.min(maxDpr, window.devicePixelRatio || 1)

        const reduceMotion =
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

        const mesh = decodeBarMesh()

        /* ------------------------------- programs ------------------------------ */
        const backdropProgram = createProgram(gl, QUAD_VERT, BACKDROP_FRAG, ["u_color"], ["aPosition"])
        const blurProgram = createProgram(gl, QUAD_VERT, BLUR_FRAG, ["u_tSource", "u_step"], ["aPosition"])
        const barProgram = createProgram(
            gl,
            BAR_VERT,
            BAR_FRAG,
            [
                "u_projectionMatrix",
                "u_viewMatrix",
                "u_modelMatrix",
                "u_normalMatrix",
                "u_ndcOffset",
                "u_time",
                "u_swingScale",
                "u_swingAxis",
                "u_tFluid",
                "u_tGradient",
                "u_tBackdrop",
                "u_cameraPos",
                "u_fluidStrength",
                "u_tintStrength",
                "u_tintGlow",
                "u_baseColor",
                "u_reflectStrength",
                "u_polish",
                "u_fresnelPower",
            ],
            ["aVertexPosition", "aVertexNormal", "aPos", "aRot", "aTintOffset", "aStrikeTime"]
        )

        const fluidPrograms = fluidEnabled
            ? {
                  splat: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_SPLAT_FRAG,
                      [
                          "u_texelSize",
                          "u_tTarget",
                          "u_aspectRatio",
                          "u_splatColor",
                          "u_splatPosition",
                          "u_prevPoint",
                          "u_splatRadius",
                      ],
                      ["aPosition"]
                  ),
                  curl: createProgram(gl, FLUID_VERT, FLUID_CURL_FRAG, ["u_texelSize", "u_tVelocity"], ["aPosition"]),
                  vorticity: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_VORTICITY_FRAG,
                      ["u_texelSize", "u_tVelocity", "u_tCurl", "u_curl", "u_dt"],
                      ["aPosition"]
                  ),
                  divergence: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_DIVERGENCE_FRAG,
                      ["u_texelSize", "u_tVelocity"],
                      ["aPosition"]
                  ),
                  clear: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_CLEAR_FRAG,
                      ["u_texelSize", "u_tTexture", "u_value", "u_dt"],
                      ["aPosition"]
                  ),
                  pressure: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_PRESSURE_FRAG,
                      ["u_texelSize", "u_tPressure", "u_tDivergence"],
                      ["aPosition"]
                  ),
                  gradientSubtract: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_GRADIENT_SUBTRACT_FRAG,
                      ["u_texelSize", "u_tPressure", "u_tVelocity"],
                      ["aPosition"]
                  ),
                  advection: createProgram(
                      gl,
                      FLUID_VERT,
                      FLUID_ADVECTION_FRAG,
                      ["u_texelSize", "u_tVelocity", "u_tSource", "u_dt", "u_dissipation"],
                      ["aPosition"]
                  ),
              }
            : null

        if (!backdropProgram || !blurProgram || !barProgram) return

        /* -------------------------------- buffers ------------------------------ */
        const quadBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

        const quadVao = gl.createVertexArray()!
        gl.bindVertexArray(quadVao)
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)

        const positionBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW)

        const normalBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW)

        const indexBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)

        const aPosBuffer = gl.createBuffer()!
        const aRotBuffer = gl.createBuffer()!
        const aTintBuffer = gl.createBuffer()!
        const aStrikeBuffer = gl.createBuffer()!

        const barVao = gl.createVertexArray()!
        gl.bindVertexArray(barVao)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

        const bindAttrib = (
            buffer: WebGLBuffer,
            location: number,
            size: number,
            divisor: number
        ) => {
            if (location < 0) return
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.enableVertexAttribArray(location)
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
            gl.vertexAttribDivisor(location, divisor)
        }

        bindAttrib(positionBuffer, barProgram.attribs.aVertexPosition, 3, 0)
        bindAttrib(normalBuffer, barProgram.attribs.aVertexNormal, 3, 0)
        bindAttrib(aPosBuffer, barProgram.attribs.aPos, 3, 1)
        bindAttrib(aRotBuffer, barProgram.attribs.aRot, 4, 1)
        bindAttrib(aTintBuffer, barProgram.attribs.aTintOffset, 1, 1)
        bindAttrib(aStrikeBuffer, barProgram.attribs.aStrikeTime, 1, 1)
        gl.bindVertexArray(null)

        /* ------------------------------ instances ------------------------------ */
        let count = live.current.bars
        // The arrangement owns the poses AND the size the group is fitted to,
        // so both are rebuilt whenever Bars or Shape moves. `fitScale` is the
        // arrangement's own fit; `groupScale` is that times the live Scale and
        // is what the model matrix, the framing pass and the PICKER all read.
        // They must be the same number or every hit box sits at a different
        // size from the blade it belongs to.
        let shapeBuilt = live.current.shape
        let layout = buildLayout(shapeBuilt, count, mesh)
        let fitScale = RING.fit / layout.extent
        let groupScale = fitScale
        let instancePositions = new Float32Array(count * 3)
        let instanceRotations = new Float32Array(count * 4)
        let instanceStrikes = new Float32Array(count)

        const allocateInstances = (nextCount: number) => {
            count = nextCount
            layout = buildLayout(shapeBuilt, count, mesh)
            fitScale = RING.fit / layout.extent
            instancePositions = new Float32Array(count * 3)
            instanceRotations = new Float32Array(count * 4)
            instanceStrikes = new Float32Array(count).fill(-1e9)

            const tintOffsets = new Float32Array(count)
            for (let i = 0; i < count; i++) tintOffsets[i] = i / count

            layout.write(0, instancePositions, instanceRotations)

            gl.bindBuffer(gl.ARRAY_BUFFER, aPosBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, instancePositions, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, aRotBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, instanceRotations, gl.DYNAMIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, aTintBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, tintOffsets, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, aStrikeBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, instanceStrikes, gl.DYNAMIC_DRAW)
        }

        allocateInstances(count)

        /* -------------------------------- textures ----------------------------- */
        const gradientTexture = createRampTexture(gl)
        // The array may be a fresh object every render, so the ramp is rebuilt
        // on a CONTENT change, not an identity change — otherwise every
        // unrelated prop edit re-uploads it.
        let rampKey = live.current.hoverColors.join("|")
        writeRampTexture(gl, gradientTexture, live.current.hoverColors)

        // Stands in for the velocity field when the fluid cannot run: a zero
        // texture reads as no wake, so the bars simply stay untinted.
        const emptyTexture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, emptyTexture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        const simRes = FLUID.simRes
        const halfFloat = gl.RGBA16F
        const velocity = fluidEnabled
            ? [
                  createTarget(gl, simRes, simRes, halfFloat, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR),
                  createTarget(gl, simRes, simRes, halfFloat, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR),
              ]
            : null
        const pressure = fluidEnabled
            ? [
                  createTarget(gl, simRes, simRes, halfFloat, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST),
                  createTarget(gl, simRes, simRes, halfFloat, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST),
              ]
            : null
        const divergenceTarget = fluidEnabled
            ? createTarget(gl, simRes, simRes, halfFloat, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST)
            : null
        const curlTarget = fluidEnabled
            ? createTarget(gl, simRes, simRes, halfFloat, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST)
            : null

        let velocityRead = 0
        let pressureRead = 0

        let backdropTargets: Target[] = []
        let backdropWidth = 1
        let backdropHeight = 1

        const disposeBackdrop = () => {
            for (const target of backdropTargets) {
                gl.deleteFramebuffer(target.fbo)
                gl.deleteTexture(target.texture)
            }
            backdropTargets = []
        }

        const allocateBackdrop = (w: number, h: number) => {
            disposeBackdrop()
            backdropWidth = Math.max(1, Math.round(w * BACKDROP_SCALE))
            backdropHeight = Math.max(1, Math.round(h * BACKDROP_SCALE))
            backdropTargets = [
                createTarget(gl, backdropWidth, backdropHeight, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR),
                createTarget(gl, backdropWidth, backdropHeight, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR),
            ]
        }

        /* --------------------------------- size -------------------------------- */
        let viewWidth = 0
        let viewHeight = 0

        const resize = () => {
            // clientWidth, not a layout prop: the element's own box is the only
            // thing that knows what CSS actually gave it.
            const cssWidth = canvas.clientWidth || root.clientWidth || 1
            const cssHeight = canvas.clientHeight || root.clientHeight || 1
            const w = Math.max(1, Math.round(cssWidth * dpr))
            const h = Math.max(1, Math.round(cssHeight * dpr))
            if (w === viewWidth && h === viewHeight) return

            viewWidth = w
            viewHeight = h
            canvas.width = w
            canvas.height = h
            allocateBackdrop(w, h)
        }

        resize()
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(root)

        /* -------------------------------- input -------------------------------- */
        const input = {
            ndcX: 0,
            ndcY: 0,
            /** 0..1 from the bottom-left — what the fluid splats in */
            screenX: 0.5,
            screenY: 0.5,
            deltaScrollY: 0,
            /** Drag travel since the last frame, as a FRACTION of the host's width. */
            deltaSpinX: 0,
            hasPointer: false,
        }

        const gesture = {
            startX: 0,
            startY: 0,
            prevX: 0,
            prevY: 0,
            axis: "none" as "none" | "x" | "y",
            /** Host width in the same (possibly zoomed) space as clientX. */
            width: 1,
            pointerId: -1,
        }

        /**
         * Horizontal drag travel -> spin, normalised by the host's width so one
         * drag across the component means one amount of rotation at any size or
         * page zoom: clientX and the rect are in the same space, so the zoom
         * cancels.
         */
        const addSpin = (dxClient: number) => {
            if (gesture.width <= 0) return
            input.deltaSpinX += dxClient / gesture.width
        }

        const readPointer = (clientX: number, clientY: number) => {
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return
            const fx = (clientX - rect.left) / rect.width
            const fy = (clientY - rect.top) / rect.height
            input.ndcX = fx * 2 - 1
            input.ndcY = 1 - fy * 2
            input.screenX = fx
            input.screenY = 1 - fy
            input.hasPointer = true
        }

        const onPointerMove = (event: PointerEvent) => readPointer(event.clientX, event.clientY)

        /**
         * Mouse and pen drag-to-spin. Touch is NOT handled here: it goes through
         * the touch handlers below so it keeps the axis lock, and running both
         * paths for one finger would count the same travel twice.
         */
        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType === "touch") return
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0) return
            gesture.pointerId = event.pointerId
            gesture.prevX = event.clientX
            gesture.width = rect.width
        }

        // On window: a drag that leaves the component must still track, and must
        // still release when the button comes up outside it.
        const onWindowPointerMove = (event: PointerEvent) => {
            if (gesture.pointerId !== event.pointerId) return
            addSpin(event.clientX - gesture.prevX)
            gesture.prevX = event.clientX
        }

        const onWindowPointerUp = (event: PointerEvent) => {
            if (gesture.pointerId === event.pointerId) gesture.pointerId = -1
        }

        const onPointerLeave = () => {
            input.hasPointer = false
            // Scoped to a component there is a leave event, and holding the last
            // hit across it would mean re-entering on the SAME bar never rings
            // it again.
            lastHitIndex = -1
        }

        const onWheel = (event: WheelEvent) => {
            // The component owns the wheel while the pointer is over it.
            event.preventDefault()
            let delta = event.deltaY
            if (event.deltaMode === 1) delta *= 16
            else if (event.deltaMode === 2) delta *= root.clientHeight || 800
            input.deltaScrollY += Math.max(-MAX_SCROLL_PER_EVENT, Math.min(MAX_SCROLL_PER_EVENT, delta))
        }

        const onTouchStart = (event: TouchEvent) => {
            const touch = event.touches[0]
            if (!touch) return
            const rect = root.getBoundingClientRect()
            gesture.startX = touch.clientX
            gesture.startY = touch.clientY
            gesture.prevX = touch.clientX
            gesture.prevY = touch.clientY
            gesture.axis = "none"
            gesture.width = rect.width > 0 ? rect.width : 1
            readPointer(touch.clientX, touch.clientY)
        }

        /**
         * Axis-locked drag. The first 8px of travel decide whether the gesture
         * scrolls the phase (vertical) or spins the figure (horizontal); once
         * locked it stays locked, so a diagonal sweep never does both at once.
         */
        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0] ?? event.changedTouches[0]
            if (!touch) return
            readPointer(touch.clientX, touch.clientY)

            if (gesture.axis === "none") {
                const dx = touch.clientX - gesture.startX
                const dy = touch.clientY - gesture.startY
                if (Math.hypot(dx, dy) < DRAG_AXIS_LOCK_PX) return
                gesture.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x"
                // drop the pre-lock travel on both axes
                gesture.prevX = touch.clientX
                gesture.prevY = touch.clientY
            }

            if (gesture.axis === "x") {
                addSpin(touch.clientX - gesture.prevX)
                gesture.prevX = touch.clientX
                return
            }

            const delta = (gesture.prevY - touch.clientY) * DRAG_SCALE
            input.deltaScrollY += Math.max(-MAX_SCROLL_PER_EVENT, Math.min(MAX_SCROLL_PER_EVENT, delta))
            gesture.prevY = touch.clientY
        }

        // On window: a touch that leaves the component must still release.
        const onTouchEnd = () => {
            gesture.axis = "none"
        }

        root.addEventListener("pointerdown", onPointerDown, { passive: true })
        window.addEventListener("pointermove", onWindowPointerMove, { passive: true })
        window.addEventListener("pointerup", onWindowPointerUp, { passive: true })
        window.addEventListener("pointercancel", onWindowPointerUp, { passive: true })
        root.addEventListener("pointermove", onPointerMove, { passive: true })
        root.addEventListener("pointerleave", onPointerLeave, { passive: true })
        root.addEventListener("wheel", onWheel, { passive: false })
        root.addEventListener("touchstart", onTouchStart, { passive: true })
        root.addEventListener("touchmove", onTouchMove, { passive: true })
        window.addEventListener("touchend", onTouchEnd, { passive: true })
        window.addEventListener("touchcancel", onTouchEnd, { passive: true })

        /* ------------------------------ frame state ---------------------------- */
        const bladeCorners = boxCorners(mesh.boxMin, mesh.boxMax)
        const ndcOffset = new Float32Array(2)

        let phaseTarget = 0
        let phaseCurrent = 0
        let spinAngle = 0
        let phaseWritten = 0
        let lastHitIndex = -1
        /** Angle of the synthetic autoplay wake point, radians. */
        let autoplayAngle = 0

        let time = 0
        let lastFrame = performance.now()
        let rafId = 0

        const point = {
            x: 0.5,
            y: 0.5,
            prevX: 0.5,
            prevY: 0.5,
            lastUpdate: 0,
            lastSplat: 0,
            velocity: 0,
        }
        let lastUserInput = -Infinity

        const projection = new Float32Array(16)
        const viewMatrix = new Float32Array(16)
        const modelMatrix = new Float32Array(16)
        const normalMatrix = new Float32Array(9)

        const drawQuad = () => {
            gl.bindVertexArray(quadVao)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            gl.bindVertexArray(null)
        }

        const bindTargetForDraw = (target: Target | null) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null)
            gl.viewport(0, 0, target ? target.width : viewWidth, target ? target.height : viewHeight)
        }

        /* ------------------------------ fluid solve ---------------------------- */
        const texel = 1 / simRes

        const splat = () => {
            if (!fluidPrograms?.splat || !velocity) return

            // Autoplay: with no real pointer over the canvas, drive the wake
            // from a synthetic point circling the figure instead of freezing at
            // (0.5, 0.5) — a frozen point never moves, so no splat is ever
            // generated without a hover.
            if (input.hasPointer) {
                point.x = input.screenX
                point.y = input.screenY
            } else {
                point.x = 0.5 + Math.cos(autoplayAngle) * AUTOPLAY_RADIUS
                point.y = 0.5 + Math.sin(autoplayAngle) * AUTOPLAY_RADIUS
            }

            if (time - point.lastUpdate < 0.016) return

            const dx = point.x - point.prevX
            const dy = point.y - point.prevY
            const dist = Math.hypot(dx, dy)
            point.velocity = Math.min(1, point.velocity + dist * 2)

            if (dist > 0) {
                if (dist > 0.001) lastUserInput = time

                const newLine = time - point.lastSplat > 0.15
                const aspect = viewHeight > 0 ? viewWidth / viewHeight : 1
                const force = newLine ? 0 : FLUID.splatForce

                const program = fluidPrograms.splat
                gl.useProgram(program.program)
                gl.uniform2f(program.uniforms.u_texelSize, texel, texel)
                gl.uniform1f(program.uniforms.u_aspectRatio, aspect)
                gl.uniform2f(program.uniforms.u_splatPosition, point.x, point.y)
                gl.uniform2f(
                    program.uniforms.u_prevPoint,
                    newLine ? point.x : point.prevX,
                    newLine ? point.y : point.prevY
                )
                gl.uniform3f(program.uniforms.u_splatColor, dx * aspect * force, dy * force, 0)
                gl.uniform1f(program.uniforms.u_splatRadius, FLUID.splatRadius * point.velocity)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, velocity[velocityRead].texture)
                gl.uniform1i(program.uniforms.u_tTarget, 0)

                bindTargetForDraw(velocity[1 - velocityRead])
                drawQuad()
                velocityRead = 1 - velocityRead

                point.lastSplat = time
            }

            point.lastUpdate = time
            point.prevX = point.x
            point.prevY = point.y
            point.velocity *= 0.9
            point.velocity = Math.min(1, point.velocity)
        }

        const solveFluid = (delta: number) => {
            if (!fluidPrograms || !velocity || !pressure || !divergenceTarget || !curlTarget) return
            const {
                curl: curlProgram,
                vorticity,
                divergence,
                clear,
                pressure: pressureProgram,
                gradientSubtract,
                advection,
            } = fluidPrograms
            if (
                !curlProgram ||
                !vorticity ||
                !divergence ||
                !clear ||
                !pressureProgram ||
                !gradientSubtract ||
                !advection
            )
                return

            splat()

            // Idle gate: once input is stale the field has dissipated, so skip
            // the solve entirely to save GPU and battery.
            if (time - lastUserInput > FLUID.idleSleepAfter) return

            const bindSource = (
                program: Program,
                name: string,
                texture: WebGLTexture,
                unit: number
            ) => {
                gl.activeTexture(gl.TEXTURE0 + unit)
                gl.bindTexture(gl.TEXTURE_2D, texture)
                gl.uniform1i(program.uniforms[name], unit)
            }

            // curl of the velocity field
            gl.useProgram(curlProgram.program)
            gl.uniform2f(curlProgram.uniforms.u_texelSize, texel, texel)
            bindSource(curlProgram, "u_tVelocity", velocity[velocityRead].texture, 0)
            bindTargetForDraw(curlTarget)
            drawQuad()

            // vorticity confinement
            gl.useProgram(vorticity.program)
            gl.uniform2f(vorticity.uniforms.u_texelSize, texel, texel)
            gl.uniform1f(vorticity.uniforms.u_curl, FLUID.curlStrength)
            gl.uniform1f(vorticity.uniforms.u_dt, delta)
            bindSource(vorticity, "u_tVelocity", velocity[velocityRead].texture, 0)
            bindSource(vorticity, "u_tCurl", curlTarget.texture, 1)
            bindTargetForDraw(velocity[1 - velocityRead])
            drawQuad()
            velocityRead = 1 - velocityRead

            // divergence
            gl.useProgram(divergence.program)
            gl.uniform2f(divergence.uniforms.u_texelSize, texel, texel)
            bindSource(divergence, "u_tVelocity", velocity[velocityRead].texture, 0)
            bindTargetForDraw(divergenceTarget)
            drawQuad()

            // dissipate the stale pressure field
            gl.useProgram(clear.program)
            gl.uniform2f(clear.uniforms.u_texelSize, texel, texel)
            gl.uniform1f(clear.uniforms.u_value, FLUID.pressureDissipation)
            gl.uniform1f(clear.uniforms.u_dt, delta)
            bindSource(clear, "u_tTexture", pressure[pressureRead].texture, 0)
            bindTargetForDraw(pressure[1 - pressureRead])
            drawQuad()
            pressureRead = 1 - pressureRead

            // Jacobi iterations
            gl.useProgram(pressureProgram.program)
            gl.uniform2f(pressureProgram.uniforms.u_texelSize, texel, texel)
            bindSource(pressureProgram, "u_tDivergence", divergenceTarget.texture, 1)
            for (let i = 0; i < FLUID.pressureIterations; i++) {
                bindSource(pressureProgram, "u_tPressure", pressure[pressureRead].texture, 0)
                bindTargetForDraw(pressure[1 - pressureRead])
                drawQuad()
                pressureRead = 1 - pressureRead
            }

            // subtract the pressure gradient — the step that makes it
            // divergence-free
            gl.useProgram(gradientSubtract.program)
            gl.uniform2f(gradientSubtract.uniforms.u_texelSize, texel, texel)
            bindSource(gradientSubtract, "u_tPressure", pressure[pressureRead].texture, 0)
            bindSource(gradientSubtract, "u_tVelocity", velocity[velocityRead].texture, 1)
            bindTargetForDraw(velocity[1 - velocityRead])
            drawQuad()
            velocityRead = 1 - velocityRead

            // advect velocity through itself
            gl.useProgram(advection.program)
            gl.uniform2f(advection.uniforms.u_texelSize, texel, texel)
            gl.uniform1f(advection.uniforms.u_dt, delta)
            gl.uniform1f(advection.uniforms.u_dissipation, FLUID.velocityDissipation)
            bindSource(advection, "u_tVelocity", velocity[velocityRead].texture, 0)
            bindSource(advection, "u_tSource", velocity[velocityRead].texture, 1)
            bindTargetForDraw(velocity[1 - velocityRead])
            drawQuad()
            velocityRead = 1 - velocityRead
        }

        /* ----------------------------- backdrop pass --------------------------- */
        const renderBackdrop = () => {
            const [colorR, colorG, colorB] = live.current.backgroundLinear

            gl.disable(gl.DEPTH_TEST)
            gl.useProgram(backdropProgram.program)
            gl.uniform3f(backdropProgram.uniforms.u_color, colorR, colorG, colorB)
            bindTargetForDraw(backdropTargets[0])
            drawQuad()

            // three separable passes, ping-ponging the pair
            const spread = BACKDROP_BLUR_SPREAD
            gl.useProgram(blurProgram.program)
            gl.activeTexture(gl.TEXTURE0)
            gl.uniform1i(blurProgram.uniforms.u_tSource, 0)

            let source = 0
            for (let i = 0; i < FROST_ITERATIONS; i++) {
                for (let axis = 0; axis < 2; axis++) {
                    const stepX = axis === 0 ? spread / backdropWidth : 0
                    const stepY = axis === 0 ? 0 : spread / backdropHeight
                    gl.uniform2f(blurProgram.uniforms.u_step, stepX, stepY)
                    gl.bindTexture(gl.TEXTURE_2D, backdropTargets[source].texture)
                    bindTargetForDraw(backdropTargets[1 - source])
                    drawQuad()
                    source = 1 - source
                }
            }

            return backdropTargets[source]
        }

        /* --------------------------- scroll and spin --------------------------- */
        const updateScroll = (delta: number, spinSpeed: number) => {
            phaseTarget += input.deltaScrollY * SCROLL.sensitivity

            // Drag-to-spin. MINUS, so the figure follows the pointer: theta
            // grows counter-clockwise seen from +Z (the camera sits at +Z,
            // looking down -Z), and the front-most blade therefore travels LEFT
            // as the phase rises. Verified numerically rather than by eye: at
            // the shipped framing, +0.2 of phase moves the front blade's world
            // x by -0.070.
            //
            // The travel arrives as a fraction of the host's width and is
            // scaled by LAPS, so `* count` is the conversion into the blade
            // units phaseTarget carries; one drag is the same rotation at any
            // Bars setting.
            phaseTarget -= input.deltaSpinX * live.current.dragTurns * count
            // framer-motion's damp, written out: an exponential approach that is
            // frame-rate independent, which a naive lerp is not.
            phaseCurrent += (phaseTarget - phaseCurrent) * (1 - Math.exp(-SCROLL.lerp * delta))
            input.deltaScrollY = 0
            input.deltaSpinX = 0

            // The idle spin rides the same phase. It ACCUMULATES AS AN ANGLE,
            // in radians, and is converted to blade units only at the point of
            // use — one lap is `count` blades — so a Speed setting means the
            // same angular rate whatever the Bars prop says, and changing Bars
            // cannot jump the rotation. Accumulated separately from the scroll
            // phase, so the scroll lerp is not forever chasing a moving target.
            spinAngle = wrap(spinAngle + spinSpeed * delta, 2 * Math.PI)

            const phase = phaseCurrent + (spinAngle * count) / (2 * Math.PI)
            if (Math.abs(phase - phaseWritten) <= 1e-5) return

            layout.write(phase, instancePositions, instanceRotations)
            gl.bindBuffer(gl.ARRAY_BUFFER, aPosBuffer)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, instancePositions)
            gl.bindBuffer(gl.ARRAY_BUFFER, aRotBuffer)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceRotations)
            phaseWritten = phase
        }

        /* -------------------------------- strike ------------------------------- */
        const updateStrike = () => {
            if (!input.hasPointer) return

            const aspect = viewHeight > 0 ? viewWidth / viewHeight : 1
            // The render shifts every blade by ndcOffset after the perspective
            // divide (see BAR_VERT), so the ray has to be built from where the
            // pointer is in the UNSHIFTED frame.
            const index = hitBarIndex(
                input.ndcX - ndcOffset[0],
                input.ndcY - ndcOffset[1],
                aspect,
                CAMERA_DISTANCE,
                live.current.tiltRad,
                live.current.rollRad,
                groupScale,
                instancePositions,
                instanceRotations,
                count,
                mesh.boxMin,
                mesh.boxMax
            )

            if (index !== -1 && index !== lastHitIndex) {
                instanceStrikes[index] = time
                gl.bindBuffer(gl.ARRAY_BUFFER, aStrikeBuffer)
                gl.bufferSubData(gl.ARRAY_BUFFER, index * 4, instanceStrikes.subarray(index, index + 1))
            }

            lastHitIndex = index
        }

        /* --------------------------------- frame ------------------------------- */
        const frame = () => {
            rafId = requestAnimationFrame(frame)

            const now = performance.now()
            const delta = Math.min((now - lastFrame) / 1e3, MAX_DELTA)
            lastFrame = now
            time += delta
            if (!reduceMotion) autoplayAngle += delta * AUTOPLAY_SPEED

            if (live.current.shape !== shapeBuilt) {
                // No GL state moves with a shape change: the mesh, the program
                // and every buffer are the same objects. Only the poses and the
                // group scale are rebuilt, and the pose rewrite is forced by
                // invalidating the written phase.
                shapeBuilt = live.current.shape
                layout = buildLayout(shapeBuilt, count, mesh)
                fitScale = RING.fit / layout.extent
                phaseWritten = Infinity
                lastHitIndex = -1
            }

            if (live.current.bars !== count) {
                allocateInstances(live.current.bars)
                // force a rewrite at the live phase: no finite phase equals this
                phaseWritten = Infinity
                lastHitIndex = -1
            }

            const nextRampKey = live.current.hoverColors.join("|")
            if (nextRampKey !== rampKey) {
                rampKey = nextRampKey
                writeRampTexture(gl, gradientTexture, live.current.hoverColors)
            }

            // One number for the whole frame: the arrangement's fit times the
            // live Scale.
            groupScale = fitScale * live.current.scaleFactor

            const spinSpeed = reduceMotion ? 0 : live.current.spinSpeed

            updateScroll(delta, spinSpeed)

            // Framing, before picking: the picker has to undo exactly the shift
            // the vertex shader is about to apply, or the hit boxes sit off the
            // blades by the size of the offset.
            const frameAspect = viewHeight > 0 ? viewWidth / viewHeight : 1
            ringNdcOffset(
                instancePositions,
                instanceRotations,
                count,
                groupScale,
                live.current.tiltRad,
                live.current.rollRad,
                CAMERA_DISTANCE,
                frameAspect,
                bladeCorners,
                ndcOffset
            )

            updateStrike()
            if (fluidEnabled) solveFluid(delta)

            const backdrop = renderBackdrop()

            /* ---------------------------- main draw ---------------------------- */
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(0, 0, viewWidth, viewHeight)
            gl.clearColor(0, 0, 0, 1)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            // the sharp backdrop fills the frame; the blades reflect the blurred one
            gl.disable(gl.DEPTH_TEST)
            gl.useProgram(backdropProgram.program)
            const [colorR, colorG, colorB] = live.current.backgroundLinear
            gl.uniform3f(backdropProgram.uniforms.u_color, colorR, colorG, colorB)
            drawQuad()

            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.disable(gl.CULL_FACE) // the reference's material is DoubleSide

            const aspect = viewHeight > 0 ? viewWidth / viewHeight : 1
            mat4TiltRollScale(live.current.tiltRad, live.current.rollRad, groupScale, modelMatrix)
            mat3FromMat4(modelMatrix, normalMatrix)
            mat4Perspective(CAMERA_FOV_DEG, aspect, 0.1, 200, projection)
            mat4TranslationZ(-CAMERA_DISTANCE, viewMatrix)

            gl.useProgram(barProgram.program)
            const u = barProgram.uniforms
            gl.uniformMatrix4fv(u.u_projectionMatrix, false, projection)
            gl.uniformMatrix4fv(u.u_viewMatrix, false, viewMatrix)
            gl.uniformMatrix4fv(u.u_modelMatrix, false, modelMatrix)
            gl.uniformMatrix3fv(u.u_normalMatrix, false, normalMatrix)
            gl.uniform2f(u.u_ndcOffset, ndcOffset[0], ndcOffset[1])
            gl.uniform1f(u.u_time, time)
            gl.uniform1f(u.u_swingScale, reduceMotion ? 0 : 1)
            gl.uniform3f(u.u_swingAxis, 0, 1, 0)
            gl.uniform3f(u.u_cameraPos, 0, 0, CAMERA_DISTANCE)
            gl.uniform1f(u.u_fluidStrength, live.current.fluidStrength)
            gl.uniform1f(u.u_tintStrength, live.current.tintStrength)
            gl.uniform1f(u.u_tintGlow, live.current.tintGlow)
            const [baseR, baseG, baseB] = live.current.baseColorLinear
            gl.uniform3f(u.u_baseColor, baseR, baseG, baseB)
            gl.uniform1f(u.u_reflectStrength, live.current.reflect)
            gl.uniform1f(u.u_polish, live.current.polish)
            gl.uniform1f(u.u_fresnelPower, FRESNEL_POWER)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, velocity ? velocity[velocityRead].texture : emptyTexture)
            gl.uniform1i(u.u_tFluid, 0)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, gradientTexture)
            gl.uniform1i(u.u_tGradient, 1)
            gl.activeTexture(gl.TEXTURE2)
            gl.bindTexture(gl.TEXTURE_2D, backdrop.texture)
            gl.uniform1i(u.u_tBackdrop, 2)

            gl.bindVertexArray(barVao)
            gl.drawElementsInstanced(gl.TRIANGLES, BAR_INDEX_COUNT, gl.UNSIGNED_SHORT, 0, count)
            gl.bindVertexArray(null)
        }

        frame()

        return () => {
            cancelAnimationFrame(rafId)
            resizeObserver.disconnect()

            root.removeEventListener("pointerdown", onPointerDown)
            window.removeEventListener("pointermove", onWindowPointerMove)
            window.removeEventListener("pointerup", onWindowPointerUp)
            window.removeEventListener("pointercancel", onWindowPointerUp)
            root.removeEventListener("pointermove", onPointerMove)
            root.removeEventListener("pointerleave", onPointerLeave)
            root.removeEventListener("wheel", onWheel)
            root.removeEventListener("touchstart", onTouchStart)
            root.removeEventListener("touchmove", onTouchMove)
            window.removeEventListener("touchend", onTouchEnd)
            window.removeEventListener("touchcancel", onTouchEnd)

            disposeBackdrop()
            for (const target of [
                ...(velocity ?? []),
                ...(pressure ?? []),
                divergenceTarget,
                curlTarget,
            ]) {
                if (!target) continue
                gl.deleteFramebuffer(target.fbo)
                gl.deleteTexture(target.texture)
            }

            gl.deleteTexture(gradientTexture)
            gl.deleteTexture(emptyTexture)
            gl.deleteBuffer(quadBuffer)
            gl.deleteBuffer(positionBuffer)
            gl.deleteBuffer(normalBuffer)
            gl.deleteBuffer(indexBuffer)
            gl.deleteBuffer(aPosBuffer)
            gl.deleteBuffer(aRotBuffer)
            gl.deleteBuffer(aTintBuffer)
            gl.deleteBuffer(aStrikeBuffer)
            gl.deleteVertexArray(quadVao)
            gl.deleteVertexArray(barVao)

            for (const program of [backdropProgram, blurProgram, barProgram]) {
                gl.deleteProgram(program.program)
            }
            if (fluidPrograms) {
                for (const program of Object.values(fluidPrograms)) {
                    if (program) gl.deleteProgram(program.program)
                }
            }
            // No loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black. React 18/19 dev StrictMode double-mounts this
            // effect, which is exactly the case that would break.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            className={className}
            style={{
                width,
                height,
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background,
                touchAction: "none",
                // A drag-to-spin gesture must not also start a native text or
                // image drag, which would swallow the pointermove stream.
                userSelect: "none",
                WebkitUserSelect: "none",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

// controls, rebuilt from the parent's schema
