export const site = {
  name: "Intrinsic Labs",
  url: "https://www.intrinsiclabs.co",
  description:
    "A one-person research studio. We build the instruments we need, run our work through them, and publish what they measure — including when the method didn't work.",
  email: "helloworld@intrinsiclabs.co",
  github: "https://github.com/intrinsic-labs",
  founded: 2024,
} as const;

/**
 * Where absolute metadata URLs (og:image, canonical) resolve. Vercel sets
 * VERCEL_PROJECT_PRODUCTION_URL to the project's shortest production domain, so this is
 * intrinsiclabs.vercel.app today and becomes the custom domain the moment it's attached —
 * without it the og:image pointed at www.intrinsiclabs.co, which is still the old site
 * and 404s. Local dev and any non-Vercel build fall back to site.url.
 */
export const metadataBase = new URL(
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : site.url,
);
