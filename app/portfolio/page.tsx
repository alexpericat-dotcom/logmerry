import type { Metadata } from "next";
import { Suspense } from "react";

import { PortfolioShowcase } from "@/components/portfolio-showcase";
import {
  PortfolioBenefits,
  PortfolioContact,
  PortfolioFooter,
  PortfolioHeader,
  PortfolioHero,
  PortfolioProcess,
  PortfolioServices,
  PortfolioShowcaseFrame,
} from "@/components/portfolio-sections";
import { listPublicCards } from "@/lib/db/public-portfolio";
import { BRAND, PAGE_DESCRIPTION, PAGE_TITLE, SHOWCASE } from "@/lib/portfolio-content";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, siteName: BRAND, type: "website", locale: "fr_FR" },
};

/** Les réalisations viennent de la base : si elle ne répond pas, le reste de la page reste lisible et un message sobre s'affiche. */
async function Showcase() {
  let cards;
  try {
    cards = await listPublicCards();
  } catch {
    return <p className="rounded-lg border bg-card p-6 text-lg text-muted-foreground">{SHOWCASE.unavailable}</p>;
  }
  return <PortfolioShowcase cards={cards} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />;
}

export default function PortfolioPage() {
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Aller au contenu
      </a>
      <PortfolioHeader />
      <main id="contenu">
        <PortfolioHero />
        <PortfolioServices />
        <PortfolioProcess />
        <PortfolioShowcaseFrame title={SHOWCASE.title} intro={SHOWCASE.intro}>
          <Suspense fallback={<p className="text-muted-foreground">Chargement des réalisations…</p>}>
            <Showcase />
          </Suspense>
        </PortfolioShowcaseFrame>
        <PortfolioBenefits />
        <PortfolioContact />
      </main>
      <PortfolioFooter />
    </>
  );
}
