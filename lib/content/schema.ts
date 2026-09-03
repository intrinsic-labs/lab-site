import { z } from "zod";
import { KINDS } from "./kinds";
import { AREAS } from "./areas";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date (YYYY-MM-DD)");

export const artifactSchema = z.object({
  label: z.string(),
  href: z.string().url().optional(),
  note: z.string().optional(),
});

export const correctionSchema = z.object({
  date: isoDate,
  text: z.string(),
});

export const postFrontMatter = z.object({
  title: z.string().min(1),
  kind: z.enum(KINDS),
  area: z.enum(AREAS),
  date: isoDate,
  summary: z.string().min(1),
  status: z.enum(["draft", "published"]).default("draft"),
  caveats: z.array(z.string()).default([]),
  artifacts: z.array(artifactSchema).default([]),
  /** Why the artifacts block is empty, when it is. Rendered instead of hiding the block. */
  artifactsNote: z.string().optional(),
  corrections: z.array(correctionSchema).default([]),
});
export type PostFrontMatter = z.infer<typeof postFrontMatter>;

export const INSTRUMENT_STATUSES = ["released", "private", "described", "in-design"] as const;
export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];

export const instrumentFrontMatter = z.object({
  name: z.string().min(1),
  measures: z.string().min(1),
  area: z.enum(AREAS),
  status: z.enum(INSTRUMENT_STATUSES),
  statusNote: z.string().optional(),
  order: z.number().int().default(100),
  href: z.string().url().optional(),
});
export type InstrumentFrontMatter = z.infer<typeof instrumentFrontMatter>;
