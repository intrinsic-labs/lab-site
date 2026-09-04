/**
 * Deterministic placeholder cover for a post (or product) card with no real image yet: a
 * seeded plotted trochoid over a faint dot grid, drawn only in the paper/ink palette so it
 * never looks like it's pretending to be a photo. Pure SVG, server-renderable — no canvas,
 * no client JS, so it's safe inside a card that's otherwise a plain server component.
 *
 * Same curve family as the masthead's Spirograph and components/home/CardCover.tsx (a
 * temporary fallback another agent is using on the home page until this lands there too),
 * so a generated cover reads as one mark wherever it shows up. This version adds the faint
 * background grid the brief asked for, which CardCover doesn't have.
 */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function trochoid(cx: number, cy: number, petals: number, r1: number, r2: number, squash: number, steps = 200): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = r1 + r2 * Math.cos(petals * t);
    pts.push(`${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t) * squash).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function GenerativeCover({ seed, className = "" }: { seed: string; className?: string }) {
  const h = hashSeed(seed);
  const petals = 3 + (h % 6); // 3–8
  const r1 = 22 + (h % 16);
  const r2 = 7 + ((h >> 4) % 14);
  const rot = h % 360;
  const cx = 100;
  const cy = 75;
  const gridId = `gc-grid-${seed}`;

  return (
    <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="">
      <defs>
        <pattern id={gridId} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="0.6" cy="0.6" r="0.6" fill="var(--color-paper-3)" />
        </pattern>
      </defs>
      <rect width="200" height="150" fill="var(--color-paper-2)" />
      <rect width="200" height="150" fill={`url(#${gridId})`} />
      <circle cx={cx} cy={cy} r={r1 + r2 + 2} fill="none" stroke="var(--color-rule)" strokeWidth="0.5" />
      <polyline
        points={trochoid(cx, cy, petals, r1, r2, 0.72)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.1"
        transform={`rotate(${rot} ${cx} ${cy})`}
      />
      <polyline
        points={trochoid(cx, cy, petals + 2, r1 * 0.6, r2 * 0.6, 0.72)}
        fill="none"
        stroke="var(--color-ink-3)"
        strokeWidth="0.6"
        transform={`rotate(${(rot + 40) % 360} ${cx} ${cy})`}
      />
    </svg>
  );
}
