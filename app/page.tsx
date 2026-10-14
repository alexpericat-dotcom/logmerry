import Link from "next/link";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-5 text-center">
      <div className="flex flex-col gap-4 max-w-xl">
        <h1 className="font-brand text-4xl font-bold tracking-tight">LogMerry</h1>
        <p className="text-lg text-muted-foreground">
          Ton cockpit pour piloter ton activité de conseil : tâches du jour,
          clients, missions, factures, et un assistant qui répond à partir de
          tes notes.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/auth/login">Se connecter</Link>
      </Button>
      <ThemeSwitcher />
    </main>
  );
}
