import type { ReactNode } from "react";
import { Spirograph } from "@/components/home/Spirograph";

/**
 * The hero: a full-viewport section with the spirograph as its ground.
 *
 * The section is the width of the page and at least `100svh` tall, and the canvas covers
 * it absolutely (`inset-0`) rather than sitting inside the content container — so the
 * drawing is the viewport, and the curves run off all four edges instead of being cut at
 * a column's border. `overflow-hidden` is only a scrollbar guard; the bleed is real, the
 * figure is simply larger than the frame (see Spirograph.tsx).
 *
 * The canvas layer is `pointer-events: none` so it never blocks a click; the spirograph
 * listens for the pointer on `window`, so it still answers movement everywhere.
 */
/**
 * Tall enough to be the whole screen and no taller: the sticky header is `h-16` from
 * `sm` up, so subtracting it makes the hero end exactly at the fold rather than a header's
 * worth past it. Below `sm` the header wraps to two rows and has no fixed height, so the
 * phone gets a fraction instead — still every pixel of visible screen, since the header
 * takes the rest.
 */
const HERO_HEIGHT = "min-h-[86svh] sm:min-h-[calc(100svh-4rem)]";

export function Masthead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative isolate w-full ${HERO_HEIGHT} overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <Spirograph className="block h-full w-full" />
      </div>

      {/* A faint well of page colour under the type — a quarter of the strength it had
          before 2026-09-04 (88/62/24% → 22/16/6%). Asher: no shadow covering up the
          spirograph, but with none at all the subtitle was a little hard to read. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(58% 46% at 50% 50%, color-mix(in oklab, var(--color-paper) 22%, transparent) 0%, color-mix(in oklab, var(--color-paper) 16%, transparent) 34%, color-mix(in oklab, var(--color-paper) 6%, transparent) 66%, transparent 100%)",
        }}
      />

      <div className={`relative flex ${HERO_HEIGHT} flex-col items-center justify-center`}>{children}</div>
    </section>
  );
}
