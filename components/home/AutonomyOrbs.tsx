import Link from "next/link";
import { fraction, readAutonomy } from "@/lib/content/autonomy";
import { OrbFigure } from "./OrbFigure";
import { OrbInteraction, type PanelMetric } from "./OrbInteraction";
import { DESKTOP, MOBILE, type OrbInput } from "./orb-geometry";

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
 * The names under the numbers are plain phrases, and the panel underneath carries the
 * explanation — a reader who has never seen this site gets a sentence about the whole
 * figure, and one about whichever orb they point at. All of that copy lives in
 * content/specimen/autonomy.json beside the numbers it describes, not in this file.
 *
 * The drawing is rendered by the server; `OrbInteraction` adds pointer response and the
 * panel on top of a figure that is already finished. Data is a committed file, never a
 * live vault read.
 */
export async function AutonomyOrbs() {
  const data = await readAutonomy();
  const up = data.metrics.filter((m) => m.direction === "up");

  const metrics: OrbInput[] = up.map((m) => ({
    key: m.key,
    label: m.shortLabel ?? m.label,
    value: m.value,
    colorVar: COLOR[m.key] ?? "--color-ink",
  }));

  // The panel opens on the highest number — the one the picture leads with.
  const lead = up.reduce((a, b) => (b.value > a.value ? b : a)).key;
  const panel: PanelMetric[] = up.map((m) => ({
    key: m.key,
    label: m.shortLabel ?? m.label,
    blurb: m.blurb ?? m.label,
    fraction: fraction(m),
    colorVar: COLOR[m.key] ?? "--color-ink",
  }));

  return (
    <>
      {/* The figure is full-bleed and the prose around it is not: the haze under the
          waterline has to reach the edges of the viewport, or it ends in the hard vertical
          edge the boxed version had. */}
      <OrbInteraction defaultKey={lead} metrics={panel}>
        <OrbFigure size={MOBILE} metrics={metrics} className="md:hidden" />
        <OrbFigure size={DESKTOP} metrics={metrics} className="hidden md:block" />
      </OrbInteraction>

      {/* One caption row under the figure (Asher, 2026-09-04: the heading/measured-date
          strip above the orbs is gone; the date rides with the target). Three cells so the
          title sits dead centre at md+; on a phone the three stack. */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-8 grid gap-y-3 border-t border-rule pt-6 text-center md:mt-6 md:grid-cols-3 md:items-baseline md:pt-4 md:text-left">
          <p className="text-sm text-ink-2 leading-snug">
            Measured {data.generated}. Target: {data.goal.low}–{data.goal.high}%.
          </p>
          <h2 className="label text-ink md:text-center">Company autonomy rate</h2>
          <Link href="/products/vault" className="label text-accent hover:underline underline-offset-4 md:text-right">
            How these are computed →
          </Link>
        </div>
      </div>
    </>
  );
}

export default AutonomyOrbs;
