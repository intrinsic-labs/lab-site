import Link from "next/link";
import { AREA_INFO, type Area } from "@/lib/content/areas";

/** Home page only: the populated research areas (`listedAreas()`), name + one line, nothing else. */
export function AreaCards({ areas }: { areas: readonly Area[] }) {
  return (
    <ol className="card-grid sm:grid-cols-3">
      {areas.map((slug) => {
        const a = AREA_INFO[slug];
        return (
          <li key={slug} className="bg-paper p-6 flex flex-col">
            <h3 className="font-serif text-xl font-medium tracking-tight leading-tight">
              <Link href={`/research/areas/${slug}`} className="hover:underline decoration-1 underline-offset-4">
                {a.name}
              </Link>
            </h3>
            <p className="text-ink-2 mt-2 text-sm leading-snug flex-1">{a.line}</p>
          </li>
        );
      })}
    </ol>
  );
}
