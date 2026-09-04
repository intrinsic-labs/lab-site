"use client";

import { useEffect, useRef } from "react";
import type { BuildScene, ThreeModule } from "./types";

/**
 * Shared mount/lifecycle for every wireframe scene: WebGL feature-detect, the dynamic `three`
 * import, renderer creation, resize + visibility handling, the RAF loop, and teardown. Each
 * scene supplies only `build()` — its geometry, camera and (optionally) a per-frame callback
 * — via `components/work/scenes/lib/types.ts`. Ported from the five near-identical copies of
 * this boilerplate in intrinsiclabs-co-v3's Wireframe*.tsx files. `build` is expected to be a
 * module-level function (every scene defines it outside the component), so it's a stable
 * reference and safe as an effect dependency.
 *
 * Everything — WebGL detection included — runs inside one effect rather than a `useState`
 * feature-detect gating a second effect: setting state synchronously from an effect just to
 * trigger a follow-up effect is the exact pattern React's own hooks lint now flags, and there
 * is nothing here that needs to survive a re-render (the container never changes shape).
 *
 * Card-responsive rather than window-responsive: sizing is driven by a `ResizeObserver` on
 * the scene's own container, so a card that changes size without the window firing `resize`
 * (a grid reflow, a sidebar, a font swap) still re-fits. Pixel ratio is capped at 2 and the
 * RAF loop is paused via `IntersectionObserver` whenever the card scrolls offscreen, so a
 * page full of these never taxes mobile scroll performance. `prefers-reduced-motion: reduce`
 * renders exactly one static frame and never starts the loop at all.
 */
/**
 * WebGL feature detection, memoized for the lifetime of the document and — critically —
 * releasing the context it opens.
 *
 * This used to run per mount, inside the effect: every scene that mounted called
 * `getContext("webgl2")` on a throwaway canvas and then dropped the canvas on the floor.
 * A WebGL context is not garbage in the ordinary sense — the browser holds a fixed budget
 * of them (Chrome: 16) and reclaims one only when it is explicitly lost or the canvas is
 * finally collected, which can be many seconds later. So the probe alone doubled every
 * scene's context cost, and /work mounts five of them.
 *
 * The answer is the same one the renderer teardown below uses: ask WEBGL_lose_context to
 * drop it the moment the answer is known, and cache the boolean so it is asked once.
 */
let webglSupport: boolean | undefined;
function supportsWebGL(): boolean {
  if (webglSupport !== undefined) return webglSupport;
  const probe = document.createElement("canvas");
  const gl = (probe.getContext("webgl2") ||
    probe.getContext("webgl") ||
    probe.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (gl) {
    // Hand the context straight back rather than waiting for the canvas to be collected.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  webglSupport = Boolean(gl);
  return webglSupport;
}

/**
 * `zoom` is applied to the camera's own `zoom` (1 = the scene's authored framing) on every
 * size pass, so a call site can show the same scene larger without each scene knowing.
 * The case-study hero asks for it: a 16:9 box on a phone is SHORTER than the 4:3 card on
 * /work, and a perspective camera's vertical FOV is fixed, so the same object rendered
 * smaller on its own page than in the list (Asher, 2026-09-04).
 */
export function useWireframeScene(build: BuildScene, zoom = 1) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    if (!supportsWebGL()) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cancelled = false;
    let frameId = 0;
    let viewportActive = true;
    let renderer: import("three").WebGLRenderer | undefined;
    const disposables: { dispose(): void }[] = [];

    const initScene = async () => {
      const THREE: ThreeModule = await import("three");
      if (cancelled) return;

      const built = build(THREE, root);
      if (cancelled) return;
      const { scene, camera, group, onFrame, rotationSpeed = 0.15 } = built;
      if (built.disposables) disposables.push(...built.disposables);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(root.clientWidth, root.clientHeight);
      renderer.setClearColor(0x000000, 0);
      root.appendChild(renderer.domElement);

      const applySize = () => {
        const w = root.clientWidth, h = root.clientHeight;
        if (!w || !h || !renderer) return;
        camera.aspect = w / h;
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const resizeObserver = new ResizeObserver(applySize);
      resizeObserver.observe(root);

      const intersectionObserver = new IntersectionObserver(
        (entries) => { viewportActive = entries.some((e) => e.isIntersecting); },
        { threshold: 0.05 },
      );
      intersectionObserver.observe(root);

      const renderFrame = () => renderer && renderer.render(scene, camera);

      if (reducedMotion) {
        onFrame?.(0);
        renderFrame();
      } else {
        const animate = (time: number) => {
          frameId = requestAnimationFrame(animate);
          if (!viewportActive || document.hidden) return;
          group.rotation.y = time * 0.001 * rotationSpeed;
          onFrame?.(time);
          renderFrame();
        };
        frameId = requestAnimationFrame(animate);
      }

      return () => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    initScene().then((fn) => { cleanup = fn; });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      cleanup?.();
      for (const d of disposables) d.dispose();
      // `dispose()` frees the GPU-side resources three allocated, but it does NOT hand the
      // WebGL CONTEXT back — that lives on the canvas and survives until the browser
      // collects it. Chrome caps a page at 16 live contexts and silently kills the oldest
      // past that ("Too many active WebGL contexts"), which is what turned a few client-side
      // trips between /work and a case study into a grid of dead black cards that a reload
      // could not fix. Losing the context first, while the extension registry is still
      // wired up, returns it immediately; `dispose()` then tears down the rest.
      if (renderer) {
        renderer.forceContextLoss();
        renderer.dispose();
      }
      const canvas = root.querySelector("canvas");
      if (canvas?.parentNode === root) root.removeChild(canvas);
    };
  }, [build, zoom]);

  return containerRef;
}
