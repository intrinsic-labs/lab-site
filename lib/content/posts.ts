import { cache } from "react";
import { readDir } from "./fs";
import { postFrontMatter, type PostFrontMatter } from "./schema";
import { draftsVisible } from "./draft-rail";
import type { Area } from "./areas";
import type { Kind } from "./kinds";

export interface Post extends PostFrontMatter {
  slug: string;
  body: string;
}

const loadAll = cache(async (): Promise<Post[]> => {
  const entries = await readDir("research");
  const posts = entries.map((e) => {
    const parsed = postFrontMatter.safeParse(e.data);
    if (!parsed.success) {
      throw new Error(`content/research/${e.slug}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    }
    return { ...parsed.data, slug: e.slug, body: e.body };
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
});

/** Every post that may appear in an index, feed or sitemap. Drafts never do. */
export async function publishedPosts(): Promise<Post[]> {
  return (await loadAll()).filter((p) => p.status === "published");
}

/** A single post by slug — a draft only where the rail allows it. */
export async function postBySlug(slug: string): Promise<Post | undefined> {
  const post = (await loadAll()).find((p) => p.slug === slug);
  if (!post) return undefined;
  if (post.status === "draft" && !draftsVisible()) return undefined;
  return post;
}

/** Slugs to statically render: published always; drafts only outside production. */
export async function renderableSlugs(): Promise<string[]> {
  const all = await loadAll();
  return all.filter((p) => p.status === "published" || draftsVisible()).map((p) => p.slug);
}

export async function postsByArea(area: Area): Promise<Post[]> {
  return (await listablePosts()).filter((p) => p.area === area);
}

export async function countByKind(): Promise<Record<Kind, number>> {
  const posts = await listablePosts();
  return {
    paper: posts.filter((p) => p.kind === "paper").length,
    note: posts.filter((p) => p.kind === "note").length,
    "field-note": posts.filter((p) => p.kind === "field-note").length,
  };
}

/**
 * What an INDEX shows: published posts always, and drafts too wherever the rail lets a
 * draft render — so a preview deployment is reviewable by navigation, not only by URL.
 * Feed and sitemap never use this; they use publishedPosts().
 */
export async function listablePosts(): Promise<Post[]> {
  const all = await loadAll();
  return draftsVisible() ? all : all.filter((p) => p.status === "published");
}
