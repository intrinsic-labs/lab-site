import Link from "next/link";

export function HowThisWorks() {
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
      <div className="prose text-lg">
        <p>
          Intrinsic Labs is one person. The daily operation of the company — routing ideas, reconciling
          projects, drafting, reviewing, publishing — runs through a small crew of named agents that read and
          write a folder of plain Markdown files on a schedule. Every project declares how much autonomy those
          agents have, and the declaration is enforced in code, not in a prompt. Every change is reviewed by a
          session that never saw the author&apos;s conversation. Nothing publishes without a human&apos;s explicit yes.
        </p>
        <p>
          That system is also the subject. Area 02 is the study of what agents do when the work is real, and
          this site is one of its instruments.
        </p>
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
