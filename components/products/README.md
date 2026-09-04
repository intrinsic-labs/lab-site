# components/products

The product-page furniture. `/products/[slug]` is a **landing screen, then a carousel, then a
document** — in that order — and these are the first two.

| File | What it is |
|---|---|
| `ProductHero.tsx` | The landing screen: name (huge, sans), the one sentence from front matter's `line`, then the hero image centred over a soft accent glow. The title is Neue Montreal (`font-sans`) at `clamp(2.75rem, 12vw, 8.5rem)`, so it scales with the viewport and cannot overflow a phone. Status (`Chip`) and `Visit` (`ButtonLink`) sit under the image, quiet. Server component. |
| `Gallery.tsx` | The gallery as a scroll-snap carousel — native horizontal scroll (so touch and trackpad are free), prev/next buttons, arrow keys, dot indicators. No carousel library. Client component. |

## Image conventions

There is no front-matter field for images. `productImages(slug)` (`lib/content/products.ts`)
reads `public/products/<slug>/`: `hero.*` is the hero, everything else is the gallery in
filename order. The full convention — including why a hero wants to be landscape, and how
portrait and landscape gallery slides coexist — is `public/products/README.md`.

Two things follow for anyone editing here:

- **Every image slot must degrade.** A product whose screenshots haven't been captured yet
  still gets a landing screen: the hero falls back to the seeded `GenerativeCover` at the same
  size, and `Gallery` renders nothing at all rather than an empty strip.
- **Semantic tokens only.** `bg-paper`, `text-ink`, `text-ink-2`, `border-rule`, `text-accent`,
  and `var(--color-…)` inside the two gradient washes. No hex anywhere: the palette is remapped
  in `app/globals.css` and these pages have to follow it without being touched.

## Small screens

The owner reads this site on a Pixel phone and a Pixel Tablet in Chrome, so 390 / 820 /
1180 are as much the target as 1400. Three things carry that and should not be undone:

- the hero title is sized in `vw`, not in breakpoint steps;
- the hero image is `object-contain` under `max-h-[62vh]`, so a portrait screenshot and a
  16:9 plate both fit without either being cropped or pushing the fold away;
- the carousel is a native scroller, so touch already works — and it must never widen the
  page. Its bleed is *padding inside the scroll area*, never a negative margin on an
  ancestor.
