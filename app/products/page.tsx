import type { Metadata } from "next";
import { allProducts, productImages } from "@/lib/content/products";
import { ProductFeature } from "@/components/products/ProductFeature";

export const metadata: Metadata = { title: "Products", description: "The company's own product bets." };

/**
 * `/products` is a STACK OF STAGES, not a grid of cards.
 *
 * Asher, 2026-09-04: "they need to look like their own standalone products, whereas this
 * looks like a list of blog posts." A card grid flattens five different things into five
 * identical cells; one full-width section per product, with a lot of air between them,
 * makes each one arrive on its own. `ProductCard` still exists and is still what the home
 * page's products row uses — it just isn't this page any more.
 *
 * Only products with an explicit `order` (< 100) are listed. IntrinsicOS keeps the default
 * order (100) and is deliberately NOT on this page: since 2026-09-04 it is its own nav item —
 * it is the thing the whole site is about, not one bet among four. The scroll-snap this page
 * had (`SnapSections`) was removed the same day at Asher's request.
 */
export default async function ProductsPage() {
  const items = await allProducts();
  const withImages = await Promise.all(items.map(async (i) => ({ ...i, images: await productImages(i.slug) })));
  const features = withImages.filter((i) => i.order < 100);

  return (
    <div>
      <header className="mx-auto max-w-6xl px-6 pt-8 pb-2 sm:pt-24 sm:pb-8">
        <p className="label mb-4">Products</p>
        <h1 className="font-sans text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
          What the workshop is building for itself.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2 sm:mt-6">
          The company&rsquo;s own product bets — each listed with its real status, not left off until it ships.
        </p>
      </header>

      {/* The first stage sits closer to the header on a phone (Asher, 2026-09-04: "the
          vertical spacing between individual products is good" — it is the header→first
          gap that was slack). Between-product spacing is untouched. */}
      {features.map((i, n) => (
        <ProductFeature key={i.slug} product={i} images={i.images} flip={n % 2 === 1} priority={n === 0} className={n === 0 ? "-mt-4 sm:mt-0" : undefined} />
      ))}

    </div>
  );
}
