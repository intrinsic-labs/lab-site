"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix } from "./lib/primitiveSampler";
import { cardCamera, finishPoints } from "./lib/sceneShell";
import type { WorkTint } from "@/lib/content/schema";

/**
 * A loom tree for loom-swift: a root at the top branching downward three levels, with one
 * path — the "remembered" branch the app follows by default — drawn heavier than the rest.
 * Nodes are spheres; edges are thin cylinders aimed from parent to child with a quaternion,
 * since the Euler helpers in primitiveSampler only cover axis-aligned placement.
 */
interface TreeNode { x: number; y: number; z: number; main: boolean }

function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const pts: number[] = [];
  const nodes: TreeNode[] = [];
  const edges: [TreeNode, TreeNode][] = [];
  const grow = (parent: TreeNode, depth: number, spread: number) => {
    if (depth === 0) return;
    const kids = depth === 2 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const t = i / (kids - 1) - 0.5;
      const main = parent.main && i === (depth === 3 ? 1 : 0);
      const n: TreeNode = { x: parent.x + t * spread, y: parent.y - 0.72, z: parent.z + (Math.random() - 0.5) * 0.35, main };
      nodes.push(n);
      edges.push([parent, n]);
      grow(n, depth - 1, spread * 0.55);
    }
  };
  const top: TreeNode = { x: 0, y: 1.1, z: 0, main: true };
  nodes.push(top);
  grow(top, 3, 2.2);

  const up = new THREE.Vector3(0, 1, 0);
  for (const [a, b] of edges) {
    const dir = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const len = dir.length();
    const heavy = a.main && b.main;
    const r = heavy ? 0.03 : 0.014;
    const geo = new THREE.CylinderGeometry(r, r, len - 0.16, 6, 1, true);
    const obj = new THREE.Object3D();
    obj.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    obj.quaternion.setFromUnitVectors(up, dir.normalize());
    obj.updateMatrix();
    sampleInto(geo, obj.matrix, heavy ? 5 : 3, pts);
    geo.dispose();
  }
  for (const n of nodes) {
    const geo = new THREE.SphereGeometry(n.main ? 0.1 : 0.065, 10, 8);
    sampleInto(geo, mkMatrix(THREE, n.x, n.y, n.z), n.main ? 7 : 4, pts);
    geo.dispose();
  }
  const camera = cardCamera(THREE, root, 5.4, 0);
  return finishPoints(THREE, pts, tint, camera, { groupY: -0.05 });
}

export function WireframeTree({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(() => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint), [tint]);
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
