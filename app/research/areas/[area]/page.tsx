import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AREAS, areaInfo } from "@/lib/content/areas";
import { postsByArea } from "@/lib/content/posts";
import { PageTitle } from "@/components/ui/PageTitle";
import { PostList } from "@/components/research/PostList";
import { SectionHead } from "@/components/ui/SectionHead";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

/**
 * Every declared area is generated, populated or not: area slugs are permanent URLs (ruled
 * 2026-09-03). An area with nothing listed renders `content/pages/research-area-empty.md`,
 * is marked noindex, and is left out of the nav, the area rows and the sitemap.
 */
export const dynamicParams = false;
export function generateStaticParams() { return AREAS.map((area) => ({ area })); }

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const a = areaInfo((await params).area);
  if (!a) return {};
  const empty = (await postsByArea(a.slug)).length === 0;
  return { title: a.name, description: a.line, robots: empty ? { index: false, follow: true } : undefined };
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const a = areaInfo((await params).area);
  if (!a) notFound();
  const posts = await postsByArea(a.slug);
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker={`Research area · ${a.beam}`} title={a.name}>
        <p className="font-serif italic text-xl">{a.line}</p>
        <p className="mt-4">{a.body}</p>
      </PageTitle>
      <section className="pt-12">
        <SectionHead n="01" title="Published" rule={false} />
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <div className="prose border-b border-rule py-5 text-ink-2 italic">
            <Mdx source={(await pageContent("research-area-empty")).content} />
          </div>
        )}
      </section>
    </div>
  );
}
