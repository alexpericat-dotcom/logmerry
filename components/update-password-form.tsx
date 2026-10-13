"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { frenchAuthError, validateNewPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const msg = validateNewPassword(password);
    setPasswordError(msg);
    setFormError(null);
    if (msg) return;

    setIsLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        const { field, message } = frenchAuthError(error);
        if (field === "password") setPasswordError(message);
        else setFormError(message);
        return;
      }
      router.push("/protected");
      router.refresh();
    } catch {
      setFormError("Enregistrement impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Nouveau mot de passe
          </h1>
          <CardDescription>Choisis ton nouveau mot de passe.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} noValidate>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                {passwordError && (
                  <p id="password-error" role="alert" className="text-sm text-destructive">
                    {passwordError}
                  </p>
                )}
              </div>
              {formError && (
                <div role="alert" className="text-sm text-destructive">
                  <p>{formError}</p>
                  <Link
                    href="/auth/forgot-password"
                    className="underline underline-offset-4"
                  >
                    Demander un nouveau lien
                  </Link>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enregistrement…" : "Enregistrer le mot de passe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
