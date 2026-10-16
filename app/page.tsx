import { redirect } from "next/navigation";

/** La première page est la connexion. Le proxy (`lib/supabase/proxy.ts`) redirige déjà `/` (vers le cockpit si on est connecté) ; ceci n'est que le filet de sécurité statique. */
export default function Home() {
  redirect("/auth/login");
}
