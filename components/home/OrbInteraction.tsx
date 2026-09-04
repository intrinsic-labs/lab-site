"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** How much an orb can swell when the pointer is right on it. */
const MAX_SWELL = 0.075;
/** How far it leans toward the pointer, as a fraction of its own radius. */
const MAX_LEAN = 0.055;
/** Reach of the pointer's pull, in radii. */
const REACH = 2.3;
/** Fraction of the remaining distance covered in one 60fps frame — the easing. */
const EASE = 0.12;

export interface PanelMetric {
  key: string;
  label: string;
  blurb: string;
  /** The raw counts behind the percentage: "270 of 369 sessions". */
  fraction: string;
  colorVar: string;
}

interface OrbState {
  els: HTMLElement[];
  cx: number;
  cy: number;
  r: number;
  gr: number;
  phase: number;
  s: number;
  tx: number;
  ty: number;
}

interface SceneState {
  box: HTMLElement;
  orbs: OrbState[];
  left: number;
  top: number;
  width: number;
  height: number;
  vw: number;
  vh: number;
  live: boolean;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/**
 * Progressive enhancement over the server-rendered figure (OrbFigure.tsx): nothing is
 * re-rendered by React and no geometry is recomputed here — the glow and disc elements
 * already exist in the markup carrying their own coordinates, and this walks them once and
 * writes one `transform` per frame.
 *
 * Every one of those elements is an HTML box with `will-change: transform`, so a frame is a
 * compositor operation and nothing repaints. That is the whole reason the figure is smooth:
 * the earlier version wrote SVG transforms on groups that lived inside an `feGaussianBlur`,
 * which forced the browser to re-run the blur at device resolution on every single frame.
 *
 * With a pointer, each orb swells and leans a few percent toward it, easing in and out, so
 * the composition answers the hand. With no pointer — a phone, a tablet — the orbs breathe
 * instead, slowly and out of phase with each other. Under `prefers-reduced-motion` none of
 * it runs and the static drawing stands.
 *
 * The context panel is the other half: it explains the figure by default and swaps to one
 * metric's explanation while that orb is hovered, focused or tapped.
 */
export function OrbInteraction({
  children,
  intro,
  metrics,
}: {
  children: ReactNode;
  intro: string;
  metrics: PanelMetric[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);

  // --- the panel: hover, focus and tap all resolve to the same "which orb" ---------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const keyFrom = (t: EventTarget | null) =>
      t instanceof Element ? (t.closest("[data-orb-hit]") as HTMLElement | null)?.dataset.orbHit ?? null : null;
    const enter = (e: Event) => {
      const key = keyFrom(e.target);
      if (key) setActive(key);
    };
    const leave = (e: Event) => {
      const key = keyFrom(e.target);
      if (key) setActive((cur) => (cur === key ? null : cur));
    };
    host.addEventListener("pointerover", enter);
    host.addEventListener("pointerout", leave);
    host.addEventListener("focusin", enter);
    host.addEventListener("focusout", leave);
    return () => {
      host.removeEventListener("pointerover", enter);
      host.removeEventListener("pointerout", leave);
      host.removeEventListener("focusin", enter);
      host.removeEventListener("focusout", leave);
    };
  }, []);

  // --- the motion ------------------------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scenes: SceneState[] = [];
    host.querySelectorAll<HTMLElement>("[data-orb-scene]").forEach((stage) => {
      const box = stage.querySelector<HTMLElement>("[data-orb-box]");
      if (!box) return;
      const byKey = new Map<string, OrbState>();
      stage.querySelectorAll<HTMLElement>("[data-orb-glow], [data-orb-body]").forEach((el) => {
        const key = el.dataset.orbGlow ?? el.dataset.orbBody ?? "";
        let orb = byKey.get(key);
        if (!orb) {
          orb = {
            els: [],
            cx: Number(el.dataset.cx),
            cy: Number(el.dataset.cy),
            r: Number(el.dataset.r),
            gr: Number(el.dataset.gr),
            phase: byKey.size * 2.1,
            s: 1,
            tx: 0,
            ty: 0,
          };
          byKey.set(key, orb);
        }
        orb.els.push(el);
      });
      if (byKey.size === 0) return;
      scenes.push({
        box,
        orbs: [...byKey.values()],
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        vw: Number(stage.dataset.vw),
        vh: Number(stage.dataset.vh),
        live: false,
      });
    });
    if (scenes.length === 0) return;

    // One rect read per scene per measure, never one per orb per frame: the old version
    // called getBoundingClientRect nine times a frame, which forces layout each time.
    let measured = false;
    function measure() {
      for (const scene of scenes) {
        const rect = scene.box.getBoundingClientRect();
        scene.left = rect.left;
        scene.top = rect.top;
        scene.width = rect.width;
        scene.height = rect.height;
        // Only one of the two presets is displayed; the other has no box at all.
        scene.live = rect.width > 0 && rect.height > 0;
      }
      measured = true;
    }
    const invalidate = () => {
      measured = false;
    };

    let hasPointer = false;
    let pointer: { x: number; y: number } | null = null;
    let rafId: number | null = null;
    let running = false;
    let visible = true;
    let last = 0;

    function frame(now: number) {
      if (!measured) measure();
      // Frame-rate independent easing, so a 120Hz screen and a 30fps one settle alike.
      const dt = last ? Math.min(64, now - last) : 16.67;
      last = now;
      const k = 1 - Math.pow(1 - EASE, dt / 16.67);

      for (const scene of scenes) {
        if (!scene.live) continue;
        const px = pointer ? ((pointer.x - scene.left) / scene.width) * scene.vw : 0;
        const py = pointer ? ((pointer.y - scene.top) / scene.height) * scene.vh : 0;

        for (const orb of scene.orbs) {
          let targetS = 1;
          let targetX = 0;
          let targetY = 0;

          if (hasPointer && pointer) {
            const dx = px - orb.cx;
            const dy = py - orb.cy;
            const dist = Math.hypot(dx, dy) || 1;
            const influence = smoothstep(Math.max(0, 1 - dist / (orb.r * REACH)));
            targetS = 1 + MAX_SWELL * influence;
            targetX = (dx / dist) * orb.r * MAX_LEAN * influence;
            targetY = (dy / dist) * orb.r * MAX_LEAN * influence;
          } else {
            const t = now / 1000;
            targetS = 1 + 0.02 * Math.sin(t * 0.55 + orb.phase);
            targetY = orb.r * 0.018 * Math.sin(t * 0.4 + orb.phase * 1.7);
          }

          orb.s += (targetS - orb.s) * k;
          orb.tx += (targetX - orb.tx) * k;
          orb.ty += (targetY - orb.ty) * k;

          // Percentages of the element's own box, so one string is correct at every
          // rendered size — the box is 2 × glowR wide in the same units as tx/ty.
          const span = 2 * orb.gr;
          const transform = `translate3d(${((orb.tx / span) * 100).toFixed(3)}%, ${((orb.ty / span) * 100).toFixed(3)}%, 0) scale(${orb.s.toFixed(4)})`;
          for (const el of orb.els) el.style.transform = transform;
        }
      }
      if (running) rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running || !visible) return;
      running = true;
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
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
    function handleVisibility() {
      visible = document.visibilityState === "visible";
      if (visible) start();
      else stop();
    }

    // Window-level, like the masthead: the figure answers the pointer wherever it is, not
    // only while it is over the drawing.
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    document.addEventListener("visibilitychange", handleVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1]?.isIntersecting ?? true;
        invalidate();
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);
    start();

    return () => {
      stop();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("visibilitychange", handleVisibility);
      io.disconnect();
    };
  }, []);

  const line =
    "absolute inset-x-0 top-0 max-w-[72ch] text-sm sm:text-base leading-snug text-ink-2 transition-opacity duration-300 ease-out motion-reduce:transition-none";

  return (
    <div ref={hostRef}>
      {children}

      <div className="mx-auto max-w-6xl px-6">
      {/* On a phone the figure carries no labels — three plain-English phrases do not fit
          over three overlapping orbs — so the legend is where they live, and it is the same
          hit target the orbs are on a desktop. */}
      <ul className="mt-6 flex flex-col gap-1.5 md:hidden">
        {metrics.map((m) => (
          <li key={m.key}>
            <button
              type="button"
              data-orb-hit={m.key}
              aria-pressed={active === m.key}
              className="flex w-full items-center gap-2.5 py-1 text-left"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: `var(${m.colorVar})` }}
                aria-hidden
              />
              <span
                className={`label normal-case tracking-normal transition-colors ${active === m.key ? "text-ink" : "text-ink-2"}`}
              >
                {m.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Fixed height, so a swap never moves the page. */}
      <div className="relative mt-5 min-h-[9.5rem] sm:min-h-[7rem] md:min-h-[5.5rem]">
        <p className={`${line} ${active ? "opacity-0" : "opacity-100"}`} aria-hidden={active !== null}>
          {intro}
        </p>
        {metrics.map((m) => (
          <p
            key={m.key}
            className={`${line} ${active === m.key ? "opacity-100" : "opacity-0"}`}
            aria-hidden={active !== m.key}
          >
            <span style={{ color: `var(${m.colorVar})` }}>{m.label}.</span> {m.blurb}{" "}
            <span className="text-ink-3">{m.fraction}.</span>
          </p>
        ))}
      </div>
      </div>
    </div>
  );
}
