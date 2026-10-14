import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
      {/* Scène B de DESIGN.md : panneau « couchant » ; le texte reste dans la zone calme, en haut. */}
      <div className="hidden bg-gradient-sunset p-10 lg:block">
        <p className="text-2xl font-bold">LogMerry</p>
        <p className="mt-1 text-sm">Ton cockpit d&apos;activité.</p>
      </div>
    </div>
  );
}
