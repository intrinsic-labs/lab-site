export function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "muted" }) {
  const tones = {
    default: "border-ink text-ink",
    accent: "border-accent text-accent",
    muted: "border-rule text-ink-3",
  };
  return (
    <span className={`label inline-block border px-1.5 py-0.5 leading-none ${tones[tone]}`}>{children}</span>
  );
}
