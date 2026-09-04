import type { Post } from "@/lib/content/posts";
import { PostCard } from "@/components/research/PostCard";

/** Home page: the three most recent posts, as the same cards /research uses. */
export function LatestGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <ol className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
      {posts.map((p) => <PostCard key={p.slug} item={p} />)}
    </ol>
  );
}
