import { cache } from "react";
import { readDir } from "./fs";
import { instrumentFrontMatter, type InstrumentFrontMatter, type InstrumentStatus } from "./schema";

export interface Instrument extends InstrumentFrontMatter {
  slug: string;
  body: string;
}

export const STATUS_LABEL: Record<InstrumentStatus, string> = {
  released: "Released",
  private: "Private — running, code not released",
  described: "Described here — no code released",
  "in-design": "In design — not yet built",
};

export const allInstruments = cache(async (): Promise<Instrument[]> => {
  const entries = await readDir("instruments");
  return entries
    .map((e) => {
      const parsed = instrumentFrontMatter.safeParse(e.data);
      if (!parsed.success) throw new Error(`content/instruments/${e.slug}: ${parsed.error.message}`);
      return { ...parsed.data, slug: e.slug, body: e.body };
    })
    .sort((a, b) => a.order - b.order);
});

export async function instrumentBySlug(slug: string): Promise<Instrument | undefined> {
  return (await allInstruments()).find((i) => i.slug === slug);
}
