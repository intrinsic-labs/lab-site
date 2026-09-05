import { cache } from "react";
import { readDir } from "./fs";
import { caseStudyFrontMatter, type CaseStudyFrontMatter } from "./schema";

export interface CaseStudy extends CaseStudyFrontMatter {
  slug: string;
  body: string;
}

export const allCaseStudies = cache(async (): Promise<CaseStudy[]> => {
  const entries = await readDir("work");
  return entries
    .map((e) => {
      const parsed = caseStudyFrontMatter.safeParse(e.data);
      if (!parsed.success) throw new Error(`content/work/${e.slug}: ${parsed.error.message}`);
      return { ...parsed.data, slug: e.slug, body: e.body };
    })
    .sort((a, b) => a.order - b.order);
});

/** The client portfolio — everything not marked `kind: open-source`. */
export async function clientWork(): Promise<CaseStudy[]> {
  return (await allCaseStudies()).filter((c) => c.kind === "client");
}

/** The open-source projects, in `order`. */
export async function openSourceWork(): Promise<CaseStudy[]> {
  return (await allCaseStudies()).filter((c) => c.kind === "open-source");
}

export async function caseStudyBySlug(slug: string): Promise<CaseStudy | undefined> {
  return (await allCaseStudies()).find((c) => c.slug === slug);
}
