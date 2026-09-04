import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // The Ghost is no longer an instrument of its own — it is what Tycho produces,
        // and lives as a section of Tycho's dossier. Permanent: the old URL was published.
        source: "/instruments/ghost",
        destination: "/instruments/tycho#the-ghost",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
