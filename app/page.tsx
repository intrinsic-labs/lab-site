import { listablePosts, countByKind } from "@/lib/content/posts";
import { Specimen } from "@/components/home/Specimen";
import { AreaCards } from "@/components/home/AreaCards";
import { InstrumentStrip } from "@/components/home/InstrumentStrip";
import { HowThisWorks } from "@/components/home/HowThisWorks";
import { SectionHead } from "@/components/ui/SectionHead";
import { PostList } from "@/components/research/PostList";

export default async function Home() {
  const posts = await listablePosts();
  const counts = await countByKind();

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* 00 Masthead */}
      <section className="grid-paper -mx-6 px-6 pt-20 pb-16 border-b border-rule">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end min-w-0">
          <div>
            <p className="label mb-6">Intrinsic Labs · a research studio</p>
            <h1 className="font-serif text-[2.4rem] sm:text-6xl font-medium tracking-tight leading-[1.02] max-w-[16ch]">
              We build the instruments we need, run our work through them, and publish what they measure.
            </h1>
            <p className="mt-8 text-lg sm:text-xl text-ink-2 max-w-[38ch] leading-snug">
              A one-person lab. N-of-1 elicitation, agents doing real work, and models on hardware we own —
              reported plainly, <span className="marker">including when the method didn&apos;t work.</span>
            </p>
          </div>
          <div className="min-w-0"><Specimen /></div>
        </div>
      </section>

      <section className="pt-16">
        <SectionHead n="01" title="Research areas" href="/research" hrefLabel="Index" />
        <AreaCards posts={posts} />
      </section>

      <section className="pt-20">
        <SectionHead n="02" title="Latest" href="/research" />
        <PostList posts={posts.slice(0, 6)} empty="Nothing published yet. The first notes are in review." />
        <p className="label mt-5">
          {counts.paper} {counts.paper === 1 ? "paper" : "papers"} · {counts.note} {counts.note === 1 ? "note" : "notes"} ·{" "}
          {counts["field-note"]} field {counts["field-note"] === 1 ? "note" : "notes"}
          {counts.paper === 0 && " — there are no papers yet, and we say so."}
        </p>
      </section>

      <section className="pt-20">
        <SectionHead n="03" title="Instruments" href="/instruments" />
        <InstrumentStrip />
      </section>

      <section className="pt-20">
        <SectionHead n="04" title="How this works" />
        <HowThisWorks />
      </section>
    </div>
  );
}
