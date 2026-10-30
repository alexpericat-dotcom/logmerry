import { ExternalLink } from "lucide-react";

import { LivePreview } from "@/components/live-preview";
import { PortfolioImage } from "@/components/portfolio-image";
import { Badge } from "@/components/ui/badge";
import { safeHttpsLink, type PublicCard } from "@/lib/domain/portfolio";
import { publicImageUrl } from "@/lib/domain/realisation-images";
import { SHOWCASE } from "@/lib/portfolio-content";

/** Cadre de navigateur autour d'une capture ou d'un aperçu en direct : barre à trois points et adresse, contenu au format 16/9. */
function BrowserFrame({ host, children }: { host?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-hard">
      <div aria-hidden="true" className="flex items-center gap-1.5 border-b bg-muted px-3 py-2">
        <span className="size-2.5 rounded-full bg-[hsl(var(--tone-pink))]" />
        <span className="size-2.5 rounded-full bg-[hsl(var(--tone-yellow))]" />
        <span className="size-2.5 rounded-full bg-[hsl(var(--tone-teal))]" />
        {host && <span className="ml-3 min-w-0 flex-1 truncate rounded-sm border bg-background px-3 py-0.5 text-xs text-muted-foreground">{host}</span>}
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
    // Sans capture : un aplat de marque avec le titre, pour que la carte ne soit jamais vide (remplacé par l'aperçu en direct quand le site est en ligne).
    <div aria-hidden="true" className="flex size-full items-center justify-center bg-gradient-sunset bg-[length:var(--banner-size)] p-6 text-center font-pixel text-2xl font-bold uppercase [overflow-wrap:anywhere] dark:font-sans dark:normal-case">
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
      <div className={`flex min-w-0 flex-col gap-4 lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
        <div className="flex flex-wrap gap-2">
          <Badge variant="signature">{card.originLabel}</Badge>
          <Badge variant="outline" className="whitespace-normal break-words">
            {card.client_label}
          </Badge>
        </div>
        <h3 className="break-words text-2xl font-bold md:text-3xl">{card.title}</h3>
        <p className="break-words text-lg leading-relaxed text-muted-foreground">{card.description}</p>
        {card.result_figure && (
          <p className="w-fit max-w-full break-words rounded-md border bg-[hsl(var(--tone-yellow))] px-3 py-2 font-semibold text-[hsl(235_47%_20%)] shadow-hard">Résultat : {card.result_figure}</p>
        )}
        {card.stack.length > 0 && (
          <ul aria-label="Outils utilisés" className="flex flex-wrap gap-1.5">
            {card.stack.map((tag) => (
              <li key={tag}>
                <Badge variant="outline" className="whitespace-normal break-all">
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-hard underline-offset-4 hover:underline"
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
  if (cards.length === 0) return <p className="rounded-lg border bg-card p-6 text-lg text-muted-foreground">{SHOWCASE.empty}</p>;
  return (
    <ul className="flex flex-col gap-20">
      {cards.map((card, i) => (
        <PortfolioCard key={card.id} card={card} index={i} supabaseUrl={supabaseUrl} />
      ))}
    </ul>
  );
}
