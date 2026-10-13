import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              Lien invalide ou expiré
            </h1>
            <CardDescription>Nous n&apos;avons pas pu te connecter.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Link
              href="/auth/forgot-password"
              className="underline underline-offset-4"
            >
              Demander un nouveau lien
            </Link>
            <Link href="/auth/login" className="underline underline-offset-4">
              Retour à la connexion
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
