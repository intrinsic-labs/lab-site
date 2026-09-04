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
 * docs/style-notes.md.
 *
 * TWO MEASURES, and that is the point (Asher, 2026-09-04: "the image should be front and
 * center, wider than the text"). The type block keeps the reading column's 68ch — the same
 * measure the body below it uses, so the title sits over the prose rather than beside it —
 * while the image breaks out to max-w-5xl at a 2xl radius. Anthropic's research posts do
 * exactly this: a ~3xl text column under a wider hero. The GenerativeCover fallback is
 * rendered at the identical size, so a post with no cover has the same silhouette.
 */
export function PostHeader({ post }: { post: Post }) {
  const primary = post.artifacts[0];
  return (
    <header className="mx-auto max-w-5xl pt-14 pb-10">
      <div className="mx-auto max-w-[68ch] text-center">
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
      </div>

      <div className="mt-12 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-rule">
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
