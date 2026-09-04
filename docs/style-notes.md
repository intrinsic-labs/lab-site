# Style notes — the latent-spaces skin, on black

The site's entire visual language is ported from **latent-spaces-web**
(`~/dev/web/latent-spaces-web/next-js`), its dark ("ls") theme, with **one deliberate
change**: the ground is pure black `#000000` rather than that site's `#121212`.

> Asher, 2026-09-04: "take all of the styling verbatim from the latent spaces website and
> use it here. The only change: I don't want this dark gray background, I want a pure black
> background like the current intrinsiclabs.co. I love the theme colors, the code colors on
> posts are so cool."

This is a **skin swap**, not a rebuild — the structure, components and content of lab-site
are unchanged. Everything flipped at once because every component was already written
against the semantic tokens in `app/globals.css`; the remap is the whole mechanism.

Source files read: `src/app/globals.css` (the `@font-face` block, `:root`, `.heading-*`,
`.paragraph*`, `.btn-*`), `tailwind.config.ts` (the `ls.*` colour scale), `public/fonts/**`,
`src/components/blog/BlogPostContent.tsx`, `src/components/openloom/OpenLoomHeader.tsx` and
`OpenLoomContent.tsx`, `src/components/latent-spaces/CodeChip.tsx`, `Hero.tsx`,
`DiscordCTA.tsx`, `FeatureItem.tsx`.

---

## Palette — every value and where it came from

`app/globals.css` `@theme`. The left column is our semantic token; the right is the
latent-spaces value it is.

| Our token | Value | Taken from |
|---|---|---|
| `--color-paper` | `#000000` | **the one change.** latent-spaces is `ls.background #121212` |
| `--color-paper-2` | `#121212` | `ls.background`, demoted to "raised surface" on black |
| `--color-paper-3` | `#1f1f1f` | ours — the dot-grid / hover step between `-2` and `--color-rule` |
| `--color-ink` | `#ffffff` | `ls.text` |
| `--color-ink-2` | `#cccccc` | `ls.textSecondary` `rgba(255,255,255,0.8)`, flattened to opaque hex |
| `--color-ink-3` | `#8c8c8c` | ours — a third step latent-spaces doesn't name |
| `--color-rule` | `#2a2a2a` | ours — hairlines; latent-spaces uses `neutral-800/50` for the same job |
| `--color-accent` | `#6cba78` | `ls.accentLight` — `rgb(108,186,120)` |
| `--color-verdant` | `#4d8c56` | `ls.accent` — `rgb(77,140,86)` |
| `--color-marker` | `#c9b374` | `ls.yellowLight` — `rgb(201,179,116)` |
| `--color-marker-2` | `#a4915c` | `ls.yellow` — `rgb(164,145,92)` |
| `--color-ember` | `#e07a55` | latent-spaces `orange` — its **dark** inline-code colour |
| `--color-surface` | `rgba(255,255,255,0.08)` | `ls.surfaceHover`; `ls.surface` (0.03) is invisible on `#000` |
| `--color-surface-hover` | `rgba(255,255,255,0.14)` | ours, one step up from the above |

**Two accents, two jobs.** Green (`accent` / `verdant`) is the *UI* accent — buttons,
generative covers, the `paper` kind label, "draft" status text. Sand (`marker` /
`marker-2`) is the *reading* accent — prose links (latent-spaces' `CodeChip` colour), the
`.marker` highlight, `::selection`, the Draft badge. Ember is inline code only.

The old cream/paper palette (`#f3eee4` / `#1b1915` / `#b5471f` …) is gone entirely.

## Fonts — the exact files, not lookalikes

All four faces are **the files latent-spaces-web ships**, copied byte-for-byte from
`latent-spaces-web/next-js/public/fonts/` into `public/fonts/`, and declared with
`@font-face` at the top of `app/globals.css` using the same family names, weights, styles
and `format()` hints as that repo's own declarations. No Google Fonts, no substitutes —
Asher: *"I love those fonts."*

| Family | Files | Role here |
|---|---|---|
| **Cardo** | Regular / Bold / Italic `.ttf` | body + all prose (`--font-body`, the `html` default) |
| **Neue Montreal** | Regular / Medium / Bold / Light + 4 italics `.otf` | every heading, the wordmark (`--font-sans`, and `--font-serif`) |
| **JetBrains Mono** | variable + italic variable `.ttf` | code blocks, the specimen plate (`--font-mono`) |
| **Calling Code** | Regular `.ttf` | `.label`, `.pill`, `.btn`, table headers, inline code (`--font-code`) |

`components/research/fonts.ts` (Cardo via `next/font/google`) is **deleted**; the four
importers were updated. `next/font/google`'s Newsreader + IBM Plex Mono are gone from
`app/layout.tsx`; the three faces that paint first-paint text are `<link rel="preload">`ed
there instead.

**One naming wrinkle worth knowing.** latent-spaces sets headings in Neue Montreal (sans)
and body in Cardo (serif). Every heading in this codebase already carried `font-serif`, so
rather than rewrite components other agents own, `--font-serif` and `--font-sans` both
resolve to Neue Montreal, Cardo is the `html` default plus explicit on `.prose`, and an
unlayered `h1…h6 { font-family: var(--font-sans) }` rule catches headings with no font
class. If the utility names are ever cleaned up, that rule is the seam.

## The reading column

Ported from `BlogPostContent.tsx` / `OpenLoomContent.tsx`.

| Thing | latent-spaces | Here |
|---|---|---|
| body block | `font-cardo text-[1.2rem] leading-[1.8] tracking-[0.01rem]` at a 16px root | `.prose-post p,li { font-size: 1.07rem; line-height: 1.8; letter-spacing: 0.01rem }` — 1.07rem at our **18px** root is the same 19.2px |
| measure | `max-w-3xl` | `.prose { max-width: 68ch }` (unchanged) |
| h2 | `text-2xl font-neue-montreal font-bold mt-10 mb-4` | `1.5rem / 700 / Neue Montreal`, `margin-top: 2.2em` |
| h3 | `text-xl font-neue-montreal font-bold mt-8 mb-4` | `1.2rem / 700 / Neue Montreal` (the old *italic serif* h3 is gone) |
| blockquote | `border-l-4 border-primary/30 pl-4 italic` | `4px solid rgba(255,255,255,0.3)`, `padding-left: 1.1em`, italic |
| links | blog: plain underline · OpenLoom: `CodeChip` = `text-ls-yellowLight bg-ls-yellowLight/10 rounded` | sand `#c9b374`, underlined, with a sand wash on hover — the CodeChip colour without turning every link into a button |
| inline code | dark page: `bg-neutral-800/40 text-orange rounded px-1.5 py-0.5 font-calling-code text-[1rem]` | Calling Code, `#e07a55`, `rgba(255,255,255,0.08)` (raised from `neutral-800/40`, which is invisible on `#000`), `border-radius: 0.25rem`, `0.1em 0.35em` |
| code blocks | `react-syntax-highlighter` Prism **`vscDarkPlus`**, `customStyle={{ borderRadius: '1rem' }}`, `my-6` | **shiki `dark-plus`** — the identical VS Code Dark+ token set — resolved at build time, `#1e1e1e` ground, `border-radius: 1rem`, `1.6em` margins, no border |
| lists | `list-disc pl-6 mb-6` | `list-style: disc` (was `square`), `padding-left: 1.4em` |

### The highlighter

`lib/mdx/highlight.ts` holds the theme + options; **both** render paths use it, which was
not previously true:

- `lib/mdx/render.tsx` — MDX posts, via `rehypePlugins: [[rehypeShiki, …]]`
- `lib/mdx/markdown.ts` — **new**, the plain `remark → rehype → html` pipeline for the Open
  Loom spec (which can't go through MDX; its `map<id, Node>` tables break acorn). It ran
  `remark-html` with **no highlighter at all** before this; `app/products/aspen-grove/open-loom/page.tsx`
  now calls `renderMarkdown()` instead of building the pipeline inline. Its data loading is untouched.

Deps added: `shiki`, `@shikijs/rehype`, `unified`, `remark-parse`, `remark-rehype`,
`rehype-stringify`. Nothing ships to the browser — it all resolves at build time.

## Labels, pills and buttons

**Ruling (Asher, 2026-09-04): a category/kind label is NOT a stroked pill.** It is text on
a low-opacity fill at a small radius, no border — latent-spaces' own tag / inline-code
shape (`bg-*/10 rounded px-1.5 py-0.5 font-calling-code`). A stroke reads as a control on a
black ground, and these are captions.

- `.pill` / `.pill-accent` / `.pill-marker` / `.pill-muted` in `globals.css`;
  `components/ui/Chip.tsx` is now a thin wrapper over them, `KindLabel` unchanged.
- `PostCard`'s **Draft badge** is `.pill .pill-marker` (was a stroked capsule).
- **One exception**: the Open Loom banner's version pill (`.version-pill`) IS a stroked
  capsule, because that is the one place latent-spaces uses that shape verbatim —
  `OpenLoomHeader`: `border border-neutral-400 rounded-full px-4 py-1 bg-neutral-300/10
  backdrop-blur-md text-neutral-300 font-calling-code`. Copied exactly.

**Buttons** (`.btn` / `.btn-green` / `.btn-ink`, `components/ui/ButtonLink.tsx`) take
latent-spaces' CTA shape — `Hero.tsx` / `DiscordCTA.tsx` / `Navigation.tsx`:
`bg-ls-accent/30 border border-ls-accentLight rounded-full font-calling-code`. The label is
the **light** accent, not the fill colour: the old `bg-verdant text-paper` put near-black
text on dark green and the "Visit →" button was unreadable. Every tone clears 7:1.

## What of ours was kept

- **The plate vocabulary** — `Frame`'s registration marks, the hairline `.card-grid` with
  its overlapping 1px outlines, `SectionHead`'s numbered rules, the `.specimen` block.
  latent-spaces has no equivalent; this is lab-site's own voice and it survives the reskin.
- **`.grid-paper`** — same dot grid, now `#1f1f1f` on black, reading as a machine ground
  rather than paper grain.
- **`.marker`** — same gradient band, but at 34% alpha with a 55% inset underline, because
  a solid sand band would black out white text.
- **`GenerativeCover`** — same seeded trochoid; the two curves now carry the two
  latent-spaces accents (green outer, sand inner) over a `#121212` plate, plus a second
  inner registration circle.
- **The 68ch measure, 18px root, `scroll-padding-top`, the sticky header, the four-item
  nav** — all unchanged.
- **The content model** — caveats above the fold, dated corrections, an artifacts block
  that says why when empty. Untouched by this.

## The dark dossier is retired

`theme: dark` front matter (Tycho) used to re-point the palette to a night/chalk set. On an
all-dark site that is a no-op, so the `--color-night-*` / `--color-chalk-*` tokens and the
`html:has(.dossier-dark)` remap are **deleted**. The front-matter field and the
`.dossier-dark` class it emits are left in place (`lib/content/schema.ts`,
`app/products/[slug]/page.tsx`) so no content file breaks — the class is simply inert.

## Verified

`pnpm exec tsc --noEmit` and `pnpm lint` clean. No horizontal overflow on `/`, `/research`,
a post, `/products`, `/products/aspen-grove/open-loom`, `/work` or `/about` at **390 / 820 /
1180 / 1400** (checked with a scripted `scrollWidth` vs `clientWidth` assertion, not by eye).
Code blocks and wide spec tables scroll inside their own box rather than the page.
