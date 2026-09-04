import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { postBySlug, renderableSlugs } from "@/lib/content/posts";
import { Mdx } from "@/lib/mdx/render";
import { PostHeader } from "@/components/research/PostHeader";
import { Artifacts } from "@/components/research/Artifacts";
import { Corrections } from "@/components/research/Corrections";
import { SystemPrimer } from "@/components/research/SystemPrimer";
import { site } from "@/lib/site";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await renderableSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await postBySlug((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    robots: post.status === "draft" ? { index: false, follow: false } : undefined,
    openGraph: { type: "article", publishedTime: post.date, title: post.title, description: post.summary, url: `${site.url}/research/${post.slug}` },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await postBySlug((await params).slug);
  if (!post) notFound();
  return (
    <article className="mx-auto max-w-6xl px-6">
      <PostHeader post={post} />
      {post.primer === "agent-ops" && <SystemPrimer />}
      <div className="py-12 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div className="prose min-w-0">
          <Mdx source={post.body} />
          <Artifacts post={post} />
          <Corrections post={post} />
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20 border-t border-ink pt-4 text-[0.9rem] text-ink-2 space-y-4">
            <p className="label">About this rung</p>
            <p>{rungNote(post.kind)}</p>
            <p className="label pt-2">Disclosure</p>
            <p>Drafted by an agent from the lab&apos;s own records; reviewed, corrected and approved by a human before publishing.</p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function rungNote(kind: "paper" | "note" | "field-note") {
  switch (kind) {
    case "paper": return "A full study. Method, protocol, results, limitations and artifacts.";
    case "note": return "A finding worth publishing that doesn't warrant a paper. Read the caveats as part of the result.";
    case "field-note": return "Short and specific: one thing that turned out to be true, written close to when it happened.";
  }
}
