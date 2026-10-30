import type { NextConfig } from "next";

// Empty in dev; "/money-legos" for the GitHub Pages build (npm run build:pages).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  // Pin the workspace root so a lockfile in a parent folder is never picked up.
  turbopack: { root: process.cwd() },
};

export default config;
