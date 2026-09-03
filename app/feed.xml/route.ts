import { Feed } from "feed";
import { publishedPosts } from "@/lib/content/posts";
import { KIND_LABEL } from "@/lib/content/kinds";
import { AREA_INFO } from "@/lib/content/areas";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export async function GET() {
  const posts = await publishedPosts();
  const feed = new Feed({
    title: site.name,
    description: site.description,
    id: site.url,
    link: site.url,
    language: "en",
    copyright: `© ${new Date().getFullYear()} Intrinsic Labs LLC`,
    feedLinks: { rss: `${site.url}/feed.xml` },
  });
  for (const p of posts) {
    feed.addItem({
      title: `${KIND_LABEL[p.kind]} · ${p.title}`,
      id: `${site.url}/research/${p.slug}`,
      link: `${site.url}/research/${p.slug}`,
      description: p.summary,
      date: new Date(`${p.date}T12:00:00Z`),
      category: [{ name: AREA_INFO[p.area].name }],
    });
  }
  return new Response(feed.rss2(), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
