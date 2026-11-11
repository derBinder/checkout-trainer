import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Datenschutz · Checkout-Trainer" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-16">
      <h1 className="text-4xl">Datenschutz</h1>
      <p className="text-lg text-muted-foreground">
        Dieser Text wird vom Betreiber ergänzt.
      </p>
      <Link href="/" className="w-fit py-2 text-sm text-muted-foreground hover:text-foreground">
        Zur Startseite
      </Link>
    </main>
  );
}
