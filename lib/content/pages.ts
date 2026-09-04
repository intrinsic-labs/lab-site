import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_ROOT, engines } from "./fs";

export interface PageContent {
  /** Front matter — `title`, `eyebrow`, whatever a given section needs. Untyped: pages don't share one shape. */
  data: Record<string, unknown>;
  /** The markdown/MDX body, ready for `<Mdx source={content} />`. */
  content: string;
}

const PAGES_ROOT = path.join(CONTENT_ROOT, "pages");

/** Read one `content/pages/<name>.md` file — a static page's prose, outside the CMS collections. */
export async function pageContent(name: string): Promise<PageContent> {
  const raw = await fs.readFile(path.join(PAGES_ROOT, `${name}.md`), "utf8");
  const { data, content } = matter(raw, { engines });
  return { data, content: content.trim() };
}
