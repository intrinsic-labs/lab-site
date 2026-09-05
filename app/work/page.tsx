import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { clientWork, openSourceWork } from "@/lib/content/work";
import { pageContent } from "@/lib/content/pages";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHead } from "@/components/ui/SectionHead";
import { Mdx } from "@/lib/mdx/render";
import { site } from "@/lib/site";
import { WorkCard } from "./_components/WorkCard";

export const metadata: Metadata = { title: "Work", description: "The client portfolio, and the open-source projects." };

const proseLink = { a: (props: ComponentProps<"a">) => <a {...props} className="underline decoration-1 underline-offset-3" /> };

/**
 * Two halves, one card. The client portfolio leads — it is what the page was built for and
 * what funds the workshop — and the open-source projects follow under their own head
 * (2026-09-05). Both halves are the same `content/work/*.mdx` collection split on `kind`, so
 * a project moves between them by editing one front-matter line, and both render through the
 * same `WorkCard`, so the two grids read as one family.
 */
export default async function WorkPage() {
  const [clients, oss, clientIntro, ossIntro] = await Promise.all([
    clientWork(),
    openSourceWork(),
    pageContent("work-client"),
    pageContent("work-open-source"),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Work" title="We will fix your life with code.">
        <Mdx source={clientIntro.content.replace(/\{email\}/g, site.email)} components={proseLink} />
      </PageTitle>
      <ul className="card-grid sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((item) => <WorkCard key={item.slug} item={item} />)}
      </ul>

      {oss.length > 0 && (
        <section className="mt-20 sm:mt-28">
          <SectionHead title="Open source" href="https://github.com/intrinsic-labs" hrefLabel="GitHub" />
          <div className="-mt-4 mb-8 max-w-2xl text-lg text-ink-2">
            <Mdx source={ossIntro.content} components={proseLink} />
          </div>
          <ul className="card-grid sm:grid-cols-2 lg:grid-cols-3">
            {oss.map((item) => <WorkCard key={item.slug} item={item} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
