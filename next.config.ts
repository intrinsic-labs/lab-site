import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
