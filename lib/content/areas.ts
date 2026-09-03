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
      "N-of-1 methodology. How you mine a person's real steering decisions out of years of transcripts, how you keep a held-out set the model can never see, and how you evaluate a persona without the evaluator quietly grading itself. Revealed preferences over stated ones; fiction-mediated elicitation and its observer effects; the construct problems that show up when the human being modelled had evidence the judge did not.",
  },
  "agent-operations": {
    slug: "agent-operations",
    name: "Agent operations",
    line: "Running real work through agents and measuring what happens.",
    beam: "Craft",
    body:
      "A small company runs its daily operations through a crew of named agents working over plain text files. Autonomy is declared per project and enforced in code, every change is reviewed by a session that never saw the author's conversation, and the whole thing is observable end to end. That makes it an instrument: trust as a measurement rather than a feeling, and a record of what agents actually do when the work is real.",
  },
  "local-compute": {
    slug: "local-compute",
    name: "Local & sovereign compute",
    line: "What you can actually do on hardware you own.",
    beam: "Sovereignty",
    body:
      "Open-weight models on a desk, measured against the frontier on the same tasks with the same harness. Where the local engine is a wash, where it isn't, and what the runtime knobs really do — reasoning budgets, quant formats, context division, speculative decoding — reported as numbers with their conditions attached.",
  },
};

export function areaInfo(slug: string): AreaInfo | undefined {
  return (AREAS as readonly string[]).includes(slug) ? AREA_INFO[slug as Area] : undefined;
}
