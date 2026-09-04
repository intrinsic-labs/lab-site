import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";
import { KindsList } from "@/components/about/KindsList";

export const metadata: Metadata = { title: "Editorial policy", description: "How something gets published here, and what each rung claims." };

export default async function EditorialPage() {
  const [intro, policy] = await Promise.all([pageContent("editorial-intro"), pageContent("editorial")]);
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="About · editorial policy" title="What we publish, and what it claims.">
        <Mdx source={intro.content} />
      </PageTitle>
      <div className="prose text-lg pt-14">
        <Mdx source={policy.content} components={{ KindsList }} />
      </div>
    </div>
  );
}
