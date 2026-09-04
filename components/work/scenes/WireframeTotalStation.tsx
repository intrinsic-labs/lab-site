"use client";

import type { BuiltScene, ThreeModule } from "./lib/types";
import { useWireframeScene } from "./lib/useWireframeScene";
import { sampleInto, mkMatrix, mkMatrixFull } from "./lib/primitiveSampler";
import { readCssColor } from "./lib/pointColor";

/**
 * Point-cloud Trimble total station for the blackthorn-geomatics case study — ported from
 * intrinsiclabs-co-v3's WireframeTotalStation. All geometry is built from Three.js
 * primitives, surface-sampled and merged into a single THREE.Points draw call.
 */

function build(THREE: ThreeModule, root: HTMLDivElement): BuiltScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, root.clientWidth / root.clientHeight, 0.1, 100);
  camera.position.set(0, 1.0, 8.2);
  camera.lookAt(0, 1.0, 0);

  const ptMat = new THREE.PointsMaterial({
    color: new THREE.Color(readCssColor("--color-ink-2")),
    size: 0.024,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
  });

  const pts: number[] = [];
  const M = (x: number, y: number, z: number, ry = 0) => mkMatrix(THREE, x, y, z, ry);
  const MF = (x: number, y: number, z: number, rx: number, ry: number, rz: number) =>
    mkMatrixFull(THREE, x, y, z, rx, ry, rz);

  // Y layout (approx): 0–0.05 tribrach · 0.05–0.17 leveling base · 0.17–0.37 circle housing
  // 0.37–2.40 main body (2.03 tall) · 2.40–2.78 handle · 2.78–3.60 antenna
  const bodyW = 1.55, bodyH = 2.03, bodyD = 0.88, bodyBot = 0.37;
  const bodyCY = bodyBot + bodyH / 2;

  // TRIBRACH BASE PLATE
  {
    const geo = new THREE.CylinderGeometry(0.95, 0.95, 0.05, 24);
    sampleInto(geo, M(0, 0.025, 0), 18, pts);
    geo.dispose();
  }
  // THREE LEVELING SCREWS
  {
    const geo = new THREE.CylinderGeometry(0.07, 0.07, 0.055, 8);
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 6;
      const sx = Math.cos(angle) * 0.74, sz = Math.sin(angle) * 0.74;
      sampleInto(geo, M(sx, 0.078, sz), 6, pts);
    }
    geo.dispose();
  }
  // LOWER LEVELING BASE
  {
    const geo = new THREE.CylinderGeometry(0.72, 0.78, 0.12, 20);
    sampleInto(geo, M(0, 0.11, 0), 22, pts);
    geo.dispose();
  }
  // HORIZONTAL CIRCLE HOUSING
  {
    const geo = new THREE.CylinderGeometry(0.62, 0.62, 0.2, 20);
    sampleInto(geo, M(0, 0.27, 0), 25, pts);
    geo.dispose();
  }
  // HORIZONTAL CLAMP KNOB (front of base)
  {
    const geo = new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8);
    sampleInto(geo, MF(0.45, 0.27, -0.48, Math.PI / 2, 0, 0), 6, pts);
    geo.dispose();
  }
  // MAIN BODY
  {
    const geo = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
    sampleInto(geo, M(0, bodyCY, 0), 110, pts);
    geo.dispose();
  }
  // LEFT / RIGHT STANDARD (side frame pillars)
  {
    const stdW = 0.2, stdH = bodyH + 0.06, stdD = bodyD + 0.08;
    const lgeo = new THREE.BoxGeometry(stdW, stdH, stdD);
    sampleInto(lgeo, M(-bodyW / 2 - stdW / 2 + 0.04, bodyCY, 0), 28, pts);
    lgeo.dispose();
    const rgeo = new THREE.BoxGeometry(stdW, stdH, stdD);
    sampleInto(rgeo, M(bodyW / 2 + stdW / 2 - 0.04, bodyCY, 0), 28, pts);
    rgeo.dispose();
  }
  // HANDLE — U-shaped: two posts + horizontal bar + rounded grip
  {
    const handleTopY = bodyBot + bodyH;
    const postH = 0.36, postW = 0.13, postD = 0.14;
    const postCY = handleTopY + postH / 2;

    const lgeo = new THREE.BoxGeometry(postW, postH, postD);
    sampleInto(lgeo, M(-0.52, postCY, 0), 14, pts);
    lgeo.dispose();
    const rgeo = new THREE.BoxGeometry(postW, postH, postD);
    sampleInto(rgeo, M(0.52, postCY, 0), 14, pts);
    rgeo.dispose();

    const barW = 1.04 + postW, barH = 0.11, barD = 0.15;
    const bgeo = new THREE.BoxGeometry(barW, barH, barD);
    sampleInto(bgeo, M(0, handleTopY + postH + barH / 2, 0), 22, pts);
    bgeo.dispose();

    const gripGeo = new THREE.CylinderGeometry(0.065, 0.065, barW * 0.7, 10);
    sampleInto(gripGeo, MF(0, handleTopY + postH + barH + 0.02, 0, 0, 0, Math.PI / 2), 14, pts);
    gripGeo.dispose();
  }
  // TELESCOPE FACE PLATE (lighter center panel + border)
  {
    const panelW = 0.72, panelH = 1.3, panelZ = -bodyD / 2 - 0.005, panelCY = bodyCY + 0.22;
    const geo = new THREE.PlaneGeometry(panelW, panelH);
    sampleInto(geo, M(0, panelCY, panelZ), 18, pts);
    geo.dispose();
    const lt = 0.012;
    const tg = new THREE.PlaneGeometry(panelW, lt);
    sampleInto(tg, M(0, panelCY + panelH / 2, panelZ), 5, pts);
    tg.dispose();
    const bg = new THREE.PlaneGeometry(panelW, lt);
    sampleInto(bg, M(0, panelCY - panelH / 2, panelZ), 5, pts);
    bg.dispose();
    const lg = new THREE.PlaneGeometry(lt, panelH);
    sampleInto(lg, M(-panelW / 2, panelCY, panelZ), 5, pts);
    lg.dispose();
    const rg = new THREE.PlaneGeometry(lt, panelH);
    sampleInto(rg, M(panelW / 2, panelCY, panelZ), 5, pts);
    rg.dispose();
  }
  // LENS HOUSING PROTRUSION
  {
    const lensY = bodyCY + 0.34, lensFrontZ = -bodyD / 2;
    const geo = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 20);
    sampleInto(geo, MF(0, lensY, lensFrontZ - 0.07, Math.PI / 2, 0, 0), 30, pts);
    geo.dispose();
    const ring1 = new THREE.TorusGeometry(0.32, 0.035, 8, 22);
    sampleInto(ring1, M(0, lensY, lensFrontZ - 0.15), 16, pts);
    ring1.dispose();
    const face = new THREE.CircleGeometry(0.28, 20);
    sampleInto(face, M(0, lensY, lensFrontZ - 0.15), 22, pts);
    face.dispose();
    const ring2 = new THREE.TorusGeometry(0.18, 0.022, 6, 16);
    sampleInto(ring2, M(0, lensY, lensFrontZ - 0.13), 10, pts);
    ring2.dispose();
    const ring3 = new THREE.TorusGeometry(0.09, 0.015, 5, 12);
    sampleInto(ring3, M(0, lensY, lensFrontZ - 0.11), 6, pts);
    ring3.dispose();
  }
  // TRACKING CAMERA (small, below main lens)
  {
    const camY = bodyCY + 0.0, camZ = -bodyD / 2 - 0.01;
    const geo = new THREE.BoxGeometry(0.16, 0.22, 0.06);
    sampleInto(geo, M(0, camY, camZ), 14, pts);
    geo.dispose();
    const lens = new THREE.CircleGeometry(0.055, 10);
    sampleInto(lens, M(0, camY, camZ - 0.035), 7, pts);
    lens.dispose();
    const ring = new THREE.TorusGeometry(0.055, 0.012, 5, 10);
    sampleInto(ring, M(0, camY, camZ - 0.035), 5, pts);
    ring.dispose();
  }
  // DISPLAY SCREEN + bezel
  {
    const dispY = bodyCY - 0.55, dispZ = -bodyD / 2 - 0.005;
    const geo = new THREE.PlaneGeometry(0.38, 0.22);
    sampleInto(geo, M(0.08, dispY, dispZ), 18, pts);
    geo.dispose();
    const bw = 0.42, bh = 0.26, lt = 0.012;
    const tg = new THREE.PlaneGeometry(bw, lt);
    sampleInto(tg, M(0.08, dispY + bh / 2, dispZ), 5, pts);
    tg.dispose();
    const bg = new THREE.PlaneGeometry(bw, lt);
    sampleInto(bg, M(0.08, dispY - bh / 2, dispZ), 5, pts);
    bg.dispose();
    const lgb = new THREE.PlaneGeometry(lt, bh);
    sampleInto(lgb, M(0.08 - bw / 2, dispY, dispZ), 5, pts);
    lgb.dispose();
    const rgb = new THREE.PlaneGeometry(lt, bh);
    sampleInto(rgb, M(0.08 + bw / 2, dispY, dispZ), 5, pts);
    rgb.dispose();
  }
  // TANGENT SCREW (small knob, front-left of display)
  {
    const screwY = bodyCY - 0.55, screwZ = -bodyD / 2 - 0.02;
    const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8);
    sampleInto(geo, MF(-0.22, screwY, screwZ, Math.PI / 2, 0, 0), 6, pts);
    geo.dispose();
  }
  // CONTROL BUTTONS (3, below display)
  {
    const geo = new THREE.BoxGeometry(0.08, 0.04, 0.012);
    const btnY = bodyCY - 0.78, btnZ = -bodyD / 2 - 0.005;
    sampleInto(geo, M(-0.02, btnY, btnZ), 5, pts);
    sampleInto(geo, M(0.1, btnY, btnZ), 5, pts);
    sampleInto(geo, M(0.22, btnY, btnZ), 5, pts);
    geo.dispose();
  }
  // THREE FLAT DISC KNOBS (left side — focus / horizontal / vertical tangent)
  {
    const knobX = -bodyW / 2 - 0.16, knobR = 0.085, knobThick = 0.035;
    const defs = [
      { y: bodyCY + 0.5, z: -0.08 },
      { y: bodyCY + 0.1, z: -0.08 },
      { y: bodyCY - 0.3, z: -0.08 },
    ];
    for (const kp of defs) {
      const geo = new THREE.CylinderGeometry(knobR, knobR, knobThick, 14);
      sampleInto(geo, MF(knobX, kp.y, kp.z, 0, 0, Math.PI / 2), 8, pts);
      geo.dispose();
      const face = new THREE.CircleGeometry(knobR, 14);
      sampleInto(face, MF(knobX - knobThick / 2 - 0.002, kp.y, kp.z, 0, Math.PI / 2, 0), 5, pts);
      face.dispose();
      const ring = new THREE.TorusGeometry(knobR, 0.008, 4, 14);
      sampleInto(ring, MF(knobX - knobThick / 2 - 0.002, kp.y, kp.z, 0, Math.PI / 2, 0), 4, pts);
      ring.dispose();
    }
  }
  // TWO CIRCULAR SCREWS (front face, flanking lens)
  {
    const screwR = 0.04, screwZ = -bodyD / 2 - 0.01, screwY = bodyCY + 0.7;
    const face = new THREE.CircleGeometry(screwR, 8);
    sampleInto(face, M(-0.54, screwY, screwZ), 4, pts);
    sampleInto(face, M(0.54, screwY, screwZ), 4, pts);
    face.dispose();
    const ring = new THREE.TorusGeometry(screwR, 0.008, 4, 8);
    sampleInto(ring, M(-0.54, screwY, screwZ), 3, pts);
    sampleInto(ring, M(0.54, screwY, screwZ), 3, pts);
    ring.dispose();
  }
  // TRIMBLE LOGO AREA
  {
    const geo = new THREE.PlaneGeometry(0.28, 0.05);
    sampleInto(geo, M(0, bodyCY + 0.82, -bodyD / 2 - 0.005), 7, pts);
    geo.dispose();
  }
  // BATTERY COMPARTMENT (right side)
  {
    const geo = new THREE.BoxGeometry(0.05, 0.72, 0.48);
    sampleInto(geo, M(bodyW / 2 + 0.12, bodyCY - 0.3, 0.05), 10, pts);
    geo.dispose();
    const line = new THREE.PlaneGeometry(0.48, 0.015);
    sampleInto(line, MF(bodyW / 2 + 0.15, bodyCY - 0.3, 0.05, 0, Math.PI / 2, 0), 4, pts);
    line.dispose();
  }
  // ANTENNA BASE + mast + tip sphere
  {
    const antX = 0.52, antBaseY = bodyBot + bodyH + 0.36, antZ = -0.22;
    const base = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8);
    sampleInto(base, M(antX, antBaseY, antZ), 6, pts);
    base.dispose();
    const mast = new THREE.CylinderGeometry(0.014, 0.01, 0.82, 6);
    sampleInto(mast, M(antX, antBaseY + 0.44, antZ), 14, pts);
    mast.dispose();
    const tip = new THREE.SphereGeometry(0.024, 6, 4);
    sampleInto(tip, M(antX, antBaseY + 0.86, antZ), 5, pts);
    tip.dispose();
  }
  // FRONT FACE HORIZONTAL ACCENT LINES
  {
    const fz = -bodyD / 2 - 0.003;
    const geo = new THREE.PlaneGeometry(bodyW, 0.008);
    const trimYs = [bodyBot + 0.08, bodyCY - 0.35, bodyCY + 0.15, bodyBot + bodyH - 0.06];
    for (const ty of trimYs) sampleInto(geo, M(0, ty, fz), 4, pts);
    geo.dispose();
  }
  // FRONT FACE VERTICAL EDGE ACCENTS
  {
    const fz = -bodyD / 2 - 0.003;
    const geo = new THREE.PlaneGeometry(0.008, bodyH);
    sampleInto(geo, M(-bodyW / 2 + 0.05, bodyCY, fz), 6, pts);
    sampleInto(geo, M(bodyW / 2 - 0.05, bodyCY, fz), 6, pts);
    geo.dispose();
  }
  // BOTTOM BODY FLARE (wider at base)
  {
    const geo = new THREE.BoxGeometry(bodyW + 0.1, 0.08, bodyD + 0.06);
    sampleInto(geo, M(0, bodyBot + 0.04, 0), 12, pts);
    geo.dispose();
  }

  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const pointsMesh = new THREE.Points(ptGeo, ptMat);

  const stationGroup = new THREE.Group();
  stationGroup.add(pointsMesh);
  // Sink the group so the instrument is well-framed
  stationGroup.position.y = -1.05;
  scene.add(stationGroup);

  return { scene, camera, group: stationGroup, disposables: [ptGeo, ptMat] };
}

export function WireframeTotalStation() {
  const containerRef = useWireframeScene(build);
  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true" />;
}
