/**
 * A small category/kind label. Ruling (Asher, 2026-09-04): NOT a stroked pill — text on a
 * low-opacity fill at a small radius, no border. That is latent-spaces-web's own tag /
 * inline-code shape (a 10% wash of the text colour, `rounded px-1.5 py-0.5 font-calling-code`); a stroke reads as
 * a control on a black ground, and these are captions. The shape itself lives in
 * `.pill` / `.pill-*` in app/globals.css so the OpenLoom banner can reuse it.
 */
export function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "marker" | "muted" }) {
  const tones = {
    default: "",
    accent: "pill-accent",
    marker: "pill-marker",
    muted: "pill-muted",
  };
  return <span className={`pill ${tones[tone]}`}>{children}</span>;
}
