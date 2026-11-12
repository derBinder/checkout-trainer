import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { NewPerDayForm } from "@/components/settings/new-per-day-form";
import { DeleteAccountSection, NewPerDayField } from "@/components/settings/settings-data";
import { SETTINGS_BODY, SettingsSection } from "@/components/settings/settings-parts";
import {
  DeleteAccountSectionSkeleton,
  NewPerDayFieldSkeleton,
} from "@/components/settings/settings-skeleton";
import { ThemeSwitch } from "@/components/theme/theme-switch";

export const metadata: Metadata = { title: "Einstellungen · Checkout-Trainer" };

/** Gerüst ohne Datenzugriff; die Datenbausteine prüfen den Zugriff selbst. */
export default function SettingsPage() {
  return (
    <div className={SETTINGS_BODY}>
      <h1 className="type-display text-3xl">Einstellungen</h1>

      <SettingsSection title="Darstellung" titleId="darstellung">
        <ThemeSwitch labelledBy="darstellung" />
      </SettingsSection>

      <SettingsSection title="Lernmenge">
        <NewPerDayForm>
          <Suspense fallback={<NewPerDayFieldSkeleton />}>
            <NewPerDayField />
          </Suspense>
        </NewPerDayForm>
      </SettingsSection>

      <SettingsSection title="Passwort ändern">
        <ChangePasswordForm />
      </SettingsSection>

      <SettingsSection title="Abmelden">
        <SignOutButton />
      </SettingsSection>

      <Suspense fallback={<DeleteAccountSectionSkeleton />}>
        <DeleteAccountSection />
      </Suspense>
    </div>
  );
}
