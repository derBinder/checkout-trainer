import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteAccount } from "@/components/settings/delete-account";
import { NewPerDayForm } from "@/components/settings/new-per-day-form";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { requireActiveUser } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Einstellungen · Checkout-Trainer" };

const SECTION_TITLE = "text-xl font-extrabold font-stretch-[112%]";

export default async function SettingsPage() {
  const user = await requireActiveUser();

  return (
    <div className="flex flex-col gap-12">
      <h1 className="type-display text-[2rem]">Einstellungen</h1>

      <section className="flex flex-col gap-5">
        <h2 id="darstellung" className={SECTION_TITLE}>
          Darstellung
        </h2>
        <ThemeSwitch labelledBy="darstellung" />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className={SECTION_TITLE}>Lernmenge</h2>
        <NewPerDayForm initial={user.newPerDay} />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className={SECTION_TITLE}>Passwort ändern</h2>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className={SECTION_TITLE}>Abmelden</h2>
        <SignOutButton />
      </section>

      {user.role === "admin" ? null : (
        <section className="flex flex-col gap-5">
          <h2 className={SECTION_TITLE}>Konto löschen</h2>
          <DeleteAccount />
        </section>
      )}
    </div>
  );
}
