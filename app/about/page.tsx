import Image from "next/image";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHead } from "@/components/ui/SectionHead";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "Who's behind the lab, what it believes, and how it operates." };

// `public/about/portrait.{jpg,png,webp}` — dropped in by hand (see public/about/README.md),
// never sourced by an agent. Checked at build time; absent renders no placeholder at all.
const PORTRAIT_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

function findPortrait(): string | undefined {
  for (const ext of PORTRAIT_EXTENSIONS) {
    if (fs.existsSync(path.join(process.cwd(), "public", "about", `portrait.${ext}`))) {
      return `/about/portrait.${ext}`;
    }
  }
  return undefined;
}

export default async function AboutPage() {
  const [intro, bio, beliefs, operations] = await Promise.all([
    pageContent("about-intro"),
    pageContent("about-bio"),
    pageContent("about-beliefs"),
    pageContent("about-operations"),
  ]);
  const portrait = findPortrait();
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="About" title="A small lab that shows its work.">
        <Mdx source={intro.content} />
      </PageTitle>

      <section className="pt-12">
        <SectionHead n="01" title="Who I am" />
        <div className={portrait ? "flex flex-col gap-8 md:flex-row md:items-start md:gap-10" : undefined}>
          {portrait && (
            <div className="order-first flex-none md:order-last md:w-80">
              <div className="relative aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-2xl">
                <Image src={portrait} alt="Asher Pope" fill priority sizes="320px" className="object-cover" />
              </div>
            </div>
          )}
          <div className="prose text-lg">
            <Mdx source={bio.content.replace(/\{email\}/g, site.email)} />
          </div>
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
