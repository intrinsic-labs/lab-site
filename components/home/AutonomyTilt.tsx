"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** How far the plate leans, at the edges of its own box. */
const TILT_DEG = 6;
/** How far it rises and settles, in user units. */
const LIFT = 3.5;

const STYLES = `
.au-plate { --au-tilt: 0deg; --au-lift: 0px; }

/* The whole drawing turns; the captions beneath it do not. */
.au-plate .au-scene {
  transform-box: view-box;
  transform-origin: 50% 100%;
  transform: translateY(var(--au-lift)) skewX(var(--au-tilt));
  transition: transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* Type inside the drawing rides along but stays upright: the parent shear moves it,
   an equal and opposite shear about its own centre un-slants it. */
.au-plate .au-counter {
  transform-box: fill-box;
  transform-origin: center;
  transform: skewX(calc(-1 * var(--au-tilt)));
  transition: transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* No pointer to follow: a very slow sway instead. */
.au-plate[data-ambient="on"] .au-scene { animation: au-sway 20s ease-in-out infinite; }
@keyframes au-sway {
  0%, 100% { transform: skewX(-3deg); }
  50% { transform: skewX(3deg); }
}

/* The reveal. Armed only when the plate starts off-screen, so a plate that is already
   in view is simply drawn at full height — the default state is always the real one. */
.au-plate .au-bar { transform-box: view-box; }
.au-plate[data-anim="on"] .au-bar { transform: scaleY(0); }
.au-plate[data-anim="on"] .au-ghost,
.au-plate[data-anim="on"] .au-readout { opacity: 0; }
.au-plate[data-anim="on"][data-grown="on"] .au-bar {
  transform: scaleY(1);
  transition: transform 820ms cubic-bezier(0.16, 0.84, 0.44, 1) var(--au-delay, 0ms);
}
.au-plate[data-anim="on"][data-grown="on"] .au-ghost,
.au-plate[data-anim="on"][data-grown="on"] .au-readout {
  opacity: 1;
  transition: opacity 700ms ease-out var(--au-delay, 0ms);
}

@media (prefers-reduced-motion: reduce) {
  .au-plate .au-scene,
  .au-plate .au-counter,
  .au-plate .au-bar { transition: none !important; animation: none !important; }
}
`;

/**
 * Progressive enhancement over the server-rendered SVG: pointer movement anywhere on the
 * page leans the projection a few degrees, so the piece follows the mouse the way the
 * masthead spirograph does. Nothing is re-rendered — the geometry is computed once on the
 * server and two CSS custom properties drive a `transform` on a single group, so a pointer
 * move costs a style recalculation and no layout.
 *
 * On a coarse pointer it sways slowly on its own. On `prefers-reduced-motion` it is
 * static. In every case the chart is already complete and legible before this mounts.
 */
export function AutonomyTilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cleanups: Array<() => void> = [];

    // ── The reveal. Only if the plate has not been looked at yet; if it is already on
    // screen we leave the bars at full height rather than collapsing them to grow again.
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.75) {
      el.dataset.anim = "on";
      let done = false;
      const grow = () => {
        if (done) return;
        done = true;
        el.dataset.grown = "on";
      };
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          grow();
        },
        { threshold: 0.15 },
      );
      io.observe(el);
      // If the observer never fires for any reason, the bars still end up full.
      const failsafe = window.setTimeout(grow, 2500);
      cleanups.push(() => {
        io.disconnect();
        window.clearTimeout(failsafe);
        grow();
      });
    }

    // ── The tilt.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      let pending: { x: number; y: number } | null = null;
      let raf = 0;
      const apply = () => {
        raf = 0;
        if (!pending) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const nx = clamp((pending.x - (r.left + r.width / 2)) / (r.width / 2));
        const ny = clamp((pending.y - (r.top + r.height / 2)) / (r.height / 2));
        el.style.setProperty("--au-tilt", `${(nx * TILT_DEG).toFixed(2)}deg`);
        el.style.setProperty("--au-lift", `${(ny * LIFT).toFixed(2)}px`);
      };
      const onMove = (e: PointerEvent) => {
        pending = { x: e.clientX, y: e.clientY };
        if (!raf) raf = requestAnimationFrame(apply);
      };
      // Window-level, like the spirograph: the plate answers the pointer wherever it is
      // on the page, not only while directly over the drawing.
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        cancelAnimationFrame(raf);
      });
    } else {
      el.dataset.ambient = "on";
      cleanups.push(() => delete el.dataset.ambient);
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div ref={ref} className="au-plate w-full min-w-0">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      {children}
    </div>
  );
}

function clamp(n: number): number {
  return Math.min(1, Math.max(-1, n));
}
