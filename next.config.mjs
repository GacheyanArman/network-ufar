/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "chart.googleapis.com",
      },
    ],
    // AVIF first for best compression; WebP as fallback
    formats: ["image/avif", "image/webp"],
    // Aggressive CDN cache for transformed images (30 days)
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Explicitly define breakpoints to reduce the number of generated sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Disable SVG serving through the image optimizer (security)
    dangerouslyAllowSVG: false,
  },
  // Enable experimental features for performance
  experimental: {
    // Parallel Route fetching for Server Components
    optimisticClientCache: true,
  },
};

export default nextConfig;

