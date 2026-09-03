import type { Metadata } from "next";
import { listablePosts } from "@/lib/content/posts";
import { PageTitle } from "@/components/ui/PageTitle";
import { ResearchIndex } from "@/components/research/ResearchIndex";
import { KINDS, KIND_LABEL, KIND_CLAIM } from "@/lib/content/kinds";

export const metadata: Metadata = { title: "Research", description: "Papers, notes and field notes from Intrinsic Labs." };

export default async function ResearchPage() {
  const posts = await listablePosts();
  const items = posts.map((p) => ({
    slug: p.slug, title: p.title, summary: p.summary, kind: p.kind, area: p.area, date: p.date, draft: p.status === "draft",
  }));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Research" title="Everything we've published, on a ladder.">
        <p>
          Three rungs, so a half-finished finding can go up honestly instead of being inflated to paper weight or
          never shipped. Each item wears its rung.
        </p>
      </PageTitle>
      <dl className="grid gap-6 sm:grid-cols-3 py-8 border-b border-rule">
        {KINDS.map((k) => (
          <div key={k}>
            <dt className="label">{KIND_LABEL[k]}</dt>
            <dd className="text-ink-2 mt-1 text-[0.95rem] leading-snug">{KIND_CLAIM[k]}</dd>
          </div>
        ))}
      </dl>
      <ResearchIndex items={items} />
    </div>
  );
}
