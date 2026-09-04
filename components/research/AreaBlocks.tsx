import Link from "next/link";
import { AREAS, AREA_INFO } from "@/lib/content/areas";
import { SectionHead } from "@/components/ui/SectionHead";

/**
 * The row of research-area blocks under the landing masthead: area name, its own
 * one-line definition, and the beam it hangs off. The description is `AreaInfo.line`
 * verbatim — the sentence that already defines the area in lib/content/areas.ts and on
 * the area page itself — rather than a second, drifting summary written for this row.
 *
 * Uses the house `.card-grid` hairline, so the three blocks share seams with the post
 * grid further down the page instead of introducing a second card idiom.
 */
export function AreaBlocks() {
  return (
    <section className="pb-16">
      <SectionHead n="01" title="Research areas" rule={false} />
      <ul className="card-grid sm:grid-cols-3">
        {AREAS.map((a) => {
          const info = AREA_INFO[a];
          return (
            <li key={a} className="bg-paper">
              <Link href={`/research/areas/${a}`} className="group flex h-full flex-col p-6 no-underline">
                <p className="label">{info.beam}</p>
                <h3 className="mt-3 font-serif text-xl leading-snug text-ink group-hover:underline decoration-1 underline-offset-4">
                  {info.name}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-snug text-ink-2">{info.line}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
