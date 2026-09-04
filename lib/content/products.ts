import { cache } from "react";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { readDir } from "./fs";
import { productFrontMatter, type ProductFrontMatter, type ProductStatus } from "./schema";

/**
 * Per-product accent — **token names only**, so a product can tint its feature section on
 * `/products` without any component ever learning a colour value. Each name maps 1:1 onto a
 * semantic token declared in `app/globals.css` (`--color-accent` green, `--color-marker`
 * sand, `--color-ember` orange, `--color-ink` white); there is no blue/`sky` token on this
 * site and none was invented for this, per the ruling that the palette lives in exactly one
 * place.
 *
 * It is parsed HERE rather than in `lib/content/schema.ts` because it is a presentation
 * detail of the products surface, and `productFrontMatter` (a `z.object`) silently strips
 * keys it does not declare — so the field is read off the raw front matter and validated
 * with its own enum, which errors loudly on a typo the same way the rest of the contract does.
 */
export const PRODUCT_ACCENTS = ["accent", "marker", "ember", "ink", "sky"] as const;
export type ProductAccent = (typeof PRODUCT_ACCENTS)[number];
const accentField = z.enum(PRODUCT_ACCENTS).optional();

/** The CSS variable one accent name resolves to. The only place a token name becomes a var(). */
export function accentVar(accent: ProductAccent = "accent"): string {
  return `var(--color-${accent})`;
}

export interface Product extends ProductFrontMatter {
  slug: string;
  body: string;
  /** Optional front-matter `accent:` — see PRODUCT_ACCENTS. Absent means the site accent. */
  accent?: ProductAccent;
}

export const STATUS_LABEL: Record<ProductStatus, string> = {
  released: "Released",
  "in-development": "In development",
  private: "Private — running, code not released",
  described: "Internal — described here, no code released",
  "in-design": "In design — not yet built",
  paused: "Paused — resuming",
};

export const allProducts = cache(async (): Promise<Product[]> => {
  const entries = await readDir("products");
  return entries
    .map((e) => {
      const parsed = productFrontMatter.safeParse(e.data);
      if (!parsed.success) throw new Error(`content/products/${e.slug}: ${parsed.error.message}`);
      const accent = accentField.safeParse((e.data as Record<string, unknown>).accent);
      if (!accent.success) throw new Error(`content/products/${e.slug}: accent must be one of ${PRODUCT_ACCENTS.join(" | ")}`);
      return { ...parsed.data, slug: e.slug, body: e.body, accent: accent.data };
    })
    .sort((a, b) => a.order - b.order);
});

export async function productBySlug(slug: string): Promise<Product | undefined> {
  return (await allProducts()).find((p) => p.slug === slug);
}

export interface ProductImages {
  /** `public/products/<slug>/hero.{png,jpg,jpeg,webp}` — the big centred image on the product page. */
  hero?: string;
  /** `public/products/<slug>/card.*` — the 4:3-croppable image for `ProductCard`. Falls back to `hero`. */
  card?: string;
  /** Every other image in that folder, filename order (`01-…png`, `02-…png`) — the carousel. */
  gallery: string[];
}

const PRODUCTS_PUBLIC_DIR = path.join(process.cwd(), "public", "products");
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/**
 * Read `public/products/<slug>/` at build time: two named roles (`hero.*`, `card.*`) plus any
 * other image, which is a gallery slide. No front-matter field for this — the folder IS the
 * declaration; see public/products/README.md.
 *
 * `card.*` exists because the two slots crop differently: the card is `object-cover` at 4:3
 * and the product page is `object-contain`, so one file cannot always serve both. It is
 * optional and falls back to `hero` — a folder that never gains one behaves exactly as before.
 * Absent folder or empty → `{ gallery: [] }`, and the caller falls back to `GenerativeCover`.
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
  const cardFile = files.find((n) => /^card\./i.test(n));
  const url = (n: string) => `/products/${slug}/${n}`;
  const gallery = files.filter((n) => n !== heroFile && n !== cardFile).map(url);
  return {
    hero: heroFile ? url(heroFile) : undefined,
    card: cardFile ? url(cardFile) : undefined,
    gallery,
  };
});
