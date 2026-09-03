import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHead } from "@/components/ui/SectionHead";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "What the lab is and how it operates." };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="About" title="A small lab that shows its work.">
        <p>
          Intrinsic Labs is a one-person software studio in Richmond, Virginia, run by Asher Pope. Client work pays
          for it. The research is what it&apos;s for.
        </p>
      </PageTitle>

      <section className="pt-12">
        <SectionHead n="01" title="What we believe" />
        <div className="prose text-lg">
          <p>
            Value should be <em>intrinsic</em> — inside the thing itself, not extracted from the person using it,
            not rented back to them, and wherever possible not dependent on someone else&apos;s server or permission.
            Everything we build hangs on two beams.
          </p>
          <h3>Sovereignty</h3>
          <p>
            People should own their technology: their data, their compute, their experience. Software should be
            local-first — working on the user&apos;s machine, with the user&apos;s data, under the user&apos;s control, with
            cloud services offered as a convenience and never engineered as a hostage situation. Resilience is a
            feature. We build things that keep working when the center fails.
          </p>
          <h3>Craft</h3>
          <p>
            Craft is not polish. It is the refusal to ship the incoherent version. Someone must own the whole story
            of a product and it must ship as one thing — respecting the user&apos;s intelligence and time, sitting at
            the correct distance in their life, fully present when needed and receding when not. No feature gets
            added because a competitor has it.
          </p>
        </div>
      </section>

      <section className="pt-16">
        <SectionHead n="02" title="How the lab operates" />
        <div className="prose text-lg">
          <p>
            One person, and a small crew of named agents. The company&apos;s operating state lives in a folder of
            plain Markdown files. Agents read and write those files on a schedule: routing raw notes into projects,
            reconciling what each project says against what its code actually does, drafting, reviewing, and
            surfacing the handful of decisions that need a human. Every project declares in its own file how much
            those agents may do — draft only, build to a boundary and stop, or run to completion — and the
            declaration is enforced in code. Every change to a code repository is reviewed by a second session
            that never saw the first one&apos;s conversation. Nothing outward-facing happens without an explicit human yes.
          </p>
          <p>
            We treat that arrangement as an experiment as much as an operating model. The agent-operations research
            area is built on what it records.
          </p>
          <p>
            Nearly everything on this site was drafted by those agents from the lab&apos;s own records, then read,
            corrected and approved by Asher before it appeared. The <Link href="/about/editorial">editorial policy</Link>
            {" "}says exactly what that means.
          </p>
        </div>
      </section>

      <section className="pt-16">
        <SectionHead n="03" title="Contact" />
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
