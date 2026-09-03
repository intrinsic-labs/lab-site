import Link from "next/link";
import { AREAS, AREA_INFO } from "@/lib/content/areas";
import type { Post } from "@/lib/content/posts";

export function AreaCards({ posts }: { posts: Post[] }) {
  return (
    <ol className="grid gap-px bg-rule border border-rule sm:grid-cols-3">
      {AREAS.map((slug, i) => {
        const a = AREA_INFO[slug];
        const n = posts.filter((p) => p.area === slug).length;
        return (
          <li key={slug} className="bg-paper p-6 flex flex-col">
            <div className="flex justify-between items-baseline">
              <span className="label">0{i + 1}</span>
              <span className="label text-ink-3">{a.beam} · {n} {n === 1 ? "item" : "items"}</span>
            </div>
            <h3 className="font-serif text-2xl font-medium tracking-tight mt-6 leading-tight">
              <Link href={`/research/areas/${slug}`} className="hover:underline decoration-1 underline-offset-4">{a.name}</Link>
            </h3>
            <p className="text-ink-2 mt-3 leading-snug flex-1">{a.line}</p>
          </li>
        );
      })}
    </ol>
  );
}
