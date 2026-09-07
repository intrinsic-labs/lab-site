import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { autonomyData, autonomyMetric, coverageNote, fraction, plotted } from "../lib/content/autonomy-schema.ts";

const metric = {
  key: "execution", label: "Recorded session completion", value: 50,
  numerator: 1, denominator: 2, countNoun: "recorded attempts", direction: "up",
  coverage: { status: "incomplete", includedRecords: 1, excludedRecords: 3,
    missingCounters: 3, invalidCounters: 0, malformedLines: 0, unpairedCompletions: 4 },
};

test("incomplete paired subset keeps its real rate with a visible coverage explanation", () => {
  const parsed = autonomyMetric.parse(metric);
  assert.equal(plotted(parsed), 50);
  assert.equal(fraction(parsed), "1 of 2 recorded attempts");
  assert.match(coverageNote(parsed) ?? "", /data is incomplete/);
  assert.match(coverageNote(parsed) ?? "", /3 run records/);
});

test("unavailable rates are never plotted or labelled as zero percent", () => {
  const parsed = autonomyMetric.parse({ ...metric, value: null, numerator: 0, denominator: 0,
    coverage: { ...metric.coverage, status: "unavailable" } });
  assert.equal(plotted(parsed), null);
  assert.equal(fraction(parsed), "Rate unavailable");
  assert.match(coverageNote(parsed) ?? "", /no rate is available/);
});

test("a measured zero is distinct from an unknown rate", () => {
  const parsed = autonomyMetric.parse({ ...metric, value: 0, numerator: 0,
    coverage: { ...metric.coverage, status: "complete", excludedRecords: 0, missingCounters: 0 } });
  assert.equal(plotted(parsed), 0);
  assert.equal(fraction(parsed), "0 of 2 recorded attempts");
  assert.equal(coverageNote(parsed), null);
});

test("schema rejects impossible percentages and malformed coverage", () => {
  for (const value of [-1, 101, "50", Infinity, NaN]) {
    assert.equal(autonomyMetric.safeParse({ ...metric, value }).success, false);
  }
  assert.equal(autonomyMetric.safeParse({ ...metric, coverage: { ...metric.coverage, excludedRecords: -1 } }).success, false);
});

test("generated public snapshot carries the narrower meaning and current coverage", () => {
  const data = autonomyData.parse(JSON.parse(fs.readFileSync(new URL("../content/specimen/autonomy.json", import.meta.url), "utf8")));
  const execution = data.metrics.find((m) => m.key === "execution");
  assert.match(execution.label, /valid recorded counts/);
  assert.equal(execution.coverage?.status, "incomplete");
  assert.ok(execution.coverage.missingCounters > 0);
  assert.ok(execution.numerator <= execution.denominator);
  assert.match(data.figure?.intro ?? "", /do not establish a company autonomy rate/);
});
