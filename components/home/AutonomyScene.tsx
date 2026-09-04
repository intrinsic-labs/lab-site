"use client";

import { useEffect, useRef } from "react";
import { draw, readPalette, type PlotMetric } from "./autonomy-plot";

const DURATION = 900;
const STAGGER = 110;

/**
 * The animated plate. Decorative by design: every number it draws is also rendered as
 * real text by the server component above it, so this is `aria-hidden` and the plate
 * still reads with JavaScript off.
 */
export function AutonomyScene({
  metrics,
  goal,
}: {
  metrics: PlotMetric[];
  goal: { low: number; high: number };
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current, cv = canvas.current;
    if (!host || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pal = readPalette(host);
    let size = { w: 0, h: 0 };
    let start: number | null = reduced ? -Infinity : null;
    let raf = 0;

    const total = DURATION + STAGGER * metrics.length;
    const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

    const paint = (now: number) => {
      if (!size.w) return;
      const el = start === null ? 0 : now - start;
      const progress = metrics.map((_, i) => ease((el - STAGGER * i) / DURATION));
      draw(ctx, size.w, size.h, pal, {
        metrics,
        goal,
        progress: reduced ? metrics.map(() => 1) : progress,
        goalProgress: reduced ? 1 : ease(el / 500),
      });
    };

    const frame = (now: number) => {
      if (start === null) start = now;
      paint(now);
      if (now - start < total) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const w = Math.max(host.clientWidth, 240);
      const h = Math.round(Math.min(Math.max(w * 0.6, 190), 300));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = { w, h };
      paint(performance.now());
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // Runs once, when the plate is first actually looked at.
    let fired = reduced;
    const io = new IntersectionObserver(
      (entries) => {
        if (fired || !entries.some((e) => e.isIntersecting)) return;
        fired = true;
        io.disconnect();
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.25 },
    );
    io.observe(host);

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [metrics, goal]);

  return (
    <div ref={wrap} className="w-full min-w-0 overflow-hidden">
      <canvas ref={canvas} aria-hidden className="block max-w-full" />
    </div>
  );
}
