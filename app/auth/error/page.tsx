import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default function Page() {
  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Lien invalide ou expiré
          </h1>
          <CardDescription>
            Nous n&apos;avons pas pu te connecter.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Link
            href="/auth/forgot-password"
            className="underline underline-offset-4 max-md:flex max-md:min-h-11 max-md:items-center"
          >
            Demander un nouveau lien
          </Link>
          <Link href="/auth/login" className="underline underline-offset-4 max-md:flex max-md:min-h-11 max-md:items-center">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
