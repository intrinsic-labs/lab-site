import { ROLES, TIERS, roleById } from "./roles";

/**
 * Every role as plain text, from the same data as the chart. It is the chart's readable
 * fallback: a native `<details>`, so it opens with no JavaScript, and it is in the HTML for
 * a reader, a crawler or a screen reader that would rather read a list. Server component.
 */
export function RoleList() {
  return (
    <details className="group mt-8 rounded-lg border border-rule">
      <summary className="label cursor-pointer select-none px-5 py-4 text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Every role as a list
      </summary>
      <div className="space-y-8 border-t border-rule px-5 py-6">
        {TIERS.map((tier) => (
          <section key={tier.id} aria-label={tier.label}>
            <p className="label text-ink-3">{tier.label}</p>
            <dl className="mt-3 space-y-6">
              {ROLES.filter((r) => r.tier === tier.id).map((r) => (
                <div key={r.id}>
                  <dt className="font-sans text-lg leading-tight text-ink">
                    {r.name} <span className="label ml-1 text-ink-3">{r.kind} · {r.family}</span>
                  </dt>
                  <dd className="mt-2 space-y-2 text-[0.95rem] leading-relaxed text-ink">
                    <p>{r.does}</p>
                    <p className="text-ink-2">May decide:</p>
                    <ul className="list-disc space-y-1 pl-5 marker:text-ink-3">
                      {r.mayDecide.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <p className="text-ink-2">Talks to:</p>
                    <ul className="list-disc space-y-1 pl-5 marker:text-ink-3">
                      {r.talksTo.map((l) => (
                        <li key={l.to}>
                          {roleById(l.to).name}: {l.how}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </details>
  );
}
