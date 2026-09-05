import type { ProductDemo as ProductDemoId } from "@/lib/content/schema";
import { TychoDemo } from "./TychoDemo";

/**
 * The registry behind the `demo:` front-matter field: one component per id in
 * `PRODUCT_DEMOS`. Adding a demo is a new file here, a new entry in this map and a new id in
 * the schema enum — the type makes a missing entry a compile error rather than an empty box.
 */
const DEMOS: Record<ProductDemoId, () => React.JSX.Element> = {
  tycho: TychoDemo,
};

export function ProductDemo({ id }: { id: ProductDemoId }) {
  const Demo = DEMOS[id];
  return <Demo />;
}
