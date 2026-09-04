import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";
import { KindLabel } from "./KindLabel";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { ButtonLink } from "@/components/ui/ButtonLink";

/** Guess a CTA label from the primary artifact's own label text — the schema carries no
 * artifact "kind" field, so this reads the words the post author already chose. */
function artifactButtonLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("paper")) return "Read the paper";
  if (l.includes("repo") || l.includes("code") || l.includes("github")) return "View the repo";
  if (l.includes("dataset") || l.includes("data")) return "Open the dataset";
  return "View artifact";
}

/**
 * Centered post header, ported to the Anthropic-blog shape: kind → title → date → one
 * button (only when there's a primary, linkable artifact) → the big featured image —
 * then straight into the body. Summary, area, draft status, caveats, corrections and the
 * full artifact list all moved to PostMeta at the foot of the post; see
 * docs/blog-style-notes.md.
 */
export function PostHeader({ post }: { post: Post }) {
  const primary = post.artifacts[0];
  return (
    <header className="mx-auto max-w-[68ch] pt-14 pb-10 text-center">
      <KindLabel kind={post.kind} />
      <h1 className="mt-6 font-serif text-4xl font-medium tracking-tight leading-[1.05] sm:text-5xl">{post.title}</h1>
      <time dateTime={post.date} className="label mt-4 block">{formatDate(post.date)}</time>

      {primary?.href && (
        <div className="mt-6">
          <ButtonLink href={primary.href} tone="ink" external>
            {artifactButtonLabel(primary.label)}
          </ButtonLink>
        </div>
      )}

      <div className="mt-10 aspect-[16/9] w-full overflow-hidden rounded-lg">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt={post.coverAlt ?? ""} className="h-full w-full object-cover" />
        ) : (
          <GenerativeCover seed={post.slug} className="h-full w-full" />
        )}
      </div>
    </header>
  );
}
