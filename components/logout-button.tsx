"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
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
    <div className="flex flex-col gap-1">
      {failed && (
        <span
          role="alert"
          className={compact ? "px-2 text-xs text-destructive md:sr-only" : "px-2 text-xs text-destructive"}
        >
          Déconnexion impossible. Réessaie.
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className={`justify-start ${compact ? "md:size-9 md:justify-center md:px-0" : ""} ${failed ? "text-destructive" : ""}`}
        onClick={logout}
        disabled={busy}
        title={failed ? "Déconnexion impossible. Réessaie." : "Se déconnecter"}
      >
        <LogOut size={16} aria-hidden="true" />
        <span className={compact ? "md:sr-only" : ""}>
          Se déconnecter
        </span>
      </Button>
    </div>
  );
}
