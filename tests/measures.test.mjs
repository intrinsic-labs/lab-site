import test from "node:test";
import assert from "node:assert/strict";
import { acceptedMeasure, releasedMeasure, agentTimeMeasure } from "../lib/measures/recount.mjs";

const T = "2026-10-30T04:00:00.000Z";
const ev = (ts, kind, payload) => ({ ts, kind, payload });
const accept = (ts, key, outcomeId = key) => ev(ts, "review_owner_settlement", { key, outcomeId, transition: "accept" });

test("released counts only accepts that scheduled a release (regression: Oct 30 definition)", () => {
  const events = [
    accept("2026-10-20T10:00:00.000Z", "a"),
    ev("2026-10-20T10:00:01.000Z", "owner_release_scheduled", { key: "a" }),
    ev("2026-10-21T10:00:00.000Z", "owner_release_done", { key: "a" }),
    // already at its destination: no release scheduled, so outside the denominator
    accept("2026-10-20T11:00:00.000Z", "b"),
    // scheduled, released after 72 h: in the denominator, not released
    accept("2026-10-18T00:00:00.000Z", "c"),
    ev("2026-10-18T00:00:01.000Z", "owner_release_scheduled", { key: "c" }),
    ev("2026-10-21T00:00:02.000Z", "owner_release_done", { key: "c" }),
    // a release recorded before the accept does not count
    accept("2026-10-22T00:00:00.000Z", "d"),
    ev("2026-10-21T23:00:00.000Z", "owner_release_done", { key: "d" }),
    ev("2026-10-22T00:00:01.000Z", "owner_release_scheduled", { key: "d" }),
    // accepted inside the last 3 days: too recent to judge
    accept("2026-10-28T00:00:00.000Z", "e"),
    ev("2026-10-28T00:00:01.000Z", "owner_release_scheduled", { key: "e" }),
  ];
  const m = releasedMeasure(events, T);
  assert.equal(m.denominator, 3);
  assert.equal(m.numerator, 1);
  assert.equal(m.noReleaseNeeded, 1);
  assert.equal(m.window.from, "2026-10-13T04:00:00.000Z");
  assert.equal(m.window.to, "2026-10-27T04:00:00.000Z");
});

test("released keys on the first accept per item", () => {
  const events = [
    accept("2026-10-15T00:00:00.000Z", "a"),
    ev("2026-10-15T00:00:01.000Z", "owner_release_scheduled", { key: "a" }),
    accept("2026-10-20T00:00:00.000Z", "a"),
    ev("2026-10-20T01:00:00.000Z", "owner_release_done", { key: "a" }),
  ];
  assert.deepEqual([releasedMeasure(events, T).numerator, releasedMeasure(events, T).denominator], [0, 1]);
});

test("accepted uses the first approval and any accept before t", () => {
  const events = [
    ev("2026-10-12T00:00:00.000Z", "outcome_approved", { outcomeId: "early" }),
    ev("2026-10-14T00:00:00.000Z", "outcome_approved", { outcomeId: "early" }),
    ev("2026-10-14T00:00:00.000Z", "outcome_approved", { outcomeId: "x" }),
    ev("2026-10-15T00:00:00.000Z", "outcome_approved", { outcomeId: "y" }),
    ev("2026-10-29T00:00:00.000Z", "outcome_approved", { outcomeId: "late" }),
    accept("2026-10-29T00:00:00.000Z", "kx", "x"),
    accept("2026-10-31T00:00:00.000Z", "ky", "y"),
    ev("2026-10-29T00:00:00.000Z", "superintendent_accept", { key: "kx", outcomeId: "x" }),
  ];
  const m = acceptedMeasure(events, T);
  assert.deepEqual([m.numerator, m.denominator, m.byManager], [1, 2, 1]);
});

test("agent time clips runs to the trailing 14 days and splits by category", () => {
  const cat = { cx1: "engine", glyphdeck: "bets", vault: "meta" };
  const runs = [
    { project: "cx1", started_at: "2026-10-16T03:00:00.000Z", ended_at: "2026-10-16T05:00:00.000Z" },
    { project: "glyphdeck", started_at: "2026-10-29T00:00:00.000Z", ended_at: "2026-10-29T00:30:00.000Z" },
    { project: "vault", started_at: "2026-10-30T03:00:00.000Z", ended_at: null },
    { project: "vault", started_at: "2026-10-01T00:00:00.000Z", ended_at: "2026-10-02T00:00:00.000Z" },
  ];
  const m = agentTimeMeasure(runs, (p) => cat[p], T);
  assert.deepEqual([m.numerator, m.denominator], [90, 150]);
});
