import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo-mark";

export default function Page() {
  return (
    // Scène B de DESIGN.md : tout l'écran en dégradé « couchant » ; le nom reste en haut (zone calme) et le formulaire est centré dans l'espace restant.
    <div className="flex min-h-svh w-full flex-col bg-gradient-sunset p-6 md:p-10">
      <header className="flex items-center gap-3">
        <LogoMark className="size-10" />
        <div>
          <p className="text-2xl font-bold leading-none">LogMerry</p>
          <p className="mt-1 text-sm">Ton cockpit d&apos;activité.</p>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center py-6">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
