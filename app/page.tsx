import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** La première page est la connexion ; une personne déjà connectée arrive directement sur le cockpit. */
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims ? "/aujourd-hui" : "/auth/login");
}
