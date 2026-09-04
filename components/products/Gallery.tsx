"use client";

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
 * under the strip is the indicator, and it is always centred.
 *
 * Keyboard still works (the strip is focusable, ← / → step it) and so does native touch
 * snapping — the click handling is additive, never a replacement for the scroller.
 *
 * Every slide is a FIXED HEIGHT with `w-auto`, which is what keeps a folder of portrait
 * phone screenshots (Aspen Grove's fourteen) from dominating the page: portrait frames
 * come out narrow and several are visible at once, landscape frames come out wide.
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

  return (
    <section aria-label={label} className="py-14">
      <div className="mx-auto max-w-6xl px-6">
        <p className="label">{label}</p>
      </div>

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
        className="mt-5 flex snap-x snap-mandatory items-center gap-5 overflow-x-auto scroll-smooth px-[50%] py-12 sm:py-16 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  focused ? "z-10 scale-[1.2] opacity-100" : "opacity-55 hover:opacity-80"
                }`}
              >
                {/* A slide is a FIXED HEIGHT and `w-auto`, so until the bytes arrive its
                    width is zero — fourteen of those in one flex row means the whole strip
                    re-lays-out as they stream in, which both jumps the page and makes
                    `syncIndex` (it measures `offsetLeft`) pick the wrong focused slide.
                    The intrinsic dimensions give each slide its aspect ratio, and therefore
                    its width, before a single byte of image has loaded. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  width={img.width}
                  height={img.height}
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-[380px] w-auto object-contain sm:h-[520px]"
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
        <p className="label tabular-nums">
          {index + 1} / {images.length}
        </p>
      </div>
    </section>
  );
}
