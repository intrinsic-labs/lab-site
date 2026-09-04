import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";
import { AREA_INFO } from "@/lib/content/areas";
import { KindLabel } from "./KindLabel";

/** One index row: kind · date · title · one line. Nobody shows abstracts in an index. */
export function PostRow({ post, showArea = true }: { post: Post; showArea?: boolean }) {
  return (
    <li className="py-5 grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-8">
      <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
        <KindLabel kind={post.kind} />
        <time dateTime={post.date} className="label">{formatDate(post.date)}</time>
        {post.status === "draft" && <span className="label text-accent">draft</span>}
      </div>
      <div>
        <h3 className="font-serif text-xl leading-snug">
          <Link href={`/research/${post.slug}`} className="hover:underline decoration-1 underline-offset-4">
            {post.title}
          </Link>
        </h3>
        <p className="text-ink-2 mt-1 leading-snug">{post.summary}</p>
        {showArea && (
          <Link href={`/research/areas/${post.area}`} className="label mt-3 inline-block hover:text-ink">
            {AREA_INFO[post.area].name}
          </Link>
        )}
      </div>
    </li>
  );
}
