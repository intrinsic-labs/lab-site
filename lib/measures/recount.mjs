/**
 * The homepage operating measures, as pure functions over IntrinsicOS journal rows.
 *
 * Definitions follow the research publishing plan (§2). `t` is the snapshot time; no window
 * starts before 2026-10-13, when the settlement and release events start. Each function takes
 * plain rows (`{ ts, kind, payload }` events, `{ project, started_at, ended_at }` runs) so the
 * counting is testable without the journal; `scripts/recount-measures.mjs` reads the journal.
 */

export const EPOCH = "2026-10-13T00:00:00.000Z";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const ms = (iso) => Date.parse(iso);
const iso = (n) => new Date(n).toISOString();
const latest = (...isos) => iso(Math.max(...isos.map(ms)));

/** First occurrence per id among events, by timestamp. */
function firstBy(events, idOf) {
  const first = new Map();
  for (const e of [...events].sort((a, b) => ms(a.ts) - ms(b.ts))) {
    const id = idOf(e);
    if (id && !first.has(id)) first.set(id, e);
  }
  return first;
}

const isAccept = (e) => e.kind === "review_owner_settlement" && e.payload.transition === "accept";

/**
 * Accepted: an outcome's first approval falls between EPOCH and t − 3 days, and it has been
 * accepted by t. Since October 29 the manager agent may accept work that cannot reach real
 * users (`superintendent_accept`); those accepts count and are reported as `byManager`.
 */
export function acceptedMeasure(events, t) {
  const to = iso(ms(t) - 3 * DAY);
  const approved = firstBy(events.filter((e) => e.kind === "outcome_approved"), (e) => e.payload.outcomeId);
  const cohort = [...approved.values()].filter((e) => e.ts >= EPOCH && e.ts < to);
  const acceptedIds = new Set(events.filter((e) => isAccept(e) && e.ts < t).map((e) => e.payload.outcomeId));
  const byManagerIds = new Set(events.filter((e) => e.kind === "superintendent_accept" && e.ts < t).map((e) => e.payload.outcomeId));
  const accepted = cohort.filter((e) => acceptedIds.has(e.payload.outcomeId));
  const byManager = accepted.filter((e) => byManagerIds.has(e.payload.outcomeId)).length;
  return { numerator: accepted.length, denominator: cohort.length, byManager, window: { from: EPOCH, to } };
}

/**
 * Released: an outcome's first accept falls between the later of EPOCH and t − 17 days, and
 * t − 3 days, and that accept scheduled a release. It counts as released when a release is
 * recorded at or after the accept and within 72 hours. Accepts that scheduled no release (the
 * work was already at its destination) are outside the denominator and reported separately;
 * counting them as unreleased understated the measure before October 30.
 */
export function releasedMeasure(events, t) {
  const from = latest(EPOCH, iso(ms(t) - 17 * DAY));
  const to = iso(ms(t) - 3 * DAY);
  const accepts = firstBy(events.filter(isAccept), (e) => e.payload.key);
  const cohort = [...accepts.values()].filter((e) => e.ts >= from && e.ts < to);
  const scheduled = new Set(events.filter((e) => e.kind === "owner_release_scheduled").map((e) => e.payload.key));
  const needing = cohort.filter((e) => scheduled.has(e.payload.key));
  const done = events.filter((e) => e.kind === "owner_release_done");
  const released = needing.filter((a) => done.some((d) =>
    d.payload.key === a.payload.key && ms(d.ts) >= ms(a.ts) && ms(d.ts) - ms(a.ts) <= 3 * DAY));
  return {
    numerator: released.length,
    denominator: needing.length,
    noReleaseNeeded: cohort.length - needing.length,
    window: { from, to },
  };
}

/**
 * Agent time: owner-session minutes in the trailing 14 days, clipped to the window. Client
 * (engine) and product (bets) projects count as outward; everything else (the runtime, the Lab
 * site) as internal. A run still going at t counts up to t.
 */
export function agentTimeMeasure(runs, categoryOf, t) {
  const end = ms(t);
  const start = end - 14 * DAY;
  let outward = 0;
  let total = 0;
  let unknownProject = 0;
  for (const r of runs) {
    const a = Math.max(ms(r.started_at), start);
    const b = Math.min(r.ended_at ? ms(r.ended_at) : end, end);
    if (!(b > a)) continue;
    const minutes = (b - a) / 60_000;
    total += minutes;
    const category = categoryOf(r.project);
    if (category === undefined) unknownProject += minutes;
    if (category === "engine" || category === "bets") outward += minutes;
  }
  return {
    numerator: Math.round(outward),
    denominator: Math.round(total),
    unknownProjectMinutes: Math.round(unknownProject),
    window: { from: iso(start), to: iso(end) },
  };
}

/** One decimal, as the site prints it. */
export const percent = (n, d) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);
