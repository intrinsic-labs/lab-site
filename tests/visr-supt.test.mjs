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
  why: b.why || "", ...(b.owners ? { ownerChoices: ["agent/ash", "agent/birch", "agent/cedar"], defaultOwner: b.owners } : {}),
  brief: { state: "ready", brief: { cardTitle, body: b.body || "", recommendation: b.rec || null } },
});
const FIXTURE = () => [
  item("draft:orc-season-planner", "draft_outcome", "orchard", "Growers plan each season from last year's yields",
    "Orchard season planner", 180, ["approve", "reject", "feedback", "not_needed", "later"],
    { owners: "agent/ash", body: "The planner reads last year's yields and the frost dates, then proposes a crop per bed.",
      rec: { text: "Approve.", reason: "Small enough to finish in a week.", doubt: "The frost dates come from one note." } }),
  item("owner:nw-launch-checklist", "owner_review", "northwind", "Launch Northwind's site against a checklist the client signs",
    "Northwind launch checklist", 300, ["accept", "park", "feedback", "not_needed", "later"],
    { body: "The owner finished the checklist. Each item carries its evidence.",
      rec: { text: "Accept it and send the link.", reason: "Every acceptance criterion has evidence attached." } }),
  item("owner:orc-frost-dates", "owner_review", "orchard", "Give each grower their own frost date", "Frost dates per grower",
    200, ["accept", "park", "feedback", "not_needed", "later"], { body: "Each grower now has a frost date from their own records." }),
  item("owner:lan-depth-calibration", "owner_review", "lanternfish", "Calibrate the sonar against the dock's known depth",
    "Sonar depth calibration", 60, ["accept", "park", "feedback", "not_needed", "later"],
    { body: "Readings sit within 4 cm of the dock gauge down to 3 m." }),
  item("decision:dec-7", "decision", "lanternfish", "Move Thursday's Lanternfish call to Friday morning?",
    "Move Thursday's call", 120, ["approve", "reject", "feedback", "not_needed", "later"],
    { body: "The DNS move needs about an hour of watching. The call would overlap it." }),
  item("proposal:run_9f2e", "proposal", "orchard", "Proposed two tasks to collect yield data from growers",
    "Yield data tasks", 1800, ["approve", "reject", "not_needed", "later"]),
  item("chore:nw-12", "chore", "northwind", "Send Northwind the redirect list to confirm", "Northwind redirect list",
    540, ["done", "feedback", "not_needed", "later"], { body: "One email to the client contact." }),
  item("linear:nw:NW-42", "linear", "northwind", "NW-42 Fix the checkout total rounding", "", 360, ["route", "feedback", "later"]),
];

function fakeDesk() {
  const items = FIXTURE();
  const removed = new Map();
  const fns = [];
  const intake = [];
  const emit = e => { for (const f of fns) f({ ...e, at: new Date().toISOString() }); };
  return {
    projects: [{ category: "engine", ref: "engine/northwind", name: "Northwind" },
      { category: "bets", ref: "bets/orchard", name: "Orchard" }, { category: "bets", ref: "bets/lanternfish", name: "Lanternfish" }],
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
  assert.ok(first.threads.some(t => t.kind === "project" && t.subjects.length === 2), "Orchard project thread with subjects");

  let r = await v.say("hi");
  assert.match(r.text, /Superintendent/);

  r = await v.say("how does this work?");
  assert.match(r.text, /IntrinsicOS/);
  assert.match(r.text, /demo|scripted|invented/);

  r = await v.say("what needs me?");
  assert.match(r.text, /1\. \[Northwind launch checklist\]\(#item=owner:nw-launch-checklist\)/, "most important first");
  assert.match(r.text, /Frost dates per grower/);

  r = await v.say("walk me through the deck");
  assert.match(r.text, /\*\*1 of \d\*\*/);
  assert.match(r.text, /#item=owner:nw-launch-checklist/);
  const chip = r.offers?.find(o => o.kind === "accepts");
  assert.ok(chip, "the walk's card comes with an ACCEPT chip");
  assert.equal(chip.items[0].outcomeId, "nw-launch-checklist");

  r = await v.say("next");
  assert.match(r.text, /\*\*2 of/);
  assert.match(r.text, /Frost dates per grower/);

  r = await v.say("acept it");
  assert.equal(desk.has("owner:orc-frost-dates"), false, "“it” was the frost-dates card");
  assert.match(r.text, /Accepted \*\*Frost dates per grower\*\*/);

  r = await v.say("park the sonar calibration");
  assert.equal(desk.has("owner:lan-depth-calibration"), false);
  assert.match(r.text, /Parked \*\*Sonar depth calibration\*\*/);

  r = await v.say("approve the orchard one");
  assert.match(r.text, /Which one/);
  assert.match(r.text, /Orchard season planner/);
  assert.match(r.text, /Yield data tasks/);
  r = await v.say("the first");
  assert.equal(desk.has("draft:orc-season-planner"), false, "ambiguity resolved to the first candidate");
  assert.match(r.text, /Approved \*\*Orchard season planner\*\*/);

  r = await v.say("I have an idea");
  assert.match(r.text, /Which project/);
  r = await v.say("orchard");
  assert.match(r.text, /What's the idea for Orchard/);
  r = await v.say("Text each grower the week before their frost date");
  assert.equal(desk.intake().length, 1);
  assert.equal(desk.intake()[0].project, "bets/orchard");
  assert.match(desk.intake()[0].note, /Text each grower the week before their frost date/);
  assert.match(r.text, /Filed for \*\*Orchard\*\*/);
  assert.match(r.text, /Projects\/bets\/orchard\/intake\//);

  r = await v.say("file an idea for lanternfish: log water temperature beside each depth reading");
  assert.equal(desk.intake().length, 2, "an idea in one go");
  assert.equal(desk.intake()[1].project, "bets/lanternfish");

  r = await v.say("Can you book me a flight to Lisbon?");
  assert.match(r.text, /scripted stand-in/);
  assert.match(r.text, /What needs me\?/);

  /* the chip from the walk's first card, tapped now */
  const tap = await v.call("/api/superintendent/decide", "POST", { offerId: chip.id, item: "nw-launch-checklist",
    decision: "accept", revision: chip.items[0].revision, requestId: "req-1" });
  assert.equal(tap.ok, true, tap.reason);
  assert.equal(tap.offer.items[0].state, "done");
  assert.equal(desk.has("owner:nw-launch-checklist"), false, "the chip accepted it");
  v.note(`tapped ACCEPT on the chip for nw-launch-checklist → ${tap.offer.items[0].state}`);
  const again = await v.call("/api/superintendent/decide", "POST", { offerId: chip.id, item: "nw-launch-checklist",
    decision: "accept", revision: chip.items[0].revision, requestId: "req-1" });
  assert.equal(again.offer.items[0].state, "done", "a retry answers its recorded result");

  /* the action log: newest first, a page of 15, the chip's decision with UNDO */
  const log = await v.call("/api/superintendent/actions");
  assert.equal(log.ok, true);
  assert.equal(log.actions.length, 15);
  assert.equal(log.more, true);
  const older = await v.call(`/api/superintendent/actions?before=${log.actions.at(-1).id}`);
  assert.ok(older.actions.length > 0 && older.actions.every(a => a.at <= log.actions.at(-1).at), "older page");
  const decided = log.actions.find(a => a.tool === "chat_decision" && a.target?.key === "owner:nw-launch-checklist");
  assert.ok(decided?.undo, "the chip's accept can be undone");
  assert.ok(log.actions.some(a => a.label === "Filed intake for bets/orchard"), "intake is in the log");

  const undone = await v.call("/api/superintendent/undo", "POST", decided.undo);
  assert.equal(undone.ok, true, undone.reason);
  assert.equal(desk.has("owner:nw-launch-checklist"), true, "undo put the card back");
  v.note(`tapped UNDO in the action log → ${undone.summary}`);
  const after = await v.call("/api/superintendent/thread");
  const view = after.messages.flatMap(m => m.offers || []).find(o => o.id === chip.id);
  assert.equal(view.items[0].state, "stale", "the chip reads stale after its review reopened");

  /* the visitor acts on the deck directly; the conversation knows */
  desk.act({ key: "linear:nw:NW-42", action: "later", revision: "NW-42:r1" }, "visitor");
  v.note("on the deck itself: moved NW-42 to later");
  r = await v.say("what's waiting on me now?");
  assert.match(r.text, /Since we last spoke you moved \*\*NW-42[^*]*\*\* to later on the deck/);
  assert.match(r.text, /Northwind launch checklist/, "the reopened card is back in the list");

  r = await v.say("who is working on what?");
  assert.match(r.text, /agent\/ash/);
  assert.match(r.text, /building/, "ash is building the planner you approved");
  r = await v.say("how is lanternfish going");
  assert.match(r.text, /\*\*Lanternfish\*\*/);
  r = await v.say("undo that");
  assert.match(r.text, /can't be taken back/, "the last act was an approval, which undo must not skip past silently");
  assert.match(r.text, /Sonar depth calibration/, "it names what can be undone instead");
  assert.equal(desk.has("owner:lan-depth-calibration"), false);
  r = await v.say("undo the sonar calibration");
  assert.equal(desk.has("owner:lan-depth-calibration"), true, "undo by name reopened the parked card");
  assert.match(r.text, /Reopened \[Sonar depth calibration\]/);
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
  const t = await call("/api/superintendent/thread?thread=project%3Abets%2Forchard&subject=orc-season-planner");
  assert.equal(t.ok, true);
  assert.ok(t.messages.length >= 3 && t.messages.every(m => m.thread === "project:bets/orchard"));
  assert.equal((await call("/api/superintendent/thread?subject=orc-season-planner")).ok, false);
  /* a card attached with no words: described, with a YES / NO chip for its main answer */
  const att = await call("/api/superintendent/send", "POST", { text: "", client_id: "att-1",
    cards: [{ key: "decision:dec-7", title: "Move Thursday's call", kind: "decision", id: "dec-7" }] });
  sb.VISR_SUPT_LIB.clock.advance(3000);
  const desc = (await call(`/api/superintendent/thread?after=${att.message.id}`)).messages.find(m => m.role === "assistant");
  const grant = desc.offers.find(o => o.kind === "action");
  assert.equal(grant.action, "grant");
  assert.match(grant.diff, /intrinsic queue act decision:dec-7 approve/);
  const no = await call("/api/superintendent/decide", "POST", { offerId: grant.id, decision: "maybe", revision: grant.revision, requestId: "r0" });
  assert.equal(no.ok, false);
  const yes = await call("/api/superintendent/decide", "POST", { offerId: grant.id, decision: "yes", revision: grant.revision, requestId: "r1" });
  assert.equal(yes.ok, true);
  assert.equal(yes.offer.state, "done");
  assert.equal(desk.has("decision:dec-7"), false);
  const resend = { text: "hello", client_id: "same-id" };
  const a = await call("/api/superintendent/send", "POST", resend);
  const b = await call("/api/superintendent/send", "POST", resend);
  assert.equal(a.message.id, b.message.id, "a resend under the same client id is the same message");
  assert.equal((await call("/api/superintendent/send", "POST", { text: "x", client_id: "t1", thread: "nope" })).ok, false);
  const inThread = await call("/api/superintendent/send", "POST",
    { text: "how is it going?", client_id: "t2", thread: "project:bets/orchard", subject: "orc-season-planner" });
  assert.equal(inThread.message.thread, "project:bets/orchard");
  sb.VISR_SUPT_LIB.clock.advance(5000);
  const th = await call(`/api/superintendent/thread?thread=project%3Abets%2Forchard&after=${inThread.message.id}`);
  const rep = th.messages.find(m => m.role === "assistant");
  assert.deepEqual([...rep.subjects], ["orc-season-planner"]);
  assert.match(rep.text, /\*\*Orchard\*\*/, "a project thread's status is its own project's");
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
  for (const text of ["hello", "what needs me", "walk me through", "next", "accept it", "how is orchard going",
    "who's working on what", "file an idea for northwind: a print stylesheet for the checklist", "what is an owner"]) {
    const r = await v.say(text);
    assert.ok(r.text && !/tripped over/.test(r.text), `"${text}" → ${r.text}`);
  }
});
