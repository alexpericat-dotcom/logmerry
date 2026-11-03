import { DOSSIER_IMAGES } from "@/components/dossier-images";
import { safeHttpsLink, type PublicCard } from "@/lib/domain/portfolio";
import { DOSSIERS, type Dossier as DossierContent } from "@/lib/portfolio-dossiers";

const LABEL = "font-mono text-phi-n1 uppercase tracking-[0.18em] text-muted-foreground";

/** Bande de chiffres : typographique, sans image ; une liste pour les lecteurs d'écran. */
function FiguresBand({ dossier }: { dossier: DossierContent }) {
  return (
    <figure className="reveal-scale">
      <ul className="grid grid-cols-3 divide-x border-y py-phi-1">
        {dossier.figures.map((f) => (
          <li key={f.label} className="flex flex-col gap-1 px-2 text-center md:px-phi-1">
            <span className="font-serif text-phi-3 text-foreground md:text-phi-5">{f.value}</span>
            <span className="text-phi-n1 text-muted-foreground">{f.label}</span>
          </li>
        ))}
      </ul>
      <figcaption className={`${LABEL} mt-3`}>{dossier.figuresCaption}</figcaption>
    </figure>
  );
}

/** Une brique du schéma : boîte, titre centré (une ou deux lignes). */
function Box({ x, y, w, h, lines, accent = false }: { x: number; y: number; w: number; h: number; lines: string[]; accent?: boolean }) {
  const mid = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} className={accent ? "fill-card stroke-tone-orange" : "fill-card stroke-foreground"} strokeWidth={accent ? 2.5 : 1.5} />
      {lines.map((line, i) => (
        <text key={line} x={x + w / 2} y={mid + 5 + (i - (lines.length - 1) / 2) * 17} textAnchor="middle" className="fill-foreground font-sans text-[15px] font-medium">
          {line}
        </text>
      ))}
    </g>
  );
}

/** Étiquette de flux posée sur une flèche : le ou les numéros, avec un liseré de la couleur du fond pour rester lisible sur le trait. */
function Tag({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-foreground stroke-card font-mono text-[13px] font-semibold [paint-order:stroke]" strokeWidth={5}>
      {children}
    </text>
  );
}

/**
 * Schéma d'architecture en SVG natif (aucune image) : couleurs du site (jetons, donc thèmes clair et sombre), texte alternatif descriptif, et les quatre flux écrits en liste
 * (c'est la version « simplifiée » du téléphone, où le schéma défile horizontalement). L'orchestration n'est pas nommée : l'outil (n8n ou Make) reste à confirmer.
 */
function ArchitectureDiagram({ dossier }: { dossier: DossierContent }) {
  const a = dossier.architecture;
  return (
    <section aria-labelledby="dossier-architecture" className="flex flex-col gap-4">
      <h4 id="dossier-architecture" className="text-phi-2">
        {a.title}
      </h4>
      <p className="text-phi-n1 text-muted-foreground">
        {a.description} <span className="md:hidden">{a.scrollHint}</span>
      </p>
      <div tabIndex={0} role="group" aria-label={`${a.title}, défilement horizontal`} className="reveal overflow-x-auto rounded-md border bg-card p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <svg viewBox="0 0 800 450" role="img" aria-labelledby="arch-title arch-desc" className="mx-auto h-auto w-full min-w-[720px] max-w-4xl stroke-foreground" fill="none">
          <title id="arch-title">{a.title}</title>
          <desc id="arch-desc">{a.alt}</desc>
          <defs>
            <marker id="arch-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" className="fill-foreground stroke-none" />
            </marker>
          </defs>
          <g strokeWidth={1.5} markerEnd="url(#arch-head)">
            <path d="M130 74H170" />
            <path d="M258 98V230H380" />
            <path d="M520 198V74H620" />
            <path d="M705 50V24H70V50" />
          </g>
          <g strokeWidth={1.5} markerStart="url(#arch-head)" markerEnd="url(#arch-head)">
            <path d="M470 262V380" />
            <path d="M560 230H620" />
            <path d="M380 404H346" />
            <path d="M130 404H170" />
          </g>
          <Box x={10} y={50} w={120} h={48} lines={["Client"]} />
          <Box x={170} y={50} w={176} h={48} lines={["Portail de soumission"]} />
          <Box x={620} y={50} w={170} h={48} lines={["Brevo (e-mails)"]} />
          <Box x={380} y={198} w={180} h={64} lines={["Orchestration"]} accent />
          <Box x={620} y={206} w={170} h={48} lines={["API Mistral AI"]} />
          <Box x={10} y={380} w={120} h={48} lines={["Agent de", "support"]} />
          <Box x={170} y={380} w={176} h={48} lines={["Back-office agent"]} />
          <Box x={380} y={380} w={180} h={48} lines={["Supabase (données)"]} />
          <Tag x={150} y={66}>1</Tag>
          <Tag x={258} y={170}>1</Tag>
          <Tag x={520} y={150}>1 · 4</Tag>
          <Tag x={388} y={18}>e-mail : 1 · 4</Tag>
          <Tag x={470} y={324}>1 · 2 · 4</Tag>
          <Tag x={590} y={222}>2</Tag>
          <Tag x={363} y={396}>3</Tag>
          <Tag x={150} y={396}>3</Tag>
        </svg>
      </div>
      <ol className="grid gap-phi-0 md:grid-cols-2">
        {a.flows.map((f) => (
          <li key={f.number} className="flex gap-3 border-t pt-3">
            <span aria-hidden="true" className="font-serif text-phi-3 leading-none text-muted-foreground">
              {f.number}
            </span>
            <div>
              <h5 className="font-semibold">{f.title}</h5>
              <p className="text-muted-foreground">{f.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Une capture : si le fichier est fourni, une image optimisée (AVIF puis WebP, dimensions explicites, chargement différé) ; sinon un emplacement visible. */
function Capture({ keyName, item, dossier, link }: { keyName: string; item: DossierContent["captures"]["items"][number]; dossier: DossierContent; link: string | null }) {
  const image = DOSSIER_IMAGES[`umaris-${keyName}`] ?? DOSSIER_IMAGES[keyName];
  const base = `/images/dossiers/${DOSSIER_IMAGES[`umaris-${keyName}`] ? `umaris-${keyName}` : keyName}`;
  const set = (ext: string) => image?.widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
  return (
    <figure className="reveal-scale flex min-w-0 flex-col gap-3">
      {image ? (
        <picture>
          <source type="image/avif" srcSet={set("avif")} sizes="(min-width: 1024px) 45vw, 100vw" />
          <source type="image/webp" srcSet={set("webp")} sizes="(min-width: 1024px) 45vw, 100vw" />
          {/* Une balise <img> dans <picture> : variantes déjà optimisées. Chargement différé : ces images sont sous la ligne de flottaison. */}
          <img src={`${base}-${image.widths[Math.min(1, image.widths.length - 1)]}.webp`} width={image.width} height={image.height} alt={item.alt} loading="lazy" decoding="async" className="h-auto w-full rounded-md border" />
        </picture>
      ) : (
        <div data-placeholder={keyName} className="flex aspect-[16/10] w-full items-center justify-center rounded-md border-2 border-dashed p-4 text-center text-muted-foreground">
          <span>
            {dossier.captures.placeholder} : {item.title.toLowerCase()}
          </span>
        </div>
      )}
      <figcaption className="text-phi-n1 text-muted-foreground">
        {item.caption}, {dossier.captures.kind}.{" "}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
            {dossier.captures.linkLabel}
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        )}
      </figcaption>
    </figure>
  );
}

function Captures({ dossier, link }: { dossier: DossierContent; link: string | null }) {
  return (
    <section aria-labelledby="dossier-captures" className="flex flex-col gap-4">
      <h4 id="dossier-captures" className="text-phi-2">
        {dossier.captures.title}
      </h4>
      <div className="grid gap-phi-2">
        {dossier.captures.items.map((item) => (
          <Capture key={item.key} keyName={item.key} item={item} dossier={dossier} link={link} />
        ))}
      </div>
    </section>
  );
}

/** Le dossier d'une réalisation (s'il en a un) : bande de chiffres, schéma d'architecture, extraits. Rien ne s'affiche pour les autres réalisations. */
export function Dossier({ card }: { card: PublicCard; supabaseUrl?: string }) {
  const dossier = DOSSIERS[card.id];
  if (!dossier) return null;
  return (
    <div className="mt-phi-1 flex min-w-0 flex-col gap-phi-2 lg:col-span-12">
      <FiguresBand dossier={dossier} />
      <ArchitectureDiagram dossier={dossier} />
      <Captures dossier={dossier} link={safeHttpsLink(card.link_url)} />
    </div>
  );
}
