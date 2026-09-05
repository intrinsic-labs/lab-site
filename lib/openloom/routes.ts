/**
 * Route arithmetic for the spec's sections — kept free of `node:fs` so the client-side
 * navigation can import it. The first section lives at the base URL itself (the header's
 * canonical link stays put); every other one at `/<slug>`.
 */

export type SpecSubsection = { slug: string; title: string };

export type SpecSection = {
  slug: string;
  /** The heading text as written, numbering included — e.g. `3. Document container`. */
  title: string;
  subsections: SpecSubsection[];
  /** Markdown, from the section's `##` heading through to the next `##` (exclusive). */
  body: string;
};

export const OPEN_LOOM_BASE = "/products/aspen-grove/open-loom";

export function sectionHref(section: SpecSection, sections: SpecSection[]): string {
  return section.slug === sections[0]?.slug ? OPEN_LOOM_BASE : `${OPEN_LOOM_BASE}/${section.slug}`;
}

/** Which section a pathname under the base is showing; `undefined` off the map. */
export function activeSectionSlug(pathname: string, sections: SpecSection[]): string | undefined {
  const tail = pathname.replace(/\/+$/, "").slice(OPEN_LOOM_BASE.length).replace(/^\//, "");
  return tail === "" ? sections[0]?.slug : sections.find((s) => s.slug === tail)?.slug;
}
