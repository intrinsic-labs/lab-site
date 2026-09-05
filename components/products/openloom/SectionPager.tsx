import Link from "next/link";
import { sectionHref, type SpecSection } from "@/lib/openloom/routes";

type Props = { prev?: SpecSection; next?: SpecSection; sections: SpecSection[] };

/** Prev / next at the foot of a section — the linear read the rail's map doesn't give. */
export function SectionPager({ prev, next, sections }: Props) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Adjacent sections" className="mt-14 flex justify-between gap-6 border-t border-rule pt-8">
      <div className="min-w-0">
        {prev && (
          <Link href={sectionHref(prev, sections)} className="group block">
            <span className="label block text-ink-3">← Previous</span>
            <span className="mt-1 block font-sans text-ink-2 transition-colors group-hover:text-accent">
              {prev.title}
            </span>
          </Link>
        )}
      </div>
      <div className="min-w-0 text-right">
        {next && (
          <Link href={sectionHref(next, sections)} className="group block">
            <span className="label block text-ink-3">Next →</span>
            <span className="mt-1 block font-sans text-ink-2 transition-colors group-hover:text-accent">
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
