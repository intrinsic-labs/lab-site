/**
 * URL slug for a spec heading. The numbering (`3.1`, `Appendix A —`) is presentation: it
 * is stripped so the slug survives a renumbering (the v1 sections were removed on
 * 2026-09-04 and everything after them moved up one — a slug carrying `2-` would have
 * broken every inbound link). `&` becomes `and` so "Purpose & design goals" reads as a
 * word, not a hole.
 */
export function headingSlug(title: string): string {
  return title
    .replace(/^\s*(?:\d+(?:\.\d+)*\.?|Appendix\s+[A-Z])\s*[—–-]?\s*/i, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
