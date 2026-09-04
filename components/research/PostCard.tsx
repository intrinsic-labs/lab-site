import Link from "next/link";
import type { Kind } from "@/lib/content/kinds";
import { formatDate } from "@/lib/content/format";
import { KindLabel } from "./KindLabel";
import { GenerativeCover } from "@/components/ui/GenerativeCover";

/** The slice of a post a card needs — satisfied by both `Post` and `ResearchIndex`'s filtered items. */
export interface PostCardItem {
  slug: string;
  title: string;
  kind: Kind;
  date: string;
  draft?: boolean;
  cover?: string;
  coverAlt?: string;
}

/**
 * One card in a research grid: cover on top, serif title, kind + date below — the same
 * composition components/home/LatestGrid.tsx uses for the front page, so a card reads the
 * same wherever it appears. Renders a real cover when the post has one; falls back to a
 * generated one otherwise. The newsroom-grid target: ref 02 in Design/refs/lab-site.
 */
export function PostCard({ item }: { item: PostCardItem }) {
  return (
    <li className="flex flex-col bg-paper">
      <Link href={`/research/${item.slug}`} className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-rule">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover}
            alt={item.coverAlt ?? ""}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <GenerativeCover seed={item.slug} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
        {item.draft && (
          <span className="label absolute top-2 right-2 border border-rule bg-paper/90 px-1.5 py-0.5">Draft</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-lg leading-snug">
          <Link href={`/research/${item.slug}`} className="hover:underline decoration-1 underline-offset-4">{item.title}</Link>
        </h3>
        <p className="label mt-3 flex items-center gap-2">
          <KindLabel kind={item.kind} />
          <span className="text-ink-3">{formatDate(item.date)}</span>
        </p>
      </div>
    </li>
  );
}
