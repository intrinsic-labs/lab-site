import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";

/** Appended, dated, never a silent edit. Rendered even when empty so the promise is visible. */
export function Corrections({ post }: { post: Post }) {
  return (
    <section className="mt-12 border-t border-rule pt-4">
      <p className="label mb-3">Corrections</p>
      {post.corrections.length === 0 ? (
        <p className="text-ink-3 text-[0.95rem] italic">None yet. Corrections are appended here with their dates; the original text is never silently changed.</p>
      ) : (
        <ol className="space-y-2 text-[0.95rem]">
          {post.corrections.map((c, i) => (
            <li key={i} className="grid sm:grid-cols-[9rem_1fr] gap-1 sm:gap-6">
              <time dateTime={c.date} className="label">{formatDate(c.date)}</time>
              <p>{c.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
