import Link from "next/link";
import { allInstruments, STATUS_LABEL } from "@/lib/content/instruments";
import { Chip } from "@/components/ui/Chip";

export async function InstrumentStrip() {
  const items = await allInstruments();
  return (
    <ul className="grid gap-px bg-rule border border-rule sm:grid-cols-3">
      {items.map((i) => (
        <li key={i.slug} className="bg-paper p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-xl font-medium">
              <Link href={`/instruments/${i.slug}`} className="hover:underline decoration-1 underline-offset-4">{i.name}</Link>
            </h3>
            <Chip tone={i.status === "released" ? "accent" : "muted"}>{STATUS_LABEL[i.status]}</Chip>
          </div>
          <p className="text-ink-2 mt-2 leading-snug">{i.measures}</p>
        </li>
      ))}
    </ul>
  );
}
