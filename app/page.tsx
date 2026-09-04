import { listablePosts, countByKind } from "@/lib/content/posts";
import { AutonomySpecimen } from "@/components/home/AutonomySpecimen";
import { Masthead } from "@/components/home/Masthead";
import { AreaCards } from "@/components/home/AreaCards";
import { InstrumentStrip } from "@/components/home/InstrumentStrip";
import { HowThisWorks } from "@/components/home/HowThisWorks";
import { SectionHead } from "@/components/ui/SectionHead";
import { PostList } from "@/components/research/PostList";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export default async function Home() {
  const [posts, counts, subtitle] = await Promise.all([listablePosts(), countByKind(), pageContent("home-subtitle")]);

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* 00 Masthead */}
      <Masthead className="grid-paper -mx-6 border-b border-rule">
      <section className="px-6 pt-20 pb-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end min-w-0">
          <div>
            <p className="label mb-6">Intrinsic Labs · a research studio</p>
            <h1 className="font-serif text-[2.4rem] sm:text-6xl font-medium tracking-tight leading-[1.02] max-w-[16ch]">
              We build the instruments we need, run our work through them, and publish what they measure.
            </h1>
            <div className="mt-8 text-lg sm:text-xl text-ink-2 max-w-[38ch] leading-snug">
              <Mdx source={subtitle.content} />
            </div>
          </div>
          <div className="min-w-0"><AutonomySpecimen /></div>
        </div>
      </section>
      </Masthead>

      <section className="pt-16">
        <SectionHead n="01" title="How this works" />
        <HowThisWorks />
      </section>

      <section className="pt-20">
        <SectionHead n="02" title="Research areas" href="/research" hrefLabel="Index" />
        <AreaCards posts={posts} />
      </section>

      <section className="pt-20">
        <SectionHead n="03" title="Latest" href="/research" />
        <PostList posts={posts.slice(0, 6)} empty="Nothing published yet. The first notes are in review." />
        <p className="label mt-5">
          {counts.paper} {counts.paper === 1 ? "paper" : "papers"} · {counts.note} {counts.note === 1 ? "note" : "notes"} ·{" "}
          {counts["field-note"]} field {counts["field-note"] === 1 ? "note" : "notes"}
        </p>
        {posts.slice(0, 6).some((p) => p.status === "draft") && (
          <p className="text-ink-3 mt-2 text-sm leading-snug">
            Items marked <em>draft</em> are agent-written and not yet approved by a human; they
            appear only on preview builds.
          </p>
        )}
      </section>

      <section className="pt-20">
        <SectionHead n="04" title="Instruments" href="/instruments" />
        <InstrumentStrip />
      </section>
    </div>
  );
}
