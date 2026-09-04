import Link from "next/link";
import type { CaseStudy } from "@/lib/content/work";
import { GenerativeCover } from "@/components/ui/GenerativeCover";

/** One case-study card: cover image (or generated cover), name, client, one line.
 *  Mirrors ProductCard's shape so /work reads as the same family of card as /products. */
export function WorkCard({ item }: { item: CaseStudy }) {
  const href = `/work/${item.slug}`;
  return (
    <li className="flex flex-col bg-paper">
      <Link href={href} className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-rule">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <GenerativeCover seed={item.slug} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl">
          <Link href={href} className="hover:underline decoration-1 underline-offset-4">{item.name}</Link>
        </h3>
        {item.client && item.client !== item.name && <p className="label mt-1 text-ink-3">{item.client}</p>}
        <p className="mt-2 flex-1 text-[0.95rem] leading-snug text-ink-2">{item.line}</p>
      </div>
    </li>
  );
}
