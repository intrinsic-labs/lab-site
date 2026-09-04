import type { Post } from "@/lib/content/posts";
import { PostCard } from "./PostCard";

/** A grid of post cards (gap-px seam trick — see components/home/AreaCards.tsx). */
export function PostList({ posts, empty }: { posts: Post[]; empty?: string }) {
  if (posts.length === 0) {
    return <p className="border-b border-rule py-5 text-ink-2 italic">{empty ?? "Nothing here yet."}</p>;
  }
  return (
    <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
      {posts.map((p) => (
        <PostCard
          key={p.slug}
          item={{ slug: p.slug, title: p.title, kind: p.kind, date: p.date, draft: p.status === "draft", cover: p.cover, coverAlt: p.coverAlt }}
        />
      ))}
    </ul>
  );
}
