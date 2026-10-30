/** En-têtes de sécurité de toutes les routes (lot A de l'audit du 30 octobre 2026). */
export function securityHeaders(supabaseUrl: string | undefined): { key: string; value: string }[] {
  // Une URL absente ou invalide (ex. `your-project-url` copié de .env.example) ne doit pas casser le build : `connect-src` se limite à 'self'.
  let supabaseOrigin = "";
  try {
    if (supabaseUrl?.trim()) supabaseOrigin = ` ${new URL(supabaseUrl.trim()).origin}`;
  } catch {}
  // La CSP reste en mode rapport : Next.js et `next-themes` injectent des scripts en ligne, une CSP bloquante non éprouvée casserait l'application.
  // Aucun point de collecte (report-uri) : les violations ne s'affichent que dans la console du navigateur.
  // ponytail: passer en `Content-Security-Policy` (avec nonces) après une période d'observation des rapports.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data:${supabaseOrigin}`,
    `connect-src 'self'${supabaseOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Ignoré en mode rapport (X-Frame-Options couvre l'anti-cadre) ; prend effet au passage en CSP bloquante.
    "frame-ancestors 'none'",
  ].join("; ");
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy-Report-Only", value: csp },
  ];
}
