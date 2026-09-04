"use client";

import { useState } from "react";
import { KINDS, KIND_LABEL, type Kind } from "@/lib/content/kinds";
import { AREAS, AREA_INFO, type Area } from "@/lib/content/areas";
import { PostCard, type PostCardItem } from "./PostCard";

/** The serialisable slice of a post the research index needs. */
export interface IndexItem extends PostCardItem {
  area: Area;
}

type FilterValue = "all" | Kind | Area;

/**
 * The archive grid at the foot of the research landing.
 *
 * The filter row used to be a serif sentence of plain words, which read as a subtitle
 * rather than a control. Ruling (Asher, 2026-09-04): kind is no longer the primary way
 * into the page — the area blocks and the featured row are — so if a filter survives it
 * has to LOOK like one. These are `.pill`s: Calling Code, small, a wash rather than a
 * stroke (the same shape a kind label on a card wears), the selected one in the accent.
 *
 * "All" means all. It used to show only the posts the featured row above hadn't already
 * displayed, so nothing appeared twice on one screen — but that made "All" list FEWER
 * posts than "Note", which reads as a bug (Asher, 2026-09-04). The archive is the
 * archive; the four newest appearing twice on the page is the lesser cost.
 */
export function ResearchIndex({ items }: { items: IndexItem[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter || i.area === filter);

  const options: { value: FilterValue; label: string }[] = [
    { value: "all", label: "All" },
    ...KINDS.map((k) => ({ value: k as FilterValue, label: KIND_LABEL[k] })),
    ...AREAS.map((a) => ({ value: a as FilterValue, label: AREA_INFO[a].name })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={filter === o.value}
            onClick={() => setFilter(o.value)}
            className={`pill ${filter === o.value ? "pill-accent" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-10 text-ink-2 italic">Nothing under that filter yet.</p>
      ) : (
        <ul className="mt-8 card-grid sm:grid-cols-3">
          {shown.map((item) => (
            <PostCard key={item.slug} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
