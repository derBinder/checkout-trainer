"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDictionary, useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";

/**
 * Fängt Fehler der angemeldeten Seiten ab, etwa wenn die Datenbank nicht antwortet.
 * Navigation und Layout bleiben stehen; retry() lädt den Seiteninhalt neu vom Server.
 */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const localePath = useLocalePath();
  const t = useDictionary().errors;
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="type-display text-3xl">{t.title}</h1>
        <p className="text-muted-foreground">
          {t.description}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="xl" onClick={() => retry()}>
          {t.retry}
        </Button>
        <Link href={localePath(ROUTES.today)} className={buttonVariants({ variant: "secondary", size: "xl" })}>
          {t.toOverview}
        </Link>
      </div>
    </div>
  );
}
