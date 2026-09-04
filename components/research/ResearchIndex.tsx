"use client";

import { useState } from "react";
import { KINDS, KIND_LABEL, type Kind } from "@/lib/content/kinds";
import { AREAS, AREA_INFO, type Area } from "@/lib/content/areas";
import { PostCard, type PostCardItem } from "./PostCard";

/** The serialisable slice of a post the newsroom grid needs. */
export interface IndexItem extends PostCardItem {
  area: Area;
}

type FilterValue = "all" | Kind | Area;

/**
 * The newsroom grid (ref 02, Design/refs/lab-site): one flat filter row of plain words —
 * no "KIND"/"AREA" mono labels — then a 3-col card grid, 1-col on mobile.
 */
export function ResearchIndex({ items }: { items: IndexItem[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const shown = items.filter((i) => filter === "all" || i.kind === filter || i.area === filter);
  const options: { value: FilterValue; label: string }[] = [
    { value: "all", label: "All" },
    ...KINDS.map((k) => ({ value: k as FilterValue, label: KIND_LABEL[k] })),
    ...AREAS.map((a) => ({ value: a as FilterValue, label: AREA_INFO[a].name })),
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-rule py-5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setFilter(o.value)}
            className={`border-b pb-0.5 text-[0.95rem] transition-colors ${
              filter === o.value ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-10 text-ink-2 italic">Nothing under that filter yet.</p>
      ) : (
        <ul className="mt-px grid gap-px border border-rule bg-rule sm:grid-cols-3">
          {shown.map((item) => (
            <PostCard key={item.slug} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
