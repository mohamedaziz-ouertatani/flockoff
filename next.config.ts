import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run next to a live dev server: NEXT_DIST_DIR=.next-build pnpm build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Product image uploads go through server actions (one file per call, max 5 MB each).
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // Local images: generated placeholders (colors in the query string) and local-driver uploads.
    localPatterns: [{ pathname: "/placeholder/**" }, { pathname: "/uploads/**" }],
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
