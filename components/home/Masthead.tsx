import type { ReactNode } from "react";
import { Spirograph } from "@/components/home/Spirograph";

/**
 * Wraps hero content with the spirograph as an absolutely-positioned backdrop.
 * The canvas layer is pointer-events: none so it never blocks clicks on the
 * content above it — the spirograph's own pointer interaction listens on
 * `window` (see Spirograph.tsx) rather than the canvas element, so it still
 * responds to the pointer everywhere on the page. `overflow-hidden` plus
 * sizing the canvas to this container (not the viewport) keeps it from
 * introducing horizontal scroll at narrow widths.
 */
export function Masthead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Spirograph className="h-full w-full" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
