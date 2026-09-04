import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Chip } from "@/components/ui/Chip";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Work", description: "What the workshop has built." };

/** The workshop's own products. Each has its own brand and site; this page only points. */
const PRODUCTS = [
  {
    name: "GlyphDeck",
    line: "A handheld gaming platform that exists entirely in software and uses text as its display. Native performance, local multiplayer, a companion app that runs on the same device, and games that exist nowhere else.",
    status: "In development",
    href: "https://glyphdeck-website.vercel.app",
  },
  {
    name: "Liturgos",
    line: "Worship planning for NAPARC (North American Presbyterian and Reformed Council) churches, built from a shared set of reusable liturgy elements — so bulletins, slides and years of history fall out of the same data. It retrieves, remembers and formats; it never writes worship content.",
    status: "In development",
    href: "https://liturgos-site.vercel.app",
  },
  {
    name: "Tycho",
    line: "Two halves: The Ghost, a model of one person's judgment mined from decisions they already made; and Tycho, the program that keeps it current by putting fresh decisions in front of them.",
    status: "Private · running for one person",
    href: "/products/tycho",
  },
];

export default async function WorkPage() {
  const clientWork = await pageContent("work-client");
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Work" title="What the workshop has built.">
        <p>
          Products earn their own brands — each gets its own name, site and voice. Intrinsic Labs is the workshop
          behind them, so this page points outward rather than selling anything here.
        </p>
      </PageTitle>
      <ul className="grid gap-px border border-rule bg-rule mt-12 sm:grid-cols-3">
        {PRODUCTS.map((p) => (
          <li key={p.name} className="bg-paper p-6 flex flex-col">
            <h2 className="font-serif text-2xl font-medium tracking-tight">{p.name}</h2>
            <p className="text-ink-2 mt-3 leading-snug flex-1">{p.line}</p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <Chip tone="muted">{p.status}</Chip>
              {p.href.startsWith("http") ? (
                <ButtonLink href={p.href} tone="green" external>Visit</ButtonLink>
              ) : (
                <ButtonLink href={p.href} tone="green">Read more</ButtonLink>
              )}
            </div>
          </li>
        ))}
      </ul>
      <section className="mt-16 max-w-2xl">
        <p className="label mb-4">Client work</p>
        <div className="text-lg leading-snug">
          <Mdx
            source={clientWork.content.replace(/\{email\}/g, site.email)}
            components={{ a: (props: ComponentProps<"a">) => <a {...props} className="underline decoration-1 underline-offset-3" /> }}
          />
        </div>
      </section>
    </div>
  );
}
