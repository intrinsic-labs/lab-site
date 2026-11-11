#!/usr/bin/env node
// Feature-map check (FEATURE_MAP.md, AGENTS.md "Verify and navigate").
//
//   node scripts/check-feature-map.mjs FEATURE_MAP.md --routes 'app/**/*.{ts,tsx}' [--root DIR] [--strict]
//
// Exit 1 on any error; warnings (drift since `revision:`, unmapped route files, stale Coverage
// paths) print but pass unless --strict. Run --strict only when reconciling the map: in a PR,
// drift from `revision:` is expected. Needs Node 22+ (fs.globSync) and git on PATH.
import { checkMap } from "./feature-map/check.mjs";

const args = process.argv.slice(2);
const routes = [];
let root;
let strict = false;
let mapPath;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--routes") routes.push(args[++i]);
  else if (args[i] === "--root") root = args[++i];
  else if (args[i] === "--strict") strict = true;
  else mapPath = args[i];
}
if (!mapPath) {
  console.error("usage: check-feature-map.mjs MAP.md [--routes GLOB]... [--root DIR] [--strict]");
  process.exit(2);
}

const { errors, warnings } = checkMap(mapPath, { root, routes });
for (const e of errors) console.log(`ERROR ${e}`);
for (const w of warnings) console.log(`WARN  ${w}`);
const failed = errors.length > 0 || (strict && warnings.length > 0);
console.log(`${failed ? "FAIL" : "ok"}: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(failed ? 1 : 0);
