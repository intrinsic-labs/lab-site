import type { Metadata } from "next";
import { listablePosts } from "@/lib/content/posts";
import { PageTitle } from "@/components/ui/PageTitle";
import { ResearchIndex } from "@/components/research/ResearchIndex";
import { KINDS, KIND_LABEL, KIND_CLAIM } from "@/lib/content/kinds";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export const metadata: Metadata = { title: "Research", description: "Papers, notes and field notes from Intrinsic Labs." };

export default async function ResearchPage() {
  const [posts, intro] = await Promise.all([listablePosts(), pageContent("research-intro")]);
  const items = posts.map((p) => ({
    slug: p.slug, title: p.title, summary: p.summary, kind: p.kind, area: p.area, date: p.date, draft: p.status === "draft",
  }));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Research" title="Everything we've published, on a ladder.">
        <Mdx source={intro.content} />
      </PageTitle>
      <p className="text-ink-2 -mt-2 mb-8 max-w-2xl text-[0.95rem] leading-snug">
        Items marked <em>draft</em> are agent-written and not yet approved by a human; they appear
        only on preview builds.
      </p>
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
