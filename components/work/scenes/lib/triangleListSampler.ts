/**
 * Samples `perTri` random barycentric points across a raw (verts + index-list) triangle mesh
 * — the dog head's own sampling approach, distinct from `primitiveSampler`'s `sampleInto`
 * because it has no `THREE.BufferGeometry` to lean on and because it also hands back a
 * per-point random seed, which its per-frame shimmer animates against. Ported verbatim from
 * intrinsiclabs-co-v3's WireframeDogHead.
 */
export function sampleTriangleList(verts: Float32Array, indices: readonly number[], perTri: number) {
  const triCount = indices.length / 3;
  const totalPts = triCount * perTri;
  const basePts = new Float32Array(totalPts * 3);
  const seeds = new Float32Array(totalPts);

  let ptr = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t * 3] * 3, i1 = indices[t * 3 + 1] * 3, i2 = indices[t * 3 + 2] * 3;
    const ax = verts[i0], ay = verts[i0 + 1], az = verts[i0 + 2];
    const bx = verts[i1], by = verts[i1 + 1], bz = verts[i1 + 2];
    const cx = verts[i2], cy = verts[i2 + 1], cz = verts[i2 + 2];

    for (let s = 0; s < perTri; s++) {
      const r1 = Math.sqrt(Math.random());
      const r2 = Math.random();
      const u = 1 - r1, v = r1 * (1 - r2), w = r1 * r2;
      basePts[ptr * 3] = u * ax + v * bx + w * cx;
      basePts[ptr * 3 + 1] = u * ay + v * by + w * cy;
      basePts[ptr * 3 + 2] = u * az + v * bz + w * cz;
      seeds[ptr] = Math.random() * Math.PI * 2;
      ptr++;
    }
  }
  return { basePts, seeds, totalPts };
}
