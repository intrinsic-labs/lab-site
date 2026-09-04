import type { MetadataRoute } from "next";
import { publishedPosts } from "@/lib/content/posts";
import { allProducts } from "@/lib/content/products";
import { allCaseStudies } from "@/lib/content/work";
import { AREAS } from "@/lib/content/areas";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await publishedPosts();
  const products = await allProducts();
  const caseStudies = await allCaseStudies();
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
    ...products.map((p) => ({ url: u(`/products/${p.slug}`) })),
    { url: u("/products/aspen-grove/open-loom") },
    ...caseStudies.map((c) => ({ url: u(`/work/${c.slug}`) })),
  ];
}
