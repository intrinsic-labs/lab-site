"use client";

import { useEffect, useRef } from "react";

/**
 * The masthead spirograph — ported from intrinsiclabs.co's hero
 * (`src/components/home/RetinaCanvas.tsx` in the intrinsiclabs-co-v3 repo) and given
 * back the two things that made the original worth sitting in front of:
 *
 *   1. It is the whole viewport. The canvas is sized to its section, which is
 *      `100vw × 100svh` (see Masthead.tsx), and every curve is scaled so its extent is
 *      larger than the section's diagonal — so the lines always run off all four edges
 *      instead of stopping at a container's border.
 *   2. Moving the pointer draws it. Each pixel of pointer travel advances the trace, so
 *      the curve draws itself on while you move and unwinds back off when it reaches the
 *      end; at zero it re-rolls new parameters and starts a different figure. Left
 *      completely alone it drifts very slowly on its own, so the page is never dead.
 *
 * Colour comes from the semantic tokens (`--color-ink`, `--color-ink-2`, `--color-accent`)
 * read off the document at draw time, never hardcoded, so the skin — cream or black —
 * carries straight through. Static on `prefers-reduced-motion`, paused off-screen and
 * while the tab is hidden.
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

function traceEndPoint(R: number, r: number, amount: number): number {
  return Math.ceil((2 * Math.PI * r) / gcd(R, r)) * amount;
}

/**
 * How far the pen gets from the centre along each axis, in curve units. Both numbers
 * matter: `min` is the radius the figure is guaranteed to reach in every direction, which
 * is what a bleed has to be scaled from — scaling off the *widest* reach lets a curve
 * whose x- and y-rotations differ sit entirely inside the frame on its narrow axis, which
 * is exactly the clipped-looking hero this replaced.
 */
function curveReach(kind: CurveKind, { R, r, d, xRotation, yRotation }: CurveParams) {
  const base = kind === "epitrochoid" ? R + r : Math.abs(R - r);
  const k = kind === "hypocycloid" ? r : d;
  const ax = base + k * Math.abs(xRotation);
  const ay = base + k * Math.abs(yRotation);
  return { min: Math.max(1, Math.min(ax, ay)), max: Math.max(1, Math.max(ax, ay)) };
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
  const endPoint = traceEndPoint(params.R, params.r, amount);
  if (endPoint <= 0) return;
  // The original stepped a flat 0.01 radians, which on a long trace is >150k segments a
  // frame. Cap the segment count instead: at this scale the difference is invisible.
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

/** A rotation factor that is never so near zero that the curve collapses to a line. */
function signedRotation(): number {
  return (Math.random() < 0.5 ? -1 : 1) * (0.38 + Math.random() * 0.62);
}

/**
 * The original rolled all six parameters uniformly, which most of the time is a fine
 * figure and some of the time is four bare strands: `traceEndPoint` is `2πr / gcd(R, r)`,
 * so a small `r` or a large common factor closes the curve after two loops, and an `R`
 * close to `r` collapses it toward a point that then gets scaled up enormously to fill the
 * frame. This keeps the same families and the same feel, and only rules out the
 * degenerate corner of the parameter space: whole numbers with a small common factor, a
 * radius far enough from `R` to have a shape, and rotations that aren't flat.
 */
function generateRandomParams(): CurveParams {
  const R = Math.round(120 + Math.random() * 136);
  let r = Math.round(30 + Math.random() * (R - 75));
  while (r > 30 && gcd(R, r) > 3) r -= 1;
  return {
    R,
    r,
    d: Math.round(30 + Math.random() * 200),
    xRotation: signedRotation(),
    yRotation: signedRotation(),
    allRotation: Math.random() * 360,
  };
}

/** Idle drift per frame with no pointer input — alive, but barely. */
const AMBIENT_DELTA = 0.00012;
/** How far a pixel of pointer travel draws the curve on. The original's figure. */
const POINTER_DELTA_PER_PX = 0.0002;

/**
 * How far past the section's half-diagonal each curve's *narrowest* reach is scaled. A
 * circle of exactly the half-diagonal passes through the corners, so anything above 1
 * leaves the frame on every side, whatever the random parameters come out as. The three
 * differ so the layers sit at different depths rather than tracing each other.
 */
const BLEED: Record<CurveKind, number> = {
  hypotrochoid: 1.22,
  epitrochoid: 1.02,
  hypocycloid: 1.45,
};

/**
 * …but a curve with a near-degenerate axis would otherwise be blown up until the frame
 * held four bare strands. This caps the widest reach, so such a figure bleeds on its long
 * axis and simply stays a narrow figure on its short one.
 */
const MAX_SPREAD = 1.7;

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

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let params = generateRandomParams();
    // The original opened at 0.05 — a few strands — and relied on the mouse to draw the
    // rest. On a landing page that reads as an empty screen to anyone who arrives and
    // doesn't move, so it opens on a figure that is already a figure and leaves the
    // remaining two-thirds for the pointer to draw.
    let amount = reducedMotionQuery.matches ? 0.7 : 0.26;
    let direction = 1;
    let pointerDelta = 0;
    let lastPointer: { x: number; y: number } | null = null;
    let rafId: number | null = null;
    let running = false;
    let isIntersecting = true;
    let palette = { ink: "#ffffff", ink2: "#888888", accent: "#e0723f" };

    function readPalette() {
      palette = {
        ink: readToken("--color-ink", palette.ink),
        ink2: readToken("--color-ink-2", palette.ink2),
        accent: readToken("--color-accent", palette.accent),
      };
    }

    function draw() {
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

      // Dead centre: the figure grows outward from the middle of the viewport and leaves
      // it on every side.
      const centerX = width / 2;
      const centerY = height / 2;
      const halfDiagonal = Math.hypot(width, height) / 2;
      const fit = (kind: CurveKind) => {
        const reach = curveReach(kind, params);
        return Math.min((halfDiagonal * BLEED[kind]) / reach.min, (halfDiagonal * MAX_SPREAD) / reach.max);
      };

      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";

      // A wide, near-invisible pass under the accent curve reads as bloom on a dark
      // ground and as nothing at all on a light one.
      ctx!.globalAlpha = 0.07;
      ctx!.lineWidth = 3;
      ctx!.strokeStyle = palette.accent;
      traceCurve(ctx!, "hypotrochoid", params, amount, fit("hypotrochoid"), centerX, centerY, params.allRotation * 1.25);

      ctx!.globalAlpha = 0.42;
      ctx!.lineWidth = 0.8;
      ctx!.strokeStyle = palette.accent;
      traceCurve(ctx!, "hypotrochoid", params, amount, fit("hypotrochoid"), centerX, centerY, params.allRotation * 1.25);

      ctx!.globalAlpha = 0.38;
      ctx!.lineWidth = 0.7;
      ctx!.strokeStyle = palette.ink;
      traceCurve(ctx!, "epitrochoid", params, amount, fit("epitrochoid"), centerX, centerY, params.allRotation * 0.5);

      ctx!.globalAlpha = 0.28;
      ctx!.lineWidth = 0.65;
      ctx!.strokeStyle = palette.ink2;
      traceCurve(ctx!, "hypocycloid", params, amount, fit("hypocycloid"), centerX, centerY, params.allRotation * 0.25);

      ctx!.globalAlpha = 1;
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
      if (running || reducedMotionQuery.matches || !isIntersecting || document.visibilityState !== "visible") return;
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

    readPalette();
    // One frame before the loop (if any) starts, so the canvas is never blank.
    draw();

    function handlePointerMove(e: PointerEvent) {
      if (lastPointer) {
        const distance = Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
        pointerDelta += distance * POINTER_DELTA_PER_PX;
      }
      lastPointer = { x: e.clientX, y: e.clientY };
    }

    // Window-level, like the original: the figure answers the pointer anywhere on the
    // page, not only while directly over the canvas — which matters because the canvas
    // sits behind the headline and is `pointer-events: none`.
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      readPalette();
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
      if (document.visibilityState === "visible") {
        readPalette();
        startLoop();
      } else {
        stopLoop();
      }
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
