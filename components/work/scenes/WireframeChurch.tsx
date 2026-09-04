"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix } from "./lib/primitiveSampler";
import { readTintColor } from "./lib/pointColor";
import type { WorkTint } from "@/lib/content/schema";

/**
 * Point-cloud small chapel for the church-ops case study — ported from
 * intrinsiclabs-co-v3's WireframeChurch. All geometry is built from Three.js primitives + a
 * custom gable-roof prism, surface-sampled and merged into a single THREE.Points draw call.
 */

function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, root.clientWidth / root.clientHeight, 0.1, 100);
  camera.position.set(0, 0.8, 10.8);
  camera.lookAt(0, 1.0, 0);

  const ptMat = new THREE.PointsMaterial({
    color: new THREE.Color(readTintColor(tint)).lerp(new THREE.Color(0xffffff), 0.15), // tinted light on black, not flat paint
    size: 0.024,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
  });

  const pts: number[] = [];
  const M = (x: number, y: number, z: number, ry = 0) => mkMatrix(THREE, x, y, z, ry);

  // FOUNDATION
  {
    const geo = new THREE.BoxGeometry(2.0, 0.07, 1.75);
    sampleInto(geo, M(0, 0.035, 0), 16, pts);
    geo.dispose();
  }

  // NAVE body
  {
    const geo = new THREE.BoxGeometry(1.85, 1.25, 1.65);
    sampleInto(geo, M(0, 0.625 + 0.07, 0), 100, pts);
    geo.dispose();
  }

  // NAVE GABLE ROOF — custom prism: 4 eave corners + 2 ridge points
  {
    const ew = 1.0, ed = 0.88, ry0 = 1.32, ry1 = 2.1;
    // prettier-ignore
    const v = new Float32Array([
      -ew, ry0, -ed,
       ew, ry0, -ed,
       ew, ry0,  ed,
      -ew, ry0,  ed,
        0, ry1, -ed,
        0, ry1,  ed,
    ]);
    // prettier-ignore
    const idx = [
      0, 1, 4,
      3, 5, 2,
      0, 3, 5, 0, 5, 4,
      1, 4, 5, 1, 5, 2,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
    geo.setIndex(idx);
    sampleInto(geo, new THREE.Matrix4(), 110, pts);
    geo.dispose();
  }

  // BELL TOWER (full height, front-centre)
  {
    const geo = new THREE.BoxGeometry(0.62, 2.7, 0.62);
    sampleInto(geo, M(0, 1.35, -0.51), 80, pts);
    geo.dispose();
  }

  // BELFRY LEDGE
  {
    const geo = new THREE.BoxGeometry(0.72, 0.07, 0.72);
    sampleInto(geo, M(0, 2.7, -0.51), 28, pts);
    geo.dispose();
  }

  // STEEPLE / SPIRE — 4-sided pyramid, openEnded so only the sloped faces sample
  {
    const geo = new THREE.CylinderGeometry(0, 0.38, 1.85, 4, 3, true);
    sampleInto(geo, M(0, 3.625, -0.51), 90, pts);
    geo.dispose();
  }

  // CROSS
  {
    const tipY = 2.7 + 1.85;
    const vgeo = new THREE.BoxGeometry(0.065, 0.5, 0.065);
    sampleInto(vgeo, M(0, tipY + 0.25, -0.51), 28, pts);
    vgeo.dispose();
    const hgeo = new THREE.BoxGeometry(0.3, 0.065, 0.065);
    sampleInto(hgeo, M(0, tipY + 0.36, -0.51), 20, pts);
    hgeo.dispose();
  }

  // SIDE WINDOWS (2 per side) — main pane
  {
    const wpane = new THREE.PlaneGeometry(0.34, 0.5);
    const wPositions = [
      { x: -0.925, y: 0.78, z: -0.28 },
      { x: -0.925, y: 0.78, z: 0.3 },
      { x: 0.925, y: 0.78, z: -0.28 },
      { x: 0.925, y: 0.78, z: 0.3 },
    ];
    for (const p of wPositions) sampleInto(wpane, mkMatrix(THREE, p.x, p.y, p.z, Math.PI / 2), 36, pts);
    wpane.dispose();
  }
  // Pointed arch peak above each window
  {
    // prettier-ignore
    const archV = new Float32Array([-0.17, 0.0, 0, 0.17, 0.0, 0, 0.0, 0.16, 0]);
    const archGeo = new THREE.BufferGeometry();
    archGeo.setAttribute("position", new THREE.BufferAttribute(archV, 3));
    archGeo.setIndex([0, 1, 2]);
    const archPositions = [
      { x: -0.925, y: 1.035, z: -0.28 },
      { x: -0.925, y: 1.035, z: 0.3 },
      { x: 0.925, y: 1.035, z: -0.28 },
      { x: 0.925, y: 1.035, z: 0.3 },
    ];
    for (const p of archPositions) sampleInto(archGeo, mkMatrix(THREE, p.x, p.y, p.z, Math.PI / 2), 22, pts);
    archGeo.dispose();
  }

  // FRONT DOOR
  {
    const dgeo = new THREE.PlaneGeometry(0.36, 0.68);
    sampleInto(dgeo, M(0, 0.41, -0.82), 42, pts);
    dgeo.dispose();
  }
  // Gothic arch peak above door
  {
    // prettier-ignore
    const archV = new Float32Array([-0.18, 0.0, 0, 0.18, 0.0, 0, 0.0, 0.22, 0]);
    const archGeo = new THREE.BufferGeometry();
    archGeo.setAttribute("position", new THREE.BufferAttribute(archV, 3));
    archGeo.setIndex([0, 1, 2]);
    sampleInto(archGeo, M(0, 0.775, -0.82), 28, pts);
    archGeo.dispose();
  }

  // FRONT STEP
  {
    const sgeo = new THREE.BoxGeometry(0.56, 0.08, 0.22);
    sampleInto(sgeo, M(0, 0.11, -0.93), 15, pts);
    sgeo.dispose();
  }

  // TOWER BELFRY WINDOW HINTS
  {
    const bwGeo = new THREE.PlaneGeometry(0.22, 0.34);
    const bwDefs = [
      { x: 0, y: 2.22, z: -0.82, ry: 0 },
      { x: 0, y: 2.22, z: -0.2, ry: Math.PI },
      { x: -0.31, y: 2.22, z: -0.51, ry: Math.PI / 2 },
      { x: 0.31, y: 2.22, z: -0.51, ry: -Math.PI / 2 },
    ];
    for (const b of bwDefs) sampleInto(bwGeo, mkMatrix(THREE, b.x, b.y, b.z, b.ry), 22, pts);
    bwGeo.dispose();
  }

  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const pointsMesh = new THREE.Points(ptGeo, ptMat);

  const churchGroup = new THREE.Group();
  churchGroup.add(pointsMesh);
  // Sink the group so the steeple soars above the lookAt point
  churchGroup.position.y = -1.4;
  scene.add(churchGroup);

  return { scene, camera, group: churchGroup, disposables: [ptGeo, ptMat] };
}

export function WireframeChurch({ tint, zoom }: { tint?: WorkTint; zoom?: number }) {
  const buildWithTint = useMemo(
    () => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint),
    [tint],
  );
  const containerRef = useWireframeScene(buildWithTint, zoom);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
