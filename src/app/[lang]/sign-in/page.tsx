import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { PublicFooter } from "@/components/public-footer";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.signIn.metaTitle}${t.common.titleSuffix}` };
}

export default async function LoginPage() {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-page pt-16 pb-inset-bottom">
      <main className="flex flex-1 flex-col gap-10">
        <h1 className="type-display text-3xl">{t.signIn.title}</h1>
        <LoginForm />
        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>{t.signIn.forgotPassword}</p>
          <p>
            {t.signIn.noAccount}{" "}
            <Link
              href={localePath(locale, ROUTES.signUp)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t.signIn.signUpLink}
            </Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
