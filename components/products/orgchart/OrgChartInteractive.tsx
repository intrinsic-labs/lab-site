"use client";

import { useMemo, useRef, useState } from "react";
import { linkedIds, roleById, ROLES, TIERS, type RoleId } from "./roles";
import { OrgNode, type NodeState } from "./OrgNode";
import { NodeDetail } from "./NodeDetail";
import { useArrowNav } from "./useArrowNav";

/** Reading order of the nodes, tier by tier: the order the arrow keys walk. */
const ORDER: RoleId[] = TIERS.flatMap((t) => ROLES.filter((r) => r.tier === t.id).map((r) => r.id));

/**
 * The chart: stacked tiers that wrap, so it reads at 390px with no panning, and the detail
 * panel beside it from `lg` (below it on a phone). Selecting a role (tap, click, Enter or
 * Space, or moving focus onto it with Tab or the arrows) shows its detail and marks the roles
 * it works with; those marks are the chart's edges. A short live status announces each
 * change. Server-rendered with Asher selected, so the first paint is already complete.
 */
export function OrgChartInteractive() {
  const [selected, setSelected] = useState<RoleId>("asher");
  const linked = useMemo(() => linkedIds(selected), [selected]);
  const nav = useArrowNav(ORDER);
  const panelRef = useRef<HTMLHeadingElement>(null);
  const role = roleById(selected);

  const stateOf = (id: RoleId): NodeState => (id === selected ? "selected" : linked.has(id) ? "linked" : "rest");

  /** A pointer tap on a phone puts the panel below the fold; bring it into view, gently. */
  const revealPanel = () => {
    const el = document.getElementById("orgchart-detail");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  };

  const pickFromPanel = (id: RoleId) => {
    setSelected(id);
    // The button that was used re-renders away; keep focus in the panel, on its new title.
    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
      <div role="group" aria-label="Org chart. Use the arrow keys to move between roles." className="flex flex-col">
        {TIERS.map((tier, i) => (
          <div key={tier.id}>
            {i > 0 && <div aria-hidden className="mx-auto h-5 w-px bg-rule" />}
            <div className="rounded-lg border border-dashed border-rule px-3 pb-3 pt-2.5">
              <p className="label mb-2.5 text-center text-ink-3">{tier.label}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ROLES.filter((r) => r.tier === tier.id).map((r) => (
                  <OrgNode
                    key={r.id}
                    role={r}
                    state={stateOf(r.id)}
                    tabbable={r.id === selected}
                    buttonRef={nav.register(r.id)}
                    onKeyDown={nav.onKeyDown(r.id)}
                    onSelect={(how) => {
                      setSelected(r.id);
                      if (how === "pointer") revealPanel();
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
        <p className="label mt-4 flex items-center justify-center gap-2 text-ink-3">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-accent" />
          Works with the selected role
        </p>
      </div>

      <NodeDetail role={role} onPick={pickFromPanel} headingRef={panelRef} />

      <p aria-live="polite" className="sr-only">
        {role.name}, {role.kind}. Details shown.
      </p>
    </div>
  );
}
