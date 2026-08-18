import type { NextConfig } from "next";

// Storage images are served straight from Supabase, and every byte counts
// against the project's cached-egress quota. Routing them through the Next.js
// image optimizer means Supabase is read once per source image while visitors
// receive resized AVIF/WebP from the app's own CDN.
const supabaseImageHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

if (!supabaseImageHostname) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL is unset or malformed; remote images will not be optimized.",
  );
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Vercel fetches the Supabase original once per width/format variant, so
    // every unused breakpoint is a wasted origin read. The layout caps at
    // max-w-7xl (1280px) and source images are 2560px, which makes the default
    // 3840 entry pure waste. These five cover mobile through 2x desktop.
    deviceSizes: [640, 828, 1080, 1920, 2560],
    // Only the fixed-size images (64/80/88/218px thumbnails) draw from these.
    imageSizes: [64, 96, 128, 256],
    // Upload paths are timestamped, so a stored object never changes contents.
    minimumCacheTTL: 31536000,
    remotePatterns: supabaseImageHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseImageHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  // sharp ships prebuilt native binaries and must not be bundled.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
