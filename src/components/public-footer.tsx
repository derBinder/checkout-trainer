"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/language/language-switch";
import { useDictionary, useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";

/** Fuß der öffentlichen Seiten: Rechtsseiten links, Sprachwahl rechts. */
export function PublicFooter() {
  const t = useDictionary().legal;
  const path = useLocalePath();
  return (
    <footer className="flex items-center justify-between gap-6 pt-16 text-sm font-medium text-muted-foreground">
      <div className="flex gap-6">
        <Link href={path(ROUTES.imprint)} className="py-2 hover:text-foreground">
          {t.imprint}
        </Link>
        <Link href={path(ROUTES.privacy)} className="py-2 hover:text-foreground">
          {t.privacy}
        </Link>
      </div>
      <LanguageSwitch variant="compact" />
    </footer>
  );
}
