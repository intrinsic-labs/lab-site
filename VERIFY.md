# Verifying lab-site

How a cold agent takes this repo from checkout to a running site with screenshots and checks.
The map of what is where is [FEATURE_MAP.md](FEATURE_MAP.md); the engineering contract is
[AGENTS.md](AGENTS.md). Last proved end to end on 2026-11-11 against `5c6fd22` plus the
`lab/verification-kit` branch.

The site is static Next.js 16 (App Router), Tailwind v4, MDX content in `content/`. It has
**no auth, no database and no backend**.

- **Demo sign-in:** none; public site. No roles, no review mode.
- **Demo data:** the content files themselves. The one interactive surface, the VISR demo, runs
  on in-memory sample data (`public/visr-demo/demo/`); a reload resets it.

## Prerequisites

- **Node 24.** The Vercel project builds with Node.js 24.x and CI pins `24`; 24.16.0 (nvm) was
  used. The repo declares no `.nvmrc` or `engines`. Node 24 matters: `tests/*.test.mjs` and
  `scripts/check-draft-rail.mjs` import the `.ts` sources directly (native type stripping), and
  the map check uses `fs.globSync`.
- **pnpm 11.9.0**, pinned by `packageManager` in `package.json` (`pnpm -v` to confirm).
- **git** on `PATH` (the feature-map check and its tests use it).
- **For driving:** Playwright's global install (`$(npm root -g)/playwright`) with Chromium in
  `~/Library/Caches/ms-playwright`. It is not a dependency of the site.
- Work in your own worktree or copy, never in Asher's live checkout
  (`~/dev/web/lab-site`), where he may run `pnpm dev` on :3000.

## Install

```sh
pnpm install --frozen-lockfile     # a real install; never symlink node_modules
```

## Start on a free port

Check first. Never use :3000, and never start `next dev` in Asher's checkout (two dev servers
contend on `.next/dev/lock`). `lsof` lives in `/usr/sbin`, which an agent shell may not have on
`PATH`, so call it by full path.

```sh
PORT=3470                                          # any free port; never 3000
/usr/sbin/lsof -nP -iTCP:$PORT -sTCP:LISTEN && echo "taken: pick another" || echo free
RUN=$(mktemp -d)                                   # your pid file and log live here
VERCEL_ENV=production pnpm build                   # or plain `pnpm build` to see drafts
pnpm exec next start -p $PORT -H 127.0.0.1 > $RUN/start.log 2>&1 &
echo $! > $RUN/server.pid
sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:$PORT/     # 200
```

`next start` serves the real production output and is up in a couple of seconds after the
build. `pnpm exec next dev -p $PORT` also works in your own copy, but a build is what CI and
Vercel run. The site reads only `content/` and `public/` and calls no external service.

## Drive it (Playwright)

`scripts/verify-drive.mjs` loads each route at **phone (Playwright's `iPhone 15` profile,
393x659), tablet (1024x768) and desktop (1440x900)**, saves screenshots, and fails on a non-200,
a missing `<h1>`, a console or page error, or a failed request:

```sh
NPM_ROOT=$(npm root -g) node scripts/verify-drive.mjs --base http://127.0.0.1:$PORT \
  --out /private/tmp/<you>/lab-kit-shots
# default routes: /  /research  /research/when-your-benchmark-saturates  /products/intrinsic-os  /visr
# --routes /work,/about to choose others
```

Screenshots are named `<size>-<route>.png` (`phone-products-intrinsic-os.png`); rename to
`NN-what-it-shows.png` when you hand a set to review. Pages are full-page captures; the VISR
routes are viewport captures after the lazy frame is scrolled into view. Open each one and
look: text fitting, spacing, the demo actually populated (a deck card and, at tablet and
desktop, the Superintendent chat), not a blank frame. Run one browser at a time. The phone
profile is Chromium emulating an iPhone's viewport and user agent, not WebKit; label the shots
as emulated.

### What the screenshots should show

- `/` is pure black: spirograph masthead, three operating-measure discs, a Products grid of two
  cards (GlyphDeck, Liturgos). No Latest or Research areas section while every post is retired.
- `/research` and `/research/<slug>` are the light theme. `/research` shows the "Nothing is
  published here right now" copy.
- `/research/when-your-benchmark-saturates` shows the RETIRED notice (title, published and
  retired dates, reason, "All research" link) and no body; the driver prints its robots meta,
  which must be `noindex, follow`.
- `/products/intrinsic-os` and `/visr` show the VISR desk with sample data. At 1024px and wider
  `/visr` docks the Superintendent chat on the right.

## Checks

CI (`.github/workflows/ci.yml`) runs these, in this order, on every pull request and every push
to `main`. Run them the same way locally:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test                                                    # node --test tests/*.test.mjs
node scripts/check-feature-map.mjs FEATURE_MAP.md --routes 'app/**/*.{ts,tsx}'
cp tests/fixtures/draft-rail-probe.mdx content/research/zz-draft-rail-probe.mdx
pnpm build                                                   # preview mode: drafts render
node scripts/check-draft-rail.mjs --preview                  # every draft has a route
VERCEL_ENV=production pnpm build                             # production
node scripts/check-draft-rail.mjs                            # no draft has a route
rm content/research/zz-draft-rail-probe.mdx                  # never commit the probe
```

There is no separate type-check script: `next build` type-checks.

### The draft rail

`VERCEL_ENV=production pnpm build` must generate no `/research/<slug>` route for a draft post.
`scripts/check-draft-rail.mjs` finds the drafts with the site's own front-matter engine
(`lib/content/fs.ts`) and schema (`lib/content/schema.ts`), so a post with no `status:` line
counts as the draft it defaults to. It then reads `.next/prerender-manifest.json` and
`.next/server/app/research/<slug>.{html,rsc,meta}`. By default it fails if any draft is
routed; with `--preview` it fails if any draft is *not* routed, because a preview must render
drafts for review.

`content/research` holds no draft today, so without help the check would pass vacuously (it
says so). The probe post (`tests/fixtures/draft-rail-probe.mdx`) is a real, schema-valid draft:
copied in before both builds, it must appear in the preview build and be absent from the
production one. On 2026-11-11 the preview build listed `/research/zz-draft-rail-probe` and the
production build did not. The probe only ever exists in a CI runner or your own copy; Vercel
never sees it. `tests/draft-rail-script.test.mjs` covers the script against fixture trees.

### VISR demo checks

The demo (`/products/intrinsic-os`, `/products/visr`, `/visr`) must make **zero console errors,
zero `/api` network requests and zero off-origin requests**: its shim answers `/api/*` in
memory, and nothing leaves the browser. `scripts/verify-drive.mjs` asserts all three on every
VISR route at every size, counting requests from the page and its iframe, and prints
`visr: N requests, 0 /api, 0 off-origin, 0 console errors`. On 2026-11-11: 164 to 176
requests per load, all same-origin.

### Demo-data scrub check

After any change under `public/visr-demo/demo/` or a re-vendor:

```sh
node scripts/scrub-check-visr-demo.mjs --vault ~/Documents/obsidian/intrinsic-labs-v01 \
  --out /private/tmp/<you>/scrub.md
```

The denylist is built at run time from the vault, `~/dev` and the tailnet, and is never
committed; the report goes outside the repo. It exits 1 when anything matches, and each match
is for a person to judge. The 2026-11-11 run reported 14 matches, all code identifiers in
vendored files (`this.local`, `SetControls.local`, `glyph`, a `~/dev/…` input placeholder, an
`arbiter` map key), none real names or data. Never put a real client, person, repo, host, issue
id or amount in `demo/`.

### Routes, redirects, feed, sitemap

```sh
B=http://127.0.0.1:$PORT
for r in / /research /research/when-your-benchmark-saturates /products /products/intrinsic-os \
  /products/visr /work /about /about/editorial /visr /feed.xml /sitemap.xml /robots.txt /no-such-page; do
  printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' $B$r)" "$r"; done   # 200s, then 404
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $B/products/vault         # 308 …/products/intrinsic-os
curl -s $B/feed.xml | grep -c '<item>'                                             # 0 while every post is retired
curl -s $B/sitemap.xml | grep -c '<loc>'                                           # 23 on 2026-11-11
```

Every redirect is in `next.config.ts` and the `seo.redirects` entry of FEATURE_MAP.md; all are
308 except the résumé PDF (307 to another Vercel project).

### Feature-map check

`scripts/check-feature-map.mjs` is a Node port of the vault skill's checker
(`Tools/skills/feature-mapping/check_map.md` stays canonical), so CI needs only node and git.
Errors fail; warnings (drift since `revision:`, unmapped route files, stale Coverage paths)
print and pass. Run it with `--strict` only when you reconcile the map and bump `revision:`.
Unlike the Python original it reads `[slug]` literally, so the map names Next's dynamic folders
as they are. `tests/feature-map-check.test.mjs` proves the checker.

## What deploys what

- Vercel project **`lab-site`**, team `intrinsic-labs`, connected to the GitHub repo
  `intrinsic-labs/lab-site`. Vercel does the deploying; GitHub Actions CI is only a check.
- **Every branch push** gets a preview at `lab-site-git-<branch>-intrinsic-labs.vercel.app`
  (slashes in the branch name become hyphens). Previews build with `VERCEL_ENV=preview`, so
  drafts render there with a `draft` chip. Previews are publicly reachable.
- **A merge to `main`** deploys production at **https://www.intrinsiclabs.co**. The apex
  `intrinsiclabs.co` answers 308 to www (a Vercel domain setting, not in the repo).

### Post-deploy check

Once Vercel reports the production deployment ready:

```sh
B=https://www.intrinsiclabs.co
for r in / /research /research/when-your-benchmark-saturates /products/intrinsic-os /visr \
  /about /work /feed.xml /sitemap.xml /robots.txt; do
  printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' $B$r)" "$r"; done      # all 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://intrinsiclabs.co/    # 308 https://www.intrinsiclabs.co/
curl -s $B/feed.xml | grep -c '<item>'                                                # the published-post count
```

Then check the change itself on the page it touched, and for a new published post that
`/research/<slug>` is 200 and appears in the feed and sitemap. All of the above answered as
expected on 2026-11-11.

### Rollback

Revert the merge commit on `main` (`git revert -m 1 <merge sha>` for a merge commit, plain
`git revert <sha>` for a squash merge) and land the revert through a PR; Vercel redeploys
production from it. Vercel's "Promote to Production" on the previous deployment is the faster
stopgap, but `main` must still be reverted or the next push redeploys the bad change.

## Migrations

None. This is a static site with no database, no seed data and no server state.

## Stop and clean up

Kill only the process you started, after confirming it owns the port. `$!` is the `pnpm exec`
wrapper; the listener is its `next-server` child, so walk up from the listener:

```sh
MINE=$(cat $RUN/server.pid)
P=$(/usr/sbin/lsof -tiTCP:$PORT -sTCP:LISTEN)
while [ -n "$P" ] && [ "$P" != "$MINE" ] && [ "$P" != 1 ]; do P=$(ps -o ppid= -p $P | tr -d ' '); done
[ "$P" = "$MINE" ] && kill "$MINE" || echo "not mine: leave it"
sleep 2; /usr/sbin/lsof -iTCP:$PORT -sTCP:LISTEN || echo stopped
rm -rf "$RUN"
```

Killing the wrapper ends `next-server` too (checked 2026-11-11). Never `pkill -f` or kill a
remembered PID. In a throwaway worktree or copy, also `rm -rf .next node_modules` when done
(disk is tight), and make sure the draft-rail probe is gone from `content/research/`.

## Gotchas

- **`lsof` is not on an agent shell's `PATH`** (`/usr/sbin` is missing); `lsof: command not
  found` is not "port free". Use `/usr/sbin/lsof`.
- **The embedded demo is lazy** (`loading="lazy"`). A viewport shot of `/products/intrinsic-os`
  at phone width never loads it unless the frame is scrolled into view; the driver does that.
- **`pnpm build` does not clobber a running `next dev`** in the same checkout (Next 16 keeps
  dev output in `.next/dev/`), but it saturates the CPU and Asher's checkout must stay
  untouched. Build in your own copy.
- **A production build after a preview build leaves no stale draft pages:** `next build`
  empties `.next` first, so the rail check reads only the last build. Always run the check
  right after the build it is about.
- **No post is published or draft right now**; all six are retired. The home page, `/research`,
  the feed and the area pages show their empty states, and that is correct.
- **`node` prints a `MODULE_TYPELESS_PACKAGE_JSON` warning** when the tests or the rail check
  import a `.ts` file, because `package.json` has no `"type"`. It is harmless.
- Headless Chromium renders the WebGL work covers and the home spirograph; no GPU flags needed.
- The `/W_ASHER_POPE_Resume_20260325.pdf` redirect is a 307 to another Vercel project; don't
  expect its target to resolve locally.
