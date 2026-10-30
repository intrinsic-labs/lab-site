// The VISR demo's scripted Superintendent (public/visr-demo/demo/supt/*.js),
// driven through its one entry point, `window.VISR_DEMO_SUPT.answer(path,
// method, body, desk)`, exactly as demo/shim.js calls it, against a fake desk.
// The main test plays a whole conversation and asserts what changed on the
// desk; with VISR_TRANSCRIPT=<path> it also writes that conversation out as
// readable text for review.
//
//   node --test tests/visr-supt.test.mjs
//   VISR_TRANSCRIPT=/tmp/supt.txt node --test tests/visr-supt.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUPT = join(ROOT, "public/visr-demo/demo/supt");
const CORPUS = join(ROOT, "public/visr-demo/demo/corpus.js");

function load(extra = []) {
  const sb = { console, URL, Response, structuredClone, setTimeout, clearTimeout };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of extra) vm.runInContext(readFileSync(f, "utf8"), sb, { filename: f });
  for (const f of readdirSync(SUPT).filter(n => n.endsWith(".js")).sort())
    vm.runInContext(readFileSync(join(SUPT, f), "utf8"), sb, { filename: f });
  return sb;
}

/* -- a fake desk, with the shim's interface ----------------------------------- */
const ago = min => new Date(Date.now() - min * 60_000).toISOString();
const item = (key, kind, project, title, cardTitle, age, actions, b = {}) => ({
  key, kind, project, title, since: ago(age), actions, lane: "decide", deferred: null, revision: `${key.split(":").pop()}:r1`,
  why: b.why || "", ...(b.owners ? { ownerChoices: ["claude/opus", "codex/sol", "claude/sonnet", "codex/astra"], defaultOwner: b.owners } : {}),
  brief: { state: "ready", brief: { cardTitle, body: b.body || "", recommendation: b.rec || null } },
});
const FIXTURE = () => [
  item("draft:lsp-pickup-plan", "draft_outcome", "larkspur", "Give each matched family a clear pickup plan on their private page",
    "Larkspur pickup plan", 180, ["approve", "reject", "feedback", "not_needed", "later"],
    { owners: "codex/sol", body: "Each matched family would see its own pickup date, time, place and what to bring on its private page.",
      rec: { text: "Approve.", reason: "It reuses the family page and the CMS she already uses.", doubt: "Nobody asked for it yet." } }),
  item("owner:hlw-patients-and-appointments", "owner_review", "harlow", "Patients and Appointments give providers two ways into the same charge flow",
    "Harlow patients and appointments", 300, ["accept", "park", "feedback", "not_needed", "later"],
    { body: "One PR gives providers four tabs and two ways into the same charge flow.",
      rec: { text: "Merge it and accept.", reason: "Every acceptance criterion has evidence attached." } }),
  item("owner:lsp-litter-gallery", "owner_review", "larkspur", "Let the breeder publish photo-and-video litter galleries", "Litter gallery with video",
    200, ["accept", "park", "feedback", "not_needed", "later"], { body: "Each litter page now takes photos and short videos from the CMS." }),
  item("owner:hwk-session-reorder", "owner_review", "heelwork", "Let the trainer reorder exercises in a session plan",
    "Reorder session exercises", 60, ["accept", "park", "feedback", "not_needed", "later"],
    { body: "Drag to reorder; the order saves with the plan." }),
  item("decision:dec-41", "decision", "vault", "Let the CI rollout merge one-line runner changes without a card each?",
    "CI rollout in private repos", 120, ["approve", "reject", "feedback", "not_needed", "later"],
    { body: "Local CI is live for IntrinsicOS. The rollout to five more private repos is one line per workflow." }),
  item("proposal:run_7c41", "proposal", "larkspur", "Proposed two tasks before the pickup plan is built",
    "Pickup plan tasks", 1800, ["approve", "reject", "not_needed", "later"]),
  item("chore:vlt-104", "chore", "vault", "Create the GitHub App the Mac's CI runners sign in with", "GitHub App for the CI runners",
    540, ["done", "feedback", "not_needed", "later"], { body: "Only an organization owner can create a GitHub App." }),
  item("linear:hwk:HWK-42", "linear", "heelwork", "HWK-42 Fix the streak count after midnight", "", 360, ["route", "feedback", "later"]),
];

function fakeDesk() {
  const items = FIXTURE();
  const removed = new Map();
  const fns = [];
  const intake = [];
  const emit = e => { for (const f of fns) f({ ...e, at: new Date().toISOString() }); };
  return {
    projects: [{ category: "engine", ref: "engine/harlow", name: "Harlow" }, { category: "engine", ref: "engine/heelwork", name: "Heelwork" },
      { category: "engine", ref: "engine/larkspur", name: "Larkspur" }, { category: "bets", ref: "bets/glyphdeck", name: "GlyphDeck" },
      { category: "bets", ref: "bets/liturgos", name: "Liturgos" }, { category: "meta", ref: "meta/vault", name: "IntrinsicOS" }],
    queue: () => ({ ok: true, items, counts: { active: items.length }, happened: [] }),
    items: () => items,
    act(req, source = "superintendent") {
      const it = items.find(i => i.key === req.key);
      if (!it) return { ok: false, reason: "That item is no longer waiting on you." };
      if (req.revision && req.revision !== it.revision) return { ok: false, reason: "stale" };
      if (!it.actions.includes(req.action)) return { ok: false, reason: `${req.action} isn't something this item takes.` };
      if (req.action === "later") it.deferred = { until: "tomorrow" };
      else if (req.action !== "feedback") { items.splice(items.indexOf(it), 1); removed.set(it.key, it); }
      emit({ type: "act", key: req.key, action: req.action, source, item: structuredClone(it) });
      return { ok: true, result: { kind: req.action, message: "Done. (Demo: nothing was sent anywhere.)" } };
    },
    reopen(key) {
      const it = removed.get(key) || items.find(i => i.key === key);
      if (!it) return { ok: false, reason: "gone" };
      removed.delete(key);
      it.deferred = null;
      if (!items.includes(it)) items.push(it);
      return { ok: true };
    },
    fileIntake(req) {
      const id = `in-${intake.length + 1}`;
      intake.push({ ...req, id });
      emit({ type: "intake", project: req.project, source: req.source || "intake" });
      return { ok: true, id, project: req.project, path: `Projects/${req.project}/intake/${id}.md` };
    },
    intake: () => intake,
    on(fn) { fns.push(fn); },
    has: key => items.some(i => i.key === key),
    find: key => items.find(i => i.key === key),
  };
}

/* -- the client's side of the conversation ------------------------------------ */
class Visitor {
  constructor(sb, desk) { Object.assign(this, { sb, desk, n: 0, cursor: null, lines: [] }); }
  get lib() { return this.sb.VISR_SUPT_LIB; }
  async call(path, method = "GET", body = {}) {
    const out = await this.sb.VISR_DEMO_SUPT.answer(path, method, body, this.desk);
    return out instanceof Response ? out : JSON.parse(JSON.stringify(out));
  }
  async open() {
    const r = await this.call("/api/superintendent/thread");
    this.cursor = r.messages.at(-1)?.id || null;
    return r;
  }
  note(s) { this.lines.push(`   [${s}]`, ""); }
  async say(text, extra = {}) {
    this.lines.push(`YOU: ${text}`);
    const sent = await this.call("/api/superintendent/send", "POST",
      { text, cards: [], attachments: [], client_id: `demo-client-${++this.n}`, ...extra });
    assert.equal(sent.ok, true, sent.reason);
    assert.equal(sent.busy, true);
    const during = await this.call(`/api/superintendent/thread?after=${encodeURIComponent(this.cursor)}`);
    assert.equal(during.busy, true, "busy while the turn runs");
    assert.ok(during.progress?.label, "progress while busy");
    assert.ok(!during.messages.some(m => m.role === "assistant"), "no reply before its time");
    this.lib.clock.advance(2000);
    const r = await this.call(`/api/superintendent/thread?after=${encodeURIComponent(this.cursor)}`);
    assert.equal(r.busy, false);
    this.cursor = r.messages.at(-1).id;
    const reply = r.messages.filter(m => m.role === "assistant").at(-1);
    assert.ok(reply, `a reply to "${text}"`);
    assert.deepEqual(reply.replyTo, [sent.message.id]);
    const chips = (reply.offers || []).flatMap(o => o.kind === "accepts"
      ? o.items.map(x => `   [chip ACCEPT · ${x.outcomeId} · ${x.state}]`) : [`   [chip ${o.title} · YES / NO · ${o.state}]`]);
    const used = reply.activity?.length ? [`   (${reply.activity.join(" · ")})`] : [];
    this.lines.push(`SUPERINTENDENT: ${reply.text}`, ...chips, ...used, "");
    return reply;
  }
}

test("a scripted conversation moves the desk and reads like the real thing", async () => {
  const sb = load();
  const desk = fakeDesk();
  const v = new Visitor(sb, desk);

  const first = await v.open();
  assert.ok(first.messages.some(m => m.routine?.name === "blocker-check"), "seeded routine");
  assert.ok(first.messages.some(m => m.role === "user"), "seeded earlier exchange");
  assert.ok(first.threads.length >= 3, "seeded threads");
  assert.ok(first.threads.some(t => t.kind === "project" && t.subjects.length === 2), "Larkspur project thread with subjects");

  let r = await v.say("hi");
  assert.match(r.text, /Superintendent/);

  r = await v.say("how does this work?");
  assert.match(r.text, /IntrinsicOS/);
  assert.match(r.text, /demo|scripted|sample/);

  r = await v.say("what needs me?");
  assert.match(r.text, /1\. \[Harlow patients and appointments\]\(#item=owner:hlw-patients-and-appointments\)/, "most important first");
  assert.match(r.text, /Litter gallery with video/);

  r = await v.say("walk me through the deck");
  assert.match(r.text, /\*\*1 of \d\*\*/);
  assert.match(r.text, /#item=owner:hlw-patients-and-appointments/);
  const chip = r.offers?.find(o => o.kind === "accepts");
  assert.ok(chip, "the walk's card comes with an ACCEPT chip");
  assert.equal(chip.items[0].outcomeId, "hlw-patients-and-appointments");

  r = await v.say("next");
  assert.match(r.text, /\*\*2 of/);
  assert.match(r.text, /Litter gallery with video/);

  r = await v.say("acept it");
  assert.equal(desk.has("owner:lsp-litter-gallery"), false, "“it” was the litter-gallery card");
  assert.match(r.text, /Accepted \*\*Litter gallery with video\*\*/);

  r = await v.say("park the session reorder");
  assert.equal(desk.has("owner:hwk-session-reorder"), false);
  assert.match(r.text, /Parked \*\*Reorder session exercises\*\*/);

  r = await v.say("approve the larkspur one");
  assert.match(r.text, /Which one/);
  assert.match(r.text, /Larkspur pickup plan/);
  assert.match(r.text, /Pickup plan tasks/);
  r = await v.say("the first");
  assert.equal(desk.has("draft:lsp-pickup-plan"), false, "ambiguity resolved to the first candidate");
  assert.match(r.text, /Approved \*\*Larkspur pickup plan\*\*/);

  r = await v.say("I have an idea");
  assert.match(r.text, /Which project/);
  r = await v.say("larkspur");
  assert.match(r.text, /What's the idea for Larkspur/);
  r = await v.say("Text each family the day before pickup with the time and what to bring");
  assert.equal(desk.intake().length, 1);
  assert.equal(desk.intake()[0].project, "engine/larkspur");
  assert.match(desk.intake()[0].note, /Text each family the day before pickup with the time and what to bring/);
  assert.match(r.text, /Filed for \*\*Larkspur\*\*/);
  assert.match(r.text, /Projects\/engine\/larkspur\/intake\//);

  r = await v.say("file an idea for heelwork: show the trainer which exercises have no title before she publishes");
  assert.equal(desk.intake().length, 2, "an idea in one go");
  assert.equal(desk.intake()[1].project, "engine/heelwork");

  r = await v.say("Can you book me a flight to Lisbon?");
  assert.match(r.text, /scripted stand-in/);
  assert.match(r.text, /What needs me\?/);

  /* the chip from the walk's first card, tapped now */
  const tap = await v.call("/api/superintendent/decide", "POST", { offerId: chip.id, item: "hlw-patients-and-appointments",
    decision: "accept", revision: chip.items[0].revision, requestId: "req-1" });
  assert.equal(tap.ok, true, tap.reason);
  assert.equal(tap.offer.items[0].state, "done");
  assert.equal(desk.has("owner:hlw-patients-and-appointments"), false, "the chip accepted it");
  v.note(`tapped ACCEPT on the chip for hlw-patients-and-appointments → ${tap.offer.items[0].state}`);
  const again = await v.call("/api/superintendent/decide", "POST", { offerId: chip.id, item: "hlw-patients-and-appointments",
    decision: "accept", revision: chip.items[0].revision, requestId: "req-1" });
  assert.equal(again.offer.items[0].state, "done", "a retry answers its recorded result");

  /* the action log: newest first, a page of 15, the chip's decision with UNDO */
  const log = await v.call("/api/superintendent/actions");
  assert.equal(log.ok, true);
  assert.equal(log.actions.length, 15);
  assert.equal(log.more, true);
  const older = await v.call(`/api/superintendent/actions?before=${log.actions.at(-1).id}`);
  assert.ok(older.actions.length > 0 && older.actions.every(a => a.at <= log.actions.at(-1).at), "older page");
  const decided = log.actions.find(a => a.tool === "chat_decision" && a.target?.key === "owner:hlw-patients-and-appointments");
  assert.ok(decided?.undo, "the chip's accept can be undone");
  assert.ok(log.actions.some(a => a.label === "Filed intake for engine/larkspur"), "intake is in the log");

  const undone = await v.call("/api/superintendent/undo", "POST", decided.undo);
  assert.equal(undone.ok, true, undone.reason);
  assert.equal(desk.has("owner:hlw-patients-and-appointments"), true, "undo put the card back");
  v.note(`tapped UNDO in the action log → ${undone.summary}`);
  const after = await v.call("/api/superintendent/thread");
  const view = after.messages.flatMap(m => m.offers || []).find(o => o.id === chip.id);
  assert.equal(view.items[0].state, "stale", "the chip reads stale after its review reopened");

  /* the visitor acts on the deck directly; the conversation knows */
  desk.act({ key: "linear:hwk:HWK-42", action: "later", revision: "HWK-42:r1" }, "visitor");
  v.note("on the deck itself: moved HWK-42 to later");
  r = await v.say("what's waiting on me now?");
  assert.match(r.text, /Since we last spoke you moved \*\*HWK-42[^*]*\*\* to later on the deck/);
  assert.match(r.text, /Harlow patients and appointments/, "the reopened card is back in the list");

  r = await v.say("who is working on what?");
  assert.match(r.text, /codex\/sol/);
  assert.match(r.text, /building/, "codex/sol is building the pickup plan you approved");
  r = await v.say("how is heelwork going");
  assert.match(r.text, /\*\*Heelwork\*\*/);
  r = await v.say("undo that");
  assert.match(r.text, /can't be taken back/, "the last act was an approval, which undo must not skip past silently");
  assert.match(r.text, /Reorder session exercises/, "it names what can be undone instead");
  assert.equal(desk.has("owner:hwk-session-reorder"), false);
  r = await v.say("undo the session reorder");
  assert.equal(desk.has("owner:hwk-session-reorder"), true, "undo by name reopened the parked card");
  assert.match(r.text, /Reopened \[Reorder session exercises\]/);
  r = await v.say("can you read that out loud?");
  assert.match(r.text, /Voice isn't available in the demo/);
  r = await v.say("thanks, that's all");
  assert.ok(r.text.length < 120);

  if (process.env.VISR_TRANSCRIPT) writeFileSync(process.env.VISR_TRANSCRIPT,
    `VISR demo · scripted Superintendent · test transcript\n\n${v.lines.join("\n")}\n`);
});

test("the other routes answer as the client expects", async () => {
  const sb = load();
  const desk = fakeDesk();
  const call = async (p, m = "GET", b = {}) => sb.VISR_DEMO_SUPT.answer(p, m, b, desk);
  const speech = await call("/api/superintendent/speech?id=m_seed_02&part=0");
  assert.equal(speech.status, 409);
  assert.match((await speech.json()).reason, /Voice isn't available in the demo/);
  assert.equal((await call("/api/superintendent/file?id=f_x")).status, 404);
  const mode = await call("/api/superintendent/mode");
  assert.equal(mode.ok, true);
  assert.equal(mode.mode, "ask_first");
  assert.equal((await call("/api/superintendent/mode", "POST", { mode: "all_in" })).ok, false);
  const t = await call("/api/superintendent/thread?thread=project%3Aengine%2Flarkspur&subject=lsp-pickup-plan");
  assert.equal(t.ok, true);
  assert.ok(t.messages.length >= 3 && t.messages.every(m => m.thread === "project:engine/larkspur"));
  assert.equal((await call("/api/superintendent/thread?subject=lsp-pickup-plan")).ok, false);
  /* a card attached with no words: described, with a YES / NO chip for its main answer */
  const att = await call("/api/superintendent/send", "POST", { text: "", client_id: "att-1",
    cards: [{ key: "decision:dec-41", title: "CI rollout in private repos", kind: "decision", id: "dec-41" }] });
  sb.VISR_SUPT_LIB.clock.advance(3000);
  const desc = (await call(`/api/superintendent/thread?after=${att.message.id}`)).messages.find(m => m.role === "assistant");
  const grant = desc.offers.find(o => o.kind === "action");
  assert.equal(grant.action, "grant");
  assert.match(grant.diff, /intrinsic queue act decision:dec-41 approve/);
  const no = await call("/api/superintendent/decide", "POST", { offerId: grant.id, decision: "maybe", revision: grant.revision, requestId: "r0" });
  assert.equal(no.ok, false);
  const yes = await call("/api/superintendent/decide", "POST", { offerId: grant.id, decision: "yes", revision: grant.revision, requestId: "r1" });
  assert.equal(yes.ok, true);
  assert.equal(yes.offer.state, "done");
  assert.equal(desk.has("decision:dec-41"), false);
  const resend = { text: "hello", client_id: "same-id" };
  const a = await call("/api/superintendent/send", "POST", resend);
  const b = await call("/api/superintendent/send", "POST", resend);
  assert.equal(a.message.id, b.message.id, "a resend under the same client id is the same message");
  assert.equal((await call("/api/superintendent/send", "POST", { text: "x", client_id: "t1", thread: "nope" })).ok, false);
  const inThread = await call("/api/superintendent/send", "POST",
    { text: "how is it going?", client_id: "t2", thread: "project:engine/larkspur", subject: "lsp-pickup-plan" });
  assert.equal(inThread.message.thread, "project:engine/larkspur");
  sb.VISR_SUPT_LIB.clock.advance(5000);
  const th = await call(`/api/superintendent/thread?thread=project%3Aengine%2Flarkspur&after=${inThread.message.id}`);
  const rep = th.messages.find(m => m.role === "assistant");
  assert.deepEqual([...rep.subjects], ["lsp-pickup-plan"]);
  assert.match(rep.text, /\*\*Larkspur\*\*/, "a project thread's status is its own project's");
});

test("it runs against the current demo corpus without tripping", { skip: !existsSync(CORPUS) }, async () => {
  let sb;
  try { sb = load([CORPUS]); } catch (e) { return void console.log(`corpus not loadable right now: ${e.message}`); }
  const C = sb.VISR_DEMO_CORPUS;
  if (!C?.ITEMS) return;
  const items = JSON.parse(JSON.stringify(C.ITEMS)).filter(i => i.lane !== "happened");
  const desk = { items: () => items, queue: () => ({ items, projects: C.PROJECTS, happened: C.HAPPENED || [] }),
    act: ({ key }) => { const i = items.findIndex(x => x.key === key); if (i < 0) return { ok: false, reason: "gone" };
      items.splice(i, 1); return { ok: true, result: { message: "ok" } }; } };
  const v = new Visitor(sb, desk);
  await v.open();
  for (const text of ["hello", "what needs me", "walk me through", "next", "accept it", "how is liturgos going",
    "who's working on what", "file an idea for harlow: a print view of the day's charges", "what is an owner"]) {
    const r = await v.say(text);
    assert.ok(r.text && !/tripped over/.test(r.text), `"${text}" → ${r.text}`);
  }
});
