import { cache } from "react";
import { readDir } from "./fs";
import { postFrontMatter, type PostFrontMatter } from "./schema";
import { draftsVisible } from "./draft-rail";
import { inFeed, isListed, isRoutable } from "./post-status";
import { populatedAreas, type Area } from "./areas";
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

/** Every post the feed and sitemap carry: published only. Drafts and retired posts never. */
export async function publishedPosts(): Promise<Post[]> {
  return (await loadAll()).filter(inFeed);
}

/** A single post by slug — a draft only where the rail allows it; a retired post always. */
export async function postBySlug(slug: string): Promise<Post | undefined> {
  const post = (await loadAll()).find((p) => p.slug === slug);
  if (!post || !isRoutable(post, draftsVisible())) return undefined;
  return post;
}

/** Slugs to statically render: published and retired always; drafts only outside production. */
export async function renderableSlugs(): Promise<string[]> {
  const visible = draftsVisible();
  return (await loadAll()).filter((p) => isRoutable(p, visible)).map((p) => p.slug);
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
 * Retired posts never. Feed and sitemap never use this; they use publishedPosts().
 */
export async function listablePosts(): Promise<Post[]> {
  const visible = draftsVisible();
  return (await loadAll()).filter((p) => isListed(p, visible));
}

/**
 * The areas an index links to: those with at least one listed post. An empty area keeps
 * its permanent URL (it renders an empty state) but drops out of the nav, the area rows
 * and the sitemap.
 */
export async function listedAreas(): Promise<Area[]> {
  return populatedAreas(await listablePosts());
}
