import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { load, JSON_SCHEMA } from "js-yaml";

/** YAML with the JSON schema, so `date: 2026-09-03` stays a string the schema can validate. */
const engines = { yaml: (s: string) => load(s, { schema: JSON_SCHEMA }) as object };

export const CONTENT_ROOT = path.join(process.cwd(), "content");

export interface RawEntry {
  slug: string;
  data: Record<string, unknown>;
  body: string;
}

/** Read every `.mdx`/`.md` file in a content directory as front matter + body. */
export async function readDir(dir: string): Promise<RawEntry[]> {
  const abs = path.join(CONTENT_ROOT, dir);
  let names: string[] = [];
  try {
    names = await fs.readdir(abs);
  } catch {
    return [];
  }
  const files = names.filter((n) => /\.mdx?$/.test(n)).sort();
  return Promise.all(
    files.map(async (name) => {
      const raw = await fs.readFile(path.join(abs, name), "utf8");
      const { data, content } = matter(raw, { engines });
      return { slug: name.replace(/\.mdx?$/, ""), data, body: content };
    }),
  );
}
