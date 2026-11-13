import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.errors.notFound.title}${t.common.titleSuffix}` };
}

/**
 * Unbekannte Adresse unter einer Sprache (`/de/xyz`): Die Sammelroute [...missing]
 * löst sie aus, die Seite erscheint im Root-Layout und damit in der Sprache der Adresse.
 */
export default async function NotFound() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-page py-16">
      <h1 className="type-display text-3xl">{t.errors.notFound.title}</h1>
      <p className="text-lg font-medium text-muted-foreground">{t.errors.notFound.description}</p>
      <Link
        href={localePath(locale, ROUTES.home)}
        className={buttonVariants({ variant: "secondary", size: "xl" })}
      >
        {t.errors.notFound.toHome}
      </Link>
    </main>
  );
}
