/**
 * The plot, as pure canvas drawing — no React, no DOM beyond the 2D context.
 *
 * A hand-rolled cabinet (oblique) projection rather than a true isometric one: the
 * front face of the box is drawn undistorted and depth recedes up and to the right at
 * a fixed angle, halved. That is the drafting convention for a plotted bar chart, and
 * it is the one that keeps every column on the same baseline — so the columns are
 * comparable to each other and the goal band stays level instead of becoming a ramp.
 *
 * World axes: x across (one unit per metric), y depth, z height (1.0 = 100%).
 * Painted back to front; everything is hairlines and flat paper fills, and the palette
 * is read from the page's own CSS custom properties so the plate can't drift from the
 * design tokens.
 */

/** Depth recession, in world units per unit of depth. */
const DX = 0.4;
const DY = 0.28;
/** Vertical exaggeration: 100% of a metric is this many world units tall. */
const ZH = 1.7;

const PLANE_DEPTH = 0.6;
const BAR_W = 0.55;
const Z_TOP = 1.12;

export interface PlotMetric {
  key: string;
  /** 0–100, already inverted for `down` metrics. */
  height: number;
  /** True when the plotted height is the complement of the stated figure. */
  inverted: boolean;
}

export interface PlotInput {
  metrics: PlotMetric[];
  goal: { low: number; high: number };
  /** 0–1, one per metric. */
  progress: number[];
  goalProgress: number;
}

export interface Palette {
  paper: string;
  paper2: string;
  paper3: string;
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  accent: string;
  marker: string;
  mono: string;
}

export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (n: string, fallback: string) => cs.getPropertyValue(n).trim() || fallback;
  return {
    paper: v("--color-paper", "#f3eee4"),
    paper2: v("--color-paper-2", "#eae4d6"),
    paper3: v("--color-paper-3", "#dfd8c7"),
    ink: v("--color-ink", "#1b1915"),
    ink2: v("--color-ink-2", "#5a544b"),
    ink3: v("--color-ink-3", "#8a8377"),
    rule: v("--color-rule", "#cbc2af"),
    accent: v("--color-accent", "#b5471f"),
    marker: v("--color-marker", "#f4d58a"),
    mono: v("--font-mono", "ui-monospace, Menlo, monospace"),
  };
}

type Pt = [number, number];
type Project = (x: number, y: number, z: number) => Pt;
interface Pad { l: number; r: number; t: number; b: number }

function fit(span: number, w: number, h: number, pad: Pad): Project {
  const raw = (x: number, y: number, z: number): Pt => [x + y * DX, -z * ZH - y * DY];
  const u0 = 0, u1 = span + PLANE_DEPTH * DX;
  const v0 = -Z_TOP * ZH - PLANE_DEPTH * DY, v1 = 0;
  const bw = w - pad.l - pad.r, bh = h - pad.t - pad.b;
  const s = Math.min(bw / (u1 - u0), bh / (v1 - v0));
  const ox = pad.l + (bw - (u1 - u0) * s) / 2 - u0 * s;
  const oy = pad.t + (bh - (v1 - v0) * s) / 2 - v0 * s;
  return (x, y, z) => {
    const [u, v] = raw(x, y, z);
    return [ox + u * s, oy + v * s];
  };
}

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill?: string, stroke?: string, lw = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, stroke: string, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette, input: PlotInput) {
  const n = input.metrics.length;
  const small = w < 420;
  const tick = small ? 8 : 9;
  const readout = small ? 10 : 11;
  const P = fit(n, w, h, { l: small ? 28 : 32, r: small ? 8 : 12, t: small ? 16 : 20, b: small ? 16 : 20 });
  const D = PLANE_DEPTH;
  const mono = (px: number) => `${px}px ${pal.mono}`;

  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = "round";
  ctx.textBaseline = "middle";

  // ── The box: a back wall and a floor, lit one shade lighter than the sheet.
  poly(ctx, [P(0, D, 0), P(n, D, 0), P(n, D, Z_TOP), P(0, D, Z_TOP)], pal.paper);
  poly(ctx, [P(0, 0, 0), P(n, 0, 0), P(n, D, 0), P(0, D, 0)], pal.paper);

  ctx.globalAlpha = 0.85;
  for (let pct = 0; pct <= 100; pct += 25) {
    const z = pct / 100;
    line(ctx, P(0, D, z), P(n, D, z), pal.rule, 1);   // ruled across the wall
    line(ctx, P(0, 0, z), P(0, D, z), pal.rule, 1);   // and back along the left return
  }
  for (let i = 0; i <= n; i++) {
    line(ctx, P(i, D, 0), P(i, D, Z_TOP), pal.rule, 1);
    line(ctx, P(i, 0, 0), P(i, D, 0), pal.rule, 1);
  }
  ctx.globalAlpha = 1;
  line(ctx, P(0, 0, 0), P(n, 0, 0), pal.ink3, 1);
  line(ctx, P(0, 0, 0), P(0, 0, Z_TOP), pal.ink3, 1);

  // ── The scale, on the front-left edge where a plotter would have put it.
  ctx.font = mono(tick);
  ctx.fillStyle = pal.ink3;
  ctx.textAlign = "right";
  for (let pct = 0; pct <= 100; pct += 25) {
    const [x, y] = P(0, 0, pct / 100);
    line(ctx, [x - 3, y], [x, y], pal.ink3, 1);
    ctx.fillText(String(pct), x - 5, y);
  }

  // ── The goal band: a slab floating at 90–95%, marked the way a page is marked.
  if (input.goalProgress > 0.01) {
    const lo = input.goal.low / 100, hi = input.goal.high / 100;
    ctx.globalAlpha = input.goalProgress * 0.85;
    poly(ctx, [P(0, 0, hi), P(n, 0, hi), P(n, D, hi), P(0, D, hi)], pal.marker);
    poly(ctx, [P(n, 0, lo), P(n, D, lo), P(n, D, hi), P(n, 0, hi)], pal.marker);
    ctx.globalAlpha = input.goalProgress;
    poly(ctx, [P(0, 0, lo), P(n, 0, lo), P(n, 0, hi), P(0, 0, hi)], pal.marker, pal.ink3, 1);
    ctx.font = mono(tick);
    ctx.fillStyle = pal.ink2;
    ctx.textAlign = "left";
    const [gx, gy] = P(0.1, D, hi);
    ctx.fillText(`GOAL ${input.goal.low}–${input.goal.high}%`, gx, gy - tick);
    ctx.globalAlpha = 1;
  }

  // ── The columns. Three faces, flat paper fills, ink outlines, an accent lid.
  input.metrics.forEach((m, i) => {
    const t = input.progress[i] ?? 1;
    const z = Math.max((m.height / 100) * t, 0.003);
    const cx = i + 0.5;
    const x0 = cx - BAR_W / 2, x1 = cx + BAR_W / 2;
    const outline = m.inverted ? pal.ink2 : pal.ink;

    poly(ctx, [P(x1, 0, 0), P(x1, D, 0), P(x1, D, z), P(x1, 0, z)], pal.paper3, outline, 1);
    poly(ctx, [P(x0, 0, z), P(x1, 0, z), P(x1, D, z), P(x0, D, z)], pal.paper2, outline, 1);
    poly(ctx, [P(x0, 0, 0), P(x1, 0, 0), P(x1, 0, z), P(x0, 0, z)], pal.paper, outline, 1);
    if (m.inverted) {
      // Hatched face: this column plots the complement of its stated figure.
      ctx.save();
      ctx.beginPath();
      ([P(x0, 0, 0), P(x1, 0, 0), P(x1, 0, z), P(x0, 0, z)] as Pt[])
        .forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = 0.6;
      const [, yTop] = P(x0, 0, z);
      const [, yBot] = P(x0, 0, 0);
      for (let py = yBot; py > yTop; py -= 4) line(ctx, [P(x0, 0, 0)[0], py], [P(x1, 0, 0)[0], py], pal.rule, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    line(ctx, P(x0, 0, z), P(x1, 0, z), pal.accent, 1.5);

    // The reading, above the column; its key, on the baseline beneath it.
    const [lx, ly] = P(cx, 0, z);
    ctx.font = mono(readout);
    ctx.fillStyle = pal.ink;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(m.height * t)}`, lx, ly - readout - 3);
    const [kx, ky] = P(cx, 0, 0);
    ctx.font = mono(tick);
    ctx.fillStyle = pal.ink3;
    ctx.fillText(m.key.toUpperCase().slice(0, 10) + (m.inverted ? " ▽" : ""), kx, ky + tick + 2);
  });
}
