"use client";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix, mkMatrixFull } from "./lib/primitiveSampler";
import { readCssColor } from "./lib/pointColor";

/**
 * Point-cloud 3-D WiFi icon for the gfbr case study — ported from intrinsiclabs-co-v3's
 * WireframeWifi. Three concentric TorusGeometry arc segments (small → large) + a
 * SphereGeometry dot, surface-sampled and merged into a single THREE.Points draw call.
 *
 * The arc angle is 120° and each arc is Z-rotated so its midpoint sits at the top (+Y),
 * giving the classic WiFi icon silhouette with open ends clearly above the centre dot.
 */

function build(THREE: ThreeModule, root: HTMLDivElement): BuiltScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, root.clientWidth / root.clientHeight, 0.1, 100);
  camera.position.set(0, 0.05, 4.4);
  camera.lookAt(0, 0.15, 0);

  const ptMat = new THREE.PointsMaterial({
    color: new THREE.Color(readCssColor("--color-ink-2")),
    size: 0.022,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
  });

  // TorusGeometry starts its sweep at +X (0°) and goes CCW. To centre the arc's midpoint at
  // +Y (top) we Z-rotate by rz = -(ARC_ANGLE/2 - π/2), which shifts the 60° midpoint to 90°.
  const ARC_ANGLE = 120 * (Math.PI / 180);
  const ARC_RZ = -(ARC_ANGLE / 2 - Math.PI / 2);
  const TUBE_R = 0.07;

  const pts: number[] = [];

  // DOT — radius ~= TUBE_R * 1.3 so it reads as a solid filled circle matching the arc weight
  {
    const geo = new THREE.SphereGeometry(0.09, 10, 8);
    sampleInto(geo, mkMatrix(THREE, 0, 0, 0), 8, pts);
    geo.dispose();
  }

  // ARCS (inner → outer) — radii spaced so the gap between arc edges stays visible
  const arcDefs = [
    { r: 0.38, tSeg: 18 },
    { r: 0.68, tSeg: 28 },
    { r: 0.98, tSeg: 38 },
  ];
  for (const a of arcDefs) {
    const geo = new THREE.TorusGeometry(a.r, TUBE_R, 8, a.tSeg, ARC_ANGLE);
    sampleInto(geo, mkMatrixFull(THREE, 0, 0, 0, 0, 0, ARC_RZ), 4, pts);
    geo.dispose();
  }

  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const pointsMesh = new THREE.Points(ptGeo, ptMat);

  const wifiGroup = new THREE.Group();
  wifiGroup.add(pointsMesh);
  // Sink the group so the dot sits low and the outer arc peak clears the top comfortably
  wifiGroup.position.y = -0.28;
  scene.add(wifiGroup);

  return { scene, camera, group: wifiGroup, disposables: [ptGeo, ptMat] };
}

export function WireframeWifi() {
  const containerRef = useWireframeScene(build);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
