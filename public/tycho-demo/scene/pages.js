/* PAGES — how a drawer's items become pages of folders, and how a file's
   text becomes the few lines a sheet can show. Pure functions. */
"use strict";

const PREVIEW_LINES = 26, PREVIEW_CHARS = 1600;
export function clip(text) {
  const lines = String(text).split("\n");
  let out = lines.slice(0, PREVIEW_LINES).join("\n");
  if (out.length > PREVIEW_CHARS) out = out.slice(0, PREVIEW_CHARS);
  if (out.length < String(text).length) out += "\n…";
  return out;
}

/* a drawer's items, cut into pages of `per`. Every item is a file and every
   file takes an ordinal — the `group` breaks and the ordinal-less `nav` item
   both went with subfolders (2026-09-02). */
export function paginate(items, per) {
  const pages = [];
  let cur = null;
  for (const it of items) {
    if (!cur || cur.items.length >= per)
      pages.push(cur = { items: [], first: 0, last: 0 });
    cur.items.push(it);
  }
  let ord = 0;
  for (const p of pages) {
    p.first = ord + 1;
    for (const it of p.items) it._ord = ++ord;
    p.last = ord;
  }
  if (!pages.length) pages.push({ items: [], first: 0, last: 0 });
  pages.total = ord;
  return pages;
}

