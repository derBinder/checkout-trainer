import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSessionUser } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Freischaltung · Checkout-Trainer" };

export default async function WaitingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/anmelden");
  if (user.status === "active") redirect("/heute");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-10 px-5 py-16">
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
