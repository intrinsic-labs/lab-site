import Link from "next/link";
import { pageContent } from "@/lib/content/pages";
import { fraction, coverageNote, readAutonomy } from "@/lib/content/autonomy";
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
 * Recorded operating measures, drawn as three orbs rising out of a haze.
 *
 * Each plotted disc represents its own recorded percentage. Missing rates have no disc;
 * they remain visible as unavailable in the context panel and coverage note. The measures
 * do not share a company-autonomy target.
 *
 * Only the three "higher is better" metrics are here. Drift is a quality measure, not an
 * autonomy one, and plotting its complement once read as a claim nobody was making.
 *
 * The names under the numbers are plain phrases, and the panel underneath carries the
 * explanation — a reader who has never seen this site gets a sentence about the whole
 * figure, and one about whichever orb they point at. Metric definitions live in
 * content/specimen/autonomy.json; research direction lives in content/pages/operating-measures.md.
 *
 * The drawing is rendered by the server; `OrbInteraction` adds pointer response and the
 * panel on top of a figure that is already finished. Data is a committed file, never a
 * live vault read.
 */
export async function AutonomyOrbs() {
  const data = await readAutonomy();
  const { content: researchDirection } = await pageContent("operating-measures");
  const up = data.metrics.filter((m) => m.direction === "up");
  const available = up.filter((m): m is typeof m & { value: number } => m.value !== null);
  const coverageNotes = up.map(coverageNote).filter((note): note is string => note !== null);

  const metrics: OrbInput[] = available.map((m) => ({
    key: m.key,
    label: m.shortLabel ?? m.label,
    value: m.value,
    colorVar: COLOR[m.key] ?? "--color-ink",
  }));

  // The panel opens on the highest number — the one the picture leads with.
  const lead = available.length ? available.reduce((a, b) => (b.value > a.value ? b : a)).key : up[0]?.key ?? "";
  const panel: PanelMetric[] = up.map((m) => ({
    key: m.key,
    label: m.shortLabel ?? m.label,
    blurb: m.blurb ?? m.label,
    fraction: fraction(m),
    colorVar: COLOR[m.key] ?? "--color-ink",
  }));

  return (
    <section id="operating-measures">
      {/* The figure is full-bleed and the prose around it is not: the haze under the
          waterline has to reach the edges of the viewport, or it ends in the hard vertical
          edge the boxed version had. */}
      <OrbInteraction defaultKey={lead} metrics={panel}>
        <OrbFigure size={MOBILE} metrics={metrics} className="md:hidden" />
        <OrbFigure size={DESKTOP} metrics={metrics} className="hidden md:block" />
      </OrbInteraction>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{researchDirection}</p>
        {coverageNotes.map((note) => <p key={note} className="mt-4 text-sm leading-relaxed text-ink-2">{note}</p>)}
      </div>

      {/* One caption row under the figure (Asher, 2026-09-04: the heading/measured-date
          strip above the orbs is gone; the date rides with the target). Three cells so the
          title sits dead centre at md+; on a phone the three stack. */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-8 grid gap-y-3 border-t border-rule pt-6 text-center md:mt-6 md:grid-cols-3 md:items-baseline md:pt-4 md:text-left">
          <p className="label text-ink-2">
            Measured {data.generated}.
          </p>
          {/* First on a phone, centre cell at md+ (Asher, 2026-09-04). */}
          <h2 className="label order-first text-ink md:order-none md:text-center">Operating measures</h2>
          <Link href="/products/intrinsic-os" className="label text-accent hover:underline underline-offset-4 md:text-right">
            How these are computed →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default AutonomyOrbs;
