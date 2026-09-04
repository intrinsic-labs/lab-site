import { productImages, type Product } from "@/lib/content/products";
import { ProductCard } from "@/components/ui/ProductCard";

/** Home page: a card per product, same card /products uses, one line each. At most 4 —
 *  the vault is excluded (its status is "internal", not a home-page pitch) and the
 *  product list is already ordered, so this is just a slice. */
export async function ProductsGrid({ items }: { items: Product[] }) {
  const featured = items.filter((i) => i.slug !== "vault").slice(0, 4);
  const withImages = await Promise.all(featured.map(async (i) => ({ item: i, images: await productImages(i.slug) })));
  return (
    <ul className="card-grid sm:grid-cols-2 lg:grid-cols-4">
      {withImages.map(({ item, images }) => (
        <ProductCard
          key={item.slug}
          item={item}
          images={images}
          blurb={
            item.slug === "tycho"
              ? <><span className="text-ink">Produces The Ghost.</span> Builds a model of one person&rsquo;s judgment from the decisions they have already made.</>
              : item.line
          }
        />
      ))}
    </ul>
  );
}
