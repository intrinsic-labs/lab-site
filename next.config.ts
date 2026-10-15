import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP fallback: the product screenshots are 0.5–1.8 MB PNGs and were being
    // served raw (Lighthouse 2026-09-04: 2.7 MB of image savings on the front page alone).
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        // "The vault" became IntrinsicOS (2026-09-04) and its slug followed. Permanent: the
        // old URL was linked from the home page and a post.
        source: "/products/vault",
        destination: "/products/intrinsic-os",
        permanent: true,
      },
      {
        // The Ghost is no longer an instrument of its own — it is what Tycho produces,
        // and lives as a section of Tycho's dossier. Permanent: the old URL was published.
        // Listed before the general /instruments/:slug rule below, since redirects are
        // matched in array order and this one needs to win over it for "ghost".
        source: "/instruments/ghost",
        destination: "/products/tycho#the-ghost",
        permanent: true,
      },
      {
        // "Instruments" → "Products" (2026-09-03 nav simplification). Permanent: the old
        // URLs were published.
        source: "/instruments/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        source: "/instruments",
        destination: "/products",
        permanent: true,
      },
      // intrinsiclabs.co served the old portfolio (intrinsiclabs-co-v3) until 2026-10-15.
      // Its published URLs land on their counterparts here. Aspen Grove was a case study
      // there and is a product page here; it must precede the general rule.
      {
        source: "/case-studies/aspen-grove",
        destination: "/products/aspen-grove",
        permanent: true,
      },
      {
        source: "/case-studies/:slug",
        destination: "/work/:slug",
        permanent: true,
      },
      {
        source: "/case-studies",
        destination: "/work",
        permanent: true,
      },
      {
        // The résumé PDF was linked from the old site; it stays hosted by the retired
        // project rather than being copied into this repo. Temporary: the host may change.
        source: "/W_ASHER_POPE_Resume_20260325.pdf",
        destination:
          "https://intrinsic-labs-website.vercel.app/W_ASHER_POPE_Resume_20260325.pdf",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
