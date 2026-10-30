/* VISR DEMO · SUPERINTENDENT · words and time.

   The scripted Superintendent (demo/supt/*.js, read in file-name order, all
   sharing one namespace, `window.VISR_SUPT_LIB`) understands what a visitor
   types by scoring words and phrases, so it has to be forgiving: this file
   normalises text (case, curly quotes, the usual shorthand), splits it into
   words, and matches a word against a keyword allowing one typo (two for a
   long word). It also keeps the demo's clock, which a test can move forward
   (`L.clock.advance`) instead of waiting.

     L.text.norm(s) · L.text.words(s) · L.text.near(word, target)
     L.text.phrase(normed, phrase) · L.text.score(text, spec)
     L.text.plain(md) · L.text.sentence(md, max?) · L.text.list(["a","b","c"]) → "a, b and c"
     L.clock.now() · L.clock.iso(ms?) · L.clock.ago(min) · L.clock.advance(ms) */
"use strict";

(function (L) {
  const FIX = [
    [/[‘’ʼ]/g, "'"], [/[“”]/g, '"'], [/[–—]/g, " - "],
    [/\bwhat's\b|\bwhats\b|\bwats\b/g, "what is"], [/\bwat\b|\bwht\b/g, "what"],
    [/\bwho's\b|\bwhos\b/g, "who is"], [/\bhow's\b|\bhows\b/g, "how is"], [/\bwhere's\b/g, "where is"],
    [/\bthat's\b|\bthats\b/g, "that is"], [/\bit's\b/g, "it is"], [/\bi'm\b|\bim\b/g, "i am"],
    [/\blet's\b|\blets\b/g, "let us"], [/\bdon't\b|\bdont\b/g, "do not"], [/\bcan't\b|\bcant\b/g, "cannot"],
    [/\bi've\b|\bive\b/g, "i have"], [/\bu\b/g, "you"], [/\bur\b/g, "your"], [/\bpls\b|\bplz\b/g, "please"],
    [/\bthx\b|\bthanx\b|\bty\b|\btnx\b/g, "thanks"], [/\bnxt\b/g, "next"], [/\bthru\b/g, "through"], [/\bplz\b/g, "please"], [/\bk\b|\bkk\b/g, "ok"],
  ];

  const text = {
    norm(s) {
      let t = ` ${String(s || "").toLowerCase()} `;
      for (const [re, to] of FIX) t = t.replace(re, to);
      return t.replace(/[^a-z0-9#'\s-]/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim();
    },

    words(s) { return this.norm(s).split(/[^a-z0-9#-]+/).map(w => w.replace(/^-+|-+$/g, "")).filter(Boolean); },

    lev(a, b) {
      if (Math.abs(a.length - b.length) > 2) return 9;
      let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++)
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
      return prev[b.length];
    },

    /* one typo in a word of five letters or more, two in one of eight */
    near(w, t) {
      if (w === t) return true;
      if (t.length < 5 || w.length < 4) return false;
      return this.lev(w, t) <= (t.length >= 8 ? 2 : 1);
    },

    phrase(normed, p) { return ` ${normed} `.includes(` ${p} `); },

    /* spec: { words: {w: weight}, phrases: {p: weight}, re: [[regex, weight]] } → the summed weight */
    score(raw, spec) {
      const normed = this.norm(raw), ws = this.words(raw);
      let s = 0;
      for (const [w, n] of Object.entries(spec.words || {}))
        if (ws.some(x => this.near(x, w))) s += n;
      for (const [p, n] of Object.entries(spec.phrases || {}))
        if (this.phrase(normed, p)) s += n;
      for (const [re, n] of spec.re || []) if (re.test(normed)) s += n;
      return s;
    },

    /* markdown down to words: link labels kept, marks and list bullets gone */
    plain(md) {
      return String(md || "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|`|^#+\s*)/gm, "")
        .replace(/^\s*([-*+]|\d+\.)\s+/gm, "").replace(/\s+/g, " ").trim();
    },

    sentence(md, max = 1) {
      const p = this.plain(md);
      const parts = p.match(/[^.!?]+[.!?]+(\s|$)/g) || [p];
      return parts.slice(0, max).join("").trim();
    },

    clip(s, n) { const t = String(s || "").trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; },

    cap(s) { const t = String(s || ""); return t.charAt(0).toUpperCase() + t.slice(1); },

    list(xs) {
      const a = xs.filter(Boolean);
      return a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`;
    },

    count(n, one, many = `${one}s`) {
      const W = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
      return `${W[n] ?? n} ${n === 1 ? one : many}`;
    },
  };

  const clock = {
    skew: 0,
    loaded: Date.now(),
    now() { return Date.now() + this.skew; },
    iso(ms = this.now()) { return new Date(ms).toISOString(); },
    ago(min) { return this.iso(this.loaded - min * 60_000); },
    advance(ms) { this.skew += ms; },
  };

  Object.assign(L, { text, clock });
})(window.VISR_SUPT_LIB ||= {});
