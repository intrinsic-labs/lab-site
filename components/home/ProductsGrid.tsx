import { productImages, type Product } from "@/lib/content/products";
import { ProductCard } from "@/components/ui/ProductCard";

/** Home page: a card per product, same card /products uses, one line each. At most 4, and
 *  the same set /products lists: only products with an explicit `order` (< 100). That keeps
 *  out the vault (its own nav item) and Aspen Grove (no longer a company bet; its page and
 *  spec stay reachable). The product list is already ordered, so this is just a slice. */
export async function ProductsGrid({ items }: { items: Product[] }) {
  const featured = items.filter((i) => i.order < 100).slice(0, 4);
  const withImages = await Promise.all(featured.map(async (i) => ({ item: i, images: await productImages(i.slug) })));
  return (
    <ul className="card-grid sm:grid-cols-2 lg:grid-cols-4">
      {withImages.map(({ item, images }) => (
        <ProductCard
          key={item.slug}
          item={item}
          images={images}
          blurb={item.line}
        />
      ))}
    </ul>
  );
}
