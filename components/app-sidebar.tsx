"use client";

import {
  Briefcase,
  CalendarClock,
  CheckSquare,
  FileText,
  Gauge,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, SIDEBAR_COOKIE, isCurrent, type NavIcon } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  cockpit: Gauge,
  notes: FileText,
  clients: Users,
  missions: Briefcase,
  factures: Receipt,
  echeances: CalendarClock,
  parametres: Settings,
  realisations: ImageIcon,
  "a-faire": CheckSquare,
};

export function AppSidebar({
  email,
  defaultCollapsed,
}: {
  email: string | null;
  defaultCollapsed: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };

  // Texte toujours présent pour les lecteurs d'écran ; visible seulement barre dépliée et écran large.
  const labelClass = collapsed ? "sr-only" : "sr-only md:not-sr-only";

  return (
    <aside
      aria-label="Barre latérale"
      className={cn(
        "sticky top-0 flex h-svh shrink-0 flex-col border-r bg-background",
        collapsed ? "w-14" : "w-14 md:w-60",
      )}
    >
      <div className="flex h-14 items-center justify-between px-2">
        <span className={cn("px-2 font-semibold", labelClass)}>LogMerry</span>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          aria-label="Replier ou déplier"
          aria-expanded={!collapsed}
          title={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
          onClick={toggle}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </Button>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const base =
              "flex h-9 items-center gap-3 rounded-md border-l-[3px] px-2 text-sm";
            if (!item.available) {
              return (
                <li key={item.href}>
                  <span
                    aria-disabled="true"
                    title={`${item.label} — bientôt`}
                    className={cn(base, "cursor-not-allowed border-transparent opacity-50")}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span className={labelClass}>
                      {item.label} <span className="text-xs">(bientôt)</span>
                    </span>
                  </span>
                </li>
              );
            }
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    base,
                    "hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                    current ? "border-primary bg-accent font-bold" : "border-transparent",
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className={labelClass}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-2 border-t p-2">
        {email && (
          <p className={cn("truncate px-2 text-xs text-muted-foreground", labelClass)}>
            {email}
          </p>
        )}
        <LogoutButton compact={collapsed} />
        <ThemeSwitcher />
      </div>
    </aside>
  );
}
