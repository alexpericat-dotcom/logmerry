// La route /auth/confirm n'importe `next/server` que pour un type (effacé) ; Node ne résout pas ce chemin sans extension.
// `NextResponse.json` : le minimum pour tester le Route Handler `/api/chat` (statut et corps JSON).
export const NextResponse = {
  json: (body: unknown, init?: { status?: number }) => new Response(JSON.stringify(body), { status: init?.status ?? 200, headers: { "content-type": "application/json" } }),
};
