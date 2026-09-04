/** Declared research areas. These are permanent URLs — approved by Asher 2026-09-03 (D1). */
export const AREAS = ["elicitation", "agent-operations", "local-compute"] as const;
export type Area = (typeof AREAS)[number];

export interface AreaInfo {
  slug: Area;
  name: string;
  /** The one-line definition. */
  line: string;
  /** Which of the Guide's Two Beams it hangs off. */
  beam: "Craft" | "Sovereignty";
  /** A short paragraph for the area page. */
  body: string;
}

export const AREA_INFO: Record<Area, AreaInfo> = {
  elicitation: {
    slug: "elicitation",
    name: "Elicitation & personalization",
    line: "Getting one person's actual judgment into a machine, and measuring honestly whether it got there.",
    beam: "Craft",
    body:
      "Single-subject (N-of-1) methodology, worked out in practice: how to mine a person's real past decisions out of years of transcripts; how to keep a held-out set of those decisions hidden from the model being tested, so it can be checked against choices it never saw; and how to grade a stand-in persona's answers without letting the same system grade its own test. It favors what someone actually chose over what they say they would choose, checks whether presenting a decision as a fictional scenario changes the answer, and watches for cases where the person being modelled knew something the grader did not. What it is working toward is a stand-in current enough to be trusted with a real decision, and a number that says whether it is.",
  },
  "agent-operations": {
    slug: "agent-operations",
    name: "Agent operations",
    line: "Running real work through agents and measuring what happens.",
    beam: "Craft",
    body:
      "A small company runs its daily operations through a crew of software agents, each with its own name and job, working over plain text files. Autonomy is declared per project and enforced in code; every change is supposed to be reviewed by a session that never saw the author's conversation — in the measured window, 51 of 58 branches actually were — and the whole thing is observable end to end. That makes it an instrument: a record of what agents actually do when the work is real, checked against what happened rather than taken on trust. It is aimed at a company that runs most of itself, with the failures still legible on the days it doesn't.",
  },
  "local-compute": {
    slug: "local-compute",
    name: "Local & sovereign compute",
    line: "What you can actually do on hardware you own.",
    beam: "Sovereignty",
    body:
      "Open-weight models on a desk, measured against the frontier on the same tasks with the same harness. Where the local engine is a wash, where it isn't, and what the runtime knobs really do — reasoning budgets, quant formats, context division, speculative decoding — reported as numbers with their conditions attached. The end of it is a clear line: which of this lab's own work can run on hardware it owns, and what that costs.",
  },
};

export function areaInfo(slug: string): AreaInfo | undefined {
  return (AREAS as readonly string[]).includes(slug) ? AREA_INFO[slug as Area] : undefined;
}
