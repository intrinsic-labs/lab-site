import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allInstruments, instrumentBySlug, STATUS_LABEL } from "@/lib/content/instruments";
import { AREA_INFO } from "@/lib/content/areas";
import { Mdx } from "@/lib/mdx/render";
import { Chip } from "@/components/ui/Chip";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allInstruments()).map((i) => ({ slug: i.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const i = await instrumentBySlug((await params).slug);
  return i ? { title: i.name, description: i.measures } : {};
}

export default async function InstrumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const i = await instrumentBySlug((await params).slug);
  if (!i) notFound();
  return (
    <article className="mx-auto max-w-6xl px-6">
      <header className="pt-14 pb-10 border-b border-rule">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="label">Instrument</span>
          <Link href={`/research/areas/${i.area}`} className="label hover:text-ink">{AREA_INFO[i.area].name}</Link>
          <Chip tone={i.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[i.status]}</Chip>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] mt-6">{i.name}</h1>
        <p className="mt-5 text-xl text-ink-2 max-w-2xl leading-snug">{i.measures}</p>
        {i.statusNote && <p className="mt-4 label">{i.statusNote}</p>}
        {i.href && <a href={i.href} className="mt-4 inline-block label text-accent hover:underline">Repository ↗︎</a>}
      </header>
      <div className="py-12 prose"><Mdx source={i.body} /></div>
    </article>
  );
}
