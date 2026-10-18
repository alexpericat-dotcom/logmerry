import { Suspense } from "react";

import { PageBanner } from "@/components/page-banner";
import { RuleActions } from "@/components/rule-actions";
import { RuleForm } from "@/components/rule-form";
import { RuleStatusBadge } from "@/components/rule-status";
import { listRules } from "@/lib/db/rules";
import { describeParams, paramsToForm, RULE_KEYS } from "@/lib/domain/finance/rule-keys";
import { ACTIVITY_CATEGORY_LABELS, canDeleteRule, canRevalidate, canUnverify, canVerify, displayState, isOfficialLink, type RuleRow } from "@/lib/domain/finance/rules";
import { formatDate, todayParis } from "@/lib/format";

export const metadata = { title: "Règles · LogMerry" };

function Version({ rule, asOf }: { rule: RuleRow; asOf: string }) {
  const state = displayState(rule, asOf);
  const closed = rule.effective_to !== null;
  return (
    <li className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <RuleStatusBadge state={state} />
        <span className="text-sm font-medium">{ACTIVITY_CATEGORY_LABELS[rule.activity_category]}</span>
        <span className="text-sm text-muted-foreground">
          {closed ? `du ${formatDate(rule.effective_from)} au ${formatDate(rule.effective_to as string)} (exclu), version close` : `depuis le ${formatDate(rule.effective_from)}, en vigueur`}
        </span>
      </div>
      <ul className="text-sm">
        {describeParams(rule.rule_key, rule.params).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
      <p className="text-sm text-muted-foreground">
        Source :{" "}
        {isOfficialLink(rule.source) ? (
          <a href={rule.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all">
            {rule.source}
          </a>
        ) : (
          <span className="break-all">{rule.source}</span>
        )}
        . {state === "verifiee" || state === "perimee" ? "Vérifiée" : "Source consultée"} le {formatDate(rule.verified_on)}, à revérifier avant le {formatDate(rule.revalidate_after)}
        {state === "perimee" && " : date dépassée, cette règle n'est plus utilisée dans les calculs"}.
      </p>
      <RuleActions
        id={rule.id}
        canVerify={canVerify(rule)}
        canUnverify={canUnverify(rule)}
        canRevalidate={canRevalidate(rule)}
        canDelete={canDeleteRule(rule)}
        missingLink={rule.status === "a_verifier" && !isOfficialLink(rule.source)}
      />
    </li>
  );
}

async function RulesList() {
  const rules = await listRules();
  const asOf = todayParis();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {RULE_KEYS.map((def) => {
        const versions = rules.filter((r) => r.rule_key === def.key); // la plus récente d'abord
        const latest = versions[0];
        return (
          <section key={def.key} aria-labelledby={`rk-${def.key}`} className="flex flex-col gap-3">
            <h2 id={`rk-${def.key}`} className="text-xl font-semibold">
              {def.label}
            </h2>
            {versions.length === 0 ? (
              <p className="text-muted-foreground">Aucune règle saisie : « paramètre manquant » partout où elle est utilisée.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {versions.map((r) => (
                  <Version key={r.id} rule={r} asOf={asOf} />
                ))}
              </ul>
            )}
            <RuleForm ruleKey={def.key} initialParams={latest ? paramsToForm(def.key, latest.params) : {}} hasVersions={versions.length > 0} />
          </section>
        );
      })}
    </div>
  );
}

export default function ReglesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageBanner title="Règles" description="Tes règles réglementaires, avec leur source officielle et leur date de vérification. Rien n'est prérempli : une règle absente, à vérifier ou périmée n'est jamais utilisée dans un calcul." />
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <RulesList />
      </Suspense>
    </div>
  );
}
