"use client";

import type { KeyboardEvent, Ref } from "react";
import type { Role } from "./roles";

export type NodeState = "selected" | "linked" | "rest";

const STATE_CLASS: Record<NodeState, string> = {
  selected: "border-accent bg-accent/15 text-ink",
  linked: "border-ink-3 bg-paper-2 text-ink",
  rest: "border-rule bg-paper text-ink-2 hover:border-ink-3 hover:text-ink",
};

/**
 * One role in the chart. A native button, so Enter and Space select it with no extra code;
 * focusing it selects it too (the chart passes `onFocus`). Only one node is in the Tab order
 * at a time (`tabbable`), and the arrow keys move between them (`useArrowNav`).
 */
export function OrgNode({
  role,
  state,
  tabbable,
  buttonRef,
  onSelect,
  onKeyDown,
}: {
  role: Role;
  state: NodeState;
  tabbable: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onSelect: (how: "focus" | "pointer") => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      tabIndex={tabbable ? 0 : -1}
      aria-pressed={state === "selected"}
      aria-controls="orgchart-detail"
      onFocus={() => onSelect("focus")}
      onClick={() => onSelect("pointer")}
      onKeyDown={onKeyDown}
      className={`flex w-[calc(50%-0.25rem)] flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-40 sm:gap-1 sm:px-3 sm:py-2.5 ${STATE_CLASS[state]}`}
    >
      <span className="flex items-center gap-1.5 font-sans text-[0.88rem] leading-tight sm:text-[0.95rem]">
        {state === "linked" && <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-accent" />}
        {role.name}
      </span>
      <span className="font-code text-[0.62rem] uppercase leading-snug tracking-[0.05em] text-ink-3 sm:text-[0.68rem]">{role.family}</span>
    </button>
  );
}
