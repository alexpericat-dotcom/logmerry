import { LogoMark } from "@/components/logo-mark";

/**
 * Écran d'authentification, même construction dans les deux thèmes : dégradé plein écran (grille du bandeau en clair, « couchant » en sombre),
 * nom et logo en haut à gauche, carte du formulaire centrée dans l'espace restant. En clair, le logo et le nom sont en pixels.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-gradient-sunset bg-[length:var(--banner-size)] p-6 md:p-10">
      <header className="flex items-center gap-3">
        <LogoMark className="size-[72px] dark:size-10" />
        <div>
          <p className="font-pixel text-5xl font-bold uppercase leading-none tracking-wide text-display [text-shadow:3px_3px_0_hsl(var(--tone-teal))] md:text-6xl dark:font-brand dark:text-3xl dark:leading-none dark:normal-case dark:tracking-tight dark:text-foreground dark:[text-shadow:none] dark:md:text-3xl">
            LogMerry
          </p>
          <p className="mt-1 font-pixel text-sm dark:font-sans">Ton cockpit d&apos;activité.</p>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center py-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
