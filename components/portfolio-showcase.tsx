import { ChevronDown, ExternalLink } from "lucide-react";

import { LivePreview } from "@/components/live-preview";
import { PortfolioImage } from "@/components/portfolio-image";
import { Dossier } from "@/components/portfolio-dossier";
import { canPreviewInFrame, safeHttpsLink, type PublicCard } from "@/lib/domain/portfolio";
import type { RealisationStatus } from "@/lib/domain/realisations";
import { publicImageUrl } from "@/lib/domain/realisation-images";
import { SHOWCASE } from "@/lib/portfolio-content";

/** Cadre de navigateur autour d'une capture ou d'un aperçu en direct : barre à trois points et adresse, contenu au format 16/9. */
function BrowserFrame({ host, children }: { host?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div aria-hidden="true" className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        {host && <span className="ml-3 min-w-0 flex-1 truncate rounded-sm border bg-background px-3 py-0.5 font-mono text-phi-n1 text-muted-foreground">{host}</span>}
      </div>
      <div className="relative aspect-video w-full bg-muted">{children}</div>
    </div>
  );
}

/** Pastille de statut : le texte porte toujours l'information ; le style (plein, contour orange, tirets) la double sans y suffire. */
const STATUS_STYLE: Record<RealisationStatus, string> = {
  client_reel: "border-transparent bg-primary text-primary-foreground",
  exercice_formation: "border-tone-orange bg-card text-foreground",
  projet_perso: "border-dashed border-foreground/60 bg-card text-foreground",
};
const DT = "font-mono text-phi-n1 uppercase tracking-[0.18em] text-muted-foreground";

export function PortfolioCard({ card, index, supabaseUrl }: { card: PublicCard; index: number; supabaseUrl: string }) {
  // Sans adresse de stockage configurée, aucune capture n'est tentée (la carte garde son aplat) : une page ne doit jamais tomber en erreur pour une image.
  const [cover, ...more] = supabaseUrl ? card.images : [];
  const link = safeHttpsLink(card.link_url);
  const poster = cover ? (
    <PortfolioImage src={publicImageUrl(supabaseUrl, cover.path)} alt={cover.alt} sizes="(min-width: 1024px) 58vw, 100vw" priority={index === 0} />
  ) : (
    // Sans capture : un aplat turquoise avec le titre, pour que la carte ne soit jamais vide (remplacé par l'aperçu en direct quand le site est en ligne).
    <div aria-hidden="true" className="flex size-full items-center justify-center bg-primary p-6 text-center font-serif text-phi-3 text-primary-foreground [overflow-wrap:anywhere]">
      {card.title}
    </div>
  );
  const flip = index % 2 === 1;
  return (
    <li className="reveal-scale min-w-0">
      {/* Accordéon natif : replié par défaut, un seul projet ouvert à la fois (`name` commun), clavier et lecteur d'écran gérés par le navigateur. */}
      <details name="realisations" className="group">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-phi-1 gap-y-2 border-y py-4 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <span data-status={card.status} className={`order-1 w-fit rounded-full border px-3 py-0.5 font-mono text-phi-n1 uppercase tracking-[0.18em] ${STATUS_STYLE[card.status]} md:order-none`}>
            {card.statusLabel}
          </span>
          <h3 className="order-3 min-w-0 basis-full break-words text-phi-2 md:order-none md:flex-1 md:basis-60 md:text-phi-3">{card.title}</h3>
          <span className="order-4 min-w-0 basis-full break-words text-muted-foreground md:order-none md:max-w-[28ch] md:basis-auto">{card.client_label}</span>
          <ChevronDown size={20} aria-hidden="true" className="order-2 ml-auto shrink-0 transition-transform group-open:rotate-180 md:order-none" />
        </summary>
        <div className="grid grid-cols-1 items-start gap-phi-1 pt-phi-1 lg:grid-cols-12">
          <div className={`min-w-0 lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
            <BrowserFrame host={link ? new URL(link).host : undefined}>{link && canPreviewInFrame(link) ? <LivePreview url={link} title={card.title} poster={poster} auto={!cover && index === 0} label={SHOWCASE.liveLabel} /> : poster}</BrowserFrame>
            {more.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {more.map((image) => (
                  <li key={image.id} className="relative aspect-video overflow-hidden rounded-md border bg-muted">
                    <PortfolioImage src={publicImageUrl(supabaseUrl, image.path)} alt={image.alt} sizes="(min-width: 1024px) 12vw, 30vw" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`flex min-w-0 flex-col gap-5 lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
            {/* Un relevé : situation, ce qui a été réalisé, résultat (seulement si fourni). Les étiquettes sont celles de `SHOWCASE.fields`. */}
            <dl className="flex flex-col divide-y border-y">
              <div className="py-3">
                <dt className={DT}>{SHOWCASE.fields.situation}</dt>
                <dd className="mt-1 break-words">{card.client_label}</dd>
              </div>
              {card.problem && (
                <div className="py-3">
                  <dt className={DT}>{SHOWCASE.fields.problem}</dt>
                  <dd className="mt-1 break-words">{card.problem}</dd>
                </div>
              )}
              <div className="py-3">
                <dt className={DT}>{SHOWCASE.fields.done}</dt>
                <dd className="mt-1 break-words text-phi-1">{card.description}</dd>
              </div>
              {card.design_choice && (
                <div className="py-3">
                  <dt className={DT}>{SHOWCASE.fields.designChoice}</dt>
                  <dd className="mt-1 break-words">{card.design_choice}</dd>
                </div>
              )}
              {card.tests && (
                <div className="py-3">
                  <dt className={DT}>{SHOWCASE.fields.tests}</dt>
                  <dd className="mt-1 break-words">{card.tests}</dd>
                </div>
              )}
              {card.validation && (
                <div className="py-3">
                  <dt className={DT}>{SHOWCASE.fields.validation}</dt>
                  <dd className="mt-1 break-words">{card.validation}</dd>
                </div>
              )}
              {card.result_figure && (
                <div className="py-3">
                  <dt className={DT}>{SHOWCASE.fields.result}</dt>
                  <dd className="mt-1 break-words border-l-4 border-tone-orange pl-3 font-serif text-phi-2">{card.result_figure}</dd>
                  {card.status !== "client_reel" && <dd className="mt-2 text-phi-n1 text-muted-foreground">{SHOWCASE.notMeasured(card.statusLabel)}</dd>}
                </div>
              )}
            </dl>
            {card.stack.length > 0 && (
              <p className={DT}>{card.stack_is_recommended ? SHOWCASE.fields.stackRecommended : SHOWCASE.fields.stack}</p>
            )}
            {card.stack.length > 0 && (
              <ul aria-label={card.stack_is_recommended ? SHOWCASE.fields.stackRecommended : SHOWCASE.fields.stack} className="-mt-3 flex flex-wrap gap-1.5">
                {card.stack.map((tag) => (
                  <li key={tag} className="whitespace-normal break-all rounded-sm border px-2 py-0.5 text-phi-n1">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="liquid liquid-orange min-h-11 w-fit px-6 py-2 text-phi-0"
              >
                {SHOWCASE.linkLabel}
                <ExternalLink size={16} aria-hidden="true" />
                <span className="sr-only"> (nouvel onglet) : {card.title}</span>
              </a>
            )}
          </div>
          <Dossier card={card} supabaseUrl={supabaseUrl} />
        </div>
      </details>
    </li>
  );
}

/** Les cartes, ou un message sobre s'il n'y en a pas. */
export function PortfolioShowcase({ cards, supabaseUrl }: { cards: PublicCard[]; supabaseUrl: string }) {
  if (cards.length === 0) return <p className="rounded-md border bg-card p-6 text-phi-1 text-muted-foreground">{SHOWCASE.empty}</p>;
  return (
    <ul className="flex flex-col gap-phi-1">
      {cards.map((card, i) => (
        <PortfolioCard key={card.id} card={card} index={i} supabaseUrl={supabaseUrl} />
      ))}
    </ul>
  );
}
