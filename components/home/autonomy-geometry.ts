/**
 * The autonomy plate's geometry, as pure arithmetic — no DOM, no canvas, no React.
 * Everything here runs on the server; the output is a bag of SVG path strings and
 * label positions that `AutonomyChart` renders straight into markup, so the finished
 * picture is in the HTML before a byte of JavaScript executes.
 *
 * A cabinet (oblique) projection, ported from the canvas version it replaces: the
 * front face of the box is drawn undistorted and depth recedes up and to the right at
 * a fixed angle, halved. That is the drafting convention for a plotted bar chart, and
 * it is the one that keeps every column on the same baseline — so the columns are
 * comparable to each other and the goal band stays level instead of becoming a ramp.
 *
 * World axes: x across (one unit per metric), y depth, z height (1.0 = 100%).
 * Because z maps to screen-y and nothing else, a column can be grown from its base
 * with a plain `scaleY`, which is what lets the reveal animation be CSS-only.
 */

/** Depth recession, in world units per unit of depth. */
const DX = 0.4;
const DY = 0.28;
/** Vertical exaggeration: 100% of a metric is this many world units tall. */
const ZH = 1.1;

const PLANE_DEPTH = 0.6;
const BAR_W = 0.52;
const Z_TOP = 1.12;

/** Grid rules and axis ticks, in percent. */
const TICKS = [0, 25, 50, 75, 100];

export interface ChartMetric {
  key: string;
  /** Plain words set under the column — not the mono key. */
  label: string;
  /** 0–100. */
  height: number;
}

export interface Sizing {
  /** User units per world unit. Sets how large the type reads against the drawing. */
  s: number;
  pad: { l: number; r: number; t: number; b: number };
  /** Type sizes, in user units. */
  tick: number;
  readout: number;
  caption: number;
}

/** Desktop: the viewBox is roughly the pixel size the plate renders at, so 9 user
 *  units of type read as about 9px. Mobile shrinks the drawing, not the type. */
export const DESKTOP: Sizing = {
  s: 250,
  pad: { l: 36, r: 18, t: 34, b: 46 },
  tick: 10,
  readout: 15,
  caption: 11,
};

export const MOBILE: Sizing = {
  s: 96,
  pad: { l: 24, r: 8, t: 26, b: 40 },
  tick: 8.5,
  readout: 9,
  caption: 9,
};

type Pt = [number, number];

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Label {
  x: number;
  y: number;
  text: string;
}

export interface BarShape {
  right: string;
  top: string;
  front: string;
  /** The bright lid: the front edge of the top face. */
  lid: Line;
}

export interface Bar {
  key: string;
  /** 0–100, as measured. */
  value: number;
  /** `scaleY` about this y (user units) grows the column out of its own base. */
  originX: number;
  originY: number;
  solid: BarShape;
  /** The frosted continuation from the reading up to the top of the goal band. */
  ghost: BarShape | null;
  readout: Label;
  caption: Label[];
}

export interface Scene {
  width: number;
  height: number;
  wall: string;
  floor: string;
  grid: Line[];
  /** The two edges of the box a plotter would ink solid. */
  edges: Line[];
  ticks: { line: Line; label: Label }[];
  band: { top: string; right: string; front: string; label: Label };
  bars: Bar[];
}

function projector(s: number, pad: Sizing["pad"]) {
  const v0 = -Z_TOP * ZH - PLANE_DEPTH * DY;
  return (x: number, y: number, z: number): Pt => [
    round(pad.l + (x + y * DX) * s),
    round(pad.t + (-z * ZH - y * DY - v0) * s),
  ];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function poly(pts: Pt[]): string {
  return `${pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("")}Z`;
}

function seg(a: Pt, b: Pt): Line {
  return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
}

/**
 * Two lines at most, split at the last space that fits. Mono type is measured by
 * character count (0.6em per glyph is right for IBM Plex Mono within a hair), which
 * is exactly as accurate as this needs to be and needs no browser to do it.
 */
function wrap(text: string, maxWidth: number, fontSize: number): string[] {
  const per = fontSize * 0.6;
  if (text.length * per <= maxWidth) return [text];
  const words = text.split(" ");
  let head = "";
  let i = 0;
  for (; i < words.length; i++) {
    const test = head ? `${head} ${words[i]}` : words[i];
    if (head && test.length * per > maxWidth) break;
    head = test;
  }
  const tail = words.slice(i).join(" ");
  return tail ? [head, tail] : [head];
}

function box(
  P: ReturnType<typeof projector>,
  x0: number,
  x1: number,
  zLow: number,
  zHigh: number,
): BarShape {
  const D = PLANE_DEPTH;
  return {
    right: poly([P(x1, 0, zLow), P(x1, D, zLow), P(x1, D, zHigh), P(x1, 0, zHigh)]),
    top: poly([P(x0, 0, zHigh), P(x1, 0, zHigh), P(x1, D, zHigh), P(x0, D, zHigh)]),
    front: poly([P(x0, 0, zLow), P(x1, 0, zLow), P(x1, 0, zHigh), P(x0, 0, zHigh)]),
    lid: seg(P(x0, 0, zHigh), P(x1, 0, zHigh)),
  };
}

export function buildScene(
  metrics: ChartMetric[],
  goal: { low: number; high: number },
  size: Sizing,
): Scene {
  const n = metrics.length;
  const D = PLANE_DEPTH;
  const P = projector(size.s, size.pad);
  const v0 = -Z_TOP * ZH - PLANE_DEPTH * DY;

  const width = round(size.pad.l + (n + D * DX) * size.s + size.pad.r);
  const height = round(size.pad.t + -v0 * size.s + size.pad.b);

  const grid: Line[] = [];
  for (const pct of TICKS) {
    const z = pct / 100;
    grid.push(seg(P(0, D, z), P(n, D, z))); // ruled across the back wall
    grid.push(seg(P(0, 0, z), P(0, D, z))); // and back along the left return
  }
  for (let i = 0; i <= n; i++) {
    grid.push(seg(P(i, D, 0), P(i, D, Z_TOP)));
    grid.push(seg(P(i, 0, 0), P(i, D, 0)));
  }

  const edges = [seg(P(0, 0, 0), P(n, 0, 0)), seg(P(0, 0, 0), P(0, 0, Z_TOP))];

  const ticks = TICKS.map((pct) => {
    const [x, y] = P(0, 0, pct / 100);
    return {
      line: { x1: round(x - 4), y1: y, x2: x, y2: y },
      label: { x: round(x - 7), y, text: String(pct) },
    };
  });

  const lo = goal.low / 100;
  const hi = goal.high / 100;
  const [gx, gy] = P(0.14, 0, hi);
  const band = {
    top: poly([P(0, 0, hi), P(n, 0, hi), P(n, D, hi), P(0, D, hi)]),
    right: poly([P(n, 0, lo), P(n, D, lo), P(n, D, hi), P(n, 0, hi)]),
    front: poly([P(0, 0, lo), P(n, 0, lo), P(n, 0, hi), P(0, 0, hi)]),
    label: { x: gx, y: round(gy - size.tick * 0.9), text: `GOAL ${goal.low}–${goal.high}%` },
  };

  const colW = size.s; // one world unit across
  const bars: Bar[] = metrics.map((m, i) => {
    const z = Math.max(m.height / 100, 0.004);
    const cx = i + 0.5;
    const x0 = cx - BAR_W / 2;
    const x1 = cx + BAR_W / 2;

    const [ox, oy] = P(cx, 0, 0);
    // Centre of the top face, where the reading is set.
    const [rx, ry] = P(cx, D / 2, z);
    const [lx, ly] = P(cx, 0, 0);

    const captionLines = wrap(m.label, colW * 0.98, size.caption);

    return {
      key: m.key,
      value: m.height,
      originX: ox,
      originY: oy,
      solid: box(P, x0, x1, 0, z),
      ghost: z < hi - 0.005 ? box(P, x0, x1, z, hi) : null,
      readout: { x: rx, y: ry, text: `${m.height.toFixed(1)}%` },
      caption: captionLines.map((text, li) => ({
        x: lx,
        y: round(ly + size.caption * 1.6 + li * size.caption * 1.25),
        text,
      })),
    };
  });

  return {
    width,
    height,
    wall: poly([P(0, D, 0), P(n, D, 0), P(n, D, Z_TOP), P(0, D, Z_TOP)]),
    floor: poly([P(0, 0, 0), P(n, 0, 0), P(n, D, 0), P(0, D, 0)]),
    grid,
    edges,
    ticks,
    band,
    bars,
  };
}
