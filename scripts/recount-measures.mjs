#!/usr/bin/env node
/**
 * Recount the homepage operating measures from the IntrinsicOS journal and write the counts
 * into `content/specimen/autonomy.json`. Counts only: no ids, names or paths leave the journal.
 *
 *   node scripts/recount-measures.mjs --journal <journal.sqlite> --vault <vault> [--at <ISO>] [--write]
 *
 * `--at` defaults to now, rounded down to the hour. The vault supplies each project's category
 * (`Projects/<category>/<project>/`). Without `--write` it prints the readings and changes
 * nothing. Definitions: `lib/measures/recount.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { acceptedMeasure, releasedMeasure, agentTimeMeasure, percent } from "../lib/measures/recount.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]);
  return acc;
}, []));
if (!args.journal || !args.vault) {
  console.error("usage: recount-measures.mjs --journal <journal.sqlite> --vault <vault> [--at <ISO>] [--write]");
  process.exit(2);
}
const hour = 3_600_000;
const t = new Date(args.at && args.at !== true ? Date.parse(args.at) : Math.floor(Date.now() / hour) * hour).toISOString();

const db = new DatabaseSync(path.resolve(args.journal), { readOnly: true });
const events = db.prepare(`select ts, kind, payload_json from events where kind in
  ('outcome_approved','review_owner_settlement','superintendent_accept','owner_release_scheduled','owner_release_done') and ts < ?`)
  .all(t).map((r) => ({ ts: r.ts, kind: r.kind, payload: JSON.parse(r.payload_json) }));
const runs = db.prepare("select project, started_at, ended_at from runs where kind = 'owner' and started_at < ?").all(t);
db.close();

const categories = new Map();
const projectsDir = path.join(path.resolve(args.vault), "Projects");
for (const category of fs.readdirSync(projectsDir)) {
  const dir = path.join(projectsDir, category);
  if (category.startsWith("_") || !fs.statSync(dir).isDirectory()) continue;
  for (const project of fs.readdirSync(dir)) categories.set(project, category);
}

const accepted = acceptedMeasure(events, t);
const released = releasedMeasure(events, t);
const outward = agentTimeMeasure(runs, (p) => categories.get(p), t);

const day = (i) => i.slice(0, 10);
const longDay = (i) => new Date(i).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const span = (w) => {
  const [a, b] = [longDay(w.from), longDay(new Date(Date.parse(w.to) - 1).toISOString())];
  const [ma, da] = a.split(" ");
  const [mb, db_] = b.split(" ");
  return ma === mb ? `${ma} ${da}–${db_}` : `${a} – ${b}`;
};
const cutoff = `${t.slice(0, 16).replace("T", " ")} UTC`;

const file = new URL("../content/specimen/autonomy.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const byKey = Object.fromEntries(data.metrics.map((m) => [m.key, m]));
Object.assign(byKey.accepted, {
  label: `Outcomes approved ${span(accepted.window)} that have been accepted`,
  blurb: `Approved ${span(accepted.window)} and accepted by ${cutoff}${accepted.byManager ? `, ${accepted.byManager} of them by the manager agent, which may accept only work that can't reach real users` : ""}. The rest are in progress or stopped.`,
  value: percent(accepted.numerator, accepted.denominator),
  numerator: accepted.numerator, denominator: accepted.denominator,
  method: `First outcome_approved per outcome from ${accepted.window.from} to ${accepted.window.to} (72 h before the ${t} cutoff); accepted = a review accept for the same outcome before the cutoff (${accepted.byManager} by the manager agent).`,
});
Object.assign(byKey.released, {
  blurb: `Merged, deployed or sent within 72 hours of acceptance, by the owner's own record. Accepted ${span(released.window)}; ${released.noReleaseNeeded} other accepts were already live and are not counted.`,
  value: percent(released.numerator, released.denominator),
  numerator: released.numerator, denominator: released.denominator,
  method: `First review accept per outcome from ${released.window.from} to ${released.window.to}, limited to accepts that scheduled a release; released = owner_release_done at or after the accept and within 72 h. ${released.noReleaseNeeded} further accepts needed no release step. "Released" is the owner's record, not an independent delivery check.`,
});
Object.assign(byKey.outward, {
  label: `Agent working minutes on client and product projects, ${span(outward.window)}`,
  blurb: `Share of owner-agent working minutes spent on client work and products, ${span(outward.window)}. The rest went to the runtime and this site. Other agent roles aren't counted.`,
  value: percent(outward.numerator, outward.denominator),
  numerator: outward.numerator, denominator: outward.denominator,
  method: `Owner-session minutes clipped to ${outward.window.from} – ${outward.window.to}; outward = client (engine) and product (bets) projects; internal = the runtime and the Lab site.${outward.unknownProjectMinutes ? ` ${outward.unknownProjectMinutes} minutes on projects without a category count as internal.` : ""}`,
});
data.metrics.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
data.generated = day(t);
data.asOf = t;
data.window = { from: day(accepted.window.from), to: day(t), days: Math.round((Date.parse(t) - Date.parse(accepted.window.from)) / (24 * hour)) };

for (const m of data.metrics) console.log(`${m.key.padEnd(9)} ${m.numerator}/${m.denominator} = ${m.value}%`);
console.log(`released: ${released.noReleaseNeeded} accepts needed no release · cutoff ${t}`);
if (args.write) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file.pathname)}`);
}
