import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allInstruments, instrumentBySlug, productImages, STATUS_LABEL } from "@/lib/content/instruments";
import { AREA_INFO } from "@/lib/content/areas";
import { Mdx } from "@/lib/mdx/render";
import { Chip } from "@/components/ui/Chip";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allInstruments()).map((i) => ({ slug: i.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const i = await instrumentBySlug((await params).slug);
  return i ? { title: i.name, description: i.measures } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const i = await instrumentBySlug((await params).slug);
  if (!i) notFound();
  const images = await productImages(i.slug);
  // The palette is data (front matter), not a slug check. `.dossier-dark` is picked up by
  // `html:has()` in globals.css, which is what carries the inversion to the header and footer.
  const dark = i.theme === "dark";
  return (
    <div data-theme={dark ? "dark" : undefined} className={dark ? "dossier-dark" : undefined}>
      <article className="mx-auto max-w-6xl px-6">
        {images.hero && (
          <div className="mt-10 aspect-[16/9] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images.hero} alt={i.name} className="h-full w-full object-cover" />
          </div>
        )}
        <header className="pt-10 pb-10 border-b border-rule">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={`/research/areas/${i.area}`} className="label hover:text-ink">{AREA_INFO[i.area].name}</Link>
            <Chip tone={i.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[i.status]}</Chip>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] mt-6">{i.name}</h1>
          <p className="mt-5 text-xl text-ink-2 max-w-2xl leading-snug">{i.measures}</p>
          {i.statusNote && <p className="mt-4 label">{i.statusNote}</p>}
          {i.href && <a href={i.href} className="mt-4 inline-block label text-accent hover:underline">Repository ↗︎</a>}
        </header>
        <div className="py-12 prose max-w-[68ch] mx-auto"><Mdx source={i.body} /></div>
        {images.gallery.length > 0 && (
          <section className="pb-16">
            <p className="label mb-4">Gallery</p>
            <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
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
