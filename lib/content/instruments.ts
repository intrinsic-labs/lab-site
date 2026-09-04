import { cache } from "react";
import { promises as fsp } from "node:fs";
import path from "node:path";
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

export interface ProductImages {
  /** `public/products/<slug>/hero.{png,jpg,jpeg,webp}` — the card image and the top of the product page. */
  hero?: string;
  /** Every other image in that folder, filename order (`01-…png`, `02-…png`) — a simple gallery. */
  gallery: string[];
}

const PRODUCTS_PUBLIC_DIR = path.join(process.cwd(), "public", "products");
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/**
 * Read `public/products/<slug>/` at build time: one optional `hero.*` plus any other
 * images, shown as a gallery. No front-matter field for this — see public/products/README.md,
 * which this convention matches. Absent folder or empty → `{ gallery: [] }`, so a product
 * with no images yet renders (the caller falls back to GenerativeCover for the hero slot).
 */
export const productImages = cache(async (slug: string): Promise<ProductImages> => {
  const dir = path.join(PRODUCTS_PUBLIC_DIR, slug);
  let names: string[] = [];
  try {
    names = await fsp.readdir(dir);
  } catch {
    return { gallery: [] };
  }
  const files = names.filter((n) => IMAGE_EXT.test(n)).sort();
  const heroFile = files.find((n) => /^hero\./i.test(n));
  const gallery = files.filter((n) => n !== heroFile).map((n) => `/products/${slug}/${n}`);
  return { hero: heroFile ? `/products/${slug}/${heroFile}` : undefined, gallery };
});
