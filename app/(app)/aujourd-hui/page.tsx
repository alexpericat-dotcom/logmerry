import { PageBanner } from "@/components/page-banner";

export const metadata = { title: "Aujourd'hui · LogMerry" };

export default function AujourdhuiPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageBanner title="Aujourd'hui" />
      <p className="max-w-2xl text-muted-foreground">
        Rien à faire pour aujourd&apos;hui. Tes tâches apparaîtront ici dès que
        tu auras saisi tes échéances, tes factures et tes devis.
      </p>
    </div>
  );
}
