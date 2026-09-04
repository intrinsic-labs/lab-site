import { Cardo } from "next/font/google";

/**
 * Cardo — latent-spaces-web's long-form reading face. There it's self-hosted
 * (`@font-face` in that repo's globals.css); it's also a real Google Fonts family, so we
 * pull it from next/font/google instead of vendoring files. Scoped to the post reading
 * column only (`app/research/[slug]/page.tsx`) — everywhere else on the site keeps
 * Newsreader, so nav, cards and every other heading stay in our own voice. See
 * docs/blog-style-notes.md for the full list of what was ported vs. kept.
 */
export const cardo = Cardo({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
