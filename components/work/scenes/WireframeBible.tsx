"use client";

import { useMemo } from "react";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix, mkMatrixFull } from "./lib/primitiveSampler";
import { readTintColor } from "./lib/pointColor";
import type { WorkTint } from "@/lib/content/schema";

/**
 * Point-cloud Bible for the sophron-studies case study — ported from intrinsiclabs-co-v3's
 * WireframeBible. All geometry is built from Three.js primitives + a custom spine arc,
 * surface-sampled and merged into a single THREE.Points draw call.
 */

function build(THREE: ThreeModule, root: HTMLDivElement, tint?: WorkTint): BuiltScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, root.clientWidth / root.clientHeight, 0.1, 100);
  camera.position.set(0, 0.6, 8.5);
  camera.lookAt(0, 0.2, 0);

  const ptMat = new THREE.PointsMaterial({
    color: new THREE.Color(readTintColor(tint)).lerp(new THREE.Color(0xffffff), 0.15), // tinted light on black, not flat paint
    size: 0.024,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
  });

  const pts: number[] = [];
  const M = (x: number, y: number, z: number, ry = 0) => mkMatrix(THREE, x, y, z, ry);
  const MF = (x: number, y: number, z: number, rx: number, ry: number, rz: number) =>
    mkMatrixFull(THREE, x, y, z, rx, ry, rz);

  // BIBLE DIMENSIONS
  const coverW = 1.8, coverH = 2.6, bookT = 0.75, coverT = 0.035, pageInset = 0.05;
  const spineR = bookT / 2;

  // FRONT COVER
  {
    const geo = new THREE.BoxGeometry(coverW, coverH, coverT);
    sampleInto(geo, M(0, 0, bookT / 2 - coverT / 2), 95, pts);
    geo.dispose();
  }
  // BACK COVER
  {
    const geo = new THREE.BoxGeometry(coverW, coverH, coverT);
    sampleInto(geo, M(0, 0, -bookT / 2 + coverT / 2), 95, pts);
    geo.dispose();
  }
  // SPINE (half-cylinder, bulges toward -x)
  {
    const geo = new THREE.CylinderGeometry(spineR, spineR, coverH, 16, 1, true, Math.PI, Math.PI);
    sampleInto(geo, M(-coverW / 2, 0, 0), 75, pts);
    geo.dispose();
  }
  // PAGE BLOCK — fore-edge (right side, facing +x)
  {
    const pageH = coverH - pageInset * 2;
    const pageT = bookT - coverT * 2 - 0.02;
    const geo = new THREE.PlaneGeometry(pageT, pageH);
    sampleInto(geo, MF(coverW / 2 - pageInset, 0, 0, 0, Math.PI / 2, 0), 75, pts);
    geo.dispose();
  }
  // PAGE BLOCK — top edge
  {
    const pageW = coverW - pageInset * 2 - spineR * 0.3;
    const pageT = bookT - coverT * 2 - 0.02;
    const geo = new THREE.PlaneGeometry(pageW, pageT);
    sampleInto(geo, MF(spineR * 0.15, coverH / 2 - pageInset, 0, Math.PI / 2, 0, 0), 55, pts);
    geo.dispose();
  }
  // PAGE BLOCK — bottom edge
  {
    const pageW = coverW - pageInset * 2 - spineR * 0.3;
    const pageT = bookT - coverT * 2 - 0.02;
    const geo = new THREE.PlaneGeometry(pageW, pageT);
    sampleInto(geo, MF(spineR * 0.15, -coverH / 2 + pageInset, 0, -Math.PI / 2, 0, 0), 55, pts);
    geo.dispose();
  }
  // PAGE LINES on fore-edge (suggest individual pages)
  {
    const pageH = coverH - pageInset * 2;
    const lineCount = 22;
    const pageT = bookT - coverT * 2 - 0.02;
    for (let i = 0; i < lineCount; i++) {
      const frac = (i + 1) / (lineCount + 1);
      const z = -pageT / 2 + frac * pageT;
      const geo = new THREE.PlaneGeometry(0.003, pageH * 0.88);
      sampleInto(geo, MF(coverW / 2 - pageInset + 0.003, 0, z, 0, Math.PI / 2, 0), 4, pts);
      geo.dispose();
    }
  }
  // CROSS on front cover
  {
    const crossY = 0.3, crossZ = bookT / 2 + 0.004;
    const vgeo = new THREE.PlaneGeometry(0.065, 0.6);
    sampleInto(vgeo, M(0, crossY, crossZ), 38, pts);
    vgeo.dispose();
    const hgeo = new THREE.PlaneGeometry(0.35, 0.065);
    sampleInto(hgeo, M(0, crossY + 0.1, crossZ), 28, pts);
    hgeo.dispose();
  }
  // TITLE LINES on front cover (below cross)
  {
    const tz = bookT / 2 + 0.004;
    const geo1 = new THREE.PlaneGeometry(0.52, 0.022);
    sampleInto(geo1, M(0, -0.28, tz), 12, pts);
    geo1.dispose();
    const geo2 = new THREE.PlaneGeometry(0.36, 0.022);
    sampleInto(geo2, M(0, -0.36, tz), 9, pts);
    geo2.dispose();
  }
  // RAISED BORDER on front cover
  {
    const bz = bookT / 2 + 0.003, bIn = 0.14, lt = 0.014;
    const bW = coverW - bIn * 2, bH = coverH - bIn * 2;
    const tg = new THREE.PlaneGeometry(bW, lt);
    sampleInto(tg, M(0, bH / 2, bz), 14, pts);
    tg.dispose();
    const bg = new THREE.PlaneGeometry(bW, lt);
    sampleInto(bg, M(0, -bH / 2, bz), 14, pts);
    bg.dispose();
    const lg = new THREE.PlaneGeometry(lt, bH);
    sampleInto(lg, M(-bW / 2, 0, bz), 14, pts);
    lg.dispose();
    const rg = new THREE.PlaneGeometry(lt, bH);
    sampleInto(rg, M(bW / 2, 0, bz), 14, pts);
    rg.dispose();
  }
  // SPINE DETAIL (title lines)
  {
    const sx = -coverW / 2 - spineR + 0.01;
    const g1 = new THREE.PlaneGeometry(0.4, 0.022);
    sampleInto(g1, MF(sx, 0.15, 0, 0, Math.PI / 2, 0), 10, pts);
    g1.dispose();
    const g2 = new THREE.PlaneGeometry(0.26, 0.022);
    sampleInto(g2, MF(sx, -0.05, 0, 0, Math.PI / 2, 0), 7, pts);
    g2.dispose();
  }
  // RIBBON BOOKMARK
  {
    const ribbonW = 0.035, ribbonH = 0.5, ribbonX = 0.12;
    const ribbonBaseZ = bookT / 2 - 0.06;
    const ribbonY = -coverH / 2 - ribbonH / 2 + 0.06;
    const geo = new THREE.PlaneGeometry(ribbonW, ribbonH);
    sampleInto(geo, M(ribbonX, ribbonY, ribbonBaseZ), 18, pts);
    geo.dispose();
    // prettier-ignore
    const vNotch = new Float32Array([-0.018, 0.0, 0, 0.018, 0.0, 0, 0.0, -0.055, 0]);
    const vGeo = new THREE.BufferGeometry();
    vGeo.setAttribute("position", new THREE.BufferAttribute(vNotch, 3));
    vGeo.setIndex([0, 1, 2]);
    sampleInto(vGeo, M(ribbonX, ribbonY - ribbonH / 2, ribbonBaseZ), 7, pts);
    vGeo.dispose();
  }
  // BACK COVER BORDER (subtle, same inset as front)
  {
    const bz = -bookT / 2 - 0.003, bIn = 0.14, lt = 0.014;
    const bW = coverW - bIn * 2, bH = coverH - bIn * 2;
    const tg = new THREE.PlaneGeometry(bW, lt);
    sampleInto(tg, M(0, bH / 2, bz), 10, pts);
    tg.dispose();
    const bg = new THREE.PlaneGeometry(bW, lt);
    sampleInto(bg, M(0, -bH / 2, bz), 10, pts);
    bg.dispose();
    const lg = new THREE.PlaneGeometry(lt, bH);
    sampleInto(lg, M(-bW / 2, 0, bz), 10, pts);
    lg.dispose();
    const rg = new THREE.PlaneGeometry(lt, bH);
    sampleInto(rg, M(bW / 2, 0, bz), 10, pts);
    rg.dispose();
  }

  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const pointsMesh = new THREE.Points(ptGeo, ptMat);

  const bibleGroup = new THREE.Group();
  bibleGroup.add(pointsMesh);
  // Slight forward tilt so the cover face is more visible
  bibleGroup.rotation.x = 0.12;
  scene.add(bibleGroup);

  return { scene, camera, group: bibleGroup, disposables: [ptGeo, ptMat] };
}

export function WireframeBible({ tint }: { tint?: WorkTint }) {
  const buildWithTint = useMemo(
    () => (THREE: ThreeModule, root: HTMLDivElement) => build(THREE, root, tint),
    [tint],
  );
  const containerRef = useWireframeScene(buildWithTint);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
