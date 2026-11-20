"use client";

import type { Ref } from "react";
import { ROLES, type Role, type RoleId } from "./roles";

/**
 * The selected role, in full: what it does, what it may decide, who it works with. Each
 * "works with" entry is a button that selects that role. `headingRef` is the heading, which the
 * chart focuses after one of those buttons is used (the button itself is about to vanish).
 * The announcement for screen readers is the chart's short live status, not this panel.
 */
export function NodeDetail({
  role,
  onPick,
  headingRef,
}: {
  role: Role;
  onPick: (id: RoleId) => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
    const reachedBy = ROLES.filter(
      (r) => r.id !== role.id && r.talksTo.some((l) => l.to === role.id) && !role.talksTo.some((l) => l.to === r.id),
    );
    return (
      <section
        id="orgchart-detail"
        aria-labelledby="orgchart-detail-title"
        className="rounded-lg border border-rule bg-paper-2 p-5 sm:p-6 lg:sticky lg:top-24 lg:self-start"
      >
        <p className="label">
          {role.kind} · {role.family}
        </p>
        <h3
          ref={headingRef}
          id="orgchart-detail-title"
          tabIndex={-1}
          className="mt-2 font-sans text-2xl leading-tight text-ink focus:outline-none"
        >
          {role.name}
        </h3>

        <h4 className="label mt-5 text-ink-3">Role</h4>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink">{role.does}</p>

        <h4 className="label mt-5 text-ink-3">May decide</h4>
        <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[0.95rem] leading-relaxed text-ink marker:text-ink-3">
          {role.mayDecide.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>

        <h4 className="label mt-5 text-ink-3">Talks to</h4>
        <ul className="mt-1.5 space-y-2">
          {role.talksTo.map((l) => (
            <li key={l.to} className="text-[0.95rem] leading-snug">
              <LinkButton id={l.to} onPick={onPick} />
              <span className="text-ink-2">: {l.how}</span>
            </li>
          ))}
        </ul>
        {reachedBy.length > 0 && (
          <p className="mt-3 text-[0.95rem] leading-snug text-ink-2">
            Also reached by{" "}
            {reachedBy.map((r, i) => (
              <span key={r.id}>
                {i > 0 && (i === reachedBy.length - 1 ? " and " : ", ")}
                <LinkButton id={r.id} onPick={onPick} />
              </span>
            ))}
            .
          </p>
        )}
      </section>
    );
}

function LinkButton({ id, onPick }: { id: RoleId; onPick: (id: RoleId) => void }) {
  const name = ROLES.find((r) => r.id === id)?.name ?? id;
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className="rounded-sm text-link underline decoration-1 underline-offset-[3px] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {name}
    </button>
  );
}
