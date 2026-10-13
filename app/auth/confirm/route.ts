import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Seul le lien de réinitialisation de mot de passe passe par cette route.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  let ok = false;
  if (token_hash && type === "recovery") {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      ok = !error;
    } catch {
      ok = false;
    }
  }

  // redirect() lève une exception : à appeler hors du try.
  redirect(ok ? next : "/auth/error");
}
