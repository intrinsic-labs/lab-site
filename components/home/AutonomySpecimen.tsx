import Link from "next/link";
import { Frame } from "@/components/ui/Frame";
import { readAutonomy, plotted, type AutonomyMetric } from "@/lib/content/autonomy";
import { AutonomyScene } from "./AutonomyScene";

/** Plain words for the chart columns and the table — the data file's own `label` is a
 *  full sentence (for the tooltip), not something to set in 9px mono type. */
const SHORT_LABEL: Record<string, string> = {
  execution: "Sessions completed",
  outward: "Aimed outward",
  decisions: "Decisions alone",
  drift: "Drift",
};

/**
 * The home-page plate: three autonomy figures drawn as an isometric bar chart, against
 * the band the company says it is aiming for. Drift is a quality metric, not an autonomy
 * one — it stays out of the chart and appears only as a row in the table below, so
 * nothing on the chart plots a complement (an earlier version did, and read as "82%
 * autonomous," which wasn't the claim). The numbers are rendered here, as text, by the
 * server; the canvas beside them is the same data drawn, and nothing else. Data is a
 * committed file (content/specimen/autonomy.json), never a live vault read.
 */
export async function AutonomySpecimen() {
  const data = await readAutonomy();
  const chartMetrics = data.metrics.filter((m) => m.direction === "up");

  return (
    <Frame className="bg-paper-2 min-w-0 mx-auto max-w-[900px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-2.5 sm:px-5">
        <span className="label normal-case tracking-normal">How much of this company runs itself</span>
        <span className="label text-ink-3 whitespace-nowrap">measured {data.generated}</span>
      </div>

      <div className="px-2 pt-3 sm:px-3">
        <AutonomyScene
          goal={{ low: data.goal.low, high: data.goal.high }}
          metrics={chartMetrics.map((m) => ({
            key: m.key,
            label: SHORT_LABEL[m.key] ?? m.label,
            height: plotted(m),
          }))}
        />
      </div>

      <dl className="border-t border-rule">
        {data.metrics.map((m) => (
          <Row key={m.key} m={m} />
        ))}
      </dl>

      <div className="border-t border-rule px-4 py-3 sm:px-5">
        <p className="text-sm text-ink-2 leading-snug">
          Target: {data.goal.low}–{data.goal.high}%. Where things are headed, not where they are.
        </p>
        <Link
          href="/about/editorial#autonomy"
          className="label mt-2 inline-block text-accent hover:underline underline-offset-4"
        >
          How these are computed →
        </Link>
      </div>
    </Frame>
  );
}

function Row({ m }: { m: AutonomyMetric }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 border-b border-rule/60 px-4 py-2 last:border-b-0 sm:px-5"
      title={`${m.label} — ${m.numerator}/${m.denominator}`}
    >
      <dt className="text-[0.82rem] leading-snug text-ink">
        {SHORT_LABEL[m.key] ?? m.label}
        {m.direction === "down" && <span className="text-ink-3"> · lower is better</span>}
      </dt>
      <dd className="font-mono text-base tabular-nums whitespace-nowrap text-ink">
        {m.value.toFixed(1)}
        <span className="text-ink-3">{m.unit}</span>
      </dd>
    </div>
  );
}

export default AutonomySpecimen;
