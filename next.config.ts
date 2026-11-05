import type { NextConfig } from "next";

import { securityHeaders } from "./lib/security-headers.ts";

/** Images du bucket public `portfolio` (page publique) : ce seul hôte et ce seul dossier sont autorisés pour `next/image`. */
function portfolioImagePatterns() {
  try {
    const { protocol, hostname, port } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "");
    if (protocol !== "https:" && protocol !== "http:") return [];
    return [{ protocol: protocol === "http:" ? ("http" as const) : ("https" as const), hostname, ...(port ? { port } : {}), pathname: "/storage/v1/object/public/portfolio/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: { remotePatterns: portfolioImagePatterns() },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NEXT_PUBLIC_SUPABASE_URL) }];
  },
};

export default nextConfig;
