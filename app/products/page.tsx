import type { Metadata } from "next";
import { allProducts, productImages } from "@/lib/content/products";
import { PageTitle } from "@/components/ui/PageTitle";
import { ProductCard } from "@/components/ui/ProductCard";

export const metadata: Metadata = { title: "Products", description: "The company's own product bets." };

export default async function ProductsPage() {
  const items = await allProducts();
  const withImages = await Promise.all(items.map(async (i) => ({ ...i, images: await productImages(i.slug) })));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Products" title="What the workshop is building for itself.">
        <p>The company&rsquo;s own product bets — each listed with its real status, not left off until it ships.</p>
      </PageTitle>
      <ul className="card-grid sm:grid-cols-2 lg:grid-cols-3">
        {withImages.map((i) => <ProductCard key={i.slug} item={i} images={i.images} />)}
      </ul>
    </div>
  );
}
