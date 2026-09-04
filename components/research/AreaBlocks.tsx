import Link from "next/link";
import { AREAS, AREA_INFO } from "@/lib/content/areas";
import { SectionHead } from "@/components/ui/SectionHead";

/**
 * The row of research areas under the landing masthead: area name and its own one-line
 * definition. The description is `AreaInfo.line` verbatim — the sentence that already
 * defines the area in lib/content/areas.ts and on the area page itself — rather than a
 * second, drifting summary written for this row.
 *
 * Plain text in three columns, no card. Ruling (Asher, 2026-09-04): "remove the boxes
 * around these — this should just be text that's hovering", and the beam label
 * (Craft / Sovereignty) is gone from here because it means nothing out of the Guide's
 * context. The beam stays on AreaInfo for the area pages and the vault.
 */
export function AreaBlocks() {
  return (
    <section className="pb-20">
      <SectionHead title="Research areas" rule={false} />
      <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-12">
        {AREAS.map((a) => {
          const info = AREA_INFO[a];
          return (
            <li key={a}>
              <Link href={`/research/areas/${a}`} className="group block no-underline">
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
