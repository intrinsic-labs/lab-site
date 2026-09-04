/**
 * Geometry for the autonomy orbs — pure arithmetic, no React, no DOM. It turns three
 * percentages into circle centres, a horizon, and the type positions around them, so the
 * drawing can be emitted by the server as finished SVG.
 *
 * The reading is literal: the horizon is 0% and "fully out of the water" is the goal. An
 * orb at 73% is 73% of the way from wholly submerged (its top touching the line) to
 * wholly risen (its bottom touching it) — so the height of a disc above the line *is* the
 * number, and three discs at three heights is the whole state of the company at a glance.
 *
 * Two presets rather than one responsive drawing: an SVG scales its type along with its
 * geometry, and a 9px mono label on a phone is not a label. Same scene, two proportions.
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
  /** 0 = submerged, 1 = wholly above the line. */
  risen: number;
  labelY: number;
  valueY: number;
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
  blur: number;
  valueSize: number;
  labelSize: number;
  /** Gap between an orb's crown and the baseline of the number above it. */
  valueGap: number;
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
};

export interface OrbScene {
  size: OrbSizing;
  orbs: OrbShape[];
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
      risen,
      valueY: crown - size.valueGap,
      labelY: crown - size.valueGap - size.valueSize * 0.86,
    };
  });
  return { size, orbs };
}
