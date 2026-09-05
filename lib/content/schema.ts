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

/**
 * Interactive demos a product page can carry in place of its screenshots. The value names a
 * component in `components/products/demos/` (the registry is `ProductDemo`); a page with one
 * renders it where the gallery would go and shows no hero image. Data, not a slug check —
 * `content/products/tycho.mdx` is the only file that sets it (2026-09-04, Asher: "ditch the
 * screenshots and instead inline an interactive prototype").
 */
export const PRODUCT_DEMOS = ["tycho"] as const;
export type ProductDemo = (typeof PRODUCT_DEMOS)[number];

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
  /** An interactive demo standing in for the gallery. See `PRODUCT_DEMOS`. */
  demo: z.enum(PRODUCT_DEMOS).optional(),
});
export type ProductFrontMatter = z.infer<typeof productFrontMatter>;

/**
 * The 3D wireframe point-cloud scenes ported from intrinsiclabs-co-v3
 * (`components/work/scenes/`) — a closed vocabulary because each id names an actual
 * component in that registry (`components/work/scenes/WorkSceneCanvas.tsx`), not a
 * free-form label.
 */
export const WORK_SCENE_IDS = [
  "dog-head", "wifi", "church", "bible", "total-station",
  // Open-source projects (2026-09-05): one small metaphor each, built from primitives.
  "spirograph", "weave", "clock", "tree", "chip", "vinyl",
] as const;
export type WorkSceneId = (typeof WORK_SCENE_IDS)[number];

/**
 * Per-case-study colour for the work-page 3D scenes and card hover accent — a closed
 * enum because each name is a semantic token declared in `app/globals.css`
 * (`--color-<name>`), not a free-form colour. `sky` is the one token added for this
 * purpose (the old Intrinsic Labs blue); the rest already existed. Absent → the scenes'
 * pre-tint `--color-ink-2` grey.
 */
export const WORK_TINTS = ["accent", "marker", "ember", "sky", "ink"] as const;
export type WorkTint = (typeof WORK_TINTS)[number];

/**
 * Which half of /work an item belongs to. `client` is the portfolio the page was built for;
 * `open-source` (2026-09-05, Asher: "a second section listing open source projects and cool
 * little 3d scenes") is the repos under github.com/intrinsic-labs — same card, same scenes,
 * listed below the client work.
 */
export const WORK_KINDS = ["client", "open-source"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

/** Work = the client portfolio, ported from the old intrinsiclabs.co case studies — plus,
 *  since 2026-09-05, the open-source projects (`kind: open-source`). */
export const caseStudyFrontMatter = z.object({
  name: z.string().min(1),
  kind: z.enum(WORK_KINDS).default("client"),
  /** Source repository, when it is public. Renders the "View on GitHub" action. */
  repo: z.string().url().optional(),
  /** App Store (or other storefront) listing, for a project sold rather than cloned. */
  store: z.string().url().optional(),
  /** Price as shown on the storefront, verbatim ("$14.99"). Only meaningful with `store`. */
  price: z.string().optional(),
  /** One short, honest status line ("Hardening in progress") — the card's label where a
   *  client item shows its client, and the eyebrow on the project page. */
  status: z.string().optional(),
  /** The client or organization, when it can be named. Confidential engagements omit it. */
  client: z.string().optional(),
  /** One sentence describing the engagement. */
  line: z.string().min(1),
  year: z.string().optional(),
  /** Live site, if the client-facing product has a public URL. */
  url: z.string().url().optional(),
  /** `public/work/<slug>/<cover>` — absent falls back to GenerativeCover. */
  cover: z.string().optional(),
  /** Ported 3D wireframe scene, rendered in the card cover slot and the case-study hero in
   * place of `cover`/GenerativeCover when set. Absent falls back to `cover`, then
   * GenerativeCover — see `WorkSceneCanvas`. */
  scene: z.enum(WORK_SCENE_IDS).optional(),
  /** Point-cloud + hover-accent colour. Absent → the pre-tint grey. */
  tint: z.enum(WORK_TINTS).optional(),
  order: z.number().int().default(100),
});
export type CaseStudyFrontMatter = z.infer<typeof caseStudyFrontMatter>;
