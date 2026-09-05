export type HeadingSlugger = (text: string) => string;

// Structural slice of hast — `@types/hast` is not a declared dependency here and this
// plugin touches only these fields, so the shape is stated rather than imported.
type Node = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: Node[] };

const HEADINGS = new Set(["h2", "h3", "h4"]);

function textOf(node: Node): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/**
 * Minimal `rehype-slug` — the site has no dependency on it, and the one caller wants the
 * ids computed by ITS slug rule (so a rail link and the heading it points at can never
 * disagree). Dedupes a repeated slug with `-2`, `-3`, …
 */
export function rehypeHeadingIds(slugger: HeadingSlugger) {
  return (tree: Node) => {
    const seen = new Map<string, number>();
    for (const node of tree.children ?? []) {
      if (node.type !== "element" || !node.tagName || !HEADINGS.has(node.tagName)) continue;
      node.properties ??= {};
      if (node.properties.id) continue;
      const base = slugger(textOf(node)) || node.tagName;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      node.properties.id = n === 1 ? base : `${base}-${n}`;
    }
  };
}
