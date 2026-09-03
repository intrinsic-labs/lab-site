import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { KINDS, KIND_LABEL, KIND_CLAIM } from "@/lib/content/kinds";

export const metadata: Metadata = { title: "Editorial policy", description: "How something gets published here, and what each rung claims." };

export default function EditorialPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <PageTitle kicker="About · editorial policy" title="What we publish, and what it claims.">
        <p>Linked from every post. Short on purpose.</p>
      </PageTitle>
      <div className="prose text-lg pt-12">
        <h2>1. Three rungs</h2>
        <p>Each item declares which it is and wears the label everywhere it appears.</p>
        <dl>
          {KINDS.map((k) => (
            <div key={k} className="mt-3">
              <dt className="label">{KIND_LABEL[k]}</dt>
              <dd>{KIND_CLAIM[k]}</dd>
            </div>
          ))}
        </dl>
        <p>There are no papers yet. The index says so rather than padding.</p>

        <h2>2. Negative results publish, with their caveats attached</h2>
        <p>
          A method that didn&apos;t work is a result. A benchmark that turned out to be saturated is a result. We publish
          them at the rung they earned, and every post carries its <strong>caveats</strong> in the header, above the
          fold, not in a limitations section at the end.
        </p>

        <h2>3. The method is published; the corpus never is</h2>
        <p>
          The elicitation work is built on one person&apos;s private transcripts. Every study says what was withheld and
          why. Harnesses, prompts, per-item results, seeds and salts are released where they can be; the personal data
          is not, ever, and a post whose artifacts can&apos;t be released says so instead of leaving the block empty.
        </p>

        <h2>4. Disclosure: agents draft, a human approves</h2>
        <p>
          Posts are drafted by agents from the lab&apos;s own records — run reports, bench write-ups, design documents —
          as a branch and a pull request. A human reads the rendered draft, corrects it, and merges it or doesn&apos;t.
          Nothing appears here without that explicit yes. This is not a footnote: running real work through agents
          is one of the three things we study, and this site is produced by that pipeline.
        </p>

        <h2>5. Corrections are appended and dated</h2>
        <p>
          When something turns out to be wrong, the correction is added beneath the post with its date. The original
          text is not silently edited. Every post shows its corrections block even when it is empty, so the promise is
          visible.
        </p>

        <h2>6. What we don&apos;t do</h2>
        <ul>
          <li>No newsletter, no comments, no analytics that phone home.</li>
          <li>No invented dates, stakeholders or numbers. When a figure is a working estimate it says so.</li>
          <li>No publication-count vanity. If there are eight things, the index shows eight things.</li>
        </ul>
      </div>
    </div>
  );
}
