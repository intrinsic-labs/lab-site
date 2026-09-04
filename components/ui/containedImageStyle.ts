import type { CSSProperties } from "react";
import type { SizedImage } from "@/lib/content/products";

/**
 * Inline sizing for an un-cropped image whose box must be reserved BEFORE it loads.
 *
 * THE PROBLEM. The product heroes are sized `w-auto max-w-full h-auto max-h-[Nvh]` — shrink
 * to fit the column, never upscale past the file's own pixels, never taller than N% of the
 * viewport. That is the right rendering, but `width: auto` on a replaced element is resolved
 * from the image's NATURAL width, and a not-yet-loaded image has none. So the box measures
 * 0×0 until the bytes land and then snaps to full height, taking the whole two-column grid
 * with it. Adding `width`/`height` attributes is not enough on its own: they give the box an
 * `aspect-ratio`, but a ratio applied to a zero width is still zero (measured: `tycho/hero.png`
 * laid out at 0×0 with `aspect-ratio: auto 2880 / 1800` set).
 *
 * THE FIX. Make the width DEFINITE and express the other two constraints as caps on it:
 *
 *   width:     100%                                    — definite, known before load
 *   max-width: min(100%, <natural>px, <maxVh>vh × ratio)
 *                └ the column   └ never upscale   └ the width at which height hits max-Nvh
 *
 * `height: auto` (Tailwind preflight) plus the attribute aspect ratio then derives the
 * height, which by construction can no longer exceed `maxVh`. The third term is what keeps
 * this a pure reservation rather than a redesign: with plain `width: 100%` a tall image whose
 * height clamped would stay full-column-width and letterbox inside `object-contain`, whereas
 * `w-auto` shrank its width to match. Capping the width by the same clamp reproduces that.
 *
 * Verified against the loaded layout: identical box for every product hero, at both a wide
 * and a short viewport. An image with no parsed dimensions returns `undefined` and the
 * element keeps its original `w-auto` classes — the pre-existing behaviour, no worse.
 */
export function containedImageStyle(img: SizedImage, maxVh: number): CSSProperties | undefined {
  if (!img.width || !img.height) return undefined;
  const ratio = img.width / img.height;
  return {
    width: "100%",
    maxWidth: `min(100%, ${img.width}px, ${(maxVh * ratio).toFixed(3)}vh)`,
  };
}
