// The org chart's data (components/products/orgchart/roles.ts): every link resolves, every
// role sits in a declared tier and can be reached by the keyboard walk, and no retired bot is
// presented as current. Node runs the .ts source directly (type stripping).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ROLES, TIERS, linkedIds } from "../components/products/orgchart/roles.ts";

const ids = new Set(ROLES.map((r) => r.id));

test("role ids are unique and every tier is declared and used", () => {
  assert.equal(ids.size, ROLES.length);
  const tiers = new Set(TIERS.map((t) => t.id));
  for (const r of ROLES) assert.ok(tiers.has(r.tier), `${r.id} has an undeclared tier ${r.tier}`);
  for (const t of TIERS) assert.ok(ROLES.some((r) => r.tier === t.id), `tier ${t.id} is empty`);
});

test("every link points at a real role, never at itself, at most once", () => {
  for (const r of ROLES) {
    const seen = new Set();
    for (const l of r.talksTo) {
      assert.ok(ids.has(l.to), `${r.id} links to unknown ${l.to}`);
      assert.notEqual(l.to, r.id, `${r.id} links to itself`);
      assert.ok(!seen.has(l.to), `${r.id} links to ${l.to} twice`);
      assert.ok(l.how.trim().length > 0, `${r.id} → ${l.to} says nothing about how`);
      seen.add(l.to);
    }
  }
});

test("every role is connected and fully described", () => {
  for (const r of ROLES) {
    assert.ok(linkedIds(r.id).size > 0, `${r.id} is connected to nothing`);
    assert.ok(r.does.trim() && r.mayDecide.length > 0, `${r.id} is missing what it does or may decide`);
  }
});

test("the chart names Jefferson as the only bot and no retired one", () => {
  const source = readFileSync(new URL("../components/products/orgchart/roles.ts", import.meta.url), "utf8");
  const data = JSON.stringify(ROLES);
  for (const retired of ["Emily", "David", "Bernard"]) {
    assert.ok(!data.includes(retired), `retired bot ${retired} appears in the chart data`);
  }
  assert.ok(ROLES.some((r) => r.name === "Jefferson"));
  assert.ok(source.includes("Jefferson is the only bot"));
});
