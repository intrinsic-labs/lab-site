#!/usr/bin/env node
// Drives a running lab-site (see VERIFY.md) with Playwright at phone, tablet and desktop
// sizes: screenshots, status, console errors, and the VISR demo's network rules.
//
//   NPM_ROOT=$(npm root -g) node scripts/verify-drive.mjs --base http://127.0.0.1:3470 \
//     --out /private/tmp/<you>/lab-kit-shots [--routes /,/research]
//
// Playwright is not a dependency of the site; it is resolved from the global install
// ($NPM_ROOT/playwright). Exit 1 on any failed check.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const root = process.env.NPM_ROOT;
if (!root) { console.error("set NPM_ROOT=$(npm root -g)"); process.exit(2); }
const { chromium, devices } = require(`${root}/playwright`);

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const base = new URL(opt("--base", "http://127.0.0.1:3470"));
const out = opt("--out", join(process.env.TMPDIR ?? "/tmp", "lab-kit-shots"));
const routes = opt("--routes", "/,/research,/research/when-your-benchmark-saturates,/products/intrinsic-os,/visr").split(",");
// VISR routes also get the zero-error / zero-/api / zero-off-origin rules.
const VISR_ROUTES = new Set(["/products/intrinsic-os", "/products/visr", "/visr"]);

const sizes = {
  phone: devices["iPhone 15"],
  tablet: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};
const slug = (r) => (r === "/" ? "home" : r.slice(1).replaceAll("/", "-"));

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL ${m}`); };

for (const [size, device] of Object.entries(sizes)) {
  const context = await browser.newContext(device);
  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [], requests = [], failed = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("request", (r) => requests.push(r.url()));
    page.on("requestfailed", (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
    const res = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
    // The embedded demo is lazy: bring its frame into view so it loads and is what the shot shows.
    if (VISR_ROUTES.has(route)) await page.locator("iframe").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(VISR_ROUTES.has(route) ? 3000 : 800);
    const file = join(out, `${size}-${slug(route)}.png`);
    await page.screenshot({ path: file, fullPage: !VISR_ROUTES.has(route) });
    console.log(`${size.padEnd(7)} ${route} -> ${res.status()} ${file}`);
    if (res.status() !== 200) fail(`${route} status ${res.status()}`);
    if (!(await page.locator("h1").count()) && route !== "/visr") fail(`${route} has no <h1>`);
    if (consoleErrors.length) fail(`${route} console errors: ${consoleErrors.join(" | ")}`);
    if (failed.length) fail(`${route} failed requests: ${failed.join(" | ")}`);
    if (VISR_ROUTES.has(route)) {
      const api = requests.filter((u) => new URL(u).pathname.startsWith("/api/"));
      const off = requests.filter((u) => /^https?:/.test(u) && new URL(u).origin !== base.origin);
      if (api.length) fail(`${route} made /api requests: ${api.join(", ")}`);
      if (off.length) fail(`${route} made off-origin requests: ${off.join(", ")}`);
      if (!page.frames().some((f) => f.url().includes("/visr-demo/"))) fail(`${route} VISR frame never loaded`);
      console.log(`  visr: ${requests.length} requests, ${api.length} /api, ${off.length} off-origin, ${consoleErrors.length} console errors`);
    }
    if (route.startsWith("/research/") && route.split("/").length === 3) {
      const robots = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => null);
      console.log(`  robots meta: ${robots}`);
    }
    await page.close();
  }
  await context.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
