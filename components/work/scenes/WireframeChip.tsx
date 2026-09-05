"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix } from "./lib/primitiveSampler";
import { cardCamera, finishPoints } from "./lib/sceneShell";
import type { WorkTint } from "@/lib/content/schema";

/**
 * A chip package for big-sleep-mps — the Apple-silicon port. A square die on a substrate,
 * pins along all four edges, and rising off the die one tall bar beside three short ones: the
 * per-step time at 128 s next to what it became (1.02 s, 0.74 s, 0.15 s — the three measured
 * configs). Heights are log-scaled so the short bars stay visible; the tall one is the story.
 */
const STEP_SECONDS = [128, 1.02, 0.74, 0.154];

function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const pts: number[] = [];
  const sub = new THREE.BoxGeometry(2.2, 0.08, 2.2);
  sampleInto(sub, mkMatrix(THREE, 0, -0.04, 0), 30, pts);
  sub.dispose();
  const die = new THREE.BoxGeometry(1.3, 0.1, 1.3);
  sampleInto(die, mkMatrix(THREE, 0, 0.05, 0), 40, pts);
  die.dispose();
  const pin = new THREE.BoxGeometry(0.06, 0.06, 0.22);
  const pinSide = new THREE.BoxGeometry(0.22, 0.06, 0.06);
  for (let i = 0; i < 12; i++) {
    const t = -0.95 + (i / 11) * 1.9;
    sampleInto(pin, mkMatrix(THREE, t, -0.04, 1.2), 3, pts);
    sampleInto(pin, mkMatrix(THREE, t, -0.04, -1.2), 3, pts);
    sampleInto(pinSide, mkMatrix(THREE, 1.2, -0.04, t), 3, pts);
    sampleInto(pinSide, mkMatrix(THREE, -1.2, -0.04, t), 3, pts);
  }
  pin.dispose();
  pinSide.dispose();
  STEP_SECONDS.forEach((s, i) => {
    const h = 0.14 + Math.log10(s * 10) * 0.3;
    const geo = new THREE.BoxGeometry(0.18, h, 0.18);
    // Dense enough that a bar reads as a solid, not a scatter — a thin box has few triangles.
    sampleInto(geo, mkMatrix(THREE, -0.42 + i * 0.28, 0.1 + h / 2, 0.15), 40, pts);
    geo.dispose();
  });
  const camera = cardCamera(THREE, root, 5.4, 1.9);
  camera.lookAt(0, 0.25, 0);
  return finishPoints(THREE, pts, tint, camera, { groupY: -0.3 });
}

export function WireframeChip({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(() => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint), [tint]);
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
