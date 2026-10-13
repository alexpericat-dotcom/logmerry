import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AssistantPanel } from "@/components/assistant-panel";
import { AssistantProvider } from "@/components/assistant-provider";
import { SIDEBAR_COOKIE } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

// Revérification côté serveur en plus du proxy : rien n'est rendu sans jeton valide.
async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  const email = typeof data.claims.email === "string" ? data.claims.email : null;

  return (
    <AssistantProvider>
      <div className="flex min-h-svh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:outline focus:outline-2 focus:outline-ring"
        >
          Aller au contenu
        </a>
        <AppSidebar email={email} defaultCollapsed={collapsed} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-6 md:p-8">
          {children}
        </main>
        <AssistantPanel />
      </div>
    </AssistantProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
