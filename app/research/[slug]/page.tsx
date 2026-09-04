import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { postBySlug, renderableSlugs } from "@/lib/content/posts";
import { Mdx } from "@/lib/mdx/render";
import { PostHeader } from "@/components/research/PostHeader";
import { PostMeta } from "@/components/research/PostMeta";
import { SystemPrimer } from "@/components/research/SystemPrimer";
import { cardo } from "@/components/research/fonts";
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
  return (
    <article className="mx-auto max-w-6xl px-6">
      <PostHeader post={post} />
      <div className="mx-auto max-w-[68ch]">
        {post.primer === "agent-ops" && <SystemPrimer />}
        {/* Cardo — latent-spaces-web's reading face, scoped to the body only. See docs/blog-style-notes.md. */}
        <div className={`prose prose-post py-12 ${cardo.className}`}>
          <Mdx source={post.body} />
        </div>
        <PostMeta post={post} />
      </div>
    </article>
  );
}
