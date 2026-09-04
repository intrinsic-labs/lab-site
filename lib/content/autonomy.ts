import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CONTENT_ROOT } from "./fs";

/**
 * The home-page specimen's data contract. The file is generated from the vault's own
 * logs and committed; the site never reads the vault live. A malformed file fails the
 * build loudly, like every other piece of content here.
 */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date (YYYY-MM-DD)");

export const autonomyMetric = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  numerator: z.number(),
  denominator: z.number(),
  unit: z.string().default("%"),
  /** `up` = higher is better. `down` = lower is better (drift). */
  direction: z.enum(["up", "down"]),
  method: z.string().default(""),
  source: z.string().default(""),
});

export const autonomyData = z.object({
  generated: isoDate,
  window: z.object({ from: isoDate, to: isoDate, days: z.number() }),
  goal: z.object({ low: z.number(), high: z.number(), text: z.string() }),
  metrics: z.array(autonomyMetric).min(1),
});

export type AutonomyMetric = z.infer<typeof autonomyMetric>;
export type AutonomyData = z.infer<typeof autonomyData>;

/** Height a metric is plotted at: for `down` metrics the complement, so up is always better. */
export function plotted(m: AutonomyMetric): number {
  return m.direction === "down" ? 100 - m.value : m.value;
}

export async function readAutonomy(): Promise<AutonomyData> {
  const file = path.join(CONTENT_ROOT, "specimen/autonomy.json");
  const parsed = autonomyData.safeParse(JSON.parse(await fs.readFile(file, "utf8")));
  if (!parsed.success) {
    throw new Error(`content/specimen/autonomy.json is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
