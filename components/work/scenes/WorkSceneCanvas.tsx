"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import type { WorkSceneId, WorkTint } from "@/lib/content/schema";

/**
 * Registry of ported 3D wireframe scenes, each lazy-loaded client-side (`ssr: false` — every
 * scene touches `window`/`document`/WebGL inside `useWireframeScene`) so `three` never lands
 * in the initial bundle. `loading` is a GenerativeCover, keyed to the scene id rather than
 * the calling card's slug — the id is known at module scope and next/dynamic's `loading`
 * component doesn't receive the caller's props, only its own static `isLoading`/`pastDelay`.
 * It's genuinely the SSR output for this boundary (see loadable.js's BailoutToCSR +
 * Suspense wiring), not just a client-side flash, and it's on screen for at most one chunk
 * fetch, so the seed mismatch is never noticed.
 */
const SCENES: Record<WorkSceneId, ComponentType<{ tint?: WorkTint }>> = {
  "dog-head": dynamic(() => import("./WireframeDogHead").then((m) => m.WireframeDogHead), {
    ssr: false,
    loading: () => <GenerativeCover seed="dog-head" className="h-full w-full" />,
  }),
  wifi: dynamic(() => import("./WireframeWifi").then((m) => m.WireframeWifi), {
    ssr: false,
    loading: () => <GenerativeCover seed="wifi" className="h-full w-full" />,
  }),
  church: dynamic(() => import("./WireframeChurch").then((m) => m.WireframeChurch), {
    ssr: false,
    loading: () => <GenerativeCover seed="church" className="h-full w-full" />,
  }),
  bible: dynamic(() => import("./WireframeBible").then((m) => m.WireframeBible), {
    ssr: false,
    loading: () => <GenerativeCover seed="bible" className="h-full w-full" />,
  }),
  "total-station": dynamic(() => import("./WireframeTotalStation").then((m) => m.WireframeTotalStation), {
    ssr: false,
    loading: () => <GenerativeCover seed="total-station" className="h-full w-full" />,
  }),
};

/**
 * Renders a case study's cover slot: the ported 3D scene when `scene` is set, otherwise the
 * plain GenerativeCover (seeded on the case study's own slug, matching WorkCard's previous
 * behaviour). `className` sizes the outer box in both call sites (the 4:3 work-card cover
 * and the 16:9 case-study hero); the scene itself always fills that box at 100%. `tint`
 * passes through to the scene's point-cloud colour (absent → the pre-tint grey).
 */
export function WorkSceneCanvas({
  scene,
  seed,
  tint,
  className,
}: {
  scene?: WorkSceneId;
  seed: string;
  tint?: WorkTint;
  className?: string;
}) {
  if (!scene) return <GenerativeCover seed={seed} className={className} />;
  const Scene = SCENES[scene];
  return (
    <div className={className}>
      <Scene tint={tint} />
    </div>
  );
}
