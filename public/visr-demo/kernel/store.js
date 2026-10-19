/* INTRINSICOS KERNEL · store — small JSON values in localStorage, never a throw.

   Android discards a backgrounded tab without warning, so anything Asher
   would be upset to lose (where he was, what he was writing) is written here
   as it changes and read back on the next load. A full or corrupt store
   degrades to "nothing remembered", never to a broken screen. */
"use strict";

const Store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  patch(key, part) {
    return this.set(key, { ...(this.get(key, {}) || {}), ...part });
  },
};
