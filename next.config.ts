import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // A pnpm lockfile exists in the parent home directory. Pin Turbopack to
    // this checkout so it does not scan the broader home tree for sources.
    root: process.cwd(),
  },
};

export default nextConfig;
