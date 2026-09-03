import type { Post } from "@/lib/content/posts";
import { PostRow } from "./PostRow";

export function PostList({ posts, showArea = true, empty }: { posts: Post[]; showArea?: boolean; empty?: string }) {
  if (posts.length === 0) {
    return <p className="text-ink-2 italic border-b border-rule py-5">{empty ?? "Nothing here yet."}</p>;
  }
  return (
    <ul className="border-t border-ink">
      {posts.map((p) => (
        <PostRow key={p.slug} post={p} showArea={showArea} />
      ))}
    </ul>
  );
}
