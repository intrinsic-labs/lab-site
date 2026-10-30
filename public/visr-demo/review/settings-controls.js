"use strict";
const SetControls = {
    UNITS: { s: 1_000, m: 60_000, h: 3_600_000 },
    make(field, value, change) {
        const kind = field.type === "enum" ? (this.segmented(field) ? "seg" : "select") : field.type;
        return this[kind](field, value, change);
    },
    segmented: f => f.options.length <= 4 && f.options.every(o => String(o.label || o.value).length <= 11),
    tag: o => !!o.help && o.help.length <= 8,
    refusals(field) {
        const by = {};
        for (const o of field.options || [])
            if (o.disabled)
                (by[o.disabled] ||= []).push(o.label || o.value);
        return Object.entries(by).map(([why, names]) => T.el("div", { class: "t-set-why" }, `${names.join(", ")}: ${why}`));
    },
    seg(field, value, change) {
        const buttons = field.options.map(o => T.el("button", {
            type: "button", role: "radio", class: "t-seg-opt", disabled: o.disabled ? true : null,
            title: o.disabled || null, "data-value": o.value,
            onclick: () => { set(o.value); change(o.value); },
        }, String(o.label || o.value)));
        const el = T.el("div", { class: "t-seg", role: "radiogroup", "aria-label": field.label }, ...buttons);
        const set = v => buttons.forEach(b => {
            const on = b.dataset.value === v;
            b.classList.toggle("on", on);
            b.setAttribute("aria-checked", on ? "true" : "false");
        });
        set(value);
        return { el, set };
    },
    select(field, value, change) {
        const label = o => (SetControls.tag(o) ? `${o.label || o.value} · ${o.help}` : String(o.label || o.value))
            + (o.disabled ? " (unavailable)" : "");
        const el = T.el("select", { class: "t-field t-set-select", "aria-label": field.label }, ...field.options.map(o => T.el("option", { value: o.value, disabled: o.disabled ? true : null }, label(o))));
        el.onchange = () => change(el.value);
        const set = v => { el.value = v; };
        set(value);
        return { el, set };
    },
    boolean(field, value, change) {
        const el = T.el("button", { type: "button", role: "switch", class: "t-switch", "aria-label": field.label,
            onclick: () => { const next = el.getAttribute("aria-checked") === "true" ? "false" : "true"; set(next); change(next); } }, T.el("span", { class: "t-switch-knob", "aria-hidden": "true" }));
        const set = v => el.setAttribute("aria-checked", v === "true" ? "true" : "false");
        set(value);
        return { el, set };
    },
    stepper(label, n, min, max, onNumber) {
        const input = T.el("input", { class: "t-field t-step-n", type: "text", inputmode: "numeric", pattern: "[0-9]*",
            "aria-label": label, autocomplete: "off" });
        const bump = d => {
            const cur = /^\d+$/.test(input.value) ? Number(input.value) : min;
            const next = Math.min(max, Math.max(min, cur + d));
            input.value = String(next);
            onNumber(input.value);
        };
        input.oninput = () => onNumber(input.value.trim());
        const minus = T.el("button", { type: "button", class: "t-btn t-step-b", "aria-label": `Less ${label}`, onclick: () => bump(-1) }, "−");
        const plus = T.el("button", { type: "button", class: "t-btn t-step-b", "aria-label": `More ${label}`, onclick: () => bump(1) }, "+");
        input.value = String(n);
        input.style.width = `max(5em, calc(${String(max).length}ch + 28px))`;
        return { el: T.el("div", { class: "t-step" }, minus, input, plus), input };
    },
    integer(field, value, change) {
        const s = this.stepper(field.label, value, field.min, field.max, change);
        return { el: s.el, set: v => { s.input.value = v; } };
    },
    duration(field, value, change) {
        const parse = v => /^(\d+)(s|m|h)$/.exec(v) || [v, "", "m"];
        let [, n, unit] = parse(value);
        const units = field.units || ["s", "m", "h"];
        const emit = () => change(`${s.input.value.trim()}${unit}`);
        const s = this.stepper(field.label, n, 0, 99_999, () => emit());
        const pick = T.el("select", { class: "t-field t-set-unit", "aria-label": `${field.label} unit` }, ...units.map(u => T.el("option", { value: u }, { s: "sec", m: "min", h: "hours" }[u])));
        pick.value = unit;
        pick.onchange = () => { unit = pick.value; emit(); };
        return {
            el: T.el("div", { class: "t-set-dur" }, s.el, pick),
            set: v => { [, n, unit] = parse(v); s.input.value = n; pick.value = unit; },
        };
    },
    time(field, value, change) {
        const el = T.el("input", { class: "t-field t-set-time", type: "time", step: "60", "aria-label": field.label });
        el.value = value;
        el.oninput = el.onchange = () => change(el.value ? el.value.slice(0, 5) : "");
        return { el, set: v => { el.value = v; } };
    },
    multi(field, value, change) {
        const picked = new Set();
        const rows = field.options.map(o => T.el("button", {
            type: "button", role: "checkbox", class: "t-seg-opt", disabled: o.disabled ? true : null,
            title: o.disabled || null, "data-value": o.value,
            onclick: () => { picked.has(o.value) ? picked.delete(o.value) : picked.add(o.value); mark(); change(current()); },
        }, T.el("span", {}, String(o.label || o.value)), o.help ? T.el("span", { class: "t-set-opt-help" }, o.help) : null));
        const current = () => field.options.map(o => o.value).filter(v => picked.has(v));
        const mark = () => rows.forEach(b => {
            const on = picked.has(b.dataset.value);
            b.classList.toggle("on", on);
            b.setAttribute("aria-checked", on ? "true" : "false");
        });
        const el = T.el("div", { class: "t-seg t-set-multi", role: "group", "aria-label": field.label }, ...rows);
        const set = v => { picked.clear(); for (const x of v || [])
            picked.add(x); mark(); };
        set(value);
        return { el, set };
    },
    sameList: (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(x => b.includes(x)),
    local(field, v) {
        if (field.type === "enum") {
            const o = field.options.find(x => x.value === v);
            return !o ? "Choose one of the options." : o.disabled || null;
        }
        if (field.type === "boolean")
            return v === "true" || v === "false" ? null : "On or off.";
        if (field.type === "integer")
            return /^\d+$/.test(v) && +v >= field.min && +v <= field.max ? null : `A whole number from ${field.min} to ${field.max}.`;
        if (field.type === "duration") {
            const m = /^(\d+)(s|m|h)$/.exec(v);
            if (!m)
                return "A whole number.";
            const ms = +m[1] * this.UNITS[m[2]];
            return ms >= field.min && ms <= field.max ? null : `Between ${field.range}.`;
        }
        if (field.type === "time")
            return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : "A 24-hour time, HH:MM.";
        if (field.type === "multi") {
            if (!Array.isArray(v))
                return "Choose from the options.";
            for (const x of v) {
                const o = field.options.find(y => y.value === x);
                if (!o)
                    return `${x} is not one of the options.`;
                if (o.disabled)
                    return o.disabled;
            }
        }
        return null;
    },
};
