import type { Metadata } from "next";
import Link from "next/link";
import { allInstruments, STATUS_LABEL } from "@/lib/content/instruments";
import { AREA_INFO } from "@/lib/content/areas";
import { PageTitle } from "@/components/ui/PageTitle";
import { Chip } from "@/components/ui/Chip";

export const metadata: Metadata = { title: "Instruments", description: "The tools the research runs on." };

export default async function InstrumentsPage() {
  const items = await allInstruments();
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Instruments" title="The tools the research runs on.">
        <p>
          An instrument exists to take a measurement. Some of ours are released, some are private, and one is
          still a design. Each is listed with its status rather than left off because it isn&apos;t open source yet.
        </p>
        <p className="mt-4 font-medium text-ink">
          One line that governs this page: the <em>method</em> is published; the <em>corpus</em> — the personal
          data the elicitation work is built on — never is, and is not listed here.
        </p>
      </PageTitle>
      <table className="w-full mt-10 text-left border-collapse">
        <thead>
          <tr className="border-b border-ink">
            <th className="label font-medium py-2 pr-6">Instrument</th>
            <th className="label font-medium py-2 pr-6 hidden sm:table-cell">Measures</th>
            <th className="label font-medium py-2 pr-6 hidden md:table-cell">Area</th>
            <th className="label font-medium py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.slug} className="border-b border-rule align-top">
              <td className="py-4 pr-6 font-serif text-xl">
                <Link href={`/instruments/${i.slug}`} className="hover:underline decoration-1 underline-offset-4">{i.name}</Link>
                <p className="sm:hidden text-ink-2 text-base mt-1">{i.measures}</p>
              </td>
              <td className="py-4 pr-6 text-ink-2 hidden sm:table-cell">{i.measures}</td>
              <td className="py-4 pr-6 hidden md:table-cell"><Link href={`/research/areas/${i.area}`} className="label hover:text-ink">{AREA_INFO[i.area].name}</Link></td>
              <td className="py-4"><Chip tone={i.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[i.status]}</Chip></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
