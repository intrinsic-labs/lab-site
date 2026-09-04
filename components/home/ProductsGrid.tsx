import { productImages, type Instrument } from "@/lib/content/instruments";
import { ProductCard } from "@/components/ui/ProductCard";

/** Home page: a card per product, same card /products uses, one line each. */
export async function ProductsGrid({ items }: { items: Instrument[] }) {
  const withImages = await Promise.all(items.map(async (i) => ({ item: i, images: await productImages(i.slug) })));
  return (
    <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
      {withImages.map(({ item, images }) => (
        <ProductCard
          key={item.slug}
          item={item}
          images={images}
          blurb={
            item.slug === "tycho"
              ? <><span className="text-ink">Produces The Ghost.</span> Builds a model of one person&rsquo;s judgment from the decisions they have already made.</>
              : item.measures
          }
        />
      ))}
    </ul>
  );
}
