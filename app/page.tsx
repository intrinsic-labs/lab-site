import Link from "next/link";
import { listablePosts } from "@/lib/content/posts";
import { populatedAreas } from "@/lib/content/areas";
import { allProducts } from "@/lib/content/products";
import { AutonomyOrbs } from "@/components/home/AutonomyOrbs";
import { Masthead } from "@/components/home/Masthead";
import { AreaCards } from "@/components/home/AreaCards";
import { LatestGrid } from "@/components/home/LatestGrid";
import { ProductsGrid } from "@/components/home/ProductsGrid";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export default async function Home() {
  const [posts, products, subtitle, tagline] = await Promise.all([listablePosts(), allProducts(), pageContent("home-subtitle"), pageContent("home-tagline")]);
  // Research sections render only when something is listed: no empty "Latest" heading, and
  // an area with no listed post isn't offered as a way in.
  const areas = populatedAreas(posts);

  return (
    <>
      {/* The hero is the viewport: one line, one subline, and the spirograph running off
          every edge behind them. It sits outside the reading column on purpose — a
          container would clip the drawing, which is the whole point of it. */}
      <Masthead className="border-b border-rule">
        <div className="mx-auto max-w-[680px] px-6 text-center">
          <h1 className="font-serif text-[2.4rem] sm:text-6xl font-medium tracking-tight leading-[1.05]">
            {tagline.content}
          </h1>
          <div className="mt-5 text-lg sm:text-xl text-ink leading-snug">
            <Mdx source={subtitle.content} />
          </div>
        </div>
      </Masthead>

      <section className="border-b border-rule py-12 sm:py-16">
        <AutonomyOrbs />
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-20 min-w-0">
        {posts.length > 0 && (
          <section className="pt-16">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-2xl font-medium tracking-tight">Latest</h2>
              <Link href="/research" className="label hover:text-ink">All research →</Link>
            </div>
            <LatestGrid posts={posts.slice(0, 3)} />
          </section>
        )}

        <section className="pt-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl font-medium tracking-tight">Products</h2>
            <Link href="/products" className="label hover:text-ink">All products →</Link>
          </div>
          <ProductsGrid items={products} />
        </section>

        {areas.length > 0 && (
          <section className="pt-16">
            <h2 className="font-serif text-2xl font-medium tracking-tight mb-6">Research areas</h2>
            <AreaCards areas={areas} />
          </section>
        )}
      </div>
    </>
  );
}
