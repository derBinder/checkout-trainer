"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useDictionary, useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import { cn } from "@/lib/utils";

/** Schließen-Kreuz oben links auf der Lernseite, zurück zur Übersicht. */
export function StudyCloseLink({ onClick }: { onClick?: (event: React.MouseEvent) => void }) {
  const localePath = useLocalePath();
  const t = useDictionary().study;
  return (
    <Link
      href={localePath(ROUTES.today)}
      aria-label={t.closeLabel}
      onClick={onClick}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "-ml-3")}
    >
      <X aria-hidden className="size-5" />
    </Link>
  );
}

/** Schließen-Kreuz als Knopf, wenn das Schließen auf derselben Seite bleibt (Üben). */
export function StudyCloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "-ml-3")}
    >
      <X aria-hidden className="size-5" />
    </button>
  );
}
