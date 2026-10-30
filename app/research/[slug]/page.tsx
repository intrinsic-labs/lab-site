import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { postBySlug, renderableSlugs } from "@/lib/content/posts";
import { Mdx } from "@/lib/mdx/render";
import { PostHeader } from "@/components/research/PostHeader";
import { PostMeta } from "@/components/research/PostMeta";
import { SystemPrimer } from "@/components/research/SystemPrimer";
import { RetiredNotice } from "@/components/research/RetiredNotice";
import { site } from "@/lib/site";

/**
 * Generated: published and retired posts everywhere, drafts only outside production (the
 * draft rail — `renderableSlugs()`, `lib/content/post-status.ts`). Anything else 404s.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await renderableSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await postBySlug((await params).slug);
  if (!post) return {};
  // A retired post's URL resolves to a notice, not content: keep it out of search indexes.
  if (post.retired) {
    return { title: post.title, description: post.retired.reason.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"), robots: { index: false, follow: true } };
  }
  return {
    title: post.title,
    description: post.summary,
    robots: post.status === "draft" ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      publishedTime: post.date,
      title: post.title,
      description: post.summary,
      url: `${site.url}/research/${post.slug}`,
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await postBySlug((await params).slug);
  if (!post) notFound();
  if (post.retired) return <RetiredNotice post={{ ...post, retired: post.retired }} />;
  return (
    <article className="mx-auto max-w-6xl px-6">
      <PostHeader post={post} />
      <div className="mx-auto max-w-[68ch]">
        {post.primer === "agent-ops" && <SystemPrimer />}
        {/* Tighter on phones (Asher, 2026-09-04): cover→body was 88px of air on a 390px screen. */}
        <div className="prose prose-post pt-4 pb-12 sm:pt-12">
          <Mdx source={post.body} />
        </div>
        <PostMeta post={post} />
      </div>
    </article>
  );
}
