import Link from "next/link";
import type { Product, ProductImages } from "@/lib/content/products";
import { STATUS_LABEL } from "@/lib/content/products";
import { Chip } from "./Chip";
import { GenerativeCover } from "./GenerativeCover";

/** One product card: image, name, one line, status label. Used by the home page's Products row.
 *  (`/products` itself is no longer a card grid — it is a stack of full-width feature sections,
 *  `components/products/ProductFeature.tsx`.)
 *
 *  The image slot prefers `public/products/<slug>/card.*` and falls back to `hero.*`, because
 *  the two crop differently: a card is `object-cover` at 4:3 while the product page shows the
 *  hero uncropped, so a 16:9 hero often loses its subject in the card. Dropping a `card.png`
 *  into the folder is the whole fix — no code change, no front-matter field (Asher, 2026-09-04:
 *  "the images on the home row don't work, I just need different images"). Neither present
 *  falls back to the seeded `GenerativeCover`. See public/products/README.md. */
export function ProductCard({ item, images, blurb }: { item: Product; images: ProductImages; blurb?: React.ReactNode }) {
  const href = `/products/${item.slug}`;
  const cover = images.card ?? images.hero;
  return (
    <li className="flex flex-col bg-paper">
      <Link href={href} className="group relative block aspect-[4/3] w-full overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <GenerativeCover seed={item.slug} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl">
          <Link href={href} className="hover:underline decoration-1 underline-offset-4">{item.name}</Link>
        </h3>
        <p className="mt-2 flex-1 text-[0.95rem] leading-snug text-ink-2">{blurb ?? item.line}</p>
        <div className="mt-4"><Chip tone={item.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[item.status]}</Chip></div>
      </div>
    </li>
  );
}
