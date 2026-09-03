/**
 * The draft rail (publication-cadence.md §5.2).
 *
 * A post with `status: draft` is excluded at build time from every index, the feed and
 * the sitemap. Its route renders only outside production, so a Vercel preview shows a
 * draft for review and the same commit deployed to production 404s it. Publishing is
 * therefore a one-word diff — and a stray merge can't ship a draft.
 */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function draftsVisible(): boolean {
  return !isProduction();
}
