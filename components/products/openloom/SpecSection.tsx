import { renderMarkdown } from "@/lib/mdx/markdown";
import { headingSlug } from "@/lib/openloom/slug";
import { sectionNeighbours, loadSpec, type SpecSection as Section } from "@/lib/openloom/spec";
import { SectionPager } from "./SectionPager";

/**
 * One `##` section of the spec as a page body: the section's own markdown, headings
 * given the same ids the rail printed, then the prev/next pager. Both routes (the base
 * URL for the first section, `/[section]` for the rest) render exactly this.
 */
export async function SpecSectionBody({ section }: { section: Section }) {
  const [{ sections }, html, neighbours] = await Promise.all([
    loadSpec(),
    renderMarkdown(section.body, { headingIds: headingSlug }),
    sectionNeighbours(section.slug),
  ]);
  return (
    <>
      {/* First heading sits flush with the rail's top; anchors clear the sticky site header. */}
      <div
        className="prose prose-post [&>h2:first-child]:mt-0 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <SectionPager {...neighbours} sections={sections} />
    </>
  );
}
