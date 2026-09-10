import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {/* config options here */};

export default withSentryConfig(nextConfig, {
  org: "kg-s7",
  project: "cubby",
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
