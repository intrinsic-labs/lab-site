"use strict";
const T = {
    el(tag, attrs = {}, ...kids) {
        const n = document.createElement(tag);
        if (tag === "button")
            n.addEventListener("pointerdown", T.keepFocus);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === "class")
                n.className = v;
            else if (k.startsWith("on"))
                n.addEventListener(k.slice(2), v);
            else if (v !== null && v !== undefined)
                n.setAttribute(k, v);
        }
        for (const kid of kids.flat()) {
            if (kid === null || kid === undefined)
                continue;
            n.append(kid.nodeType ? kid : document.createTextNode(kid));
        }
        return n;
    },
    keepFocus(e) {
        const a = document.activeElement;
        if (!a)
            return;
        const editable = a.tagName === "TEXTAREA" ||
            (a.tagName === "INPUT" && !["checkbox", "radio", "range", "button",
                "submit", "reset", "color", "file", "hidden"].includes(a.type)) ||
            a.isContentEditable || Boolean(a.closest?.(".xterm-helper-textarea"));
        if (editable)
            e.preventDefault();
    },
    keepScroll(from, fn) {
        const scrollers = [];
        for (let n = from.parentElement; n; n = n.parentElement) {
            const oy = getComputedStyle(n).overflowY;
            if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight)
                scrollers.push([n, n.scrollTop]);
        }
        fn();
        for (const [n, top] of scrollers)
            n.scrollTop = top;
    },
    esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    },
    mdInline(s, o = {}) {
        const html = T.esc(s)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/`([^`]+)`/g, "<code>$1</code>");
        const unesc = v => v.replace(/&quot;/g, '"').replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        return html.split(/(<code>.*?<\/code>)/).map((part, n) => {
            if (n % 2)
                return part;
            const links = [];
            const hold = a => { links.push(a); return `\u0000${links.length - 1}\u0000`; };
            const out = (label, url) => hold(/^mailto:/i.test(url) ? `<a class="t-email" href="${url}" title="Tap to copy">${label}</a>`
                : `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
            part = part
                .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_, label, url) => out(label, url))
                .replace(/\[([^\]]+)\]\((#(?:item|sfile)=[^\s)"]+)\)/g, (_, label, target) => hold(`<a href="${target}" class="t-item-link">${label}</a>`))
                .replace(/\[([^\]]+)\]\(([^)\s]*)\)/g, (_, label, target) => {
                const path = T.vaultPath(unesc(target), o.base);
                return path ? hold(`<a href="#" class="vault" data-vault="${T.esc(path)}">${label}</a>`) : label;
            })
                .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, (_, pre, url) => pre + out(url, url))
                .replace(Email.RE, addr => hold(Email.html(unesc(addr))));
            part = part
                .replace(/(^|[^*\w])\*(?![\s*])([^*]+?)(?<!\s)\*(?![*\w])/g, "$1<em>$2</em>")
                .replace(/(^|\W)_(?![\s_])([^_]+?)(?<!\s)_(?!\w)/g, "$1<em>$2</em>");
            return part.replace(/\u0000(\d+)\u0000/g, (_, k) => links[+k]);
        }).join("");
    },
    VAULT_ROOTS: /^(Projects|Tools|Mechanical|Prompts|Design|Research)\//,
    vaultPath(target, base) {
        let t = String(target || "").split("#")[0].split("?")[0].trim();
        try {
            t = decodeURIComponent(t);
        }
        catch { }
        if (!t || t.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(t))
            return null;
        if (!/\.md$/i.test(t))
            return null;
        const parts = (T.VAULT_ROOTS.test(t) || !base ? [] : String(base).split("/").slice(0, -1));
        for (const seg of t.split("/")) {
            if (seg === "" || seg === ".")
                continue;
            if (seg === "..") {
                if (!parts.length)
                    return null;
                parts.pop();
            }
            else
                parts.push(seg);
        }
        return parts.join("/") || null;
    },
    md(text, o = {}) {
        const root = T.el("div", { class: "t-md" });
        const lines = String(text || "").split("\n");
        let i = 0, para = [];
        const flush = () => {
            if (!para.length)
                return;
            const p = T.el("p");
            p.innerHTML = T.mdInline(para.join(" "), o);
            root.append(p);
            para = [];
        };
        const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
        while (i < lines.length) {
            const ln = lines[i];
            if (ln.startsWith("```")) {
                flush();
                const start = ++i;
                let first = -1, end = -1, nested = false;
                for (let j = i; j < lines.length; j++) {
                    if (!lines[j].startsWith("```")) {
                        if (lines[j].startsWith("**"))
                            break;
                        continue;
                    }
                    if (first < 0)
                        first = j;
                    const nxt = lines[j + 1];
                    if (!(nxt === undefined || nxt.trim() === "" || nxt.startsWith("**"))) {
                        nested = true;
                        continue;
                    }
                    end = j;
                    if (!nested)
                        break;
                }
                if (end < 0)
                    end = first < 0 ? lines.length : first;
                root.append(T.el("pre", {}, lines.slice(start, end).join("\n")));
                i = end + 1;
                continue;
            }
            if (ln.trimStart().startsWith("|")) {
                flush();
                const rows = [];
                while (i < lines.length && lines[i].trimStart().startsWith("|")) {
                    const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
                    if (!cells.every(c => /^:?-+:?$/.test(c)))
                        rows.push(cells);
                    i++;
                }
                const tbl = T.el("table");
                rows.forEach((cells, r) => {
                    const tr = T.el("tr");
                    cells.forEach(c => {
                        const td = T.el(r === 0 ? "th" : "td");
                        td.innerHTML = T.esc(c)
                            .replace(/\*\*(HIT|WEAK|MISS)\*\*/g, '<strong class="v-$1">$1</strong>')
                            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                            .replace(/`([^`]+)`/g, "<code>$1</code>");
                        tr.append(td);
                    });
                    tbl.append(tr);
                });
                root.append(tbl);
                continue;
            }
            const head = ln.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
            if (head) {
                flush();
                const h = T.el("h" + head[1].length);
                h.innerHTML = T.mdInline(head[2], o);
                root.append(h);
                i++;
                continue;
            }
            if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(ln)) {
                flush();
                root.append(T.el("hr"));
                i++;
                continue;
            }
            if (/^\s{0,3}>/.test(ln)) {
                flush();
                const quoted = [];
                while (i < lines.length && /^\s{0,3}>/.test(lines[i]))
                    quoted.push(lines[i++].replace(/^\s{0,3}> ?/, ""));
                root.append(T.el("blockquote", {}, T.md(quoted.join("\n"), o)));
                continue;
            }
            if (LIST.test(ln)) {
                flush();
                const ordered = /\d/.test(ln.match(LIST)[2]);
                const list = T.el(ordered ? "ol" : "ul");
                if (ordered)
                    list.setAttribute("start", parseInt(ln.match(LIST)[2], 10));
                let li = null, body = [];
                const close = () => {
                    if (li) {
                        li.innerHTML = T.mdInline(body.join(" "), o);
                        list.append(li);
                    }
                    li = null;
                    body = [];
                };
                while (i < lines.length) {
                    const m = lines[i].match(LIST);
                    if (m && /\d/.test(m[2]) === ordered) {
                        close();
                        const depth = Math.min(3, Math.floor(m[1].replace(/\t/g, "  ").length / 2));
                        li = T.el("li", depth ? { class: "d" + depth } : {});
                        body.push(m[3]);
                        i++;
                    }
                    else if (li && lines[i].trim() && /^\s+/.test(lines[i]) && !m) {
                        body.push(lines[i].trim());
                        i++;
                    }
                    else
                        break;
                }
                close();
                root.append(list);
                continue;
            }
            if (ln.trim() === "") {
                flush();
                i++;
                continue;
            }
            para.push(ln);
            i++;
        }
        flush();
        return root;
    },
    progress(done, total, max = 50) {
        const bar = T.el("div", { class: "t-progress",
            title: `${done}/${total}` });
        const segs = Math.min(total, max) || 1;
        for (let s = 0; s < segs; s++)
            bar.append(T.el("i", { class: s < Math.round(done / total * segs) ? "on" : "" }));
        return bar;
    },
    async api(path, body, { signal } = {}) {
        let r, text;
        try {
            ({ r, text } = await Net.fetch(path, body
                ? { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body), signal }
                : { cache: "no-cache", signal }, body ? Net.WRITE_MS : Net.READ_MS));
        }
        catch (e) {
            if (!e.net)
                throw e;
            throw new Error(e.net === "timeout" ? "no answer — the Mac didn't reply in time"
                : e.net === "cut" ? "connection lost — the answer was cut off"
                    : "connection lost — the request never reached the Mac", { cause: e });
        }
        if (!text.trim())
            throw new Error(r.ok
                ? "connection lost — the answer arrived empty"
                : `the server said ${r.status}${r.statusText ? " " + r.statusText : ""}`);
        let out;
        try {
            out = JSON.parse(text);
        }
        catch {
            throw new Error(`the server answered with something that isn't JSON ` +
                `(${r.status}) — ${text.trim().slice(0, 200)}`);
        }
        if (!r.ok || out.error)
            throw T.thrown(out, r);
        return out;
    },
    thrown(out, r) {
        const e = new Error(out.error || out.summary || out.reason ||
            r?.statusText || `HTTP ${r?.status ?? "?"}`);
        if (out.detail)
            e.detail = out.detail;
        if (out.remedy)
            e.remedy = out.remedy;
        return e;
    },
    fault(e) {
        const src = (e && typeof e === "object") ? e : { message: String(e ?? "") };
        const raw = String(src.summary ?? src.message ?? src.reason ??
            src.error ?? src.text ?? e ?? "").replace(/\s+$/, "");
        const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
        let head = lines[0] || "something went wrong";
        const wrapped = head.match(/^(.*?)\s*[:—-]?\s*Command failed:/i);
        if (wrapped && wrapped[1].trim()) {
            head = wrapped[1].trim().replace(/[:\s]+$/, "");
        }
        else {
            const said = lines.find(l => /^(error|fatal|warning|refusing):/i.test(l));
            if (said && (head.length > 88 || /^command failed/i.test(head)))
                head = said;
        }
        head = head.replace(/^(error|fatal):\s*/i, "").replace(/^`([^`]+)`$/, "$1");
        if (head.length > 180)
            head = head.slice(0, 179).trimEnd() + "…";
        const given = String(src.detail ?? "").trim();
        return {
            head,
            detail: given || (raw.length > head.length ? raw : ""),
            remedy: String(src.remedy ?? "").trim(),
        };
    },
    faultBody(f, ...acts) {
        const dump = f.detail
            ? T.el("pre", { class: "dump", style: "display:none" }, f.detail) : null;
        const more = dump
            ? T.el("button", { class: "t-btn tiny", onclick() {
                    const open = dump.style.display === "none";
                    dump.style.display = open ? "" : "none";
                    this.textContent = open ? "DETAIL ▾" : "DETAIL ▸";
                } }, "DETAIL ▸")
            : null;
        const row = [...acts.filter(Boolean), more].filter(Boolean);
        return [
            T.el("div", { class: "head" }, T.icon("warn"), T.el("span", {}, f.head)),
            f.remedy ? T.el("div", { class: "remedy" }, T.el("span", { class: "cmd" }, f.remedy), T.el("button", { class: "t-btn tiny ico",
                title: "copy the command",
                onclick: () => Tycho.copy(f.remedy, "command copied") }, T.icon("copy"))) : null,
            row.length ? T.el("div", { class: "acts" }, ...row) : null,
            dump,
        ];
    },
    errBox(e, { cap = "FAULT", retry = null, retryLabel = "TAP TO RETRY" } = {}) {
        return T.el("div", { class: "t-box t-err" }, T.el("div", { class: "cap" }, cap), ...T.faultBody(T.fault(e), retry ? T.el("button", { class: "t-btn tiny", onclick: retry }, retryLabel) : null));
    },
    icon(name) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 9 9");
        svg.setAttribute("class", "t-ico");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("data-ico", name);
        (T.ICONS[name] || T.ICONS.dot).forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                if (row[x] !== "#")
                    continue;
                const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                r.setAttribute("x", x);
                r.setAttribute("y", y);
                r.setAttribute("width", 1);
                r.setAttribute("height", 1);
                svg.append(r);
            }
        });
        return svg;
    },
};
T.ICONS = {
    dot: ["", "", "", "...###...", "...###...", "...###..."],
    mission: ["....#....", "..##.##..", ".#..#..#.", "#..###..#", "#.##.##.#",
        "#..###..#", ".#..#..#.", "..##.##..", "....#...."],
    door: [".#######.", ".#.....#.", ".#.....#.", ".#....##.", ".#....##.",
        ".#.....#.", ".#.....#.", ".#.....#.", ".#######."],
    talk: [".########", ".#......#", ".#......#", ".#......#", ".########",
        "...##....", "...#.....", "", ""],
    eye: ["", "..#####..", ".#.....#.", "#...#...#", "#..###..#",
        "#...#...#", ".#.....#.", "..#####..", ""],
    check: ["", ".......##", "......##.", ".....##..", "##..##...",
        ".####....", "..##.....", "", ""],
    skip: ["", ".#.....#.", ".##....#.", ".###...#.", ".####..#.",
        ".###...#.", ".##....#.", ".#.....#.", ""],
    broom: [".......##", "......###", ".....##..", "....##...", "...##....",
        ".####....", "#####....", "###......", ""],
    stash: ["", ".#######.", ".#..#..#.", ".#######.", ".#.....#.",
        ".#.....#.", ".#.....#.", ".#######.", ""],
    hold: ["..#####..", ".#.....#.", "#...#...#", "#...#...#", "#...##..#",
        "#.......#", ".#.....#.", "..#####..", ""],
    trash: ["...###...", ".#######.", "..#...#..", "..#.#.#..", "..#.#.#..",
        "..#.#.#..", "..#.#.#..", "..#...#..", "..#####.."],
    keep: ["....#....", "...###...", "..#####..", "..#####..", "...###...",
        "....#....", "....#....", "....#....", "....#...."],
    folder: ["", ".####....", ".#...####", ".########", ".#......#",
        ".#......#", ".#......#", ".########", ""],
    doc: [".#####...", ".#...##..", ".#....#..", ".#....#..", ".#.##.#..",
        ".#....#..", ".#.##.#..", ".#....#..", ".######.."],
    gem: ["", "..#####..", ".#.....#.", "#.......#", ".#.....#.",
        "..#...#..", "...#.#...", "....#....", ""],
    focus: ["....#....", "....#....", "..#####..", ".#..#..#.", "#########",
        ".#..#..#.", "..#####..", "....#....", "....#...."],
    list: ["", "##.######", "", "##.######", "", "##.######", "",
        "##.######", ""],
    branch: [".##......", ".##...##.", "..#...##.", "..#..##..", "..####...",
        "..#......", "..#......", ".###.....", ""],
    term: ["#########", "#.......#", "#.#.....#", "#..#....#", "#.#.....#",
        "#....##.#", "#.......#", "#########", ""],
    warn: ["....#....", "...###...", "...#.#...", "..#.#.#..", "..#.#.#..",
        ".#..#..#.", ".#.....#.", "#...#...#", "#########"],
    play: ["", ".##......", ".####....", ".######..", ".########",
        ".######..", ".####....", ".##......", ""],
    copy: ["..######.", "..#....#.", "..#....#.", "####...#.", "#..#####.",
        "#......#.", "#......#.", "#......#.", "########."],
    cut: ["...#.#...", "...#.#...", "...#.#...", "....#....", "...###...",
        "..#...#..", ".##...##.", ".##...##.", "..#...#.."],
    paste: [".######..", ".#.....#.", "##.###.##", "#.......#", "#.#####.#",
        "#.......#", "#.#####.#", "#.......#", "#########"],
    clip: ["....###..", "...#...#.", "..#.....#", ".#.....#.", ".#....#..",
        ".#...#...", ".#..#....", "..##.....", ""],
};
