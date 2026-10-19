/* REVIEW · fields — a document's front matter as controls, above the text.

   The runtime says which keys are controls and how (contract `fields`):
     enum    a choice — readonly unless the runtime says otherwise
     text    a value — readonly unless the runtime says otherwise
   Every change is a `doc save` with `set` for that one key; the runtime
   preserves every other byte of the file. `set(key, value)` is the caller's
   and resolves when the save settled either way. */
"use strict";

const Fields = {
  render(fields, o) {
    if (!fields?.length) return null;
    return T.el("div", { class: "t-fields" }, ...fields.map(f => this.row(f, o)));
  },

  row(f, o) {
    const label = T.el("span", { class: "t-label" }, String(f.label || f.key).toUpperCase());
    const ro = f.readonly !== false;
    if (ro) return T.el("div", { class: "t-field-row" }, label,
      T.el("span", { class: f.value ? "v" : "v dim" }, f.value == null || f.value === "" ? "—" : String(f.value)));
    if (f.type === "enum") {
      const sel = T.el("select", { class: "t-field" },
        ...[f.value == null ? T.el("option", { value: "" }, "—") : null,
            ...(f.options || []).map(v => T.el("option", { value: v }, v))]);
      sel.value = f.value ?? "";
      sel.onchange = async () => { sel.disabled = true; await o.set(f.key, sel.value || null); sel.disabled = false; };
      return T.el("div", { class: "t-field-row" }, label, sel);
    }
    const input = T.el("input", { class: "t-field", type: "text", value: f.value ?? "" });
    const set = T.el("button", { class: "t-btn", hidden: true }, "SET");
    const commit = async () => {
      const raw = input.value.trim();
      const v = raw === "" ? null : raw;
      set.disabled = input.disabled = true;
      await o.set(f.key, v);
      set.disabled = input.disabled = false;
    };
    input.oninput = () => { set.hidden = input.value === String(f.value ?? ""); };
    input.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); commit(); } };
    set.onclick = commit;
    return T.el("div", { class: "t-field-row" }, label, input, set);
  },
};
