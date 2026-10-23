import { Suspense } from "react";

import { FilterChips } from "@/components/filter-chips";
import { InvoicesPanel } from "@/components/invoices-panel";
import { PageBanner } from "@/components/page-banner";
import { listInvoiceChoices, listInvoices } from "@/lib/db/invoices";
import { INVOICE_FILTERS, INVOICE_FILTER_LABELS, parseInvoiceFilter, viewInvoices } from "@/lib/domain/invoices";
import { todayParis } from "@/lib/format";

export const metadata = { title: "Factures · LogMerry" };

type SearchParams = Promise<{ filtre?: string | string[] }>;

async function InvoicesList({ searchParams }: { searchParams: SearchParams }) {
  const filter = parseInvoiceFilter((await searchParams).filtre);
  const today = todayParis();
  const [all, choices] = await Promise.all([listInvoices(), listInvoiceChoices()]);
  const rows = viewInvoices(all, filter, today);
  const chips = INVOICE_FILTERS.map((f) => ({ label: INVOICE_FILTER_LABELS[f], href: f === "toutes" ? "/factures" : `/factures?filtre=${f}`, active: f === filter }));
  const empty = all.length === 0 ? "Aucune facture pour l'instant." : "Aucune facture ne correspond à ce filtre.";
  return (
    <div className="flex flex-col gap-4">
      <FilterChips label="Filtrer les factures" items={chips} />
      <p role="status" className="text-sm text-muted-foreground">
        {rows.length} facture{rows.length > 1 ? "s" : ""} affichée{rows.length > 1 ? "s" : ""} sur {all.length}
      </p>
      <InvoicesPanel invoices={rows} missions={choices.missions} quotes={choices.quotes} today={today} emptyText={empty} />
    </div>
  );
}

export default function FacturesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Factures" description="Les factures que tu as émises, avec leur échéance, pour savoir lesquelles relancer. Le statut « payée » viendra des encaissements." />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <InvoicesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
