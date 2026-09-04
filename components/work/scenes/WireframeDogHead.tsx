"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleTriangleList } from "./lib/triangleListSampler";
import { readTintColor } from "./lib/pointColor";
import type { WorkTint } from "@/lib/content/schema";

/**
 * Procedurally built low-poly wireframe German Shepherd head for the dog-body-mind case
 * study — ported from intrinsiclabs-co-v3's WireframeDogHead. Vertex layout unchanged from
 * the original (world-space, Y-up, facing -Z); see that file's history for the annotated
 * index map if the geometry ever needs editing.
 */

// prettier-ignore
const VERTS = new Float32Array([
   0.00,  0.10, -1.55,
   0.00,  0.30, -1.10,
  -0.18,  0.24, -0.95,
   0.18,  0.24, -0.95,
  -0.16,  0.02, -1.05,
   0.16,  0.02, -1.05,
   0.00,  0.00, -1.30,
   0.00, -0.12, -1.40,
  -0.14, -0.16, -1.00,
   0.14, -0.16, -1.00,
  -0.28, -0.10, -0.50,
   0.28, -0.10, -0.50,
   0.00,  0.58, -0.70,
  -0.30,  0.52, -0.55,
   0.30,  0.52, -0.55,
  -0.48,  0.18, -0.30,
   0.48,  0.18, -0.30,
  -0.30, -0.22, -0.20,
   0.30, -0.22, -0.20,
   0.00,  0.82,  0.10,
  -0.44,  0.62,  0.20,
   0.44,  0.62,  0.20,
   0.00,  0.55,  0.70,
  -0.36,  0.28,  0.75,
   0.36,  0.28,  0.75,
   0.00, -0.05,  0.30,
  -0.38, -0.02,  0.55,
   0.38, -0.02,  0.55,
   0.00, -0.10,  0.90,
  -0.38,  0.65, -0.05,
  -0.18,  0.68,  0.00,
  -0.30,  0.95,  0.00,
  -0.24,  1.22, -0.08,
   0.38,  0.65, -0.05,
   0.18,  0.68,  0.00,
   0.30,  0.95,  0.00,
   0.24,  1.22, -0.08,
]);

// prettier-ignore
const INDICES = [
  0, 1, 2,
  0, 3, 1,
  1, 3, 14,
  1, 14, 12,
  1, 12, 13,
  1, 13, 2,
  2, 13, 15,
  3, 16, 14,

  0, 6, 4,
  0, 5, 6,
  4, 6, 8,
  5, 9, 6,
  6, 9, 8,
  0, 4, 7,
  0, 7, 5,
  7, 8, 10,
  7, 11, 9,
  4, 7, 6,
  5, 6, 7,

  2, 4, 15,
  4, 10, 15,
  3, 16, 5,
  5, 16, 11,
  0, 2, 4,
  0, 3, 5,

  10, 17, 15,
  11, 16, 18,
  10, 11, 17,
  11, 18, 17,

  12, 14, 19,
  12, 19, 13,
  13, 19, 20,
  14, 21, 19,
  13, 20, 15,
  14, 16, 21,

  15, 20, 26,
  15, 26, 25,
  15, 25, 17,
  16, 27, 21,
  16, 18, 27,
  17, 25, 18,
  18, 25, 27,

  19, 21, 22,
  19, 22, 20,
  20, 22, 23,
  21, 24, 22,

  20, 26, 23,
  21, 24, 27,
  23, 26, 28,
  24, 28, 27,
  22, 24, 23,
  23, 28, 26,
  24, 27, 28,

  29, 30, 31,
  30, 32, 31,
  29, 31, 32,
  20, 29, 30,
  19, 30, 29,

  33, 35, 34,
  34, 35, 36,
  33, 36, 35,
  21, 34, 33,
  19, 33, 34,
];

const PER_TRI = 70;
const SHIMMER_AMP = 0.004;
const SHIMMER_FREQ = 1.1;

function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, root.clientWidth / root.clientHeight, 0.1, 100);
  camera.position.set(0, 0.18, 4.2);
  camera.lookAt(0, 0.22, 0);

  const { basePts, seeds, totalPts } = sampleTriangleList(VERTS, INDICES, PER_TRI);
  const livePts = basePts.slice();

  const ptGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(livePts, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  ptGeo.setAttribute("position", posAttr);

  const ptMat = new THREE.PointsMaterial({
    color: new THREE.Color(readTintColor(tint)).lerp(new THREE.Color(0xffffff), 0.15), // tinted light on black, not flat paint
    size: 0.022,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
  });

  const points = new THREE.Points(ptGeo, ptMat);
  const headGroup = new THREE.Group();
  headGroup.rotation.x = 0.08;
  headGroup.add(points);
  scene.add(headGroup);

  const onFrame = (timeMs: number) => {
    const t = timeMs * 0.001;
    for (let i = 0; i < totalPts; i++) {
      const bx = basePts[i * 3], by = basePts[i * 3 + 1], bz = basePts[i * 3 + 2];
      const dx = bx, dy = by - 0.2, dz = bz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const flicker = Math.sin(t * SHIMMER_FREQ + seeds[i]) * SHIMMER_AMP;
      livePts[i * 3] = bx + (dx / len) * flicker;
      livePts[i * 3 + 1] = by + (dy / len) * flicker;
      livePts[i * 3 + 2] = bz + (dz / len) * flicker;
    }
    posAttr.needsUpdate = true;
  };

  return { scene, camera, group: headGroup, disposables: [ptGeo, ptMat], onFrame };
}

export function WireframeDogHead({ tint }: { tint?: WorkTint }) {
  const buildWithTint = useMemo(
    () => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint),
    [tint],
  );
  const containerRef = useWireframeScene(buildWithTint);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
