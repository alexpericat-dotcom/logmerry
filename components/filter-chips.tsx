import Link from "next/link";

import { cn } from "@/lib/utils";

export type FilterChip = { label: string; href: string; active: boolean };

/** Groupe de filtres en liens (l'état vit dans l'adresse) ; le filtre actif porte `aria-current`. */
export function FilterChips({ label, items }: { label: string; items: FilterChip[] }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-8 max-md:min-h-11 items-center rounded-sm border px-2.5 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                item.active ? "neon font-bold dark:bg-accent" : "border-input bg-card",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
