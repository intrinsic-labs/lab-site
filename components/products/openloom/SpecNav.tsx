"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeSectionSlug, sectionHref, type SpecSection } from "@/lib/openloom/routes";

type Props = { sections: SpecSection[] };

/**
 * The spec's table of contents — one entry per `##` section, the ACTIVE section expanded to
 * its `###` subsections as in-page anchors. Rendered twice from one component: a sticky
 * rail beside the reading column from `lg` up, and a `<details>` disclosure above it below
 * that, so a phone gets the same map without giving up the width. The disclosure is
 * re-keyed on the pathname so following a link closes it (a `<details>` has no other way
 * to be told the page moved on).
 *
 * Client component only for `usePathname` — the layout that owns the two-column shell is a
 * server component and cannot know which sub-route is showing.
 */
export function SpecNav({ sections }: Props) {
  const pathname = usePathname();
  const active = activeSectionSlug(pathname, sections);
  const list = <SectionList sections={sections} active={active} />;
  return (
    <>
      <details key={pathname} className="group mb-10 border-y border-rule py-3 lg:hidden">
        <summary className="label flex cursor-pointer list-none items-center justify-between text-ink">
          Contents
          <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-90">
            →
          </span>
        </summary>
        <div className="pt-4">{list}</div>
      </details>
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4">
          <p className="label mb-4 text-ink-3">Contents</p>
          {list}
        </div>
      </aside>
    </>
  );
}

function SectionList({ sections, active }: { sections: SpecSection[]; active?: string }) {
  return (
    <nav aria-label="Specification sections">
      <ol className="space-y-2">
        {sections.map((s) => {
          const isActive = s.slug === active;
          return (
            <li key={s.slug}>
              <Link
                href={sectionHref(s, sections)}
                aria-current={isActive ? "page" : undefined}
                // `.label`'s own colour is unlayered CSS and would beat the `text-accent`
                // utility, so the label's type is spelled out here and the colour stays free.
                className={`block font-code text-[0.74rem] uppercase leading-snug tracking-[0.08em] transition-colors hover:text-accent ${
                  isActive ? "text-accent" : "text-ink-2"
                }`}
              >
                {s.title}
              </Link>
              {isActive && s.subsections.length > 0 && (
                <ol className="mt-2 mb-3 space-y-1.5 border-l border-rule pl-3">
                  {s.subsections.map((sub) => (
                    <li key={sub.slug}>
                      <a
                        href={`#${sub.slug}`}
                        className="block font-code text-[0.78rem] leading-snug text-ink-2 transition-colors hover:text-accent"
                      >
                        {sub.title}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
