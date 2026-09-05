/* TYCHO KERNEL · device settings — Sys: text scale, applied to the --fs-* tokens. SYSTEM is the UI; localStorage is the store. */
"use strict";

/* ---------------------------------------------------------------- system
   Device-local settings — SYSTEM is the UI, this is the store + the apply.
   Text size scales the --fs-* tokens so layout metrics stay put. Everything
   lives in localStorage: the corpus never learns your font size. (The
   procedural wallpapers went with the desktop, 2026-09-01.) */
const Sys = {
  KEY: "tycho.sys",
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch { return {}; } },
  set(patch) {
    localStorage.setItem(this.KEY, JSON.stringify({ ...this.get(), ...patch }));
    this.apply();
  },
  SCALES: { small: 0.85, standard: 1, large: 1.15, huge: 1.3 },
  BASE: { "--fs-xs": 10, "--fs-s": 12, "--fs-m": 14, "--fs-l": 18, "--fs-xl": 28 },
  apply() {
    const s = this.get();
    const scale = this.SCALES[s.text] ?? 1;
    for (const [v, px] of Object.entries(this.BASE))
      document.documentElement.style.setProperty(v, Math.round(px * scale) + "px");
  },
};
