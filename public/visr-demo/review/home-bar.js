/* REVIEW · home bar — the two buttons in home's top corners.

   Out of the flow, so the deck stays centred. Top left, the funnel: the
   deck's filter (deck-filter.js), lit and filled while it hides anything.
   Its rows stack: ALL clears every facet; I'M ON IT is a checkbox; LANE ›,
   HIDE › and BY PROJECT › open a second menu on the same funnel, each led
   by BACK. LANE holds DECIDE, DO and HAPPENED as checkboxes (the last one
   ticked stays ticked), and its row names the lanes shown; HIDE holds
   LATER, BLOCKED and LINEAR as checkboxes (the menu stays open while he
   ticks); BY PROJECT holds ANY PROJECT, then every project with something
   in the chosen lanes, by name, each with its count, focus or not.
   Top right, the menu, a V in a square: NEW NOTE (capture), TELEMETRY,
   MONDAY (the Monday meeting) and SETTINGS, in that order, as a dropdown (dropdown.js). While an unsent
   capture draft waits, the menu button carries an amber dot and its New
   note row says DRAFT. Each button is a 52px target.

     const { left, right } = HomeBar.mount({ open, filtered, items })
       open(view)       opens "capture" | "telemetry" | "monday" | "settings"
       filtered(f)      the filter changed; the deck redraws
       items()          every card, unfiltered (`Lanes`, deck-filter.js), for BY PROJECT
     HomeBar.sync()     redraws the dot and the funnel from current state */
"use strict";

const HomeBar = {
  menu: null, filter: null,

  mount({ open, filtered, items }) {
    this.menu = T.el("button", { class: "t-home-corner r t-home-menu", type: "button", "aria-label": "Menu" });
    this.menu.innerHTML = Icons.html("menu") + '<span class="dot"></span>';
    Dropdown.attach(this.menu, { label: "Menu", align: "right", items: () => [
      { icon: "pencil", label: "New note", note: Drafts.has("capture") ? "DRAFT" : null, fn: () => open("capture") },
      { icon: "monitor", label: "Telemetry", fn: () => open("telemetry") },
      { icon: "calendar", label: "Monday", fn: () => open("monday") },
      { icon: "gear", label: "Settings", fn: () => open("settings") },
    ] });

    this.filter = T.el("button", { class: "t-home-corner l t-home-filter", type: "button" });
    this.filter.innerHTML = Icons.html("filter");
    const change = patch => { DeckFilter.set({ ...DeckFilter.get(), ...patch }); this.sync(); filtered(DeckFilter.get()); };
    const back = { icon: "back", label: "Back", fn: () => Dropdown.open(this.filter, top) };
    const hide = { label: "Hide", align: "left", items: () => {
      const f = DeckFilter.get();
      return [back, ...DeckFilter.HIDE.map(h => ({ label: DeckFilter.HIDE_LABEL[h], checked: f.hide.includes(h), keep: true,
        fn: () => change({ hide: f.hide.includes(h) ? f.hide.filter(x => x !== h) : [...f.hide, h] }) }))];
    } };
    const lane = { label: "Lane", align: "left", items: () => {
      const f = DeckFilter.get();
      return [back, ...Lanes.ALL.map(l => ({ label: Lanes.LABEL[l], checked: f.lanes.includes(l), keep: true,
        fn: () => { if (f.lanes.includes(l) && f.lanes.length === 1) return;
          change({ lanes: f.lanes.includes(l) ? f.lanes.filter(x => x !== l) : [...f.lanes, l] }); } }))];
    } };
    const byProject = { label: "Project", align: "left", items: () => {
      const f = DeckFilter.get();
      const list = DeckFilter.projects(items(), f);
      /* a remembered project with nothing waiting stays on the list, at 0 */
      if (f.project && !list.some(p => p.path === f.project)) list.push({ path: f.project, name: Fmt.project(f.project), count: 0 });
      return [back, { label: "Any project", checked: !f.project, fn: () => change({ project: null }) },
        ...list.map(p => ({ label: p.name, count: p.count, checked: p.path === f.project, fn: () => change({ project: p.path }) }))];
    } };
    const top = { label: "Show", align: "left", items: () => {
      const f = DeckFilter.get();
      return [
        { label: "All", checked: DeckFilter.all(f), fn: () => change(DeckFilter.NONE) },
        { label: "Lane", note: DeckFilter.lanes(f).toUpperCase(), checked: !DeckFilter.defaultLanes(f), next: true,
          fn: () => Dropdown.open(this.filter, lane) },
        { label: "I'm on it", checked: f.working, keep: true, fn: () => change({ working: !f.working }) },
        { label: "Hide", note: f.hide.length ? DeckFilter.hidden(f).toUpperCase() : null, checked: f.hide.length > 0, next: true,
          fn: () => Dropdown.open(this.filter, hide) },
        { label: "By project", note: f.project ? Fmt.project(f.project) : null, checked: !!f.project, next: true,
          fn: () => Dropdown.open(this.filter, byProject) },
      ];
    } };
    Dropdown.attach(this.filter, top);
    this.sync();
    return { left: this.filter, right: this.menu };
  },

  sync() {
    const draft = Drafts.has("capture");
    this.menu.classList.toggle("draft", draft);
    this.menu.setAttribute("aria-label", draft ? "Menu, unsent note draft" : "Menu");
    const f = DeckFilter.get();
    this.filter.classList.toggle("on", !DeckFilter.all(f));
    this.filter.setAttribute("aria-label", DeckFilter.all(f) ? "Filter the deck: showing all"
      : `Filter the deck: ${DeckFilter.label(f)}`);
  },
};
