import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Anmelden · Checkout-Trainer" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-10 px-page py-16">
      <h1 className="type-display text-3xl">Anmelden</h1>
      <LoginForm />
      <div className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>Passwort vergessen? Wende dich an den Betreiber, er setzt dir ein neues.</p>
        <p>
          Noch kein Konto?{" "}
          <Link
            href="/registrieren"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Registrieren
          </Link>
        </p>
      </div>
    </main>
  );
}
