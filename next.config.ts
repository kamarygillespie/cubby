import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  images: {
    // Only ever true in local dev, where NEXT_PUBLIC_SUPABASE_URL points at
    // `supabase start`'s 127.0.0.1 storage endpoint. Never enabled in
    // production, where this would be a real SSRF risk.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Local Supabase (`supabase start`) serves storage from 127.0.0.1,
      // not *.supabase.co — needed for local dev/testing only.
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "kg-s7",
  project: "cubby",
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
