import { KIND_LABEL, type Kind } from "@/lib/content/kinds";
import { Chip } from "@/components/ui/Chip";

export function KindLabel({ kind }: { kind: Kind }) {
  return <Chip tone={kind === "paper" ? "accent" : "default"}>{KIND_LABEL[kind]}</Chip>;
}
