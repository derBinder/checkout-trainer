import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Impressum · Checkout-Trainer" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-16">
      <h1 className="type-display text-[2rem]">Impressum</h1>
      <p className="text-lg font-medium text-muted-foreground">
        Dieser Text wird vom Betreiber ergänzt.
      </p>
      <Link href="/" className="w-fit py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Zur Startseite
      </Link>
    </main>
  );
}
