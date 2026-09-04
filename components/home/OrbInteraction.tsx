"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** How much an orb can swell when the pointer is right on it. */
const MAX_SWELL = 0.075;
/** How far it leans toward the pointer, as a fraction of its own radius. */
const MAX_LEAN = 0.055;
/** Reach of the pointer's pull, in radii. */
const REACH = 2.3;
/** Per-frame approach to the target — the easing. */
const EASE = 0.12;

interface OrbState {
  el: SVGGElement;
  cx: number;
  cy: number;
  r: number;
  phase: number;
  s: number;
  tx: number;
  ty: number;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/**
 * Progressive enhancement over the server-rendered figure (OrbFigure.tsx): nothing is
 * re-rendered and no React state is involved — the orb groups already exist in the
 * markup, and this walks them once and writes a `transform` attribute per frame.
 *
 * With a pointer, each orb swells and leans a few percent toward it, easing in and out,
 * so the composition answers the hand. With no pointer — a phone, a tablet — the orbs
 * breathe instead, slowly and out of phase with each other, so the piece is alive on
 * touch without depending on hover. Under `prefers-reduced-motion` this does nothing at
 * all and the static drawing stands.
 */
export function OrbInteraction({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const scenes = Array.from(host.querySelectorAll<SVGSVGElement>("svg[data-orb-scene]"));
    if (scenes.length === 0) return;

    const orbs: OrbState[] = [];
    scenes.forEach((svg) => {
      svg.querySelectorAll<SVGGElement>("[data-orb]").forEach((el, i) => {
        orbs.push({
          el,
          cx: Number(el.dataset.cx),
          cy: Number(el.dataset.cy),
          r: Number(el.dataset.r),
          phase: (i % 3) * 2.1,
          s: 1,
          tx: 0,
          ty: 0,
        });
      });
    });

    // Ambient until a real pointer shows up — a coarse-pointer device never gets one.
    let hasPointer = false;
    let pointer: { x: number; y: number } | null = null;
    let rafId: number | null = null;
    let running = false;
    let visible = true;

    function frame(now: number) {
      for (const orb of orbs) {
        let targetS = 1;
        let targetX = 0;
        let targetY = 0;

        if (hasPointer && pointer) {
          const svg = orb.el.ownerSVGElement;
          if (svg) {
            const rect = svg.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const vw = Number(svg.dataset.vw);
              const vh = Number(svg.dataset.vh);
              const px = ((pointer.x - rect.left) / rect.width) * vw;
              const py = ((pointer.y - rect.top) / rect.height) * vh;
              const dx = px - orb.cx;
              const dy = py - orb.cy;
              const dist = Math.hypot(dx, dy) || 1;
              const influence = smoothstep(Math.max(0, 1 - dist / (orb.r * REACH)));
              targetS = 1 + MAX_SWELL * influence;
              targetX = (dx / dist) * orb.r * MAX_LEAN * influence;
              targetY = (dy / dist) * orb.r * MAX_LEAN * influence;
            }
          }
        } else {
          const t = now / 1000;
          targetS = 1 + 0.02 * Math.sin(t * 0.55 + orb.phase);
          targetY = orb.r * 0.018 * Math.sin(t * 0.4 + orb.phase * 1.7);
        }

        orb.s += (targetS - orb.s) * EASE;
        orb.tx += (targetX - orb.tx) * EASE;
        orb.ty += (targetY - orb.ty) * EASE;

        orb.el.setAttribute(
          "transform",
          `translate(${orb.tx.toFixed(2)} ${orb.ty.toFixed(2)}) translate(${orb.cx} ${orb.cy}) scale(${orb.s.toFixed(4)}) translate(${-orb.cx} ${-orb.cy})`,
        );
      }
      if (running) rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running || !visible) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function handlePointerMove(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      hasPointer = true;
      pointer = { x: e.clientX, y: e.clientY };
    }

    function handlePointerLeave() {
      pointer = null;
      hasPointer = false;
    }

    // Window-level, like the masthead: the figure answers the pointer wherever it is,
    // not only while it is over the drawing.
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1]?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    function handleVisibility() {
      visible = document.visibilityState === "visible";
      if (visible) start();
      else stop();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    start();

    return () => {
      stop();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      io.disconnect();
    };
  }, []);

  return <div ref={hostRef}>{children}</div>;
}
