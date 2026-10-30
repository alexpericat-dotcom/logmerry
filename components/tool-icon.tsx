import { toolIconPath } from "@/lib/portfolio-tools";

/** Logo d'un outil, dessiné en masque CSS dans la couleur du texte (suit le thème). Décoratif : le nom de l'outil est toujours écrit à côté. Rien si l'outil n'a pas de logo. */
export function ToolIcon({ tool, size = 18 }: { tool: string; size?: number }) {
  const path = toolIconPath(tool);
  if (!path) return null;
  const mask = `url(${path}) center / contain no-repeat`;
  return <span aria-hidden="true" data-tool-icon={tool} className="inline-block shrink-0 bg-current" style={{ width: size, height: size, mask, WebkitMask: mask }} />;
}
