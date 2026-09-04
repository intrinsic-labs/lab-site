import { cache } from "react";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { readDir } from "./fs";
import { productFrontMatter, type ProductFrontMatter, type ProductStatus } from "./schema";

export interface Product extends ProductFrontMatter {
  slug: string;
  body: string;
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
      return { ...parsed.data, slug: e.slug, body: e.body };
    })
    .sort((a, b) => a.order - b.order);
});

export async function productBySlug(slug: string): Promise<Product | undefined> {
  return (await allProducts()).find((p) => p.slug === slug);
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
