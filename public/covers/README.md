# Post cover images

Drop one image per post here and point at it from the post's front matter:

```yaml
cover: /covers/lm-studio-slots.png
coverAlt: "LM Studio's context-per-slot setting"
```

- 4:3 works best (cards crop to 4:3); ≥ 1600px wide; PNG or JPG.
- Screenshots, plots, photos are all fine — no text-heavy images (the card title carries the words).
- A post with no `cover:` gets a generated plotted-curve placeholder, so nothing breaks while these fill in.

## `spare/`

Unused images from Asher's 2026-09-04 placeholder batch, kept as options for future posts.
Move one up a level, rename it to the post's slug, and point `cover:` at it.
