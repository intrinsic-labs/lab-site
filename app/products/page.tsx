import type { Metadata } from "next";
import { allProducts, productImages } from "@/lib/content/products";
import { ProductFeature } from "@/components/products/ProductFeature";
import { SnapSections } from "@/components/products/SnapSections";

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
 * The tail: anything left at the default `order` (100) is rendered `quiet` — smaller, last.
 * That is the vault, which is internal, and keying off the order it already declares avoids
 * a slug check here (the same reasoning as `theme` being front matter rather than
 * `slug === "tycho"`).
 */
export default async function ProductsPage() {
  const items = await allProducts();
  const withImages = await Promise.all(items.map(async (i) => ({ ...i, images: await productImages(i.slug) })));
  const features = withImages.filter((i) => i.order < 100);
  const tail = withImages.filter((i) => i.order >= 100);

  return (
    <div>
      <SnapSections />

      <header className="mx-auto max-w-6xl px-6 pt-16 pb-8 sm:pt-24" style={{ scrollSnapAlign: "start" }}>
        <p className="label mb-4">Products</p>
        <h1 className="font-sans text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
          What the workshop is building for itself.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-2">
          The company&rsquo;s own product bets — each listed with its real status, not left off until it ships.
        </p>
      </header>

      {features.map((i, n) => (
        <ProductFeature key={i.slug} product={i} images={i.images} flip={n % 2 === 1} />
      ))}

      {tail.length > 0 && (
        <div className="border-t border-rule">
          {tail.map((i) => (
            <ProductFeature key={i.slug} product={i} images={i.images} quiet />
          ))}
        </div>
      )}
    </div>
  );
}
