import { buildScene, type OrbInput, type OrbSizing } from "./orb-geometry";

/**
 * The drawing itself, emitted as finished SVG by the server — the static state is the
 * real state, and it is complete before any script runs.
 *
 * Above the horizon each orb is a solid disc; below it the same disc continues as a
 * heavily blurred glow, cut off at the line and fading downward. In SVG the filter is
 * applied before the clip, so blurring the whole circle and then clipping to the water
 * gives exactly the haze the reference has: the disc's light spreading under the line
 * rather than a blurred half-moon.
 *
 * `uid` namespaces the defs, because two copies of this figure (phone and desktop) exist
 * in the same document and duplicate SVG ids resolve to whichever came first.
 */
export function OrbFigure({
  uid,
  size,
  metrics,
  className = "",
}: {
  uid: string;
  size: OrbSizing;
  metrics: OrbInput[];
  className?: string;
}) {
  const { orbs } = buildScene(size, metrics);
  const { width, height, horizonY, blur } = size;
  const id = (name: string) => `orb-${uid}-${name}`;

  const discs = (
    <>
      {orbs.map((o) => (
        <g key={o.key} data-orb={o.key} data-cx={o.cx} data-cy={o.cy} data-r={o.r}>
          <circle cx={o.cx} cy={o.cy} r={o.r} fill={`url(#${id(o.key)})`} />
        </g>
      ))}
    </>
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block w-full ${className}`}
      data-orb-scene
      data-vw={width}
      data-vh={height}
      role="img"
      aria-label={orbs
        .map((o) => `${o.label}: ${o.value.toFixed(1)}% of the way to fully autonomous`)
        .join(". ")}
    >
      <defs>
        {orbs.map((o) => (
          <radialGradient key={o.key} id={id(o.key)} cx="50%" cy="32%" r="76%">
            <stop offset="0%" stopColor={`var(${o.colorVar})`} stopOpacity="0.95" />
            <stop offset="100%" stopColor={`var(${o.colorVar})`} stopOpacity="0.6" />
          </radialGradient>
        ))}

        <filter id={id("blur")} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>

        <clipPath id={id("above")}>
          <rect x="0" y="0" width={width} height={horizonY} />
        </clipPath>
        <clipPath id={id("below")}>
          <rect x="0" y={horizonY} width={width} height={height - horizonY} />
        </clipPath>

        {/* The haze thins with depth. */}
        <linearGradient id={id("fade")} x1="0" y1={horizonY} x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={id("haze")}>
          <rect x="0" y={horizonY} width={width} height={height - horizonY} fill={`url(#${id("fade")})`} />
        </mask>

        <linearGradient id={id("rule")} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-rule)" stopOpacity="0" />
          <stop offset="16%" stopColor="var(--color-rule)" stopOpacity="1" />
          <stop offset="84%" stopColor="var(--color-rule)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-rule)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Under the line: the blurred continuation of each disc. */}
      <g clipPath={`url(#${id("below")})`}>
        <g mask={`url(#${id("haze")})`}>
          <g filter={`url(#${id("blur")})`} opacity="0.8">
            {discs}
          </g>
        </g>
      </g>

      {/* Above it: a halo, then the solid disc. */}
      <g clipPath={`url(#${id("above")})`}>
        <g filter={`url(#${id("blur")})`} opacity="0.32">
          {discs}
        </g>
        <g opacity="0.92">{discs}</g>
      </g>

      <line x1="0" y1={horizonY} x2={width} y2={horizonY} stroke={`url(#${id("rule")})`} strokeWidth="1" />

      {/* Each number sits directly over its own orb, so the cascade of the figures is the
          cascade of the discs. */}
      {orbs.map((o) => (
        <g key={o.key}>
          <text
            x={o.cx}
            y={o.labelY}
            textAnchor="middle"
            className="font-mono"
            fontSize={size.labelSize}
            letterSpacing={size.labelSize * 0.08}
            fill="var(--color-ink-2)"
            style={{ textTransform: "uppercase" }}
          >
            {o.label.toUpperCase()}
          </text>
          <text
            x={o.cx}
            y={o.valueY}
            textAnchor="middle"
            className="font-serif"
            fontSize={size.valueSize}
            fill={`var(${o.colorVar})`}
          >
            {o.value.toFixed(1)}
            <tspan fontSize={size.valueSize * 0.5} fill="var(--color-ink-3)">
              %
            </tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
