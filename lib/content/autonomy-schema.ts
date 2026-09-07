import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date (YYYY-MM-DD)");

export const autonomyMetric = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  /** The plain phrase set under the drawing. `label` is a footnote sentence, not a caption. */
  shortLabel: z.string().min(1).optional(),
  /** One or two sentences explaining the metric to somebody who has never seen this site. */
  blurb: z.string().min(1).optional(),
  /** What the numerator and denominator count — "270 of 369 <sessions>". */
  countNoun: z.string().min(1).default("of these"),
  value: z.number().min(0).max(100).nullable(),
  coverage: z.object({
    status: z.enum(["complete", "incomplete", "unavailable"]),
    includedRecords: z.number().int().nonnegative(),
    excludedRecords: z.number().int().nonnegative(),
    missingCounters: z.number().int().nonnegative(),
    invalidCounters: z.number().int().nonnegative(),
    malformedLines: z.number().int().nonnegative(),
    unpairedCompletions: z.number().int().nonnegative(),
  }).optional(),
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
  /** Copy for the figure itself — the sentence the context panel rests on. */
  figure: z.object({ intro: z.string().min(1) }).optional(),
  metrics: z.array(autonomyMetric).min(1),
});

export type AutonomyMetric = z.infer<typeof autonomyMetric>;
export type AutonomyData = z.infer<typeof autonomyData>;

/** The raw counts behind a percentage, as the context panel says them: "270 of 369 sessions". */
export function fraction(m: AutonomyMetric): string {
  return m.value === null ? "Rate unavailable" : `${m.numerator} of ${m.denominator} ${m.countNoun}`;
}

/** Height a metric is plotted at: for `down` metrics the complement, so up is always better. */
export function plotted(m: AutonomyMetric): number | null {
  if (m.value === null) return null;
  return m.direction === "down" ? 100 - m.value : m.value;
}

/** Always visible; historical gaps must not hide in a hover panel. */
export function coverageNote(m: AutonomyMetric): string | null {
  if (m.value === null) return `${m.shortLabel ?? m.label}: no rate is available from the recorded attempts.`;
  if (m.coverage?.status === "incomplete") return `Completion data is incomplete: ${m.coverage.excludedRecords} run records without reliable counts${m.coverage.malformedLines ? ` and ${m.coverage.malformedLines} unreadable lines` : ""} are excluded.`;
  return null;
}
