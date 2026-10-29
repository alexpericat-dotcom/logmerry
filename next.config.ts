import type { NextConfig } from "next";

import { securityHeaders } from "./lib/security-headers.ts";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NEXT_PUBLIC_SUPABASE_URL) }];
  },
};

export default nextConfig;
