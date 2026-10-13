"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { frenchAuthError, validateEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailMsg = validateEmail(email);
    setEmailError(emailMsg);
    setFormError(null);
    if (emailMsg) return;

    setIsLoading(true);
    try {
      // Le modèle d'e-mail Supabase ajoute token_hash et type à cette URL (voir docs/supabase-auth-setup.md).
      const { error } = await createClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/confirm` },
      );
      if (error) {
        setFormError(frenchAuthError(error).message);
        return;
      }
      setSuccess(true);
    } catch {
      setFormError("Envoi impossible pour le moment. Réessaie dans un instant.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        {success ? (
          <>
            <CardHeader>
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                Vérifie ta boîte mail
              </h1>
              <CardDescription>E-mail de réinitialisation envoyé</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground" role="status">
                Si un compte existe pour cette adresse, tu vas recevoir un e-mail
                avec un lien pour choisir un nouveau mot de passe.
              </p>
              <Link
                href="/auth/login"
                className="text-sm underline underline-offset-4"
              >
                Retour à la connexion
              </Link>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <h1 className="text-2xl font-semibold leading-none tracking-tight">
                Mot de passe oublié
              </h1>
              <CardDescription>
                Saisis ton e-mail : nous t&apos;envoyons un lien pour choisir un
                nouveau mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} noValidate>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? "email-error" : undefined}
                    />
                    {emailError && (
                      <p id="email-error" role="alert" className="text-sm text-destructive">
                        {emailError}
                      </p>
                    )}
                  </div>
                  {formError && (
                    <p role="alert" className="text-sm text-destructive">
                      {formError}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Envoi…" : "Envoyer le lien"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  <Link
                    href="/auth/login"
                    className="underline underline-offset-4"
                  >
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
