import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";
import { Mdx } from "@/lib/mdx/render";

/**
 * What `/research/<slug>` shows for a `status: retired` post: the title, when it was first
 * published, when and why it was retired (`retired.reason`, from the post's own front
 * matter), and the way back to the index. The body is deliberately not rendered — a
 * retired post is withdrawn, not archived — so the URL resolves without re-publishing it.
 */
export function RetiredNotice({ post }: { post: Post & { retired: NonNullable<Post["retired"]> } }) {
  return (
    <article className="mx-auto max-w-[68ch] px-6 pt-16 pb-24 sm:pt-24">
      <p className="label">Retired</p>
      <h1 className="mt-6 font-serif text-4xl font-medium tracking-tight leading-[1.05] sm:text-5xl">{post.title}</h1>
      <p className="label mt-4">
        Published <time dateTime={post.date}>{formatDate(post.date)}</time> · Retired{" "}
        <time dateTime={post.retired.date}>{formatDate(post.retired.date)}</time>
      </p>
      <div className="prose prose-post mt-10 border-t border-rule pt-8">
        <Mdx source={post.retired.reason} />
      </div>
      <p className="mt-10">
        <Link href="/research" className="label hover:text-ink">All research →</Link>
      </p>
    </article>
  );
}
