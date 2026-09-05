import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCaseStudies, caseStudyBySlug } from "@/lib/content/work";
import { Mdx } from "@/lib/mdx/render";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { GenerativeCover } from "@/components/ui/GenerativeCover";
import { WorkSceneCanvas } from "@/components/work/scenes/WorkSceneCanvas";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allCaseStudies()).map((c) => ({ slug: c.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await caseStudyBySlug((await params).slug);
  return c ? { title: c.name, description: c.line } : {};
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await caseStudyBySlug((await params).slug);
  if (!c) notFound();
  return (
    <article className="mx-auto max-w-6xl px-6">
      <div className="relative mt-6 aspect-[4/3] w-full overflow-hidden sm:mt-10 sm:aspect-[16/9]">
        {c.scene ? (
          <WorkSceneCanvas scene={c.scene} seed={c.slug} tint={c.tint} zoom={1.35} className="h-full w-full" />
        ) : c.cover ? (
          <Image src={c.cover} alt={c.name} fill priority sizes="(min-width: 1280px) 1152px, 100vw" className="object-cover" />
        ) : (
          <GenerativeCover seed={c.slug} className="h-full w-full" />
        )}
      </div>
      <header className="pt-4 pb-8 sm:pt-10 sm:pb-10 border-b border-rule mx-auto max-w-[68ch]">
        {c.client && c.client !== c.name && <p className="label">{c.client}</p>}
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] mt-2">{c.name}</h1>
        <p className="mt-5 text-xl text-ink-2 max-w-2xl leading-snug">{c.line}</p>
        {c.url && (
          <div className="mt-6">
            <ButtonLink href={c.url} tone="green" external>Visit</ButtonLink>
          </div>
        )}
      </header>
      <div className="mx-auto max-w-[68ch]">
        <div className="prose prose-post py-12">
          <Mdx source={c.body} />
        </div>
      </div>
    </article>
  );
}
