import type { Post } from "@/lib/content/posts";

/** Ship the artifact next to the claim. Empty says why rather than hiding. */
export function Artifacts({ post }: { post: Post }) {
  return (
    <section className="mt-16 border-t border-ink pt-4">
      <p className="label mb-4">Artifacts</p>
      {post.artifacts.length === 0 ? (
        <p className="text-ink-2 text-[0.95rem] italic">{post.artifactsNote ?? "Nothing from this work can be released."}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {post.artifacts.map((a, i) => (
            <li key={i} className="border border-rule p-3 text-[0.95rem]">
              {a.href ? (
                <a href={a.href} className="font-medium underline decoration-1 underline-offset-3">{a.label} ↗</a>
              ) : (
                <span className="font-medium">{a.label}</span>
              )}
              {a.note && <p className="text-ink-2 mt-1 leading-snug">{a.note}</p>}
            </li>
          ))}
        </ul>
      )}
      {post.artifacts.length > 0 && post.artifactsNote && (
        <p className="text-ink-2 text-[0.95rem] italic mt-3">{post.artifactsNote}</p>
      )}
    </section>
  );
}
