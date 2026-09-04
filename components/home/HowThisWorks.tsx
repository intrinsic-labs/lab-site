import Link from "next/link";
import { Mdx } from "@/lib/mdx/render";
import { pageContent } from "@/lib/content/pages";

export async function HowThisWorks() {
  const body = await pageContent("how-this-works");
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
      <div className="prose text-lg">
        <Mdx source={body.content} />
      </div>
      <div className="border-l border-rule pl-8 flex flex-col justify-between gap-8">
        <p className="font-serif text-2xl leading-snug tracking-tight">
          “Drafted by agents in a vault of plain text files. Reviewed, corrected, and approved by a human before
          anything appears here — which is also, in part, what we study.”
        </p>
        <Link href="/about/editorial" className="label hover:text-ink">Read the editorial policy →</Link>
      </div>
    </div>
  );
}
