import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  label: string;
  /** Adresse du tri sur cette colonne ; absente = colonne non triable. */
  sortHref?: string;
  align?: "right";
  render: (row: T) => ReactNode;
};

/**
 * Tableau de données réutilisable (DESIGN.md, `data-table`) : `<table>` natif, légende masquée, `aria-sort` sur la colonne triée,
 * tri par lien (l'état du tri vit dans l'adresse), défilement horizontal dans un conteneur focalisable nommé.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  sorted,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sorted?: { key: string; dir: "asc" | "desc" };
}) {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="w-full overflow-x-auto rounded-md border bg-card">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sorted?.key === c.key ? (sorted.dir === "asc" ? "ascending" : "descending") : undefined}
                className={cn("px-3 py-2 font-medium", c.align === "right" && "text-right")}
              >
                {c.sortHref ? (
                  <Link href={c.sortHref} className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {c.label}
                    {sorted?.key === c.key && <span aria-hidden="true">{sorted.dir === "asc" ? " ↑" : " ↓"}</span>}
                  </Link>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b last:border-b-0 hover:bg-accent/40">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2", c.align === "right" && "text-right font-mono tabular-nums")}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
