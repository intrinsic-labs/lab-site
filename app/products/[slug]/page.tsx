import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProducts, productBySlug, productImages, STATUS_LABEL } from "@/lib/content/products";
import { Mdx } from "@/lib/mdx/render";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allProducts()).map((p) => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await productBySlug((await params).slug);
  return p ? { title: p.name, description: p.line } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await productBySlug((await params).slug);
  if (!p) notFound();
  const images = await productImages(p.slug);
  // The palette is data (front matter), not a slug check. `.dossier-dark` is picked up by
  // `html:has()` in globals.css, which is what carries the inversion to the header and footer.
  const dark = p.theme === "dark";
  return (
    <div data-theme={dark ? "dark" : undefined} className={dark ? "dossier-dark" : undefined}>
      <article className="mx-auto max-w-6xl px-6">
        {images.hero && (
          <div className="mt-10 aspect-[16/9] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images.hero} alt={p.name} className="h-full w-full object-cover" />
          </div>
        )}
        <header className="pt-10 pb-10 border-b border-rule">
          <Chip tone={p.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[p.status]}</Chip>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] mt-6">{p.name}</h1>
          <p className="mt-5 text-xl text-ink-2 max-w-2xl leading-snug">{p.line}</p>
          {p.statusNote && <p className="mt-4 label">{p.statusNote}</p>}
          {p.url && (
            <div className="mt-6">
              <ButtonLink href={p.url} tone="green" external>Visit</ButtonLink>
            </div>
          )}
        </header>
        <div className="py-12 prose max-w-[68ch] mx-auto"><Mdx source={p.body} /></div>
        {images.gallery.length > 0 && (
          <section className="pb-16">
            <p className="label mb-4">Gallery</p>
            <ul className="card-grid sm:grid-cols-2">
              {images.gallery.map((src) => (
                <li key={src} className="bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
