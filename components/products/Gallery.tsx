"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The product gallery, as a carousel rather than a stack.
 *
 * No carousel library: the strip is a native horizontally-scrolling flex row with CSS
 * scroll-snap, so touch and trackpad get real momentum scrolling for free and the only
 * JavaScript is the prev/next buttons, the arrow keys, and reading back which slide is
 * centred for the dots.
 *
 * Every slide is a FIXED HEIGHT with `w-auto`, which is what keeps a folder of portrait
 * phone screenshots (Aspen Grove's fourteen) from dominating the page: portrait frames
 * come out narrow and several are visible at once, landscape frames come out wide. No
 * outlines — the images are the objects, not cards containing them.
 */
export function Gallery({ images, label = "Gallery" }: { images: string[]; label?: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  /** Which slide's centre is nearest the viewport centre — the dots read from this. */
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
      <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6">
        <p className="label">{label}</p>
        <p className="label tabular-nums">
          {index + 1} / {images.length}
        </p>
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
        className="mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[max(1.5rem,calc((100vw-72rem)/2))] pb-3 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <li key={src} className="shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading={i < 2 ? "eager" : "lazy"}
              className="h-[380px] w-auto rounded-xl object-contain sm:h-[520px]"
            />
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-6 flex max-w-6xl items-center gap-4 px-6">
        <button
          type="button"
          aria-label="Previous image"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="pill px-3 transition-colors hover:text-accent disabled:opacity-30 disabled:hover:text-ink-2"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next image"
          onClick={() => goTo(index + 1)}
          disabled={index === images.length - 1}
          className="pill px-3 transition-colors hover:text-accent disabled:opacity-30 disabled:hover:text-ink-2"
        >
          →
        </button>

        <div className="ml-2 flex flex-wrap items-center gap-2">
          {images.map((src, i) => (
            <button
              key={src}
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
