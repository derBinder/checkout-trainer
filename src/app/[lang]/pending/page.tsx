import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { localePath, ROUTES } from "@/i18n/paths";
import { getLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/guard";

// Liest die Sitzung vor dem Rendern und bleibt beim Seitenwechsel blockierend.
export const instant = false;

export const metadata: Metadata = { title: "Freischaltung · Checkout-Trainer" };

export default async function WaitingPage() {
  const [user, locale] = await Promise.all([getSessionUser(), getLocale()]);
  if (!user) redirect(localePath(locale, ROUTES.signIn));
  if (user.status === "active") redirect(localePath(locale, ROUTES.today));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-10 px-page py-16">
      <h1 className="type-display text-2xl leading-tight">
        {user.status === "blocked"
          ? "Dein Konto ist gesperrt."
          : "Dein Konto wartet auf Freischaltung durch den Betreiber."}
      </h1>
      <div className="flex flex-col">
        <SignOutButton />
      </div>
    </main>
  );
}
