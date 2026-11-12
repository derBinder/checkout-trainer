import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { localePath, ROUTES } from "@/i18n/paths";
import { getLocale } from "@/i18n/server";

export const metadata: Metadata = { title: "Registrieren · Checkout-Trainer" };

export default async function RegisterPage() {
  const locale = await getLocale();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-10 px-page py-16">
      <h1 className="type-display text-3xl">Registrieren</h1>
      <RegisterForm />
      <p className="text-sm text-muted-foreground">
        Schon ein Konto?{" "}
        <Link
          href={localePath(locale, ROUTES.signIn)}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Anmelden
        </Link>
      </p>
    </main>
  );
}
