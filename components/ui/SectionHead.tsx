import Link from "next/link";

/** Numbered section heading: `03 — Latest` with an optional right-hand link. */
export function SectionHead({ n, title, href, hrefLabel }: { n: string; title: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between border-t border-ink pt-3 mb-8">
      <h2 className="flex items-baseline gap-4">
        <span className="label">{n}</span>
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
