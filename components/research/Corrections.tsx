import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";

/** Appended, dated, never a silent edit. Renders only once there's a correction to show. */
export function Corrections({ post }: { post: Post }) {
  if (post.corrections.length === 0) return null;
  return (
    <section className="mt-12">
      <p className="label mb-3">Corrections</p>
      <ol className="space-y-2 text-[0.95rem]">
        {post.corrections.map((c, i) => (
          <li key={i} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <time dateTime={c.date} className="label">{formatDate(c.date)}</time>
            <p>{c.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
