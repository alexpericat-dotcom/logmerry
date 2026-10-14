import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
      {/* Scène B de DESIGN.md : panneau décoratif en dégradé (3 en clair, 4 en sombre), sans texte ni information. */}
      <div aria-hidden="true" className="hidden bg-gradient-login lg:block" />
    </div>
  );
}
