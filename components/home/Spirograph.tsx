"use client";

import { useEffect, useRef } from "react";

/**
 * The masthead spirograph — the live intrinsiclabs.co hero's `RetinaCanvas`
 * (`src/components/home/RetinaCanvas.tsx` in the intrinsiclabs-co-v3 repo), spliced in with
 * its behaviour intact (Asher, 2026-09-04: "I dialed it in pretty nice … splice it in
 * exactly"). What is the original's, unchanged:
 *
 *   - the three curve families and their formulas, drawn in the same order with the same
 *     per-curve rotation multipliers (×1.25, ×0.5, ×0.25 of `allRotation`)
 *   - `generateRandomParams` — every parameter uniform, R/r/d in [0, 256), rotations in [-1, 1)
 *   - the scale `min(w, h) / 600` and the 0.5px stroke (the centre is ours — see draw())
 *   - the trace opens at 0.05 and is DRAWN BY THE POINTER: each pixel of mouse travel advances
 *     it by 0.0002; at 1 it turns around and unwinds; at 0 it re-rolls a new figure. There
 *     is no ambient animation — a still pointer is a still figure.
 *   - on touch, the trace advances 0.002 per pixel, after a 10px dead zone so a tap does
 *     nothing
 *   - the colour mode: copper / cream / blue-400, the site's `--color-spiro-*` tokens
 *
 * Two deliberate departures, both because this canvas sits BEHIND the headline with
 * `pointer-events: none` (the original's canvas was the touch target and its text was
 * inert): touch is listened for on `window`, and it uses total travel rather than
 * horizontal-only, so an ordinary phone SCROLL over the hero draws it. The original's
 * hero controls — shift-scroll rotate, ±/c keys, the mono↔colour toggle — are not
 * ported: there is no UI for them here, and a global keydown on `+`/`-` on a content site
 * is a hijack.
 *
 * Redraw happens only on input (one rAF per event burst) and on resize; the segment step is
 * capped so a long trace is a few thousand segments rather than the original's flat 0.01
 * radians (>150k on the longest figures) — invisible at this stroke, and it keeps a phone
 * scroll smooth.
 */

interface CurveParams {
  R: number;
  r: number;
  d: number;
  xRotation: number;
  yRotation: number;
  allRotation: number;
}

type CurveKind = "hypotrochoid" | "epitrochoid" | "hypocycloid";

function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function point(kind: CurveKind, p: CurveParams, theta: number): [number, number] {
  const { R, r, d, xRotation, yRotation } = p;
  if (kind === "epitrochoid") {
    return [
      (R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta) * xRotation,
      (R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta) * yRotation,
    ];
  }
  const k = kind === "hypocycloid" ? r : d;
  return [
    (R - r) * Math.cos(theta) + k * Math.cos(((R - r) / r) * theta) * xRotation,
    (R - r) * Math.sin(theta) - k * Math.sin(((R - r) / r) * theta) * yRotation,
  ];
}

function traceCurve(
  ctx: CanvasRenderingContext2D,
  kind: CurveKind,
  params: CurveParams,
  amount: number,
  scale: number,
  centerX: number,
  centerY: number,
  rotationDegrees: number,
) {
  const endPoint = Math.ceil((2 * Math.PI * params.r) / gcd(params.R, params.r)) * amount;
  if (!(endPoint > 0)) return;
  const step = Math.max(0.01, endPoint / 24000);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotationDegrees * Math.PI) / 180);
  ctx.beginPath();
  for (let theta = 0; theta <= endPoint; theta += step) {
    const [x, y] = point(kind, params, theta);
    if (theta === 0) ctx.moveTo(x * scale, y * scale);
    else ctx.lineTo(x * scale, y * scale);
  }
  ctx.stroke();
  ctx.restore();
}

/** The original's, verbatim. */
function generateRandomParams(): CurveParams {
  return {
    R: Math.random() * 256,
    r: Math.random() * 256,
    d: Math.random() * 256,
    xRotation: Math.random() * 2 - 1,
    yRotation: Math.random() * 2 - 1,
    allRotation: Math.random() * 360,
  };
}

const START_AMOUNT = 0.05;
const MOUSE_DELTA_PER_PX = 0.0002;
const TOUCH_DELTA_PER_PX = 0.002;
const TOUCH_DEAD_ZONE_PX = 10;
const STROKE_WIDTH = 0.5;

function readToken(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function Spirograph({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let params = generateRandomParams();
    let amount = START_AMOUNT;
    let direction = 1;
    let lastMouse: { x: number; y: number } | null = null;
    let lastTouch: { x: number; y: number } | null = null;
    let touchStart: { x: number; y: number } | null = null;
    let rafId: number | null = null;
    let palette = { copper: "#c49a6c", cream: "#e4ddd3", blue: "#51a2ff" };

    function readPalette() {
      palette = {
        copper: readToken("--color-spiro-copper", palette.copper),
        cream: readToken("--color-spiro-cream", palette.cream),
        blue: readToken("--color-spiro-blue", palette.blue),
      };
    }

    function draw() {
      rafId = null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas!.width !== targetW || canvas!.height !== targetH) {
        canvas!.width = targetW;
        canvas!.height = targetH;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);

      // The original's scale, verbatim; the centre is ours. The old hero was bottom-aligned
      // text under a figure hung at h/2.9 — here the headline is centred, so the figure is
      // too (Asher, 2026-09-04: "center on the headline").
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) / 600;

      ctx!.lineWidth = STROKE_WIDTH;

      ctx!.strokeStyle = palette.copper;
      traceCurve(ctx!, "hypotrochoid", params, amount, scale, centerX, centerY, params.allRotation * 1.25);

      ctx!.strokeStyle = palette.cream;
      traceCurve(ctx!, "epitrochoid", params, amount, scale, centerX, centerY, params.allRotation * 0.5);

      ctx!.strokeStyle = palette.blue;
      traceCurve(ctx!, "hypocycloid", params, amount, scale, centerX, centerY, params.allRotation * 0.25);
    }

    function scheduleDraw() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    }

    /** The original's advance: forward to 1, back to 0, re-roll at 0. */
    function advance(delta: number) {
      amount += delta * direction;
      if (amount >= 1) {
        amount = 1;
        direction = -1;
      } else if (amount <= 0) {
        params = generateRandomParams();
        amount = 0;
        direction = 1;
      }
      scheduleDraw();
    }

    function handleMouseMove(e: MouseEvent) {
      if (lastMouse) {
        const distance = Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y);
        advance(distance * MOUSE_DELTA_PER_PX);
      }
      lastMouse = { x: e.clientX, y: e.clientY };
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
      lastTouch = { x: t.clientX, y: t.clientY };
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1 || !lastTouch) return;
      const t = e.touches[0];
      // The original's tap dead zone: nothing moves until the finger has clearly travelled.
      if (touchStart && Math.abs(t.clientX - touchStart.x) < TOUCH_DEAD_ZONE_PX && Math.abs(t.clientY - touchStart.y) < TOUCH_DEAD_ZONE_PX) return;
      const distance = Math.hypot(t.clientX - lastTouch.x, t.clientY - lastTouch.y);
      advance(distance * TOUCH_DELTA_PER_PX);
      lastTouch = { x: t.clientX, y: t.clientY };
    }

    function handleTouchEnd() {
      lastTouch = null;
      touchStart = null;
    }

    readPalette();
    draw();

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      readPalette();
      scheduleDraw();
    });
    resizeObserver.observe(canvas);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
