"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const logout = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.push("/auth/login");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {failed && (
        <span role="alert" className="text-sm text-destructive">
          Déconnexion impossible. Réessaie.
        </span>
      )}
      <Button onClick={logout} disabled={busy}>
        Se déconnecter
      </Button>
    </div>
  );
}
