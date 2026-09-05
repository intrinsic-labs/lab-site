import type { BuiltScene, ThreeModule } from "./types";
import { readTintColor } from "./pointColor";
import type { WorkTint } from "@/lib/content/schema";

/**
 * The boilerplate every primitive-built scene repeats once it has its point list: one
 * PointsMaterial tinted from the live palette, one BufferGeometry, one THREE.Points, one
 * group for the hook to spin. The six open-source scenes (2026-09-05) share it so each file
 * is only its geometry; the five ported client scenes keep their verbatim copies on purpose
 * — they are ports, and the point of them is that they match the originals line for line.
 */
export function finishPoints(
  THREE: ThreeModule,
  pts: number[],
  tint: WorkTint | undefined,
  camera: import("three").PerspectiveCamera,
  opts: { size?: number; opacity?: number; groupY?: number; tiltX?: number } = {},
): BuiltScene {
  const scene = new THREE.Scene();
  const ptMat = new THREE.PointsMaterial({
    color: new THREE.Color(readTintColor(tint)).lerp(new THREE.Color(0xffffff), 0.15), // tinted light on black, not flat paint
    size: opts.size ?? 0.022,
    sizeAttenuation: true,
    transparent: true,
    opacity: opts.opacity ?? 0.75,
  });
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  const group = new THREE.Group();
  group.add(new THREE.Points(ptGeo, ptMat));
  if (opts.groupY) group.position.y = opts.groupY;
  if (opts.tiltX) group.rotation.x = opts.tiltX;
  scene.add(group);
  return { scene, camera, group, disposables: [ptGeo, ptMat] };
}

/** A camera at the usual card framing — fov 36, on the +z axis at `z`, raised by `y`,
 *  looking at the origin. Scenes that want a different aim call `lookAt` again. */
export function cardCamera(THREE: ThreeModule, root: HTMLDivElement, z: number, y = 0) {
  const camera = new THREE.PerspectiveCamera(36, root.clientWidth / root.clientHeight, 0.1, 100);
  camera.position.set(0, y, z);
  camera.lookAt(0, 0, 0);
  return camera;
}
