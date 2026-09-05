import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSpec } from "@/lib/openloom/spec";
import { SpecSectionBody } from "@/components/products/openloom/SpecSection";

export const metadata: Metadata = {
  title: "OpenLoom — Aspen Grove",
  description:
    "OpenLoom: a portable JSON interchange format for loom trees, so a tree built in one loom opens in another without losing structure or provenance.",
};

/**
 * The base URL renders the spec's FIRST section (with the abstract folded in), so the
 * canonical `/open-loom` link keeps working and the header's URL is never a redirect.
 * Every later section is `[section]/page.tsx`. The banner and the rail come from
 * `layout.tsx`.
 */
export default async function OpenLoomPage() {
  const { sections } = await loadSpec();
  const first = sections[0];
  if (!first) notFound();
  return <SpecSectionBody section={first} />;
}
