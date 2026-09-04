import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-rule mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="font-serif font-medium">Intrinsic Labs LLC</p>
          <p className="text-ink-2 text-sm mt-1">One person, a crew of named agents, and a folder of plain text files.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/feed.xml" className="label hover:text-ink">RSS feed</Link>
          <Link href="/about/editorial" className="label hover:text-ink">Editorial policy</Link>
          <a href={site.github} className="label hover:text-ink" rel="me">GitHub ↗︎</a>
        </div>
        <div className="flex flex-col gap-2 sm:text-right">
          <a href={`mailto:${site.email}`} className="label hover:text-ink">{site.email}</a>
          <p className="label">Richmond, Virginia</p>
        </div>
      </div>
    </footer>
  );
}
