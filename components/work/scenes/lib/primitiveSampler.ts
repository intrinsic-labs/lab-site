import type { ThreeModule } from "./types";

/**
 * Uniform-random barycentric surface sampler shared by every primitive-built scene (church,
 * wifi, bible, total station): samples `perTri` points on each triangle of `geo`, transforms
 * each by `matrix`, and appends XYZ into `out`. Ported verbatim from intrinsiclabs-co-v3's
 * WireframeChurch/WireframeWifi/WireframeBible/WireframeTotalStation, which each carried an
 * identical private copy of this function.
 */
export function sampleInto(
  geo: import("three").BufferGeometry,
  matrix: import("three").Matrix4,
  perTri: number,
  out: number[],
) {
  const nonIdx = geo.toNonIndexed();
  const attr = nonIdx.getAttribute("position");
  const triCount = attr.count / 3;
  const e = matrix.elements;

  for (let t = 0; t < triCount; t++) {
    const ax = attr.getX(t * 3), ay = attr.getY(t * 3), az = attr.getZ(t * 3);
    const bx = attr.getX(t * 3 + 1), by = attr.getY(t * 3 + 1), bz = attr.getZ(t * 3 + 1);
    const cx = attr.getX(t * 3 + 2), cy = attr.getY(t * 3 + 2), cz = attr.getZ(t * 3 + 2);

    for (let s = 0; s < perTri; s++) {
      const r1 = Math.sqrt(Math.random());
      const r2 = Math.random();
      const u = 1 - r1, v = r1 * (1 - r2), w = r1 * r2;
      const lx = u * ax + v * bx + w * cx;
      const ly = u * ay + v * by + w * cy;
      const lz = u * az + v * bz + w * cz;
      out.push(
        e[0] * lx + e[4] * ly + e[8] * lz + e[12],
        e[1] * lx + e[5] * ly + e[9] * lz + e[13],
        e[2] * lx + e[6] * ly + e[10] * lz + e[14],
      );
    }
  }
  nonIdx.dispose();
}

/** Matrix4 from a position + optional Y rotation. */
export function mkMatrix(THREE: ThreeModule, x: number, y: number, z: number, ry = 0) {
  const obj = new THREE.Object3D();
  obj.position.set(x, y, z);
  if (ry) obj.rotation.y = ry;
  obj.updateMatrix();
  return obj.matrix;
}

/** Matrix4 from a position + arbitrary Euler rotation. */
export function mkMatrixFull(
  THREE: ThreeModule,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
) {
  const obj = new THREE.Object3D();
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  obj.updateMatrix();
  return obj.matrix;
}
