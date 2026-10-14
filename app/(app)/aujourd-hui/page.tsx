import { PageBanner } from "@/components/page-banner";

export const metadata = { title: "Aujourd'hui · LogMerry" };

export default function AujourdhuiPage() {
  return (
    <PageBanner
      title="Aujourd'hui"
      description="Rien à faire pour aujourd'hui. Tes tâches apparaîtront ici dès que tu auras saisi tes échéances, tes factures et tes devis."
    />
  );
}
