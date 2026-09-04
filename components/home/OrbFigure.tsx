import {
  boxStyle,
  buildScene,
  discBackground,
  glowBackground,
  horizonPct,
  type OrbInput,
  type OrbSizing,
} from "./orb-geometry";

/** Strength of each of the three passes, carried over from the SVG this replaced. */
const HAZE = 0.8; // the blurred continuation under the water
const HALO = 0.32; // the same glow above it, behind the disc
const DISC = 0.92; // the crisp disc itself

/**
 * The drawing, emitted finished by the server — the static state is the real state, and it
 * is complete before any script runs.
 *
 * Above the horizon each orb is a solid disc with a soft halo; below it the same disc
 * continues as a heavily blurred glow, cut off at the line and fading downward.
 *
 * Two things about the construction are deliberate and load-bearing.
 *
 * **The glow is a radial gradient, not a filter.** `feGaussianBlur` has to be re-rasterised
 * every time anything inside the filtered group moves, which on a Retina screen is the
 * whole cost of a frame; the figure dropped to ~43fps whenever the pointer was over it.
 * `glowBackground()` traces the same erfc profile as a gaussian-blurred disc, so it paints
 * once and every frame after that is a compositor transform.
 *
 * **The glow layers are full-bleed, and only the type is boxed.** An SVG `mask` defaults to
 * a region of the referencing element's bounding box +10%, so the haze was being sliced off
 * at a hard vertical edge a little outside the discs — the black-beyond-the-glass edge in
 * Asher's screenshot. Here the two glow layers span the whole section and every falloff is a
 * gradient, so there is no edge to find at any width from 390 to 1920.
 *
 * There are no SVG `defs` left to namespace, which is why the two copies of this figure
 * (phone and desktop) no longer need a `uid`: nothing in here is referenced by id.
 */
export function OrbFigure({
  size,
  metrics,
  className = "",
}: {
  size: OrbSizing;
  metrics: OrbInput[];
  className?: string;
}) {
  const { orbs } = buildScene(size, metrics);
  const { width, height } = size;
  const h = horizonPct(size);

  // Not a mask anywhere near the animated layers. A CSS mask forces its whole subtree into
  // a render surface that has to be recomposited every frame, which on a 1920 viewport was
  // still costing dropped frames after the filter was gone. Two cheaper primitives replace
  // it: `overflow: hidden` on a clip box for the hard cut at the waterline, and a scrim —
  // an ordinary gradient of the page's own background colour painted over the top — for
  // every soft falloff. On a black page a paper-coloured scrim and an alpha mask are the
  // same picture, and the scrim is static, so it costs nothing per frame.
  const paper = (a: number) => `color-mix(in srgb, var(--color-paper) ${(a * 100).toFixed(0)}%, transparent)`;

  /**
   * A full-bleed layer clipped to one side of the waterline. The inner wrapper is scaled and
   * offset so that percentages inside it still resolve against the whole figure box, which
   * is what lets one set of coordinates place an element in either layer.
   */
  const bleed = (side: "above" | "below", children: React.ReactNode) => {
    const share = side === "above" ? size.horizonY / height : 1 - size.horizonY / height;
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 overflow-hidden"
        style={side === "above" ? { top: 0, height: h } : { top: h, bottom: 0 }}
      >
        <div
          className="absolute inset-x-0"
          style={{ height: `${(100 / share).toFixed(4)}%`, top: side === "above" ? 0 : `${(-100 * (size.horizonY / height) / share).toFixed(4)}%` }}
        >
          <div className={`mx-auto h-full w-full px-6 ${size.frameClass}`}>
            <div className="relative h-full w-full">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative w-full overflow-x-clip ${className}`}
      data-orb-scene
      data-vw={width}
      data-vh={height}
    >
      {/* Under the line: the blurred continuation of each disc. */}
      {bleed(
        "below",
        orbs.map((o) => (
          <div
            key={o.key}
            data-orb-glow={o.key}
            data-cx={o.cx}
            data-cy={o.cy}
            data-r={o.r}
            data-gr={o.glowR}
            className="absolute will-change-transform"
            style={{ ...boxStyle(o.cx, o.cy, o.glowR, size), background: glowBackground(o.colorVar, o.r, size.blur, HAZE) }}
          />
        )),
      )}

      {/* Above it: a halo, then the solid disc, both cut hard at the waterline. */}
      {bleed(
        "above",
        orbs.map((o) => (
          <div
            key={o.key}
            data-orb-body={o.key}
            data-cx={o.cx}
            data-cy={o.cy}
            data-r={o.r}
            data-gr={o.glowR}
            className="absolute will-change-transform"
            style={boxStyle(o.cx, o.cy, o.glowR, size)}
          >
            <div
              className="absolute inset-0"
              style={{ background: glowBackground(o.colorVar, o.r, size.blur, HALO) }}
            />
            <div
              className="absolute rounded-full"
              style={{
                inset: `${(((o.glowR - o.r) / (2 * o.glowR)) * 100).toFixed(4)}%`,
                background: discBackground(o.colorVar, DISC),
              }}
            />
          </div>
        )),
      )}

      {/* The haze thins with depth, and dies before it reaches the left and right edges of
          the viewport — so there is no edge to find at any width. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          top: h,
          background: `linear-gradient(to bottom, transparent 0%, ${paper(0.5)} 55%, var(--color-paper) 100%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[4%]"
        style={{ background: `linear-gradient(to right, var(--color-paper) 0%, transparent 100%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[4%]"
        style={{ background: `linear-gradient(to left, var(--color-paper) 0%, transparent 100%)` }}
      />

      {/* The waterline runs the width of the section, not the width of the figure. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-px"
        style={{
          top: h,
          background:
            "linear-gradient(to right, transparent 0%, var(--color-rule) 12%, var(--color-rule) 88%, transparent 100%)",
        }}
      />

      {/* The type, and only the type, is SVG: it is never animated, so it is never repainted,
          and inside the viewBox it scales with the drawing it belongs to. */}
      <div className={`relative mx-auto w-full px-6 ${size.frameClass}`}>
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" aria-hidden focusable="false">
          {orbs.map((o) => (
            <g key={o.key}>
              {o.labelLines.map((line, i) => (
                <text
                  key={line}
                  x={o.cx}
                  y={o.labelY - (o.labelLines.length - 1 - i) * size.labelSize * 1.35}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={size.labelSize}
                  letterSpacing={size.labelSize * 0.08}
                  fill="var(--color-ink-2)"
                >
                  {line}
                </text>
              ))}
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
      </div>

      {/* Hit areas: server-rendered so the client wrapper only has to listen, never lay out.
          Back-to-front order means the front-most orb wins where two overlap. */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`mx-auto h-full w-full px-6 ${size.frameClass}`}>
          <div className="relative h-full w-full" data-orb-box>
            {orbs.map((o) => (
              <button
                key={o.key}
                type="button"
                data-orb-hit={o.key}
                className="pointer-events-auto absolute rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink-3)]"
                style={boxStyle(o.cx, o.cy, o.r, size)}
              >
                <span className="sr-only">
                  {o.label}: {o.value.toFixed(1)} percent
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
