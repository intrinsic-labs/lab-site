"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix, mkMatrixFull } from "./lib/primitiveSampler";
import { cardCamera, finishPoints } from "./lib/sceneShell";
import type { WorkTint } from "@/lib/content/schema";

/**
 * A record for Record Machine: a thin disc, grooves as concentric tori, a label ring, the
 * label face and the spindle hole — laid nearly flat and spun by the hook, the one scene
 * where the Y rotation is the object's own motion rather than a turntable for it.
 */
function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const pts: number[] = [];
  const R = 1.25;
  const flat = (y: number) => mkMatrixFull(THREE, 0, y, 0, Math.PI / 2, 0, 0);
  const disc = new THREE.CylinderGeometry(R, R, 0.03, 72, 1, true);
  sampleInto(disc, mkMatrix(THREE, 0, 0, 0), 2, pts);
  disc.dispose();
  for (let r = R - 0.06; r > 0.5; r -= 0.055) {
    const groove = new THREE.TorusGeometry(r, 0.006, 4, 96);
    sampleInto(groove, flat(0.016), 1, pts);
    groove.dispose();
  }
  const label = new THREE.TorusGeometry(0.42, 0.02, 6, 64);
  sampleInto(label, flat(0.02), 3, pts);
  label.dispose();
  const labelFace = new THREE.RingGeometry(0.06, 0.42, 48, 3);
  sampleInto(labelFace, mkMatrixFull(THREE, 0, 0.018, 0, -Math.PI / 2, 0, 0), 1, pts);
  labelFace.dispose();
  const hole = new THREE.TorusGeometry(0.06, 0.012, 6, 32);
  sampleInto(hole, flat(0.02), 4, pts);
  hole.dispose();
  const camera = cardCamera(THREE, root, 4.4, 1.9);
  return finishPoints(THREE, pts, tint, camera, { size: 0.018, opacity: 0.8 });
}

export function WireframeVinyl({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(() => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint), [tint]);
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
