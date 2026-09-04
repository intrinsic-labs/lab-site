import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { allCaseStudies } from "@/lib/content/work";
import { pageContent } from "@/lib/content/pages";
import { PageTitle } from "@/components/ui/PageTitle";
import { Mdx } from "@/lib/mdx/render";
import { site } from "@/lib/site";
import { WorkCard } from "./_components/WorkCard";

export const metadata: Metadata = { title: "Work", description: "The client portfolio." };

export default async function WorkPage() {
  const [items, clientWork] = await Promise.all([allCaseStudies(), pageContent("work-client")]);
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="Work" title="We will fix your life with code.">
        <Mdx
          source={clientWork.content.replace(/\{email\}/g, site.email)}
          components={{ a: (props: ComponentProps<"a">) => <a {...props} className="underline decoration-1 underline-offset-3" /> }}
        />
      </PageTitle>
      <ul className="card-grid sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <WorkCard key={item.slug} item={item} />)}
      </ul>
    </div>
  );
}
