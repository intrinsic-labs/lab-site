import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProducts, productBySlug, productImages, STATUS_LABEL } from "@/lib/content/products";
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
 * fold. The status opens the reading column instead of the hero, because it qualifies the
 * thing rather than introducing it — the hero's job is the hook, and it carries no chip
 * (Asher, 2026-09-04: "just say Visit"). This line is therefore the ONE place the status is
 * stated: `statusNote` when the front matter has one (the "built for one person, source is
 * private" kind of caveat, which already says the status in prose), the plain `STATUS_LABEL`
 * otherwise — so a product like GlyphDeck with no note still says "In development" somewhere.
 * The one exception is `described`: that page IS the description, so a label saying so is
 * noise (Asher, 2026-09-04: drop "the code is private for now; this page is the description").
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await productBySlug((await params).slug);
  if (!p) notFound();
  const images = await productImages(p.slug);
  // The palette is data (front matter), not a slug check. `.dossier-dark` is inert now that
  // the site's one colour mode is dark — kept so no content file breaks. See globals.css.
  const dark = p.theme === "dark";
  const statusLine = p.statusNote ?? (p.status === "described" ? null : STATUS_LABEL[p.status]);
  return (
    <div data-theme={dark ? "dark" : undefined} className={dark ? "dossier-dark" : undefined}>
      <article>
        <ProductHero product={p} images={images} />

        <Gallery images={images.gallery} />

        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-[68ch] border-t border-rule py-14">
            {statusLine && <p className="label mb-8">{statusLine}</p>}
            <div className="prose prose-post"><Mdx source={p.body} /></div>
          </div>
        </div>
      </article>
    </div>
  );
}
