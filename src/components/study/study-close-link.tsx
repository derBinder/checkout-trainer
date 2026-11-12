"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import { cn } from "@/lib/utils";

/** Schließen-Kreuz oben links auf der Lernseite, zurück zur Übersicht. */
export function StudyCloseLink({ onClick }: { onClick?: (event: React.MouseEvent) => void }) {
  const localePath = useLocalePath();
  return (
    <Link
      href={localePath(ROUTES.today)}
      aria-label="Lernen beenden"
      onClick={onClick}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "-ml-3")}
    >
      <X aria-hidden className="size-5" />
    </Link>
  );
}
