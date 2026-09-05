import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import { rehypeShikiOptions } from "./highlight";

/**
 * Plain-markdown → HTML, for prose that can't go through MDX. The OpenLoom spec is
 * the one caller: its tables carry raw `map<id, Node>`-style angle brackets outside
 * code spans, which the MDX/acorn parser reads as broken JSX.
 *
 * Same code-block highlighting as the MDX path (lib/mdx/render.tsx) so a fence looks
 * identical wherever it appears — that was previously not true: this path ran
 * `remark-html` with no highlighter at all.
 */
export async function renderMarkdown(raw: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki, rehypeShikiOptions)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(raw);
  return String(file);
}
