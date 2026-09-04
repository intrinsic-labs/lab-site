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
  /** Renders the shared-vocabulary SystemPrimer box between the header and the body. */
  primer: z.enum(["agent-ops"]).optional(),
  /** Card + post-header image, path under /public/covers/. Absent → GenerativeCover. */
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
});
export type PostFrontMatter = z.infer<typeof postFrontMatter>;

/**
 * Products = the company's own product bets (GlyphDeck, Liturgos, Tycho, Aspen Grove, the
 * vault) — distinct from Work, the client portfolio (`caseStudyFrontMatter` below).
 * `released`/`in-development` cover the shipping lifecycle; `private` (running, code
 * withheld), `described` (no code released — the vault) and `in-design` are inherited from
 * the old instrument vocabulary; `paused` is Aspen Grove's honest label while it's
 * reopening. Labels live in one place: `STATUS_LABEL` in `lib/content/products.ts`.
 */
export const PRODUCT_STATUSES = [
  "released",
  "in-development",
  "private",
  "described",
  "in-design",
  "paused",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const productFrontMatter = z.object({
  name: z.string().min(1),
  /** One sentence: what it is. */
  line: z.string().min(1),
  status: z.enum(PRODUCT_STATUSES),
  /** Optional extra status detail, rendered under the header when present. */
  statusNote: z.string().optional(),
  /** External site, if the product has one of its own. Renders a "Visit →" button. */
  url: z.string().url().optional(),
  order: z.number().int().default(100),
  /**
   * Page palette. Omitted means the site's one colour mode (cream). `dark` renders that
   * product's page — chrome included — as the negative of the plate. Data, not a slug
   * check, and deliberately not a user-facing toggle: see app/globals.css § Dark dossier.
   * `/products/tycho` is the only page that sets this.
   */
  theme: z.enum(["light", "dark"]).optional(),
});
export type ProductFrontMatter = z.infer<typeof productFrontMatter>;

/** Work = the client portfolio, ported from the old intrinsiclabs.co case studies. */
export const caseStudyFrontMatter = z.object({
  name: z.string().min(1),
  /** The client or organization, when it can be named. Confidential engagements omit it. */
  client: z.string().optional(),
  /** One sentence describing the engagement. */
  line: z.string().min(1),
  year: z.string().optional(),
  /** Live site, if the client-facing product has a public URL. */
  url: z.string().url().optional(),
  /** `public/work/<slug>/<cover>` — absent falls back to GenerativeCover. */
  cover: z.string().optional(),
  order: z.number().int().default(100),
});
export type CaseStudyFrontMatter = z.infer<typeof caseStudyFrontMatter>;
