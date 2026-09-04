import Link from "next/link";
import { Frame } from "@/components/ui/Frame";
import { readAutonomy, plotted, type AutonomyMetric } from "@/lib/content/autonomy";
import { AutonomyScene } from "./AutonomyScene";

/**
 * The home-page plate: four autonomy figures drawn as an isometric plot, against the
 * band the company says it is aiming for. The numbers are rendered here, as text, by
 * the server — the canvas beside them is the same data drawn, and nothing else.
 * Data is a committed file (content/specimen/autonomy.json), never a live vault read.
 */
export async function AutonomySpecimen() {
  const data = await readAutonomy();
  const inverted = data.metrics.filter((m) => m.direction === "down");

  return (
    <Frame className="bg-paper-2 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-2.5 sm:px-5">
        <span className="label normal-case tracking-normal">How much of this company runs itself</span>
        <span className="label text-ink-3 whitespace-nowrap">measured {data.generated}</span>
      </div>

      <div className="border-b border-rule px-4 py-3 sm:px-5">
        <p className="text-sm text-ink-2 leading-snug">
          Four ratios from the system&rsquo;s own run logs over {data.window.days} days. A{" "}
          <em>session</em> is one autonomous agent run; <em>drift</em> is a documentation claim
          that no longer matched the code when checked.
        </p>
      </div>

      <div className="px-2 pt-3 sm:px-3">
        <AutonomyScene
          goal={{ low: data.goal.low, high: data.goal.high }}
          metrics={data.metrics.map((m) => ({
            key: m.key,
            height: plotted(m),
            inverted: m.direction === "down",
          }))}
        />
      </div>

      <dl className="border-t border-rule">
        {data.metrics.map((m) => (
          <Row key={m.key} m={m} />
        ))}
      </dl>

      <div className="border-t border-rule px-4 py-3 sm:px-5">
        <p className="label normal-case tracking-normal text-ink-3">
          {data.window.days} days · {data.window.from} → {data.window.to}
        </p>
        <p className="mt-2 text-sm text-ink-2 leading-snug">
          The founder&rsquo;s target is for the company to run {data.goal.low}–{data.goal.high}%
          autonomously — a personal target, not a forecast. The band is that target; the columns
          are where the four measures stood in this window.
        </p>
        {inverted.length > 0 && (
          <p className="mt-2 text-sm text-ink-3 leading-snug">
            {inverted.map((m) => m.key).join(", ")} is better when lower, so that column is plotted
            upside down: the striped face shows its complement —{" "}
            {(100 - inverted[0].value).toFixed(1)}% of claims that held up — so every column still
            rises toward the same band.
          </p>
        )}
        <Link
          href="/about/editorial#autonomy"
          className="label mt-3 inline-block text-accent hover:underline underline-offset-4"
        >
          How these are computed →
        </Link>
      </div>
    </Frame>
  );
}

function Row({ m }: { m: AutonomyMetric }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-rule/60 px-4 py-2 last:border-b-0 sm:px-5">
      <div className="min-w-0 flex-1">
        <dt className="text-[0.82rem] leading-snug text-ink">{m.label}</dt>
        <dd className="label mt-0.5 normal-case tracking-normal text-ink-3">
          {m.key} · {m.numerator}/{m.denominator}
          {m.key === "decisions" && " · small n"}
          {m.direction === "down" && " · lower is better"}
        </dd>
      </div>
      <div className="font-mono text-base tabular-nums whitespace-nowrap text-ink">
        {m.value.toFixed(1)}
        <span className="text-ink-3">{m.unit}</span>
      </div>
    </div>
  );
}

export default AutonomySpecimen;
