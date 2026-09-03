import type { ReactNode } from "react";

export function PageTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="pt-16 pb-12 border-b border-rule">
      {kicker && <p className="label mb-4">{kicker}</p>}
      <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05]">{title}</h1>
      {children && <div className="mt-6 max-w-2xl text-lg text-ink-2">{children}</div>}
    </header>
  );
}
