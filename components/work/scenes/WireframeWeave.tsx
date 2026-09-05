"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrixFull } from "./lib/primitiveSampler";
import { cardCamera, finishPoints } from "./lib/sceneShell";
import type { WorkTint } from "@/lib/content/schema";

/**
 * A plain-weave swatch for weft: warp threads run vertically, weft threads horizontally, and
 * each thread bobs over and under the ones it crosses — short cylinder segments alternating
 * ±z per cell, so the interlacing is real geometry rather than a grid drawn flat. Two weft
 * ends run past the right selvedge, the way a cut swatch frays.
 */
function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const pts: number[] = [];
  const N = 9, pitch = 0.26, half = ((N - 1) * pitch) / 2, R = 0.045, lift = 0.05;
  const seg = new THREE.CylinderGeometry(R, R, pitch * 1.02, 8, 1, true);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = -half + i * pitch, y = -half + j * pitch;
      const over = (i + j) % 2 === 0 ? 1 : -1;
      sampleInto(seg, mkMatrixFull(THREE, x, y, over * lift, 0, 0, 0), 3, pts); // warp
      sampleInto(seg, mkMatrixFull(THREE, x, y, -over * lift, 0, 0, Math.PI / 2), 3, pts); // weft
    }
  }
  seg.dispose();
  const tail = new THREE.CylinderGeometry(R, R, 0.7, 8, 1, true);
  sampleInto(tail, mkMatrixFull(THREE, half + 0.35, -half + 2 * pitch, lift, 0, 0, Math.PI / 2), 3, pts);
  sampleInto(tail, mkMatrixFull(THREE, half + 0.35, -half + 5 * pitch, -lift, 0, 0, Math.PI / 2), 3, pts);
  tail.dispose();
  const camera = cardCamera(THREE, root, 5.2, 0.3);
  return finishPoints(THREE, pts, tint, camera, { size: 0.02, tiltX: 0.55 });
}

export function WireframeWeave({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(() => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint), [tint]);
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
