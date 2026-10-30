import type { MetadataRoute } from "next";

/** Les moteurs de recherche ne connaissent que la page publique ; le reste de l'application est privé (connexion). */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/portfolio", disallow: "/" } };
}
