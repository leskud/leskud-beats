import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  serverExternalPackages: ["music-metadata"],
  outputFileTracingIncludes: {
    "/api/admin/beats/**": [
      "./node_modules/ffmpeg-static/**",
      "./assets/audio/**",
    ],
    "/admin/**": [
      "./node_modules/ffmpeg-static/**",
      "./assets/audio/**",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
