"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SizedImage } from "@/lib/content/products";

/**
 * The product gallery, as a carousel rather than a stack.
 *
 * No carousel library: the strip is a native horizontally-scrolling flex row with CSS
 * scroll-snap, so touch and trackpad get real momentum scrolling for free.
 *
 * **The images are the control** (Asher, 2026-09-04). There are no arrow buttons under the
 * strip: clicking any visible image scrolls it to the centre, and hovering a non-centred one
 * lays a single arrow over it pointing the way it will travel (← for a slide left of centre,
 * → for one right of it). The centred slide is full opacity, its neighbours are dimmed, so
 * "which one is focused" is legible without a chrome element saying so. The only thing left
 * under the strip is the dot indicator, and it is always centred (the `n / total` counter
 * beside it and the "Gallery" eyebrow above the strip were dropped 2026-09-04 — the dots say
 * where you are).
 *
 * Keyboard still works (the strip is focusable, ← / → step it) and so does native touch
 * snapping — the click handling is additive, never a replacement for the scroller.
 *
 * Every slide is bounded by a MAX height and a MAX width with both axes `auto`, so the
 * browser fits the intrinsic aspect ratio inside whichever bound binds: a portrait phone
 * screenshot (Aspen Grove's fourteen) is capped by height and comes out narrow, several
 * visible at once; a landscape console frame is capped by width. The width cap is what
 * keeps a 1600×738 frame from spilling off a 390px phone (Asher, 2026-09-04 — on mobile a
 * landscape slide was 620px wide, ×1.2 focused, and clipped hard on both sides).
 */
export function Gallery({ images, label = "Gallery" }: { images: SizedImage[]; label?: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  /** Which slide's centre is nearest the viewport centre — the dots and the dimming read from this. */
  const syncIndex = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const dist = Math.abs(node.offsetLeft + node.offsetWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setIndex(best);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // Half-viewport padding on both ends is what lets the FIRST and LAST slides reach the
    // centre at all — with the old gutter, `scrollTo` clamped at 0 and clicking either end
    // slide did nothing (Asher, 2026-09-04, Aspen Grove). Land on slide 0 centred.
    const first = el.children[0] as HTMLElement | undefined;
    if (first) el.scrollLeft = first.offsetLeft - (el.clientWidth - first.offsetWidth) / 2;
    syncIndex();
    el.addEventListener("scroll", syncIndex, { passive: true });
    return () => el.removeEventListener("scroll", syncIndex);
  }, [syncIndex]);

  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const target = el.children[Math.max(0, Math.min(i, el.children.length - 1))] as HTMLElement | undefined;
    if (!target) return;
    el.scrollTo({
      left: target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, []);

  if (images.length === 0) return null;

  // A strip of phone screenshots (Aspen Grove's fourteen) reads differently from a strip of
  // landscape frames: the focused slide is narrow, so it can grow more without leaving the
  // screen, and its neighbours need more air so they don't rub against it (Asher, 2026-09-04).
  // Judged per strip, not per slide, so the gap never changes as focus moves — `syncIndex`
  // measures offsetLeft and a moving gap would make it pick the wrong slide.
  const portrait = images.every((img) => (img.height ?? 0) > (img.width ?? 0));

  return (
    <section aria-label={label} className="py-14">

      <ul
        ref={scroller}
        tabIndex={0}
        role="group"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goTo(index + 1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            goTo(index - 1);
          }
        }}
        className={`flex snap-x snap-mandatory items-center overflow-x-auto scroll-smooth px-[50%] py-12 sm:py-16 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${portrait ? "gap-10 sm:gap-16" : "gap-5"}`}
      >
        {images.map((img, i) => {
          const focused = i === index;
          return (
            <li key={img.src} className="shrink-0 snap-center">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={focused ? `Image ${i + 1}, focused` : `Focus image ${i + 1}`}
                aria-current={focused}
                // Not a control when it is already centred: the pointer says so, and the
                // click is a no-op scroll to where the strip already is.
                // The centred slide is scaled up 20% (Asher, 2026-09-04) with a transform, so
                // the strip's layout — and `syncIndex`'s offsetLeft measurements — never
                // change; the `py-*` on the list is the room the scale needs vertically.
                className={`group relative block cursor-pointer overflow-hidden rounded-xl outline-none transition-[opacity,transform] duration-300 focus-visible:ring-1 focus-visible:ring-accent ${
                  focused
                    ? portrait
                      ? "z-10 scale-[1.15] opacity-100 sm:scale-[1.35]"
                      : "z-10 scale-[1.08] opacity-100 sm:scale-[1.2]"
                    : "opacity-55 hover:opacity-80"
                }`}
              >
                {/* A slide's box comes from its intrinsic ratio, so without the attributes
                    its width is zero until the bytes arrive — fourteen of those in one flex row means the whole strip
                    re-lays-out as they stream in, which both jumps the page and makes
                    `syncIndex` (it measures `offsetLeft`) pick the wrong focused slide.
                    The intrinsic dimensions give each slide its aspect ratio, and therefore
                    its width, before a single byte of image has loaded. */}
                <Image
                  src={img.src}
                  alt=""
                  width={img.width ?? 1600}
                  height={img.height ?? 1000}
                  sizes="(min-width: 640px) min(80vw, 960px), calc(100vw - 4rem)"
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-auto w-auto max-h-[380px] max-w-[calc(100vw-4rem)] object-contain sm:max-h-[520px] sm:max-w-[min(80vw,960px)]"
                />
                {/* The arrow overlay: one direction, only on a slide that is NOT centred,
                    only on hover/focus. It is decorative — the whole slide is the button. */}
                {!focused && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface font-code text-lg text-ink backdrop-blur-sm">
                      {i < index ? "←" : "→"}
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* The indicator is centred under the strip, always — it is the only chrome left. */}
      <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-center gap-3 px-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-accent" : "w-1.5 bg-ink-3 hover:bg-ink-2"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
