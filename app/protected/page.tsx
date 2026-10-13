import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

// Revérification côté serveur en plus du proxy : le contenu n'est rendu que pour un jeton valide.
async function PrivateContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Zone privée</h1>
      <p className="text-muted-foreground">
        Tu es connecté. Le cockpit « Aujourd&apos;hui » arrive avec la story
        suivante.
      </p>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense>
      <PrivateContent />
    </Suspense>
  );
}
