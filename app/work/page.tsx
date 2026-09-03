import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { Chip } from "@/components/ui/Chip";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Work", description: "What the workshop has built." };

/** The workshop's own products. Each has its own brand and site; this page only points. */
const PRODUCTS = [
  {
    name: "GlyphDeck",
    line: "A handheld gaming platform that exists entirely in software and uses text as its display. Native performance, local multiplayer, an on-device companion, and games that exist nowhere else.",
    status: "In development",
    href: "https://glyphdeck-website.vercel.app",
  },
  {
    name: "Liturgos",
    line: "Worship planning for NAPARC churches, built from tight elements — so bulletins, slides and years of history fall out of the same data. It retrieves, remembers and formats; it never writes worship content.",
    status: "In development",
    href: "https://liturgos-site.vercel.app",
  },
  {
    name: "Tycho",
    line: "A company's decision surface rebuilt as a game — and beneath it, a calibration instrument for the elicitation research.",
    status: "In design",
    href: "/instruments/tycho",
  },
];

export default function WorkPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Work" title="What the workshop has built.">
        <p>
          Products earn their own brands — each gets its own name, site and voice. Intrinsic Labs is the workshop
          behind them, so this page points outward rather than selling anything here.
        </p>
      </PageTitle>
      <ol className="border-t border-ink mt-12">
        {PRODUCTS.map((p, i) => (
          <li key={p.name} className="border-b border-rule py-7 grid gap-3 sm:grid-cols-[4rem_1fr_auto] sm:gap-8">
            <span className="label pt-2">0{i + 1}</span>
            <div>
              <h2 className="font-serif text-2xl font-medium tracking-tight">
                <a href={p.href} className="hover:underline decoration-1 underline-offset-4">{p.name}{p.href.startsWith("http") && " ↗"}</a>
              </h2>
              <p className="text-ink-2 mt-2 max-w-2xl leading-snug">{p.line}</p>
            </div>
            <div className="pt-2"><Chip tone="muted">{p.status}</Chip></div>
          </li>
        ))}
      </ol>
      <section className="mt-16 max-w-2xl">
        <p className="label mb-4">Client work</p>
        <p className="text-lg leading-snug">
          Custom software — mobile, web, full-stack — is what funds the workshop. We take a small number of
          engagements at a time and build them the way we build our own things: local-first where it makes sense,
          carefully typeset, coherent as one product rather than a pile of features. If that sounds like what you
          need, write to <a href={`mailto:${site.email}`} className="underline decoration-1 underline-offset-3">{site.email}</a>.
        </p>
      </section>
    </div>
  );
}
