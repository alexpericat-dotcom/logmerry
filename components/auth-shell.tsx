import { LogoMark } from "@/components/logo-mark";

/** Écran d'authentification (scène B de DESIGN.md) : dégradé « couchant » plein écran, nom et logo en haut (zone calme), carte centrée dans l'espace restant. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-gradient-sunset p-6 md:p-10">
      <header className="flex items-center gap-3">
        <LogoMark className="size-10" />
        <div>
          <p className="font-brand text-3xl font-bold leading-none tracking-tight">
            LogMerry
          </p>
          <p className="mt-1 text-sm">Ton cockpit d&apos;activité.</p>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center py-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
