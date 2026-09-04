import { KINDS, KIND_LABEL, KIND_CLAIM } from "@/lib/content/kinds";

/**
 * The publication ladder, spliced into the editorial policy's prose as an MDX shortcode
 * (`<KindsList />` in `content/pages/editorial.md`) so the list stays live against
 * `lib/content/kinds.ts` instead of being copied into markdown as static text.
 */
export function KindsList() {
  return (
    <dl>
      {KINDS.map((k) => (
        <div key={k} className="mt-3">
          <dt className="label">{KIND_LABEL[k]}</dt>
          <dd>{KIND_CLAIM[k]}</dd>
        </div>
      ))}
    </dl>
  );
}
