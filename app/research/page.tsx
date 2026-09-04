import type { Metadata } from "next";
import { listablePosts } from "@/lib/content/posts";
import { ResearchHero } from "@/components/research/ResearchHero";
import { AreaBlocks } from "@/components/research/AreaBlocks";
import { FeaturedRow } from "@/components/research/FeaturedRow";
import { ResearchIndex, type IndexItem } from "@/components/research/ResearchIndex";
import { SectionHead } from "@/components/ui/SectionHead";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export const metadata: Metadata = { title: "Research", description: "Papers, notes and field notes from Intrinsic Labs." };

/**
 * The research landing, in anthropic.com/research's order: masthead (title left, intro
 * right, the areas as inline links) → the three area blocks → the newest post given
 * room, with the three behind it beside it → the archive grid with its filter.
 *
 * The old "Everything we've published, on a ladder" PageTitle and its serif filter row
 * are gone (Asher, 2026-09-04). The ladder still exists — it is what the kind pill on
 * each card means — but it is no longer the way in.
 *
 * The page is the light surface: app/research/layout.tsx wraps it in
 * `data-theme="light"`, and every component below reads the semantic tokens, so none of
 * them needed a change for the cream ground.
 */
export default async function ResearchPage() {
  const [posts, intro] = await Promise.all([listablePosts(), pageContent("research-intro")]);
  const items: IndexItem[] = posts.map((p) => ({
    slug: p.slug, title: p.title, kind: p.kind, area: p.area, date: p.date, draft: p.status === "draft", cover: p.cover, coverAlt: p.coverAlt,
  }));

  const [featured, ...behind] = items;
  const next = behind.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-8">
      <ResearchHero intro={<Mdx source={intro.content} />} />
      <AreaBlocks />
      {featured && <FeaturedRow featured={featured} next={next} />}
      {items.length > 0 && (
        <section>
          <SectionHead n="03" title="All research" />
          <ResearchIndex items={items} />
        </section>
      )}
    </div>
  );
}
