import Link from "next/link";
import { AREAS, AREA_INFO } from "@/lib/content/areas";
import { SectionHead } from "@/components/ui/SectionHead";

/**
 * The row of research areas under the landing masthead: area name and its own one-line
 * definition. The description is `AreaInfo.line` verbatim — the sentence that already
 * defines the area in lib/content/areas.ts and on the area page itself — rather than a
 * second, drifting summary written for this row.
 *
 * The house `.card-grid` hairline (Asher tried them box-less on 2026-09-04 and brought
 * the boxes back the same day). The beam label (Craft / Sovereignty) is gone from here
 * because it means nothing out of the Guide's context; it stays on AreaInfo for the
 * area pages and the vault.
 */
export function AreaBlocks() {
  return (
    <section className="pb-20">
      <SectionHead n="01" title="Research areas" rule={false} />
      <ul className="card-grid sm:grid-cols-3">
        {AREAS.map((a) => {
          const info = AREA_INFO[a];
          return (
            <li key={a} className="bg-paper">
              <Link href={`/research/areas/${a}`} className="group flex h-full flex-col p-6 no-underline">
                <h3 className="font-serif text-xl leading-snug text-ink group-hover:underline decoration-1 underline-offset-4">
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
