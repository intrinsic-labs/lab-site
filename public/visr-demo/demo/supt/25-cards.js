/* VISR DEMO · SUPERINTENDENT · cards — naming them, ordering them, finding the one meant.

   A deck item is named by its brief's short card title when it has one
   ("Northwind launch checklist"), else its title. "Most important first"
   is an order by kind (an owner stopped on you, then work ready to accept,
   then questions, drafts, proposals, your own tasks), oldest first within a
   kind. `resolve` turns what the visitor wrote into one card: "it" is the
   card last talked about, a number or "the second" counts in the list last
   shown, otherwise the words are matched against each card's titles, id and
   project, typos allowed; a tie comes back as `ambiguous` with the
   candidates, so the dialog can ask which.

     L.cards.name(item) · L.cards.link(item) · L.cards.kind(item) · L.cards.id(item)
     L.cards.rank(items) · L.cards.gist(item) · L.cards.advice(item) → {text, reason, doubt} | null
     L.cards.resolve(text, ctx, { pool?, action? }) → { item } | { ambiguous: [items] } | { gone: key } | {}
     L.projects.find(text) → {slug, ref, name} | null · L.projects.of(item) */
"use strict";

(function (L) {
  const T = L.text;
  const ORDER = ["owner_waiting", "owner_review", "decision", "status_request", "draft_outcome", "proposal",
    "chore", "linear", "receipt"];
  const KIND = {
    owner_waiting: "an owner waiting on you", owner_review: "an owner checkpoint", decision: "a decision",
    status_request: "a status request", draft_outcome: "a draft outcome", proposal: "a proposal",
    chore: "a task for you", linear: "a Linear card", receipt: "a standing-approval receipt",
  };
  const STOP = new Set(("the a an to it its this that these those one card cards please can could would you will " +
    "for on of and me my i is be us let do go ahead with now just then also again deck item about from in " +
    "what which there here want wanna like ok okay yes so some up out lets let's we our").split(" "));
  const ORDINAL = { first: 1, "1st": 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3,
    fourth: 4, "4th": 4, four: 4, fifth: 5, "5th": 5, five: 5, sixth: 6, six: 6, top: 1 };
  const PRONOUN = /\b(it|this|that|this one|that one|the card|this card|that card|the same one)\b/;

  const cards = {
    VERBS: new Set(), // filled by 40-intents.js: words that are actions, never a card's title

    name(i) { return String(i?.brief?.brief?.cardTitle || i?.cardTitle || i?.title || i?.key || "that card"); },
    id(i) { return String(i?.key || "").split(":").pop(); },
    link(i) { return `[${this.name(i)}](#item=${i.key})`; },
    kind(i) { return KIND[i?.kind] || (i?.kindName ? `a ${String(i.kindName).toLowerCase()}` : "a card"); },

    rank(items) {
      const at = i => Date.parse(i.since || "") || 0;
      const ord = i => { const n = ORDER.indexOf(i.kind); return n < 0 ? ORDER.length : n; };
      return [...items].sort((a, b) => ord(a) - ord(b) || at(a) - at(b));
    },

    /* one or two plain sentences of what the card is */
    gist(i) {
      const b = i?.brief?.brief;
      const src = b?.body || i?.why || i?.ask || "";
      return T.sentence(src, 2) || T.cap(this.kind(i)) + ".";
    },

    advice(i) {
      const r = i?.brief?.brief?.recommendation;
      if (r?.text) return { text: r.text, reason: r.reason || "", doubt: r.doubt || "" };
      if (i?.recommendation?.text) return { text: i.recommendation.text, reason: "", doubt: "", by: i.recommendation.by };
      return null;
    },

    haystack(i) {
      const p = L.projects.of(i);
      return T.words([this.name(i), i.title, this.id(i), p?.name].filter(Boolean).join(" "))
        .filter(w => !STOP.has(w));
    },

    /* which of `list` the words point at, with a score each */
    match(words, list) {
      const scored = list.map(i => {
        const hay = this.haystack(i), id = this.id(i).toLowerCase();
        let s = 0;
        for (const w of words) {
          if (w === id) s += 4;
          else if (hay.includes(w)) s += 1;
          else if (hay.some(h => T.near(w, h))) s += 0.7;
          else if (w.length >= 4 && hay.some(h => h.startsWith(w))) s += 0.5;
        }
        return { i, s };
      }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
      return scored;
    },

    /* the words that could name a card: not filler, not an action */
    content(raw) { return T.words(raw).filter(w => !STOP.has(w) && !this.VERBS.has(w) && !/^(what|who|how|is|are|explain|tell)$/.test(w)); },

    resolve(raw, ctx, { pool = null, action = null } = {}) {
      const live = L.desk.all();
      const byKey = k => live.find(i => i.key === k);
      let list = pool ? pool.map(byKey).filter(Boolean) : live;
      const normed = T.norm(raw);
      const words = this.content(raw);

      /* "it", or a bare "accept": the card last talked about */
      if (!words.length && (PRONOUN.test(normed) || ctx.lastCard)) {
        if (ctx.lastCard) {
          const it = byKey(ctx.lastCard);
          return it ? { item: it } : { gone: ctx.lastCard };
        }
        if (pool && list.length === 1) return { item: list[0] };
        return {};
      }

      /* a number or an ordinal counts in the candidates, else the last list shown */
      const shown = (pool || ctx.lastList || []).map(byKey).filter(Boolean);
      const base = shown.length ? shown : this.rank(L.desk.items());
      const num = /(?:^|\s)(?:#|no |number |card )?([1-9])(?:\s|$)/.exec(` ${normed} `);
      const ord = num ? Number(num[1]) : / (the )?last( one)?$/.test(` ${normed}`) ? base.length
        : T.words(raw).map(w => ORDINAL[w]).find(Boolean);
      if (ord && base[ord - 1] && (num || words.length <= 2)) return { item: base[ord - 1] };

      /* the words: titles, ids, the project */
      if (action) {
        const able = list.filter(i => L.acts.fit(i, action));
        if (able.length) list = able.concat(list.filter(i => !able.includes(i)));
      }
      const found = this.match(words, list);
      if (!found.length) {
        if (PRONOUN.test(normed) && ctx.lastCard) {
          const it = byKey(ctx.lastCard);
          return it ? { item: it } : { gone: ctx.lastCard };
        }
        return {};
      }
      const top = found[0].s;
      const close = found.filter(x => x.s >= top - 0.3);
      if (close.length === 1) return { item: close[0].i };
      if (action) {
        const able = close.filter(x => L.acts.fit(x.i, action));
        if (able.length === 1) return { item: able[0].i };
      }
      return { ambiguous: close.slice(0, 3).map(x => x.i) };
    },
  };

  const ALIAS = {
    northwind: ["northwind", "nw", "client site", "website", "redirects", "launch"],
    orchard: ["orchard", "planner", "growers", "planting", "yield", "yields", "frost"],
    lanternfish: ["lanternfish", "sonar", "kayak", "lantern", "depth", "calibration"],
  };

  const projects = {
    /* named outright, typos allowed; else by an alias only when `loose` */
    find(raw, { loose = false } = {}) {
      const ws = T.words(raw), normed = T.norm(raw);
      const all = L.desk.projects();
      const named = all.find(p => ws.some(w => T.near(w, p.slug) || T.near(w, p.name.toLowerCase())));
      if (named || !loose) return named || null;
      const hits = all.filter(p => (ALIAS[p.slug] || []).some(a => a.includes(" ") ? T.phrase(normed, a) : ws.includes(a)));
      return hits.length === 1 ? hits[0] : null;
    },

    of(i) { return L.desk.project(i?.project) || (i?.project ? { slug: i.project, ref: i.project, name: T.cap(i.project) } : null); },

    names() { return T.or(L.desk.projects().map(p => p.name)); },
  };

  Object.assign(L, { cards, projects });
})(window.VISR_SUPT_LIB ||= {});
