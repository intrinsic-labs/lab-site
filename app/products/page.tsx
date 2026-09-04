import type { Metadata } from "next";
import { allInstruments, productImages } from "@/lib/content/instruments";
import { PageTitle } from "@/components/ui/PageTitle";
import { ProductCard } from "@/components/ui/ProductCard";

export const metadata: Metadata = { title: "Products", description: "The tools the research runs on." };

export default async function ProductsPage() {
  const items = await allInstruments();
  const withImages = await Promise.all(items.map(async (i) => ({ ...i, images: await productImages(i.slug) })));
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Products" title="The tools the research runs on.">
        <p>
          An instrument exists to take a measurement. Neither of ours is distributed yet — the source of both
          is private today. Each is listed here with its status rather than left off until it is open source.
        </p>
        <p className="mt-4 font-medium text-ink">
          One line that governs this page: the <em>method</em> is published; the <em>corpus</em> — the personal
          data the elicitation work is built on — never is, and is not listed here.
        </p>
      </PageTitle>
      <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {withImages.map((i) => <ProductCard key={i.slug} item={i} images={i.images} />)}
      </ul>
    </div>
  );
}
