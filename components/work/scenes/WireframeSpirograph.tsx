"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { cardCamera, finishPoints } from "./lib/sceneShell";
import type { WorkTint } from "@/lib/content/schema";

/**
 * Three trochoid curves as point clouds, each on its own shallow z-plane — Retina is a SwiftUI
 * spirograph toy and the direct ancestor of this site's masthead, so the scene is literally
 * what the app draws: a hypotrochoid, an epitrochoid and a hypocycloid. The z offsets are what
 * make the hook's Y rotation read as depth instead of a flat print turning.
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * `sign` +1 = epitrochoid (rolling outside), −1 = hypotrochoid (rolling inside). Each curve is
 * drawn in its own plane, given by `rx`/`ry`, so the three together make a small armillary
 * rather than one flat print — a flat print turns edge-on under the hook's Y rotation and
 * vanishes to a line on a phone.
 */
function trochoid(
  THREE: ThreeModule, pts: number[],
  R: number, r: number, d: number, sign: 1 | -1, scale: number, n: number, rx: number, ry: number,
) {
  const k = (R + sign * r) / r;
  const turns = 2 * Math.PI * (r / gcd(R, r));
  const rot = new THREE.Euler(rx, ry, 0);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * turns;
    const x = (R + sign * r) * Math.cos(t) - sign * d * Math.cos(k * t);
    const y = (R + sign * r) * Math.sin(t) - d * Math.sin(k * t);
    v.set(x * scale, y * scale, (Math.random() - 0.5) * 0.01).applyEuler(rot);
    pts.push(v.x, v.y, v.z);
  }
}

function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const pts: number[] = [];
  trochoid(THREE, pts, 7, 3, 2.2, -1, 0.14, 2600, 0, 0); // hypotrochoid, facing the camera
  trochoid(THREE, pts, 5, 2, 1.2, 1, 0.11, 2200, Math.PI / 3, 0); // epitrochoid, tipped back
  trochoid(THREE, pts, 6, 1, 1.0, -1, 0.16, 2400, 0, Math.PI / 3); // hypocycloid, turned aside
  const camera = cardCamera(THREE, root, 4.6, 0.1);
  return finishPoints(THREE, pts, tint, camera, { size: 0.018, opacity: 0.8, tiltX: 0.2 });
}

export function WireframeSpirograph({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(() => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint), [tint]);
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
