# Blog style notes — what we took from latent-spaces-web

Source: `~/dev/web/latent-spaces-web/next-js/src/app/blog/**` and
`src/components/blog/**` (`BlogPostHeader.tsx`, `BlogPostContent.tsx`, `BlogPosts.tsx`,
`FeaturedPost.tsx`), plus `src/app/globals.css` for its type scale (`.container-custom`,
`.heading-xl`) and fonts (`@font-face` block, self-hosted).

Fonts there: **Cardo** (long-form body), **Neue Montreal** (headings/UI), **Calling Code**
(mono labels), **JetBrains Mono** (code). All four are self-hosted `@font-face` there, not
`next/font`. Of the four, **Cardo is also a real Google Fonts family** — same font, not an
approximation — so it's the only one pulled in directly (`components/research/fonts.ts`,
`next/font/google`). Neue Montreal and Calling Code are commercial (Pangram Pangram); their
closest free equivalents would be something like Space Grotesk / Hanken Grotesk, but we
didn't bring a substitute in — see "kept from ours" below for why.

## Measurements taken

- **Reading column**: `max-w-3xl` (48rem) at their root size vs. our `.prose` at 68ch —
  close enough at our type scale that we just widened `.prose` from 66ch → 68ch rather than
  hard-coding a px value.
- **Body copy**: `font-cardo text-[1.2rem] leading-[1.8] tracking-[0.01rem]` on their root
  (16px base). Ours runs an 18px root, so the equivalent rhythm is closer to
  `1.05rem` / `line-height: 1.75` — see `.prose-post` in `app/globals.css`.
- **Post header**: centered — category pill, then title, then a pipe-separated meta row
  (`author | date | readingTime`), then a full-width cover image last. Ported the shape
  (kind/area chip → title → meta → cover), not the literal pipe glyph (kept our `·`, used
  everywhere else on the site) and not the dark gradient-overlay-on-image treatment (doesn't
  suit a cream ground).
- **Cards** (`BlogPosts.tsx` / `FeaturedPost.tsx`): image on top, subtle `scale-105` on
  hover, category as a bordered pill, meta line with a `|` separator. Ported the hover-scale
  and the top-image composition; the card layout itself follows the newsroom grid in
  Design/refs/lab-site/02.jpeg per Asher's explicit direction, which predates and takes
  precedence over the latent-spaces card shape (list rows there, not a 3-col grid).
- **Blockquote / pull quote**: `border-l-4 border-primary/30 pl-4 italic` there → ours is
  `border-left: 2px solid var(--color-ink); padding-left: 1.4em; font-size: 1.15rem; italic`
  (`.prose-post blockquote`), heavier than our default `.prose blockquote` but still one
  hairline, not four.

## What we kept from ours

- **Newsreader** for every heading site-wide, including post titles — the brand voice
  didn't move. Cardo is scoped to the post body copy only (`app/research/[slug]/page.tsx`),
  applied via `cardo.className` on the prose wrapper, not threaded through the Tailwind
  theme — so About/Editorial/Work pages, which also render through `.prose`, are untouched.
- **IBM Plex Mono** for every `.label` (dates, kind/area chips, nav) — didn't swap for
  JetBrains Mono even though it's the exact same self-hosted family there and is also on
  Google Fonts, because `.label` is a pervasive sitewide detail; swapping it only on two
  routes would read as an inconsistency, not a refinement.
- **Square corners, hairline borders, no gradients** — our whole visual language (cream
  ground, ink rules, no `rounded-xl`, no image-overlay text). Latent's rounded cards and
  gradient-over-image title treatment weren't ported for the same "still coheres" reason.
- **The `·` separator**, not latent's `|`, in every meta line across the site (cards, post
  header, footer).
- **Caveats / Corrections / Artifacts** as our own post-footer idiom in place of latent's
  Tags + social-share footer — we have no tag taxonomy in the schema, and sharing buttons
  would cut against the "No analytics, deliberate" house rule in AGENTS.md. The *place* (a
  structured block after the body) was kept; the content is ours.

## What we took from theirs

- **Cardo** for the post reading body, scoped to that one route.
- **Centered header composition** — kind/area chip → title → meta line → cover image, all
  centered — replacing the old two-column grid with a sidebar.
- **Hover-scale on card cover images** (`group-hover:scale-[1.03]`, 500ms) — every card in
  `PostCard.tsx`, `ProductsGrid`-equivalent on `/products`, and area-page product cards.
- **Reading rhythm**: `.prose-post` bumps paragraph/list line-height and size specifically
  in the post body, and gives blockquotes the heavier pull-quote treatment.
- **68ch reading measure** site-wide (`.prose`), since it's close to what they use and is a
  strict improvement over 66ch either way.
