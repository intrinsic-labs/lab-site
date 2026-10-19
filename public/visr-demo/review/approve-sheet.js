/* REVIEW · the approve sheet — what Asher settles as the APPROVE stamp lands
   on an outcome: who starts (owner-pick.js, when the item carries
   `ownerChoices`) and which repositories it may write (repo-pick.js, when it
   carries `repoChoices`), on one slip. The button names the owner choice
   (KEEP ASTRA, SWITCH TO OPUS) or says APPROVE, and stays dark until an
   owner and at least one repo are picked. CANCEL (or the shade, or Esc)
   sends nothing and puts the stamp back. An item with neither picker is
   approved without asking.

     const picks = await ApproveSheet.confirm(item);   // { owner?, repos? }, or null if cancelled
     ApproveSheet.needed(item) */
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
        if (go.disabled) return;
        sh.close();
        resolve({ ...(owner ? { owner: owner.value() } : {}), ...(repos ? { repos: repos.value() } : {}) });
      };
      mark();
    });
  },
};
