Drop `portrait.jpg` here (4:5, ≥1200px wide).

`app/about/page.tsx` checks for `portrait.jpg` / `portrait.png` / `portrait.webp` at build
time and renders it beside the bio in section 01 when present — nothing renders if it's
absent, so there's no placeholder to remove later.
