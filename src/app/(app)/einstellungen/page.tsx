import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteAccount } from "@/components/settings/delete-account";
import { NewPerDayForm } from "@/components/settings/new-per-day-form";
import { requireActiveUser } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Einstellungen · Checkout-Trainer" };

export default async function SettingsPage() {
  const user = await requireActiveUser();

  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-4xl">Einstellungen</h1>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl">Lernmenge</h2>
        <NewPerDayForm initial={user.newPerDay} />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl">Passwort ändern</h2>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl">Abmelden</h2>
        <SignOutButton />
      </section>

      {user.role === "admin" ? null : (
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl">Konto löschen</h2>
          <DeleteAccount />
        </section>
      )}
    </div>
  );
}
