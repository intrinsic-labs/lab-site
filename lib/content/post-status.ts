/**
 * What a post's `status` means for each surface — the one place that decides it, kept free
 * of Next, React and the filesystem so `tests/content-status.test.mjs` can check it directly.
 *
 * - `published`: listed, in the feed and sitemap, route generated everywhere.
 * - `draft` (the draft rail, publication-cadence.md §5.2 — do not weaken): never in the feed
 *   or sitemap; listed and routed only where `draftsVisible` (outside production).
 * - `retired`: a post withdrawn after publication. Its URL keeps resolving — everywhere,
 *   production included — to a short notice (`retired.reason`) instead of the body, so old
 *   links don't dead-end; it is never listed, never in the feed, never in the sitemap.
 */
export const POST_STATUSES = ["draft", "published", "retired"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

interface HasStatus {
  status: PostStatus;
}

/** Feed and sitemap: published posts only, on every deployment. */
export function inFeed(p: HasStatus): boolean {
  return p.status === "published";
}

/** Indexes (research, area pages, home): published, plus drafts where the rail shows them. */
export function isListed(p: HasStatus, draftsVisible: boolean): boolean {
  return p.status === "published" || (p.status === "draft" && draftsVisible);
}

/** Whether `/research/<slug>` is generated: everything but a draft the rail hides. */
export function isRoutable(p: HasStatus, draftsVisible: boolean): boolean {
  return p.status !== "draft" || draftsVisible;
}
