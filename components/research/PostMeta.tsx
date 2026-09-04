import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";
import { AREA_INFO } from "@/lib/content/areas";

/**
 * Quiet metadata block at the foot of a post — everything the Anthropic-shaped header no
 * longer carries: area, draft status, caveats, corrections, and the full artifact list
 * (the primary one already has a button up top). One hairline above it, small type
 * throughout. Each field renders only when it has something to say. Folds in what used
 * to be separate Artifacts/Corrections components — this is the only place they're used.
 */
export function PostMeta({ post }: { post: Post }) {
  return (
    <section className="mt-16 border-t border-rule pt-8 text-[0.9rem] text-ink-2">
      <p className="label mb-3">About this note</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span>
          Area:{" "}
          <Link href={`/research/areas/${post.area}`} className="text-ink underline decoration-1 underline-offset-3 hover:text-accent">
            {AREA_INFO[post.area].name}
          </Link>
        </span>
        {post.status === "draft" && (
          <>
            <span className="text-ink-3">·</span>
            <span className="text-accent">Draft — not yet published</span>
          </>
        )}
      </div>

      {post.caveats.length > 0 && (
        <div className="mt-6">
          <p className="label mb-2">Caveats</p>
          <ul className="list-disc space-y-1.5 pl-5 leading-snug">
            {post.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {post.corrections.length > 0 && (
        <div className="mt-6">
          <p className="label mb-2">Corrections</p>
          <ol className="space-y-2">
            {post.corrections.map((c, i) => (
              <li key={i} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <time dateTime={c.date} className="label">{formatDate(c.date)}</time>
                <p>{c.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {post.artifacts.length > 0 && (
        <div className="mt-6">
          <p className="label mb-2">Artifacts</p>
          <ul className="space-y-1.5">
            {post.artifacts.map((a, i) => (
              <li key={i}>
                {a.href ? (
                  <a href={a.href} className="text-ink underline decoration-1 underline-offset-3 hover:text-accent">{a.label} ↗︎</a>
                ) : (
                  <span className="text-ink">{a.label}</span>
                )}
                {a.note && <span className="ml-1">— {a.note}</span>}
              </li>
            ))}
          </ul>
          {post.artifactsNote && <p className="mt-2 italic">{post.artifactsNote}</p>}
        </div>
      )}
    </section>
  );
}
