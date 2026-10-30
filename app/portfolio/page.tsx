import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";

import { PortfolioShowcase } from "@/components/portfolio-showcase";
import {
  PortfolioContact,
  PortfolioFooter,
  PortfolioHeader,
  PortfolioHero,
  PortfolioLever,
  PortfolioMarquee,
  PortfolioProcess,
  PortfolioServices,
  PortfolioShowcaseFrame,
  PortfolioSkills,
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
  if ("unavailable" in result) return <p className="rounded-lg border bg-card p-6 text-lg text-muted-foreground">{SHOWCASE.unavailable}</p>;
  return <PortfolioShowcase cards={result.cards} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />;
}

export default function PortfolioPage() {
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Aller au contenu
      </a>
      <PortfolioHeader />
      <main id="contenu" tabIndex={-1} className="outline-none">
        <PortfolioHero />
        <PortfolioMarquee />
        <PortfolioLever />
        <PortfolioProcess />
        <PortfolioServices />
        <PortfolioSkills />
        <PortfolioShowcaseFrame eyebrow={SHOWCASE.eyebrow} title={SHOWCASE.title} intro={SHOWCASE.intro}>
          <Suspense fallback={<p className="text-muted-foreground">Chargement des réalisations…</p>}>
            <Showcase />
          </Suspense>
        </PortfolioShowcaseFrame>
        <PortfolioContact />
      </main>
      <PortfolioFooter />
    </>
  );
}
