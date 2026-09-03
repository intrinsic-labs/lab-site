/** The publication ladder. Each rung is a claim about how finished the work is. */
export const KINDS = ["paper", "note", "field-note"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  paper: "Paper",
  note: "Note",
  "field-note": "Field note",
};

export const KIND_CLAIM: Record<Kind, string> = {
  paper:
    "A full study: method, protocol (including what was held out and why), results, limitations, and the artifacts.",
  note: "A finding worth publishing that doesn't warrant a paper. Usually 1,000–3,000 words.",
  "field-note":
    "Short, dated, specific. One thing that turned out to be true — a harness gotcha, a number that meant something other than what it looked like, a thing that broke.",
};
