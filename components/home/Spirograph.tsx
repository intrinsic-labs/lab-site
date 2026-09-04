"use client";

import { useEffect, useRef } from "react";

/**
 * Ported from intrinsiclabs.co's interactive spirograph hero
 * (src/components/home/RetinaCanvas.tsx in the intrinsiclabs-co-v3 repo).
 * Same hypotrochoid/epitrochoid/hypocycloid math, recoloured for the paper/ink
 * theme: thin, low-opacity ink strokes on a transparent ground so the cream
 * page shows through and body copy laid over it stays readable. The pointer
 * still nudges the curve forward (as it did on the original, via a
 * window-level listener rather than one scoped to the canvas, so the effect
 * works no matter what sits visually on top); left alone it drifts on its
 * own at a slow, print-like pace. Static on prefers-reduced-motion, paused
 * off-screen and while the tab is hidden.
 */

interface CurveParams {
  R: number;
  r: number;
  d: number;
  xRotation: number;
  yRotation: number;
  allRotation: number;
}

// --color-ink and --color-ink-3 from app/globals.css, as rgb triples so we
// can drive the alpha channel per stroke.
const INK = "27, 25, 21";
const INK_3 = "138, 131, 119";

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

function traceEndPoint(R: number, r: number, amount: number): number {
  const divisor = gcd(R, r);
  return Math.ceil((2 * Math.PI * r) / divisor) * amount;
}

function drawHypotrochoid(
  ctx: CanvasRenderingContext2D,
  params: CurveParams,
  amount: number,
  scale: number,
  centerX: number,
  centerY: number,
  rotationDegrees: number,
) {
  const { R, r, d, xRotation, yRotation } = params;
  const endPoint = traceEndPoint(R, r, amount);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotationDegrees * Math.PI) / 180);

  ctx.beginPath();
  for (let theta = 0; theta <= endPoint; theta += 0.01) {
    const x =
      ((R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta) * xRotation) * scale;
    const y =
      ((R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta) * yRotation) * scale;
    if (theta === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawEpitrochoid(
  ctx: CanvasRenderingContext2D,
  params: CurveParams,
  amount: number,
  scale: number,
  centerX: number,
  centerY: number,
  rotationDegrees: number,
) {
  const { R, r, d, xRotation, yRotation } = params;
  const endPoint = traceEndPoint(R, r, amount);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotationDegrees * Math.PI) / 180);

  ctx.beginPath();
  for (let theta = 0; theta <= endPoint; theta += 0.01) {
    const x =
      ((R + r) * Math.cos(theta) - d * Math.cos(((R + r) / r) * theta) * xRotation) * scale;
    const y =
      ((R + r) * Math.sin(theta) - d * Math.sin(((R + r) / r) * theta) * yRotation) * scale;
    if (theta === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHypocycloid(
  ctx: CanvasRenderingContext2D,
  params: CurveParams,
  amount: number,
  scale: number,
  centerX: number,
  centerY: number,
  rotationDegrees: number,
) {
  const { R, r, xRotation, yRotation } = params;
  const endPoint = traceEndPoint(R, r, amount);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotationDegrees * Math.PI) / 180);

  ctx.beginPath();
  for (let theta = 0; theta <= endPoint; theta += 0.01) {
    const x =
      ((R - r) * Math.cos(theta) + r * Math.cos(((R - r) / r) * theta) * xRotation) * scale;
    const y =
      ((R - r) * Math.sin(theta) - r * Math.sin(((R - r) / r) * theta) * yRotation) * scale;
    if (theta === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

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

// Idle drift: how much the trace advances per frame with no pointer input.
const AMBIENT_DELTA = 0.00025;
// How strongly pointer movement (mouse, pen, or touch) speeds the trace along.
const POINTER_DELTA_PER_PX = 0.00006;

export function Spirograph({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let params = generateRandomParams();
    let amount = reducedMotionQuery.matches ? 0.65 : 0.05;
    let direction = 1;
    let pointerDelta = 0;
    let lastPointer: { x: number; y: number } | null = null;
    let rafId: number | null = null;
    let running = false;
    let isIntersecting = true;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
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

      const centerX = width / 2;
      const centerY = height / 2.9;
      const scale = Math.min(width, height) / 600;

      ctx!.lineWidth = 0.75;

      ctx!.strokeStyle = `rgba(${INK}, 0.22)`;
      drawHypotrochoid(ctx!, params, amount, scale, centerX, centerY, params.allRotation * 1.25);

      ctx!.strokeStyle = `rgba(${INK_3}, 0.16)`;
      drawEpitrochoid(ctx!, params, amount, scale, centerX, centerY, params.allRotation * 0.5);

      ctx!.strokeStyle = `rgba(${INK_3}, 0.12)`;
      drawHypocycloid(ctx!, params, amount, scale, centerX, centerY, params.allRotation * 0.25);
    }

    function advance() {
      const delta = (AMBIENT_DELTA + pointerDelta) * direction;
      pointerDelta = 0;
      amount += delta;

      if (amount >= 1) {
        amount = 1;
        direction = -1;
      } else if (amount <= 0) {
        params = generateRandomParams();
        amount = 0;
        direction = 1;
      }
    }

    function tick() {
      advance();
      draw();
      if (running) rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (running || reducedMotionQuery.matches || !isIntersecting || document.visibilityState !== "visible") {
        return;
      }
      running = true;
      rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // Initial paint — a single frame even before the loop (if any) starts,
    // so there's never a blank canvas.
    draw();

    function handlePointerMove(e: PointerEvent) {
      if (lastPointer) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        pointerDelta += distance * POINTER_DELTA_PER_PX;
      }
      lastPointer = { x: e.clientX, y: e.clientY };
    }

    // Window-level, like the original: the effect responds to the pointer
    // anywhere on the page, not just while directly over the canvas — which
    // matters here since the canvas sits behind other content and is
    // pointer-events: none (see Masthead.tsx).
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[entries.length - 1]?.isIntersecting ?? true;
        if (isIntersecting) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") startLoop();
      else stopLoop();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    function handleReducedMotionChange(e: MediaQueryListEvent) {
      if (e.matches) {
        stopLoop();
        draw();
      } else {
        startLoop();
      }
    }
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    startLoop();

    return () => {
      stopLoop();
      window.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
