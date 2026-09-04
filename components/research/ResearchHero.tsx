import Link from "next/link";
import type { ReactNode } from "react";
import { AREAS, AREA_INFO } from "@/lib/content/areas";

/**
 * The research landing's masthead, in anthropic.com/research's shape: the word
 * "Research" set large on the left, a single paragraph of intro on the right, and
 * beneath it an inline "Research areas:" run of links into the three area pages.
 *
 * The paragraph is `content/pages/research-intro.md`, passed in already rendered —
 * prose stays in content/, per AGENTS.md. The area run is NOT prose: it is derived
 * from AREA_INFO, which is where that vocabulary is canonical, so declaring a fourth
 * area puts it here with no copy edit.
 *
 * This replaces the old PageTitle whose headline was "Everything we've published, on
 * a ladder" — the ladder is still what the kinds mean, but it is a caption on a card
 * now, not the page's title.
 */
export function ResearchHero({ intro }: { intro: ReactNode }) {
  return (
    <header className="grid gap-8 pt-16 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
      <h1 className="font-serif text-5xl font-medium leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
        Research
      </h1>
      <div className="max-w-2xl">
        <div className="text-lg text-ink-2">{intro}</div>
        <p className="mt-6 text-[0.95rem] leading-relaxed text-ink-2">
          <span className="label mr-2">Research areas:</span>
          {AREAS.map((a, i) => (
            <span key={a}>
              {i > 0 && <span className="text-ink-3"> · </span>}
              <Link
                href={`/research/areas/${a}`}
                className="text-ink underline decoration-1 underline-offset-4 transition-colors hover:text-accent"
              >
                {AREA_INFO[a].name}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </header>
  );
}
