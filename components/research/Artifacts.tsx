import type { Post } from "@/lib/content/posts";

/** Ship the artifact next to the claim. Nothing renders when there's nothing to ship. */
export function Artifacts({ post }: { post: Post }) {
  if (post.artifacts.length === 0) return null;
  return (
    <section className="mt-12">
      <p className="label mb-4">Artifacts</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {post.artifacts.map((a, i) => (
          <li key={i} className="border border-rule p-3 text-[0.95rem]">
            {a.href ? (
              <a href={a.href} className="font-medium underline decoration-1 underline-offset-3">{a.label} ↗︎</a>
            ) : (
              <span className="font-medium">{a.label}</span>
            )}
            {a.note && <p className="mt-1 leading-snug text-ink-2">{a.note}</p>}
          </li>
        ))}
      </ul>
      {post.artifactsNote && <p className="mt-3 text-[0.95rem] text-ink-2 italic">{post.artifactsNote}</p>}
    </section>
  );
}
