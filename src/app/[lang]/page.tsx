import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";
import { cn } from "@/lib/utils";

export default async function Home() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-page pt-screen-top pb-inset-bottom">
      <main className="flex flex-1 flex-col gap-10">
        <h1 className="type-display text-hero hyphens-manual">
          {t.common.appName}
        </h1>
        <p className="max-w-xs text-lg leading-relaxed font-medium text-muted-foreground">
          {t.home.intro}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={localePath(locale, ROUTES.signUp)} className={cn(buttonVariants({ size: "xl" }))}>
            {t.home.signUp}
          </Link>
          <Link
            href={localePath(locale, ROUTES.signIn)}
            className={cn(buttonVariants({ size: "xl", variant: "secondary" }))}
          >
            {t.home.signIn}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
