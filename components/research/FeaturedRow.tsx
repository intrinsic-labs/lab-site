import Link from "next/link";
import { formatDate } from "@/lib/content/format";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { KindLabel } from "./KindLabel";
import { SectionHead } from "@/components/ui/SectionHead";
import type { IndexItem } from "./ResearchIndex";

/**
 * The latest post, given the room the newest thing deserves — a wide cover on the left
 * and the headline beside it — with the three behind it as a compact dated list down the
 * right. anthropic.com/research's shape. Everything older falls through to the card grid.
 *
 * A card is a card and a list row is a list row: the three on the right are deliberately
 * text-only, so the eye lands on the featured cover first and the grid below reads as the
 * archive rather than as more of the same.
 */
function Cover({ item, className }: { item: IndexItem; className?: string }) {
  return item.cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.cover} alt={item.coverAlt ?? ""} className={className} />
  ) : (
    <GenerativeCover seed={item.slug} className={className} />
  );
}

export function FeaturedRow({ featured, next }: { featured: IndexItem; next: IndexItem[] }) {
  return (
    <section className="pb-16">
      <SectionHead n="02" title="Latest" rule={false} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12">
        <article className="grid gap-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-8">
          <Link
            href={`/research/${featured.slug}`}
            className="group block aspect-[4/3] overflow-hidden rounded-2xl border border-rule sm:aspect-[5/4]"
          >
            <Cover
              item={featured}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </Link>
          <div>
            <p className="flex items-center gap-2">
              <KindLabel kind={featured.kind} />
              {featured.draft && <span className="pill pill-marker">Draft</span>}
            </p>
            <h3 className="mt-4 font-serif text-2xl leading-tight tracking-tight sm:text-3xl">
              <Link href={`/research/${featured.slug}`} className="hover:underline decoration-1 underline-offset-4">
                {featured.title}
              </Link>
            </h3>
            <time dateTime={featured.date} className="label mt-4 block">
              {formatDate(featured.date)}
            </time>
          </div>
        </article>

        {next.length > 0 && (
          <ul className="flex flex-col border-t border-rule lg:border-t-0 lg:border-l lg:pl-8">
            {next.map((item) => (
              <li key={item.slug} className="border-b border-rule py-4 first:lg:pt-0">
                <Link href={`/research/${item.slug}`} className="group block no-underline">
                  <h3 className="font-serif text-[1.05rem] leading-snug text-ink group-hover:underline decoration-1 underline-offset-4">
                    {item.title}
                  </h3>
                  <p className="label mt-2 flex items-center gap-2">
                    <KindLabel kind={item.kind} />
                    <span className="text-ink-3">{formatDate(item.date)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
