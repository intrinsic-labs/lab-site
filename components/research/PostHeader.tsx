import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";
import { AREA_INFO } from "@/lib/content/areas";
import { KindLabel } from "./KindLabel";

/**
 * Centered post header — category → title → meta → cover image, the flow ported from
 * latent-spaces-web's BlogPostHeader (kept in our own type/colour system; see
 * docs/blog-style-notes.md). Caveats, when present, render here too — above the fold, as
 * a simple indented block, never a boxed Frame.
 */
export function PostHeader({ post }: { post: Post }) {
  return (
    <header className="mx-auto max-w-[68ch] border-b border-rule pt-14 pb-10">
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <KindLabel kind={post.kind} />
          <Link href={`/research/areas/${post.area}`} className="label hover:text-ink">{AREA_INFO[post.area].name}</Link>
          <span className="label text-ink-3">·</span>
          <time dateTime={post.date} className="label">{formatDate(post.date)}</time>
          {post.status === "draft" && (
            <>
              <span className="label text-ink-3">·</span>
              <span className="label text-accent">Draft — preview only</span>
            </>
          )}
        </div>
        <h1 className="mt-6 font-serif text-4xl font-medium tracking-tight leading-[1.05] sm:text-5xl">{post.title}</h1>
        <p className="mx-auto mt-6 max-w-[52ch] text-xl leading-snug text-ink-2">{post.summary}</p>
      </div>

      {post.cover && (
        <div className="mt-10 aspect-[16/9] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover} alt={post.coverAlt ?? ""} className="h-full w-full object-cover" />
        </div>
      )}

      {post.caveats.length > 0 && (
        <div className="mx-auto mt-10 max-w-[52ch] pl-5 text-left">
          <p className="label mb-2">Caveats</p>
          <ul className="list-square space-y-1.5 pl-5 text-[0.95rem] leading-snug text-ink-2">
            {post.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
