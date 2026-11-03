import { ExternalLink } from "lucide-react";

import { LivePreview } from "@/components/live-preview";
import { PortfolioImage } from "@/components/portfolio-image";
import { safeHttpsLink, type PublicCard } from "@/lib/domain/portfolio";
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
        {host && <span className="ml-3 min-w-0 flex-1 truncate rounded-sm border bg-background px-3 py-0.5 font-mono text-xs text-muted-foreground">{host}</span>}
      </div>
      <div className="relative aspect-video w-full bg-muted">{children}</div>
    </div>
  );
}

export function PortfolioCard({ card, index, supabaseUrl }: { card: PublicCard; index: number; supabaseUrl: string }) {
  // Sans adresse de stockage configurée, aucune capture n'est tentée (la carte garde son aplat) : une page ne doit jamais tomber en erreur pour une image.
  const [cover, ...more] = supabaseUrl ? card.images : [];
  const link = safeHttpsLink(card.link_url);
  const poster = cover ? (
    <PortfolioImage src={publicImageUrl(supabaseUrl, cover.path)} alt={cover.alt} sizes="(min-width: 1024px) 58vw, 100vw" priority={index === 0} />
  ) : (
    // Sans capture : un aplat turquoise avec le titre, pour que la carte ne soit jamais vide (remplacé par l'aperçu en direct quand le site est en ligne).
    <div aria-hidden="true" className="flex size-full items-center justify-center bg-primary p-6 text-center font-serif text-3xl text-primary-foreground [overflow-wrap:anywhere]">
      {card.title}
    </div>
  );
  const flip = index % 2 === 1;
  return (
    <li className="reveal grid min-w-0 grid-cols-1 items-center gap-8 lg:grid-cols-12">
      <div className={`min-w-0 lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
        <BrowserFrame host={link ? new URL(link).host : undefined}>{link ? <LivePreview url={link} title={card.title} poster={poster} auto={!cover && index === 0} label={SHOWCASE.liveLabel} /> : poster}</BrowserFrame>
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
        <p className="w-fit rounded-sm border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{card.originLabel}</p>
        <h3 className="break-words text-3xl leading-tight md:text-4xl">{card.title}</h3>
        {/* Un relevé : situation, ce qui a été réalisé, résultat (seulement si fourni). Les étiquettes sont celles de `SHOWCASE.fields`. */}
        <dl className="flex flex-col divide-y border-y">
          <div className="py-3">
            <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{SHOWCASE.fields.situation}</dt>
            <dd className="mt-1 break-words">{card.client_label}</dd>
          </div>
          <div className="py-3">
            <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{SHOWCASE.fields.done}</dt>
            <dd className="mt-1 break-words text-lg leading-relaxed">{card.description}</dd>
          </div>
          {card.result_figure && (
            <div className="py-3">
              <dt className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{SHOWCASE.fields.result}</dt>
              <dd className="mt-1 break-words border-l-4 border-tone-orange pl-3 font-serif text-2xl">{card.result_figure}</dd>
            </div>
          )}
        </dl>
        {card.stack.length > 0 && (
          <ul aria-label={SHOWCASE.fields.stack} className="flex flex-wrap gap-1.5">
            {card.stack.map((tag) => (
              <li key={tag} className="whitespace-normal break-all rounded-sm border px-2 py-0.5 text-sm">
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
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground underline-offset-4 hover:underline"
          >
            {SHOWCASE.linkLabel}
            <ExternalLink size={16} aria-hidden="true" />
            <span className="sr-only"> (nouvel onglet) : {card.title}</span>
          </a>
        )}
      </div>
    </li>
  );
}

/** Les cartes, ou un message sobre s'il n'y en a pas. */
export function PortfolioShowcase({ cards, supabaseUrl }: { cards: PublicCard[]; supabaseUrl: string }) {
  if (cards.length === 0) return <p className="rounded-md border bg-card p-6 text-lg text-muted-foreground">{SHOWCASE.empty}</p>;
  return (
    <ul className="flex flex-col gap-20">
      {cards.map((card, i) => (
        <PortfolioCard key={card.id} card={card} index={i} supabaseUrl={supabaseUrl} />
      ))}
    </ul>
  );
}
