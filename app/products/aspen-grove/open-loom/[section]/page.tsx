import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { loadSpec, sectionBySlug, OPEN_LOOM_BASE } from "@/lib/openloom/spec";
import { SpecSectionBody } from "@/components/products/openloom/SpecSection";

type Params = { params: Promise<{ section: string }> };

/** Every `##` section after the first is a static route; the first lives at the base URL. */
export async function generateStaticParams() {
  const { sections } = await loadSpec();
  return sections.slice(1).map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const section = await sectionBySlug((await params).section);
  if (!section) return {};
  return {
    title: `${section.title} — OpenLoom`,
    description: `OpenLoom specification, ${section.title}.`,
  };
}

export default async function OpenLoomSectionPage({ params }: Params) {
  const { section: slug } = await params;
  const { sections } = await loadSpec();
  // The first section's canonical home is the base URL — one address per section.
  if (sections[0]?.slug === slug) permanentRedirect(OPEN_LOOM_BASE);
  const section = await sectionBySlug(slug);
  if (!section) notFound();
  return <SpecSectionBody section={section} />;
}
