import type { ReactNode } from "react";

/**
 * A row of VISR phone screenshots (`<VisrShot>` children): three across from `sm`, stacked on
 * a phone. It breaks out of the reading column, the way SystemCards does, so each phone shot
 * is wide enough to read. The vertical margin is inline because the column's unlayered
 * `.prose > * + *` rule would beat a `my-*` utility.
 */
export function VisrShots({ children }: { children: ReactNode }) {
  return (
    <div
      className="not-prose relative left-1/2 w-screen max-w-5xl -translate-x-1/2 px-6"
      style={{ marginBlock: "3rem" }}
    >
      <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">{children}</div>
    </div>
  );
}
