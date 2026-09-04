import type { MetadataRoute } from "next";
import { publishedPosts } from "@/lib/content/posts";
import { allInstruments } from "@/lib/content/instruments";
import { AREAS } from "@/lib/content/areas";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await publishedPosts();
  const instruments = await allInstruments();
  const u = (p: string) => `${site.url}${p}`;
  return [
    { url: u("/") },
    { url: u("/research") },
    { url: u("/products") },
    { url: u("/work") },
    { url: u("/about") },
    { url: u("/about/editorial") },
    ...AREAS.map((a) => ({ url: u(`/research/areas/${a}`) })),
    ...posts.map((p) => ({ url: u(`/research/${p.slug}`), lastModified: p.date })),
    ...instruments.map((i) => ({ url: u(`/products/${i.slug}`) })),
  ];
}
