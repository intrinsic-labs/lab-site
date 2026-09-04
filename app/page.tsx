import Link from "next/link";
import { listablePosts } from "@/lib/content/posts";
import { allInstruments } from "@/lib/content/instruments";
import { AutonomySpecimen } from "@/components/home/AutonomySpecimen";
import { Masthead } from "@/components/home/Masthead";
import { AreaCards } from "@/components/home/AreaCards";
import { LatestGrid } from "@/components/home/LatestGrid";
import { ProductsGrid } from "@/components/home/ProductsGrid";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export default async function Home() {
  const [posts, instruments, subtitle] = await Promise.all([listablePosts(), allInstruments(), pageContent("home-subtitle")]);

  return (
    <div className="mx-auto max-w-6xl px-6 min-w-0">
      {/* Hero: one line, one subline, one graphic — everything else is air. */}
      <Masthead className="grid-paper -mx-6 border-b border-rule">
        <section className="px-6 pt-24 pb-20">
          <div className="mx-auto max-w-[640px] text-center">
            <h1 className="font-serif text-[2.4rem] sm:text-6xl font-medium tracking-tight leading-[1.05]">
              A one-person company, run mostly by agents.
            </h1>
            <div className="mt-5 text-lg sm:text-xl text-ink-2 leading-snug">
              <Mdx source={subtitle.content} />
            </div>
          </div>
          <div className="mt-12 min-w-0">
            <AutonomySpecimen />
          </div>
        </section>
      </Masthead>

      <section className="pt-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl font-medium tracking-tight">Latest</h2>
          <Link href="/research" className="label hover:text-ink">All research →</Link>
        </div>
        <LatestGrid posts={posts.slice(0, 3)} />
      </section>

      <section className="pt-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl font-medium tracking-tight">Products</h2>
          <Link href="/products" className="label hover:text-ink">All products →</Link>
        </div>
        <ProductsGrid items={instruments} />
      </section>

      <section className="pt-16 pb-20">
        <h2 className="font-serif text-2xl font-medium tracking-tight mb-6">Research areas</h2>
        <AreaCards />
      </section>
    </div>
  );
}
