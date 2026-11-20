import type { Metadata } from "next";
import Link from "next/link";
import { pageContent } from "@/lib/content/pages";
import { Mdx } from "@/lib/mdx/render";
import { OrgChart } from "@/components/products/orgchart/OrgChart";
import { VisrShot } from "@/components/products/howitworks/VisrShot";
import { VisrShots } from "@/components/products/howitworks/VisrShots";

/**
 * How IntrinsicOS and VISR work, as a Lab report under the IntrinsicOS product page. A static
 * folder beside `[slug]` (the aspen-grove/open-loom pattern); `/products/intrinsic-os` itself
 * still comes from `[slug]`, because this folder has no page of its own at that level.
 *
 * The prose is two files in content/pages/: the introduction, the flow of work, the VISR
 * screenshots and "Who does what" (`-intro`), then where the founder sits, what is manual and
 * what has failed (`-limits`). The org chart sits between them at the page's full width,
 * outside the reading column (see OrgChart.tsx for why).
 */
export async function generateMetadata(): Promise<Metadata> {
  const { data } = await pageContent("intrinsic-os-how-it-works-intro");
  return { title: String(data.title), description: String(data.description) };
}

export default async function HowItWorksPage() {
  const [intro, limits] = await Promise.all([
    pageContent("intrinsic-os-how-it-works-intro"),
    pageContent("intrinsic-os-how-it-works-limits"),
  ]);
  const column = "mx-auto max-w-[68ch] prose prose-post";
  return (
    <article className="mx-auto max-w-6xl px-6">
      <header className="mx-auto max-w-[68ch] pb-10 pt-16">
        <p className="label mb-4">
          <Link href="/products/intrinsic-os" className="hover:text-accent">
            ← IntrinsicOS
          </Link>
          <span className="text-ink-3"> · {String(intro.data.kicker)}</span>
        </p>
        <h1 className="font-sans text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">{String(intro.data.title)}</h1>
        <p className="mt-6 text-lg text-ink-2">{String(intro.data.dek)}</p>
      </header>

      <div className="border-t border-rule pt-10">
        <div className={column}>
          <Mdx source={intro.content} components={{ VisrShot, VisrShots }} />
        </div>
      </div>

      <OrgChart />

      <div className="pb-20 pt-6">
        <div className={column}>
          <Mdx source={limits.content} />
        </div>
      </div>
    </article>
  );
}
