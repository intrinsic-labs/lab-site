"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix, mkMatrixFull } from "./lib/primitiveSampler";
import { cardCamera, finishPoints } from "./lib/sceneShell";
import type { WorkTint } from "@/lib/content/schema";

/**
 * A clock face for TimeLogger: bezel torus, twelve tick marks (the quarter hours heavier),
 * an hour and a minute hand, and a centre boss — a billing clock, stopped at ten past two.
 */
function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const pts: number[] = [];
  const R = 1.15;
  const bezel = new THREE.TorusGeometry(R, 0.05, 8, 64);
  sampleInto(bezel, mkMatrix(THREE, 0, 0, 0), 3, pts);
  bezel.dispose();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const quarter = i % 3 === 0;
    const len = quarter ? 0.22 : 0.12, w = quarter ? 0.04 : 0.025;
    const rr = R - 0.1 - len / 2;
    const geo = new THREE.BoxGeometry(w, len, 0.03);
    sampleInto(geo, mkMatrixFull(THREE, Math.sin(a) * rr, Math.cos(a) * rr, 0, 0, 0, -a), 6, pts);
    geo.dispose();
  }
  // Hands pivot at the centre: place the box's midpoint half its length out along the angle.
  const hand = (len: number, w: number, angle: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, len, 0.03);
    const mid = len / 2 - 0.08;
    sampleInto(geo, mkMatrixFull(THREE, Math.sin(angle) * mid, Math.cos(angle) * mid, z, 0, 0, -angle), 10, pts);
    geo.dispose();
  };
  hand(0.62, 0.06, (2 / 12) * Math.PI * 2 + (10 / 60) * (Math.PI / 6), 0.03); // hour, ~2:10
  hand(0.92, 0.04, (10 / 60) * Math.PI * 2, 0.05); // minute, ten past
  const boss = new THREE.SphereGeometry(0.07, 10, 8);
  sampleInto(boss, mkMatrix(THREE, 0, 0, 0.04), 8, pts);
  boss.dispose();
  const camera = cardCamera(THREE, root, 4.8, 0.2);
  return finishPoints(THREE, pts, tint, camera, { tiltX: 0.18 });
}

export function WireframeClock({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(() => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint), [tint]);
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
