import { buildScene, type ChartMetric, type Line, type Sizing } from "./autonomy-geometry";

/**
 * The plate, as SVG rendered by the server. Every path, every number and every label
 * is in the HTML that comes off the wire — nothing here waits on JavaScript, an
 * IntersectionObserver, or a canvas context. `AutonomyTilt` layers motion on top of
 * this; with motion off, or scripting off, the finished picture is what you get.
 *
 * Each column is solid up to its measured reading and continues as a blurred, low-opacity
 * "ghost" of itself up to the top of the goal band — so the picture reads as *this much
 * done, this much to go* without the ghost ever being mistaken for the number.
 */
export function AutonomyChart({
  metrics,
  goal,
  size,
  uid,
  className = "",
  ariaHidden = false,
}: {
  metrics: ChartMetric[];
  goal: { low: number; high: number };
  size: Sizing;
  /** Namespaces the filter ids — two variants of this chart share one document. */
  uid: string;
  className?: string;
  ariaHidden?: boolean;
}) {
  const scene = buildScene(metrics, goal, size);
  const blur = `au-blur-${uid}`;
  const summary = metrics.map((m) => `${m.label} ${m.height.toFixed(1)}%`).join("; ");

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className={`block w-full h-auto ${className}`}
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden || undefined}
      aria-labelledby={ariaHidden ? undefined : `au-t-${uid} au-d-${uid}`}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {!ariaHidden && (
        <>
          <title id={`au-t-${uid}`}>How much of this company runs itself</title>
          <desc id={`au-d-${uid}`}>
            {summary}. The goal band is {goal.low} to {goal.high} percent; the translucent
            extension above each column is the distance still to cover.
          </desc>
        </>
      )}

      <defs>
        <filter id={blur} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation={size.s * 0.012} />
        </filter>
      </defs>

      <g className="au-scene">
        {/* The box: a back wall and a floor, one shade off the sheet. */}
        <path d={scene.wall} fill="var(--color-paper)" />
        <path d={scene.floor} fill="var(--color-paper)" />

        <g stroke="var(--color-rule)" strokeWidth="1" opacity="0.85">
          {scene.grid.map((l, i) => (
            <Seg key={i} l={l} />
          ))}
        </g>
        <g stroke="var(--color-ink-3)" strokeWidth="1">
          {scene.edges.map((l, i) => (
            <Seg key={i} l={l} />
          ))}
        </g>

        {/* The scale, on the front-left edge where a plotter would have put it. */}
        <g fill="var(--color-ink-3)" fontSize={size.tick}>
          {scene.ticks.map((t) => (
            <g key={t.label.text}>
              <Seg l={t.line} stroke="var(--color-ink-3)" strokeWidth="1" />
              <text x={t.label.x} y={t.label.y} textAnchor="end" dominantBaseline="middle">
                {t.label.text}
              </text>
            </g>
          ))}
        </g>

        {/* The goal band: a slab floating at the target, marked the way a page is marked. */}
        <g className="au-band">
          <path d={scene.band.top} fill="var(--color-marker)" opacity="0.5" />
          <path d={scene.band.right} fill="var(--color-marker)" opacity="0.7" />
          <path
            d={scene.band.front}
            fill="var(--color-marker)"
            stroke="var(--color-ink-3)"
            strokeWidth="1"
          />
          <text
            x={scene.band.label.x}
            y={scene.band.label.y}
            fill="var(--color-ink-2)"
            fontSize={size.tick}
            dominantBaseline="middle"
            className="au-counter"
          >
            {scene.band.label.text}
          </text>
        </g>

        {/* The columns. */}
        {scene.bars.map((bar, i) => (
          <g key={bar.key}>
            {bar.ghost && (
              <g
                className="au-ghost"
                style={{ ["--au-delay" as string]: `${260 + i * 120}ms` }}
              >
                <g filter={`url(#${blur})`}>
                  <path d={bar.ghost.right} fill="var(--color-ink)" opacity="0.14" />
                  <path d={bar.ghost.top} fill="var(--color-ink)" opacity="0.06" />
                  <path d={bar.ghost.front} fill="var(--color-ink)" opacity="0.09" />
                </g>
                <g
                  fill="none"
                  stroke="var(--color-ink-3)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.9"
                >
                  <path d={bar.ghost.front} />
                  <path d={bar.ghost.right} />
                </g>
              </g>
            )}

            <g
              className="au-bar"
              style={{
                transformOrigin: `${bar.originX}px ${bar.originY}px`,
                ["--au-delay" as string]: `${i * 110}ms`,
              }}
            >
              <path d={bar.solid.right} fill="var(--color-paper-3)" stroke="var(--color-ink)" strokeWidth="1" />
              <path d={bar.solid.top} fill="var(--color-paper-2)" stroke="var(--color-ink)" strokeWidth="1" />
              <path d={bar.solid.front} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1" />
              <Seg l={bar.solid.lid} stroke="var(--color-accent)" strokeWidth="1.5" />
            </g>

            {/* The reading, set on the solid top face — never on the ghost. */}
            <text
              className="au-counter au-readout"
              style={{ ["--au-delay" as string]: `${340 + i * 110}ms` }}
              x={bar.readout.x}
              y={bar.readout.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-ink)"
              fontSize={size.readout}
            >
              {bar.readout.text}
            </text>
          </g>
        ))}
      </g>

      {/* Captions stay square to the page — the plate turns, the words do not. */}
      <g fill="var(--color-ink-2)" fontSize={size.caption} textAnchor="middle">
        {scene.bars.map((bar) =>
          bar.caption.map((c, li) => (
            <text key={`${bar.key}-${li}`} x={c.x} y={c.y} dominantBaseline="middle">
              {c.text}
            </text>
          )),
        )}
      </g>
    </svg>
  );
}

function Seg({ l, ...rest }: { l: Line } & React.SVGProps<SVGLineElement>) {
  return <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} {...rest} />;
}
