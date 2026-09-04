import Link from "next/link";
import { readAutonomy } from "@/lib/content/autonomy";
import { OrbFigure } from "./OrbFigure";
import { OrbInteraction } from "./OrbInteraction";
import { DESKTOP, MOBILE, type OrbInput } from "./orb-geometry";

/** The data file's own `label` is a full sentence written for a footnote, not something to
 *  set in 11px mono under a drawing. */
const SHORT_LABEL: Record<string, string> = {
  execution: "Sessions completed",
  outward: "Aimed outward",
  decisions: "Decisions alone",
};

/** Token names, never literal colours — the skin decides what they are. */
const COLOR: Record<string, string> = {
  execution: "--color-accent",
  outward: "--color-ink",
  decisions: "--color-marker",
};

/**
 * How much of the company runs itself, drawn as three orbs rising out of a haze.
 *
 * The horizon is nothing running by itself; an orb wholly clear of the line is the stated
 * goal, 90–95%. So each disc's height above the water is its number, the three overlap
 * into one composition rather than three bars, and the shape of the picture — one nearly
 * out, one half out, one barely breaking the surface — is the honest shape of the claim.
 *
 * Only the three "higher is better" metrics are here. Drift is a quality measure, not an
 * autonomy one, and plotting its complement once read as a claim nobody was making.
 *
 * The SVG is rendered by the server; `OrbInteraction` adds pointer response on top of a
 * drawing that is already finished. Data is a committed file
 * (content/specimen/autonomy.json), never a live vault read.
 */
export async function AutonomyOrbs() {
  const data = await readAutonomy();
  const metrics: OrbInput[] = data.metrics
    .filter((m) => m.direction === "up")
    .map((m) => ({
      key: m.key,
      label: SHORT_LABEL[m.key] ?? m.label,
      value: m.value,
      colorVar: COLOR[m.key] ?? "--color-ink",
    }));

  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-3">
        <h2 className="label normal-case tracking-normal text-ink">How much of this company runs itself</h2>
        <span className="label text-ink-3 whitespace-nowrap">measured {data.generated}</span>
      </div>

      <OrbInteraction>
        <div className="mx-auto max-w-[960px]">
          <OrbFigure uid="sm" size={MOBILE} metrics={metrics} className="sm:hidden" />
          <OrbFigure uid="lg" size={DESKTOP} metrics={metrics} className="hidden sm:block" />
        </div>
      </OrbInteraction>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-rule pt-3">
        <p className="text-sm text-ink-2 leading-snug">
          Target: {data.goal.low}–{data.goal.high}%.
        </p>
        <Link href="/products/vault" className="label text-accent hover:underline underline-offset-4">
          How these are computed →
        </Link>
      </div>
    </div>
  );
}

export default AutonomyOrbs;
