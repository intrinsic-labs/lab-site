/* REVIEW · the repo picker — which repositories the owner may write, chosen
   as Asher approves. The project brief's `repo:` list (`repoChoices`, first
   its primary) is a column of checkable rows, the outcome's own `repos:`
   (`defaultRepos`, else the brief's primary) already checked; a path field
   under them takes one the list doesn't show. The runtime refuses a path the
   brief doesn't declare, by name, with the brief's list; the brief is
   Asher's to widen, never this sheet's. Checked rows go first, in the
   brief's order, then the typed path.

     const p = RepoPick.picker(item, changed);   // p.el · p.value()
     RepoPick.needed(item) */
"use strict";

const RepoPick = {
  needed: item => Array.isArray(item.repoChoices),

  picker(item, changed) {
    const choices = item.repoChoices;
    const defaults = item.defaultRepos || [];
    const picked = new Set(defaults.filter(r => choices.includes(r)));
    const rows = choices.map((repo, i) => T.el("button", {
      class: "t-btn tiny t-repo", type: "button", role: "checkbox", "data-repo": repo,
      onclick: () => { picked.has(repo) ? picked.delete(repo) : picked.add(repo); mark(); changed(); },
    }, T.el("span", { class: "t-repo-path" }, repo), i === 0 ? T.el("span", { class: "t-foot" }, "primary") : null));
    const mark = () => rows.forEach(b => {
      const on = picked.has(b.dataset.repo);
      b.classList.toggle("primary", on);
      b.setAttribute("aria-checked", String(on));
    });
    const typed = T.el("input", { class: "t-field t-repo-typed", type: "text", spellcheck: "false",
      autocapitalize: "off", autocomplete: "off", enterkeyhint: "done", "aria-label": "Another repository path",
      placeholder: "Or type a path, e.g. ~/dev/…" });
    typed.value = defaults.find(r => !choices.includes(r)) || "";
    typed.oninput = () => changed();
    const lead = choices.length
      ? T.el("p", {}, "Which repositories may the owner write? The project brief declares these.")
      : T.el("p", {}, "The project brief declares no repo:, so add one to the brief first, or type a path.");
    mark();
    return {
      el: T.el("div", { class: "t-repo-pick" }, T.el("label", { class: "t-label" }, "REPOS"), lead,
        T.el("div", { class: "t-repos", role: "group", "aria-label": "Repositories" }, ...rows), typed),
      value: () => {
        const extra = typed.value.trim();
        const list = choices.filter(r => picked.has(r));
        return extra && !list.includes(extra) ? [...list, extra] : list;
      },
    };
  },
};
