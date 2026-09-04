import type { Metadata } from "next";
import { listablePosts } from "@/lib/content/posts";
import { PageTitle } from "@/components/ui/PageTitle";
import { ResearchIndex } from "@/components/research/ResearchIndex";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export const metadata: Metadata = { title: "Research", description: "Papers, notes and field notes from Intrinsic Labs." };

export default async function ResearchPage() {
  const [posts, intro] = await Promise.all([listablePosts(), pageContent("research-intro")]);
  const items = posts.map((p) => ({
    slug: p.slug, title: p.title, kind: p.kind, area: p.area, date: p.date, draft: p.status === "draft", cover: p.cover, coverAlt: p.coverAlt,
  }));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Research" title="Everything we've published, on a ladder.">
        <Mdx source={intro.content} />
      </PageTitle>
      <ResearchIndex items={items} />
    </div>
  );
}
