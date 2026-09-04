import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AREAS, areaInfo } from "@/lib/content/areas";
import { postsByArea } from "@/lib/content/posts";
import { allInstruments } from "@/lib/content/instruments";
import { PageTitle } from "@/components/ui/PageTitle";
import { PostList } from "@/components/research/PostList";
import { SectionHead } from "@/components/ui/SectionHead";
import Link from "next/link";

export const dynamicParams = false;
export function generateStaticParams() { return AREAS.map((area) => ({ area })); }

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const a = areaInfo((await params).area);
  return a ? { title: a.name, description: a.line } : {};
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const a = areaInfo((await params).area);
  if (!a) notFound();
  const posts = await postsByArea(a.slug);
  const instruments = (await allInstruments()).filter((i) => i.area === a.slug);
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker={`Research area · ${a.beam}`} title={a.name}>
        <p className="font-serif italic text-xl">{a.line}</p>
        <p className="mt-4">{a.body}</p>
      </PageTitle>
      <section className="pt-12">
        <SectionHead n="01" title="Published" rule={false} />
        <PostList posts={posts} empty="This area is declared before it is full. Nothing published under it yet." />
      </section>
      {instruments.length > 0 && (
        <section className="pt-16">
          <SectionHead n="02" title="Products in this area" href="/products" rule={false} />
          <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
            {instruments.map((i) => (
              <li key={i.slug} className="bg-paper p-5">
                <Link href={`/products/${i.slug}`} className="font-serif text-xl hover:underline decoration-1 underline-offset-4">{i.name}</Link>
                <p className="mt-2 text-[0.95rem] leading-snug text-ink-2">{i.measures}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
