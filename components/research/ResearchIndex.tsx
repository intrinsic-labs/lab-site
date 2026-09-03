"use client";

import { useState } from "react";
import Link from "next/link";
import { KINDS, KIND_LABEL, type Kind } from "@/lib/content/kinds";
import { AREAS, AREA_INFO, type Area } from "@/lib/content/areas";
import { formatDate } from "@/lib/content/format";
import { KindLabel } from "./KindLabel";

/** The serialisable slice of a post an index needs. */
export interface IndexItem {
  slug: string;
  title: string;
  summary: string;
  kind: Kind;
  area: Area;
  date: string;
  draft: boolean;
}

export function ResearchIndex({ items }: { items: IndexItem[] }) {
  const [kind, setKind] = useState<Kind | "all">("all");
  const [area, setArea] = useState<Area | "all">("all");
  const shown = items.filter((i) => (kind === "all" || i.kind === kind) && (area === "all" || i.area === area));

  return (
    <div>
      <div className="flex flex-wrap gap-x-10 gap-y-3 py-5 border-b border-rule">
        <Filter label="Kind" value={kind} onChange={(v) => setKind(v as Kind | "all")}
          options={KINDS.map((k) => [k, KIND_LABEL[k]] as const)} />
        <Filter label="Area" value={area} onChange={(v) => setArea(v as Area | "all")}
          options={AREAS.map((a) => [a, AREA_INFO[a].name] as const)} />
      </div>
      {shown.length === 0 ? (
        <p className="text-ink-2 italic py-8">Nothing under that filter yet.</p>
      ) : (
        <ul>
          {shown.map((p) => (
            <li key={p.slug} className="border-b border-rule py-5 grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-8">
              <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                <KindLabel kind={p.kind} />
                <time dateTime={p.date} className="label">{formatDate(p.date)}</time>
                {p.draft && <span className="label text-accent">draft</span>}
              </div>
              <div>
                <h3 className="font-serif text-xl leading-snug">
                  <Link href={`/research/${p.slug}`} className="hover:underline decoration-1 underline-offset-4">{p.title}</Link>
                </h3>
                <p className="text-ink-2 mt-1 leading-snug">{p.summary}</p>
                <p className="label mt-3">{AREA_INFO[p.area].name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="label mt-6">{shown.length} of {items.length}</p>
    </div>
  );
}

function Filter<T extends string>({ label, value, onChange, options }: {
  label: string; value: T | "all"; onChange: (v: string) => void; options: readonly (readonly [T, string])[];
}) {
  const btn = (v: string, text: string) => (
    <button key={v} type="button" onClick={() => onChange(v)}
      className={`label pb-0.5 border-b transition-colors ${value === v ? "border-ink text-ink" : "border-transparent hover:text-ink"}`}>
      {text}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="label text-ink-3">{label}</span>
      {btn("all", "All")}
      {options.map(([v, text]) => btn(v, text))}
    </div>
  );
}
