import Link from "next/link";

/**
 * Section heading, optionally numbered (`03 — Latest`), with an optional right-hand link.
 * The research surfaces pass no `n` (Asher, 2026-09-04: drop the 01/02/03 there); About keeps them. `rule={false}`
 * drops the top hairline — use it when a card grid sits directly below, whose own gap-px
 * seam already reads as the divider (too many hairlines was a standing note).
 */
export function SectionHead({ n, title, href, hrefLabel, rule = true }: { n?: string; title: string; href?: string; hrefLabel?: string; rule?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between mb-8 ${rule ? "border-t border-ink pt-3" : ""}`}>
      <h2 className="flex items-baseline gap-4">
        {n && <span className="label">{n}</span>}
        <span className="font-serif text-2xl font-medium tracking-tight">{title}</span>
      </h2>
      {href && (
        <Link href={href} className="label hover:text-ink">
          {hrefLabel ?? "All"} →
        </Link>
      )}
    </div>
  );
}
