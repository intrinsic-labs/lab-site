/**
 * Geometry for the autonomy orbs — pure arithmetic, no React, no DOM. It turns three
 * percentages into circle centres, a horizon, and the type positions around them, so the
 * drawing can be emitted by the server as finished markup.
 *
 * The reading is literal: the horizon is 0% and "fully out of the water" is the goal. An
 * orb at 73% is 73% of the way from wholly submerged (its top touching the line) to
 * wholly risen (its bottom touching it) — so the height of a disc above the line *is* the
 * number, and three discs at three heights is the whole state of the company at a glance.
 *
 * Two presets rather than one responsive drawing: type inside a scaled drawing scales with
 * it, and a 9px mono label on a phone is not a label. Same scene, two proportions — and
 * the phone one carries no labels at all, because three plain-English phrases do not fit
 * over three overlapping orbs at 400 units wide. There they become the legend under the
 * figure instead.
 *
 * Everything below the type is laid out in PERCENTAGES of the figure box rather than in
 * SVG user units, because the glow and the discs are HTML elements now (see OrbFigure).
 * That works because every layer box has the same aspect ratio as the viewBox: a
 * percentage of the box height and a percentage of the box width resolve to the same
 * scale factor, so one set of numbers positions both.
 */

export interface OrbInput {
  key: string;
  label: string;
  value: number;
  /** A CSS custom property name — never a literal colour, so the skin carries through. */
  colorVar: string;
}

export interface OrbShape extends OrbInput {
  cx: number;
  cy: number;
  r: number;
  /** Visible extent of this orb's glow — the disc plus the blur's tail. */
  glowR: number;
  /** 0 = submerged, 1 = wholly above the line. */
  risen: number;
  labelY: number;
  valueY: number;
  labelLines: string[];
}

export interface OrbSizing {
  width: number;
  height: number;
  horizonY: number;
  /**
   * Radii and horizontal centres, in the data's own order (largest value first) — which
   * is back-to-front for drawing, and right-to-left on the page: the orbs climb toward
   * the goal as they go, and each one's type sits in the clear sky above its own crown
   * because its left-hand neighbour is always the shorter one.
   */
  radii: [number, number, number];
  centers: [number, number, number];
  /** Standard deviation of the haze, in user units — the σ the old feGaussianBlur used. */
  blur: number;
  valueSize: number;
  labelSize: number;
  /** Gap between an orb's crown and the baseline of the number above it. */
  valueGap: number;
  /** Widest a wrapped label may run, in user units. */
  labelWidth: number;
  showLabels: boolean;
  /**
   * Tailwind class fixing this preset's outer frame. A literal, because Tailwind v4 scans
   * source text for candidates and never sees a class name built at runtime. It is the
   * figure's max width plus the 24px gutter on each side.
   */
  frameClass: string;
}

export const DESKTOP: OrbSizing = {
  width: 960,
  height: 480,
  horizonY: 340,
  radii: [152, 118, 92],
  centers: [660, 415, 220],
  blur: 26,
  valueSize: 54,
  labelSize: 15,
  valueGap: 20,
  labelWidth: 232,
  showLabels: true,
  frameClass: "max-w-[1008px]",
};

export const MOBILE: OrbSizing = {
  width: 400,
  height: 380,
  horizonY: 272,
  radii: [84, 64, 50],
  centers: [296, 168, 74],
  blur: 13,
  valueSize: 30,
  labelSize: 11,
  valueGap: 12,
  labelWidth: 0,
  showLabels: false,
  frameClass: "max-w-[488px]",
};

export interface OrbScene {
  size: OrbSizing;
  orbs: OrbShape[];
}

/** A blurred disc dies three standard deviations past its edge; past that there is nothing to draw. */
export function glowRadius(r: number, sigma: number): number {
  return r + 3 * sigma;
}

/** Percentage of the figure box, so the same numbers place an element at any rendered size. */
function pct(n: number, of: number): string {
  return `${((n / of) * 100).toFixed(4)}%`;
}

/** A token at a given alpha. Never a literal colour — the skin decides what the token is. */
function tint(colorVar: string, a: number): string {
  return `color-mix(in srgb, var(${colorVar}) ${(a * 100).toFixed(2)}%, transparent)`;
}

/**
 * The CSS stand-in for `feGaussianBlur`, and the reason the figure animates at 60fps now.
 *
 * A solid disc convolved with a gaussian is a soft-edged disc whose profile is an erfc:
 * full strength two sigmas inside the edge, half at the edge, gone three sigmas out. Six
 * stops trace that curve closely enough that the two are indistinguishable side by side —
 * and a radial gradient is painted once and then composited, where the filter had to be
 * re-rasterised on every frame the disc moved.
 */
export function glowBackground(colorVar: string, r: number, sigma: number, peak: number): string {
  const R = glowRadius(r, sigma);
  const profile: [number, number][] = [
    [r - 2 * sigma, 1],
    [r - sigma, 0.84],
    [r, 0.5],
    [r + sigma, 0.16],
    [r + 2 * sigma, 0.023],
    [R, 0],
  ];
  const stops = profile
    .map(([d, a]) => `${tint(colorVar, a * peak)} ${((Math.max(0, d) / R) * 100).toFixed(2)}%`)
    .join(", ");
  return `radial-gradient(circle closest-side at 50% 50%, ${stops})`;
}

/** The crisp disc above the water: the old radialGradient (cx 50%, cy 32%, r 76%), in CSS. */
export function discBackground(colorVar: string, opacity: number): string {
  return `radial-gradient(ellipse 76% 76% at 50% 32%, ${tint(colorVar, 0.95 * opacity)} 0%, ${tint(colorVar, 0.6 * opacity)} 100%)`;
}

/** A box of half-size `half` centred on (cx, cy), in percentages of the figure box. */
export function boxStyle(cx: number, cy: number, half: number, size: OrbSizing) {
  return {
    left: pct(cx - half, size.width),
    top: pct(cy - half, size.height),
    width: pct(2 * half, size.width),
    height: pct(2 * half, size.height),
  };
}

/** Where the waterline sits, as a percentage of the figure box's height. */
export function horizonPct(size: OrbSizing): string {
  return pct(size.horizonY, size.height);
}

/**
 * Greedy wrap for an SVG label, which has no line breaking of its own. Mono type at a
 * known size and letter-spacing has a known advance, so the budget is just a character
 * count.
 */
export function wrapLabel(text: string, size: OrbSizing, maxLines = 3): string[] {
  if (!size.showLabels || size.labelWidth <= 0) return [];
  const advance = size.labelSize * 0.68; // 0.6em glyph + 0.08em tracking
  const budget = Math.max(6, Math.floor(size.labelWidth / advance));
  const lines: string[] = [];
  let line = "";
  for (const word of text.toUpperCase().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > budget && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")] : lines;
}

/**
 * Orbs are returned largest-first, which is also back-to-front: the big one is furthest
 * away and everything else overlaps it.
 */
export function buildScene(size: OrbSizing, inputs: OrbInput[]): OrbScene {
  const orbs = inputs.slice(0, 3).map((input, i) => {
    const r = size.radii[i];
    const cx = size.centers[i];
    const risen = Math.min(1, Math.max(0, input.value / 100));
    const cy = size.horizonY + r - 2 * r * risen;
    const crown = cy - r;
    return {
      ...input,
      cx,
      cy,
      r,
      glowR: glowRadius(r, size.blur),
      risen,
      valueY: crown - size.valueGap,
      labelY: crown - size.valueGap - size.valueSize * 0.86,
      labelLines: wrapLabel(input.label, size),
    };
  });
  return { size, orbs };
}
