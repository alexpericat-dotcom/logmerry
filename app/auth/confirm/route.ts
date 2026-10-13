import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Retour du lien de réinitialisation : Supabase renvoie ici avec un `code` (PKCE),
// échangé contre une session côté serveur.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  let ok = false;
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    } catch {
      ok = false;
    }
  }

  // redirect() lève une exception : à appeler hors du try.
  redirect(ok ? next : "/auth/error");
}
