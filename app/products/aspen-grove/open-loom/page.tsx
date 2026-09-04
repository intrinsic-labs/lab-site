import type { Metadata } from "next";
import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { renderMarkdown } from "@/lib/mdx/markdown";

export const metadata: Metadata = {
  title: "Open Loom — Aspen Grove",
  description: "Open Loom: a portable JSON interchange format for loom trees, so a tree built in one loom opens in another without losing structure or provenance.",
};

const SPEC_PATH = path.join(process.cwd(), "content", "products", "aspen-grove", "open-loom.md");

/** The banner image is Aspen Grove's own hero — one marbled plate, used in both places. */
const BANNER = "/products/aspen-grove/hero.jpg";

/**
 * Renders the Open Loom spec as plain markdown rather than through the MDX pipeline: the
 * spec's own tables use raw `map<id, Node>`-style angle brackets outside code spans, which
 * `next-mdx-remote-client`'s MDX/acorn parser reads as broken JSX and fails to compile. A
 * plain remark→HTML pass has no JSX layer to trip on. See lab-site AGENTS.md task notes —
 * the spec's words are never edited to work around this; the renderer changes instead.
 *
 * Two things are lifted off the top of the file before rendering: the leading `# …` title
 * (the banner is the title now, so leaving it in would print it twice) and the version,
 * which is READ FROM THE SPEC'S OWN TEXT — a `**Version X**` line — and never invented. A
 * spec that doesn't state one simply gets no version pill.
 */
async function loadSpec(): Promise<{ html: string; version?: string }> {
  const raw = await fs.readFile(SPEC_PATH, "utf8");
  const version = /^\*\*Version\s+([^*]+?)\*\*/m.exec(raw)?.[1].trim();
  const body = raw.replace(/^#\s+.+$/m, "");
  return { html: await renderMarkdown(body), version };
}

export default async function OpenLoomPage() {
  const { html: rendered, version } = await loadSpec();
  return (
    <article>
      {/* Full-width banner: the marbled plate, darkened, with the title sitting on it. */}
      <header className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BANNER} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-paper/55" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-1/2"
          style={{ background: "linear-gradient(to top, var(--color-paper), transparent)" }}
        />

        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <h1 className="font-sans font-medium tracking-[-0.035em] leading-[0.92] text-[clamp(2.75rem,11vw,7rem)] break-words">
            Open Loom
          </h1>
          <p className="mt-5 font-code text-base text-ink-2 sm:text-lg">A protocol for loom interfaces</p>
          {version && (
            <p className="mt-7">
              <span className="version-pill">
                Current Version: {version}
              </span>
            </p>
          )}
          <p className="mt-8">
            <Link href="/products/aspen-grove" className="label hover:text-accent">
              ← Aspen Grove
            </Link>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-[68ch]">
          <div
            className="prose prose-post py-14"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        </div>
      </div>
    </article>
  );
}
