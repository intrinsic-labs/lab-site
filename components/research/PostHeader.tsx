import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { formatDate } from "@/lib/content/format";
import { AREA_INFO } from "@/lib/content/areas";
import { KindLabel } from "./KindLabel";
import { Frame } from "@/components/ui/Frame";

/** kind · area · date · status, then the title, then the caveats — above the fold, always. */
export function PostHeader({ post }: { post: Post }) {
  return (
    <header className="pt-14 pb-10 border-b border-rule">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <KindLabel kind={post.kind} />
        <Link href={`/research/areas/${post.area}`} className="label hover:text-ink">{AREA_INFO[post.area].name}</Link>
        <span className="label text-ink-3">·</span>
        <time dateTime={post.date} className="label">{formatDate(post.date)}</time>
        {post.status === "draft" && (
          <>
            <span className="label text-ink-3">·</span>
            <span className="label text-accent">Draft — preview only</span>
          </>
        )}
      </div>
      <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] mt-6 max-w-3xl">{post.title}</h1>
      <p className="mt-5 text-xl text-ink-2 max-w-2xl leading-snug">{post.summary}</p>
      {post.caveats.length > 0 && (
        <Frame className="mt-10 max-w-2xl p-5 bg-paper-2">
          <p className="label mb-3">Caveats — read these first</p>
          <ul className="list-square pl-5 space-y-1.5 text-[0.95rem] leading-snug">
            {post.caveats.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Frame>
      )}
    </header>
  );
}
