import type * as ThreeNamespace from "three";

/** The `three` module shape, as returned by the dynamic `await import("three")` every scene
 * uses so the ~600KB library never lands in the initial bundle. */
export type ThreeModule = typeof ThreeNamespace;

/** What a scene's `build()` hands back to `useWireframeScene` once `three` has loaded and the
 * geometry is assembled. `group` is what the hook spins on the Y axis every frame; `onFrame`
 * is for anything beyond that single rotation (only the dog head's shimmer uses it today). */
export interface BuiltScene {
  scene: import("three").Scene;
  camera: import("three").PerspectiveCamera;
  group: import("three").Object3D;
  /** Disposed on unmount, in addition to the renderer itself. */
  disposables?: { dispose(): void }[];
  /** Radians/sec the group turns on Y. Matches every ported scene's original constant. */
  rotationSpeed?: number;
  /** Runs once per rendered frame before the frame is drawn (skipped entirely under
   * prefers-reduced-motion, since then only one frame ever renders). */
  onFrame?: (timeMs: number) => void;
}

export type BuildScene = (three: ThreeModule, root: HTMLDivElement) => BuiltScene;
