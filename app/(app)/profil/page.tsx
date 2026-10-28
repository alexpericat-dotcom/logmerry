import { Suspense } from "react";

import { AlertThresholds, ProfileField } from "@/components/profile-field";
import { PageBanner } from "@/components/page-banner";
import { getOrCreateProfile } from "@/lib/db/profile";
import { PROFILE_FIELDS, fieldState } from "@/lib/domain/profile";

export const metadata = { title: "Profil · LogMerry" };

async function ProfileCard() {
  const profile = await getOrCreateProfile();
  const text = (k: string) => (profile[k] as string | null) ?? null;
  const row = (def: (typeof PROFILE_FIELDS)[number]) => (
    <ProfileField key={def.key} def={def} value={text(def.key)} other={text(`${def.key}_other`)} confirmedAt={text(`${def.key}_confirmed_at`)} />
  );
  const main = PROFILE_FIELDS.filter((f) => f.kind !== "text");
  const states = main.map((f) => fieldState(text(f.key), text(`${f.key}_confirmed_at`), f.key));
  const toConfirm = states.filter((x) => x === "missing").length;
  const declared = states.filter((x) => x === "declared").length;
  const summary = [toConfirm && `${toConfirm} à confirmer`, declared && `${declared} déclaré${declared > 1 ? "s" : ""}, à confirmer d'un clic`].filter(Boolean).join(" · ");
  return (
    <div className="flex max-w-4xl flex-col gap-3">
      <p role="status" className="text-sm font-medium">
        {summary || "Tout est confirmé."}
      </p>
      <div className="grid rounded-md border bg-card md:grid-cols-2">{main.map(row)}</div>
      <details className="rounded-md border bg-card">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Plus de champs</summary>
        <div className="flex flex-col">
          {PROFILE_FIELDS.filter((f) => f.kind === "text").map(row)}
          <AlertThresholds active={profile.alert_thresholds} />
        </div>
      </details>
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
        <ProfileCard />
      </Suspense>
    </div>
  );
}
