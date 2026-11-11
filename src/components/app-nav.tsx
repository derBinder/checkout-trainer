"use client";

import {
  ChartColumn,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/heute", label: "Heute", icon: Target },
  { href: "/statistik", label: "Statistik", icon: ChartColumn },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

const ADMIN_ITEM: NavItem = {
  href: "/verwaltung",
  label: "Verwaltung",
  icon: Users,
};

/** Am Smartphone unten fixiert (Symbol und Wort), ab md oben als Textleiste. */
export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
  // Die Lernseite hat nur eine Aufgabe und keine Navigation.
  if (pathname === "/lernen") return null;

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b md:pb-0"
    >
      <div className="mx-auto flex max-w-2xl items-stretch md:h-16 md:items-center md:gap-2 md:px-5">
        <span className="type-display hidden flex-1 text-lg md:block">Checkout-Trainer</span>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground outline-offset-[-4px] transition-colors hover:text-foreground focus-visible:outline-2 md:min-h-0 md:flex-none md:rounded-pill md:px-4 md:py-2 md:text-sm md:outline-offset-2",
                active && "text-foreground md:bg-primary md:text-primary-foreground md:hover:text-primary-foreground",
              )}
            >
              {/* Aktiv: Symbol in einer Pille der Hauptaktion (hell schwarz mit Gelb, dunkel Gelb mit Schwarz). */}
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-pill transition-colors md:hidden",
                  active && "bg-primary text-primary-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
