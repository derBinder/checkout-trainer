import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PublicFooter } from "@/components/public-footer";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/guard";

// Liest die Sitzung vor dem Rendern und bleibt beim Seitenwechsel blockierend.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.pending.metaTitle}${t.common.titleSuffix}` };
}

export default async function WaitingPage() {
  const [user, locale, t] = await Promise.all([
    getSessionUser(),
    getLocale(),
    getDictionary(),
  ]);
  if (!user) redirect(localePath(locale, ROUTES.signIn));
  if (user.status === "active") redirect(localePath(locale, ROUTES.today));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-page pt-16 pb-inset-bottom">
      <main className="flex flex-1 flex-col gap-10">
        <h1 className="type-display text-2xl leading-tight">
          {user.status === "blocked" ? t.pending.blocked : t.pending.waiting}
        </h1>
        <div className="flex flex-col">
          <SignOutButton />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
