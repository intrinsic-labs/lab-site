import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import { headingSlug } from "./slug";
import type { SpecSection, SpecSubsection } from "./routes";

export type { SpecSection, SpecSubsection } from "./routes";
export { OPEN_LOOM_BASE, sectionHref } from "./routes";

/**
 * The OpenLoom spec, read from the ONE markdown file and split into its `##` sections so
 * each can be a route of its own. The spec's words are never edited here — a section's
 * `body` is the exact slice of the file from its `##` line to the next one, heading
 * included, so the renderer prints the numbered heading the author wrote.
 *
 * Everything above the first `##` (the `# …` title, the `**Version …**` line and the
 * abstract) is the preamble: the banner header already says the title and the version,
 * and the abstract joins the first section's page so no words are lost.
 */
export type Spec = { version?: string; sections: SpecSection[] };

const SPEC_PATH = path.join(process.cwd(), "content", "products", "aspen-grove", "open-loom.md");

const FENCE = /^\s*(```|~~~)/;

/** Split on `## ` lines — outside fenced code, where a `#` line is just code. */
function splitSections(raw: string): { preamble: string; chunks: string[] } {
  const chunks: string[][] = [];
  let preamble: string[] | null = null;
  let current: string[] = [];
  let inFence = false;
  for (const line of raw.split("\n")) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) {
      if (preamble === null) preamble = current;
      else chunks.push(current);
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (preamble === null) return { preamble: current.join("\n"), chunks: [] };
  chunks.push(current);
  return { preamble: preamble.join("\n"), chunks: chunks.map((c) => c.join("\n")) };
}

function parseSection(chunk: string): SpecSection {
  const [headingLine, ...rest] = chunk.split("\n");
  const title = headingLine.replace(/^##\s+/, "").trim();
  const subsections: SpecSubsection[] = [];
  let inFence = false;
  for (const line of rest) {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^###\s+(.+)$/.exec(line);
    if (m) subsections.push({ slug: headingSlug(m[1]), title: m[1].trim() });
  }
  // The spec closes each section with a `---` rule. That was a separator between sections
  // on one long page; now the page boundary is the section boundary and the pager draws
  // its own rule, so a trailing one would print two. Only a TRAILING rule is dropped.
  const body = chunk.replace(/\n---[ \t]*\s*$/, "");
  return { slug: headingSlug(title), title, subsections, body };
}

export const loadSpec = cache(async (): Promise<Spec> => {
  const raw = await fs.readFile(SPEC_PATH, "utf8");
  // Read from the spec's own text, never invented — a spec that states none gets no pill.
  const version = /^\*\*Version\s+([^*]+?)\*\*/m.exec(raw)?.[1].trim();
  const { preamble, chunks } = splitSections(raw);
  const sections = chunks.map(parseSection);
  const abstract = preamble
    .replace(/^#\s+.+$/m, "")
    .replace(/^\*\*Version\s+[^\n]*$/m, "")
    .replace(/\n---[ \t]*\s*$/, "")
    .trim();
  // The abstract goes UNDER section 1's heading, not above it: a page that opens with a
  // media-type line and then a heading reads as two starts.
  if (sections[0] && abstract) {
    const [heading, ...rest] = sections[0].body.split("\n");
    sections[0] = { ...sections[0], body: `${heading}\n\n${abstract}\n${rest.join("\n")}` };
  }
  const seen = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.slug)) throw new Error(`OpenLoom spec: two sections slug to "${s.slug}"`);
    seen.add(s.slug);
  }
  return { version, sections };
});

export async function sectionBySlug(slug: string): Promise<SpecSection | undefined> {
  return (await loadSpec()).sections.find((s) => s.slug === slug);
}

/** Neighbours for the prev/next pager; `undefined` at either end. */
export async function sectionNeighbours(slug: string): Promise<{ prev?: SpecSection; next?: SpecSection }> {
  const { sections } = await loadSpec();
  const i = sections.findIndex((s) => s.slug === slug);
  return { prev: i > 0 ? sections[i - 1] : undefined, next: i >= 0 ? sections[i + 1] : undefined };
}
