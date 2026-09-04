import type { ReactNode } from "react";

/**
 * The research landing's masthead, in anthropic.com/research's shape: the word
 * "Research" set large on the left, a single paragraph of intro on the right.
 *
 * The paragraph is `content/pages/research-intro.md`, passed in already rendered —
 * prose stays in content/, per AGENTS.md. The inline "Research areas:" link run that
 * used to sit under it is gone (Asher, 2026-09-04) — the area row directly below and
 * the nav dropdown already carry those links.
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
      </div>
    </header>
  );
}
