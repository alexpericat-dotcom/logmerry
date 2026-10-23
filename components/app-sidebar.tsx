"use client";

import {
  Briefcase,
  CalendarClock,
  CheckSquare,
  FileText,
  Gauge,
  Image as ImageIcon,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Scale,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAssistant } from "@/components/assistant-provider";
import { LogoMark } from "@/components/logo-mark";
import { LogoutButton } from "@/components/logout-button";
import { SearchPalette } from "@/components/search-palette";
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
  profil: UserRound,
  regles: Scale,
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
  const assistant = useAssistant();
  // Sous 768 px la barre latérale est un tiroir : fermé par défaut, ouvert par le bouton de la barre du haut.
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false); // naviguer referme le tiroir
  }
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    // Le focus suit le tiroir : sur « Fermer » à l'ouverture, sur le bouton de la barre à la fermeture.
    if (menuOpen) closeButton.current?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = menuOpen;
  }, [menuOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector("dialog[open]")) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };

  // Texte toujours présent pour les lecteurs d'écran ; masqué visuellement seulement quand la barre est repliée (écran large).
  // Sous 768 px le tiroir affiche toujours les libellés.
  const labelClass = collapsed ? "md:sr-only" : "";

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-1 border-b bg-background px-2 md:hidden">
        <Button
          ref={openButton}
          variant="ghost"
          size="icon"
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </Button>
        <LogoMark className="size-8 dark:size-6" />
        <span className="font-pixel text-lg font-bold tracking-wide dark:font-brand dark:tracking-tight">LogMerry</span>
      </div>
      {menuOpen && <div className="fixed inset-0 z-30 bg-foreground/40 md:hidden" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
    <aside
      id="app-sidebar"
      aria-label="Barre latérale"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r bg-background md:sticky md:top-0 md:z-auto md:h-svh",
        collapsed ? "w-72 md:w-14" : "w-72 md:w-60",
        !menuOpen && "max-md:invisible",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-filet px-2">
        <span className="flex items-center gap-2 px-2">
          <LogoMark className={cn("size-8 dark:size-6", collapsed && "md:hidden")} />
          <span className={cn("font-pixel text-lg font-bold tracking-wide dark:font-brand dark:tracking-tight", labelClass)}>LogMerry</span>
        </span>
        <Button
          ref={closeButton}
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} aria-hidden="true" />
        </Button>
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

      <div className="mb-2 flex flex-col gap-1 border-b border-filet px-2 py-2">
        <SearchPalette labelClass={labelClass} />
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false); // l'assistant s'ouvre en plein écran sur téléphone : le tiroir ne doit pas rester ouvert dessous
            if (assistant.isOpen) assistant.closePanel();
            else assistant.openPanel();
          }}
          aria-expanded={assistant.isOpen}
          title={assistant.isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
          className="flex h-9 w-full items-center gap-3 rounded-sm border border-transparent px-2 text-sm max-md:h-11 hover:border-border hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring dark:rounded-md dark:border-0 dark:border-l-[3px] dark:hover:border-transparent"
        >
          <MessageSquare size={16} aria-hidden="true" />
          <span className={labelClass}>{assistant.isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}</span>
        </button>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item, index) => {
            const Icon = ICONS[item.icon];
            const groupHeading =
              item.group && item.group !== NAV_ITEMS[index - 1]?.group ? (
                <p className={cn("px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground", labelClass)}>{item.group}</p>
              ) : null;
            const base =
              "flex h-9 items-center gap-3 rounded-sm border px-2 text-sm max-md:h-11 dark:rounded-md dark:border-0 dark:border-l-[3px]";
            if (!item.available) {
              return (
                <li key={item.href}>
                {groupHeading}
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
                {groupHeading}
                <Link
                  href={item.href}
                  title={item.label}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    base,
                    "group border-transparent hover:border-border hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring dark:hover:border-transparent dark:hover:bg-transparent",
                    current && "neon-light font-bold",
                  )}
                >
                  <Icon size={16} aria-hidden="true" className={cn("transition-[filter,color]", current ? "dark:neon-icon" : "group-hover:neon-icon group-focus-visible:neon-icon")} />
                  <span className={labelClass}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-2 border-t p-2">
        <div className="flex items-center gap-2 px-1 dark:block dark:px-0">
          <Image
            src="/images/alex-portrait.png"
            alt=""
            width={32}
            height={32}
            unoptimized
            className="size-8 shrink-0 border-2 object-cover [image-rendering:pixelated] dark:hidden"
          />
          {email && <p className={cn("min-w-0 truncate text-xs text-muted-foreground dark:px-2", labelClass)}>{email}</p>}
        </div>
        <LogoutButton compact={collapsed} />
        <ThemeSwitcher />
      </div>
    </aside>
    </>
  );
}
