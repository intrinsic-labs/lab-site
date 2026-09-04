import type { Metadata } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import { cardo } from "@/components/research/fonts";

export const metadata: Metadata = {
  title: "Open Loom — Aspen Grove",
  description: "Open Loom: a portable JSON interchange format for loom trees, so a tree built in one loom opens in another without losing structure or provenance.",
};

const SPEC_PATH = path.join(process.cwd(), "content", "products", "aspen-grove", "open-loom.md");

/**
 * Renders the Open Loom spec as plain markdown rather than through the MDX pipeline: the
 * spec's own tables use raw `map<id, Node>`-style angle brackets outside code spans, which
 * `next-mdx-remote-client`'s MDX/acorn parser reads as broken JSX and fails to compile. A
 * plain remark→HTML pass has no JSX layer to trip on. See lab-site AGENTS.md task notes —
 * the spec's words are never edited to work around this; the renderer changes instead.
 */
async function renderSpec(): Promise<string> {
  const raw = await fs.readFile(SPEC_PATH, "utf8");
  const processed = await remark().use(remarkGfm).use(html, { sanitize: false }).process(raw);
  return processed.toString();
}

export default async function OpenLoomPage() {
  const rendered = await renderSpec();
  return (
    <article className="mx-auto max-w-6xl px-6">
      <div className="mx-auto max-w-[68ch]">
        {/* Cardo — the same reading face the research post column uses. */}
        <div
          className={`prose prose-post py-12 ${cardo.className}`}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </div>
    </article>
  );
}
