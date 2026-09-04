import type { WorkTint } from "@/lib/content/schema";

/**
 * Reads a CSS custom property off `:root` at mount time, so a scene's point-cloud colour
 * follows whichever palette is live (the cream plate today, the black reskin once it lands)
 * instead of a hardcoded hex the way the original intrinsiclabs-co-v3 wireframes did
 * (`0xd4c9a8` baked into every file). Same rule as the JSX: never hardcode a colour, read the
 * token. Falls back to the light-mode `--color-ink-2` value for the brief window before the
 * stylesheet is attached (or if this ever runs somewhere with no `window`).
 */
export function readCssColor(varName: string, fallback = "#5a544b"): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

/**
 * Resolves a case study's `tint` front-matter value to `--color-<tint>`, falling back to
 * the scenes' original `--color-ink-2` grey when no tint is set. Kept a thin wrapper over
 * `readCssColor` rather than hardcoding the fallback var name in every scene file.
 */
export function readTintColor(tint?: WorkTint): string {
  return readCssColor(tint ? `--color-${tint}` : "--color-ink-2");
}
