"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";

/**
 * Fängt Fehler der angemeldeten Seiten ab, etwa wenn die Datenbank nicht antwortet.
 * Navigation und Layout bleiben stehen; retry() lädt den Seiteninhalt neu vom Server.
 */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const localePath = useLocalePath();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="type-display text-3xl">Das hat nicht geklappt.</h1>
        <p className="text-muted-foreground">
          Die Seite konnte nicht geladen werden. Versuche es gleich noch einmal.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="xl" onClick={() => retry()}>
          Erneut versuchen
        </Button>
        <Link href={localePath(ROUTES.today)} className={buttonVariants({ variant: "secondary", size: "xl" })}>
          Zur Übersicht
        </Link>
      </div>
    </div>
  );
}
