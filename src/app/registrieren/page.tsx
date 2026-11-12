import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Registrieren · Checkout-Trainer" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-10 px-page py-16">
      <h1 className="type-display text-3xl">Registrieren</h1>
      <RegisterForm />
      <p className="text-sm text-muted-foreground">
        Schon ein Konto?{" "}
        <Link
          href="/anmelden"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Anmelden
        </Link>
      </p>
    </main>
  );
}
