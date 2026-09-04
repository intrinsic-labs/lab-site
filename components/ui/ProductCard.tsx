import Link from "next/link";
import type { Product, ProductImages } from "@/lib/content/products";
import { STATUS_LABEL } from "@/lib/content/products";
import { Chip } from "./Chip";
import { GenerativeCover } from "./GenerativeCover";

/** One product card: hero image (or generated cover), name, one line, status chip.
 *  Shared by the home page's Products grid and /products so a product reads the same everywhere. */
export function ProductCard({ item, images, blurb }: { item: Product; images: ProductImages; blurb?: React.ReactNode }) {
  const href = `/products/${item.slug}`;
  return (
    <li className="flex flex-col bg-paper">
      <Link href={href} className="group relative block aspect-[4/3] w-full overflow-hidden border-b border-rule">
        {images.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images.hero} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
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
