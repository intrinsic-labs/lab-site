import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHead } from "@/components/ui/SectionHead";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "Who's behind the lab, what it believes, and how it operates." };

export default async function AboutPage() {
  const [intro, bio, beliefs, operations] = await Promise.all([
    pageContent("about-intro"),
    pageContent("about-bio"),
    pageContent("about-beliefs"),
    pageContent("about-operations"),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="About" title="A small lab that shows its work.">
        <Mdx source={intro.content} />
      </PageTitle>

      <section className="pt-12">
        <SectionHead n="01" title="Who I am" />
        <div className="prose text-lg">
          <Mdx source={bio.content.replace(/\{email\}/g, site.email)} />
        </div>
      </section>

      <section className="pt-16">
        <SectionHead n="02" title="What we believe" />
        <div className="prose text-lg">
          <Mdx source={beliefs.content} />
        </div>
      </section>

      <section className="pt-16">
        <SectionHead n="03" title="How the lab operates" />
        <div className="prose text-lg">
          <Mdx source={operations.content} />
        </div>
      </section>

      <section className="pt-16">
        <SectionHead n="04" title="Contact" />
        <div className="prose text-lg">
          <p>
            <a href={`mailto:${site.email}`}>{site.email}</a> · <a href={site.github}>GitHub</a> ·{" "}
            <a href="https://www.linkedin.com/in/asher-pope/">LinkedIn</a>. If you work on elicitation, evaluation,
            or running agents against real work and want to compare notes, write.
          </p>
        </div>
      </section>
    </div>
  );
}
