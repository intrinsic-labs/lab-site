"use strict";
const ApproveSheet = {
    needed: item => OwnerPick.needed(item) || RepoPick.needed(item),
    confirm(item) {
        return new Promise(resolve => {
            const go = T.el("button", { class: "t-btn ok", type: "button" });
            const mark = () => {
                const who = owner ? owner.go() : "APPROVE";
                const none = repos && !repos.value().length;
                go.disabled = !who || none;
                go.textContent = !who ? "PICK AN OWNER" : none ? "PICK A REPO" : who;
            };
            const owner = OwnerPick.needed(item) ? OwnerPick.picker(item, () => mark()) : null;
            const repos = RepoPick.needed(item) ? RepoPick.picker(item, () => mark()) : null;
            const no = T.el("button", { class: "t-btn", type: "button" }, "CANCEL");
            const sh = Tycho.sheet({ cap: owner ? "APPROVE · WHO STARTS?" : "APPROVE · WHICH REPOS?",
                kids: [owner?.el, repos?.el].filter(Boolean), acts: [no, go], onCancel: () => resolve(null) });
            no.onclick = () => { sh.close(); resolve(null); };
            go.onclick = () => {
                if (go.disabled)
                    return;
                sh.close();
                resolve({ ...(owner ? { owner: owner.value() } : {}), ...(repos ? { repos: repos.value() } : {}) });
            };
            mark();
        });
    },
};
