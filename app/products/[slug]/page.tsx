import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProducts, productBySlug, productImages } from "@/lib/content/products";
import { Mdx } from "@/lib/mdx/render";
import { ProductHero } from "@/components/products/ProductHero";
import { Gallery } from "@/components/products/Gallery";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allProducts()).map((p) => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await productBySlug((await params).slug);
  return p ? { title: p.name, description: p.line } : {};
}

/**
 * A product page is a landing screen, then a carousel, then the document — in that order.
 * The hero carries the name, the one sentence and the image; nothing else goes above the
 * fold. `statusNote` (the "built for one person, source is private" kind of caveat) opens
 * the reading column instead of the hero, because it qualifies the thing rather than
 * introducing it — the hero's job is the hook.
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await productBySlug((await params).slug);
  if (!p) notFound();
  const images = await productImages(p.slug);
  // The palette is data (front matter), not a slug check. `.dossier-dark` is inert now that
  // the site's one colour mode is dark — kept so no content file breaks. See globals.css.
  const dark = p.theme === "dark";
  return (
    <div data-theme={dark ? "dark" : undefined} className={dark ? "dossier-dark" : undefined}>
      <article>
        <ProductHero product={p} images={images} />

        <Gallery images={images.gallery} />

        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-[68ch] border-t border-rule py-14">
            {p.statusNote && <p className="label mb-8">{p.statusNote}</p>}
            <div className="prose prose-post"><Mdx source={p.body} /></div>
          </div>
        </div>
      </article>
    </div>
  );
}
