import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";

import { sendContactMessage } from "@/app/portfolio/contact-action";
import { PortfolioShowcaseFilter } from "@/components/portfolio-showcase-filter";
import { ScrollEffects } from "@/components/scroll-effects";
import {
  PortfolioContact,
  PortfolioFooter,
  PortfolioHeader,
  PortfolioHero,
  PortfolioLever,
  PortfolioProcess,
  PortfolioServices,
  PortfolioShowcaseFrame,
  PortfolioStack,
} from "@/components/portfolio-sections";
import { listPublicCards } from "@/lib/db/public-portfolio";
import { loadCards } from "@/lib/domain/portfolio";
import { BRAND, PAGE_DESCRIPTION, PAGE_TITLE, SHOWCASE } from "@/lib/portfolio-content";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/portfolio" },
  robots: { index: true, follow: true },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, siteName: BRAND, type: "website", locale: "fr_FR" },
};

/** Les réalisations viennent de la base : si elle ne répond pas, le reste de la page reste lisible et un message sobre s'affiche. */
async function Showcase() {
  // `unstable_rethrow` : les signaux internes de Next (rendu dynamique, interruption du prérendu) ne sont jamais pris pour une panne de la base.
  const result = await loadCards(listPublicCards, unstable_rethrow);
  if ("unavailable" in result) return <p className="rounded-md border bg-card p-6 text-phi-1 text-muted-foreground">{SHOWCASE.unavailable}</p>;
  return <PortfolioShowcaseFilter cards={result.cards} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />;
}

export default function PortfolioPage() {
  return (
    <div className="folio min-h-screen bg-background text-foreground">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Aller au contenu
      </a>
      <ScrollEffects />
      <PortfolioHeader />
      <main id="contenu" tabIndex={-1} className="outline-none">
        <PortfolioHero />
        <PortfolioLever />
        <PortfolioProcess />
        <PortfolioServices />
        <PortfolioStack />
        <PortfolioShowcaseFrame eyebrow={SHOWCASE.eyebrow} title={SHOWCASE.title} intro={SHOWCASE.intro}>
          <Suspense fallback={<p className="text-muted-foreground">Chargement des réalisations…</p>}>
            <Showcase />
          </Suspense>
        </PortfolioShowcaseFrame>
        <PortfolioContact action={sendContactMessage} />
      </main>
      <PortfolioFooter />
    </div>
  );
}
