import { Suspense } from "react";

import { AlertThresholds, ProfileField } from "@/components/profile-field";
import { PageBanner } from "@/components/page-banner";
import { getOrCreateProfile } from "@/lib/db/profile";
import { PROFILE_FIELDS } from "@/lib/domain/profile";

export const metadata = { title: "Profil · LogMerry" };

async function ProfileForms() {
  const profile = await getOrCreateProfile();
  const text = (k: string) => (profile[k] as string | null) ?? null;
  return (
    <div className="flex flex-col gap-3">
      {PROFILE_FIELDS.map((def) => (
        <ProfileField key={def.key} def={def} value={text(def.key)} other={text(`${def.key}_other`)} confirmedAt={text(`${def.key}_confirmed_at`)} />
      ))}
      <AlertThresholds active={profile.alert_thresholds} />
    </div>
  );
}

export default function ProfilPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Profil" description="Ta situation professionnelle. Rien n'est prérempli : un champ vide reste « À confirmer »." />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Ces informations peuvent être transmises à l&apos;assistant quand il explique une estimation. N&apos;y mets pas de données personnelles sensibles.
      </p>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ProfileForms />
      </Suspense>
    </div>
  );
}
