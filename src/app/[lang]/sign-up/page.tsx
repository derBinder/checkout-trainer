import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { PublicFooter } from "@/components/public-footer";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.signUp.metaTitle}${t.common.titleSuffix}` };
}

export default async function RegisterPage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-page pt-16 pb-inset-bottom">
      <main className="flex flex-1 flex-col gap-10">
        <h1 className="type-display text-3xl">{t.signUp.title}</h1>
        <RegisterForm />
        <p className="text-sm text-muted-foreground">
          {t.signUp.haveAccount}{" "}
          <Link
            href={localePath(locale, ROUTES.signIn)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t.signUp.signInLink}
          </Link>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
