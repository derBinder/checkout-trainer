import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { NewPerDayForm } from "@/components/settings/new-per-day-form";
import { DeleteAccountSection, ExtraCardsField, NewPerDayField } from "@/components/settings/settings-data";
import { SETTINGS_BODY, SettingsSection } from "@/components/settings/settings-parts";
import {
  DeleteAccountSectionSkeleton,
  ExtraCardsSkeleton,
  NewPerDayFieldSkeleton,
} from "@/components/settings/settings-skeleton";
import { LanguageSwitch } from "@/components/language/language-switch";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.nav.settings}${t.common.titleSuffix}` };
}

/** Gerüst ohne Datenzugriff; die Datenbausteine prüfen den Zugriff selbst. */
export default async function SettingsPage() {
  const t = await getDictionary();
  return (
    <div className={SETTINGS_BODY}>
      <h1 className="type-display text-3xl">{t.nav.settings}</h1>

      <SettingsSection title={t.settings.appearance} titleId="appearance">
        <ThemeSwitch labelledBy="appearance" />
      </SettingsSection>

      <SettingsSection title={t.language.label} titleId="sprache">
        <LanguageSwitch variant="settings" labelledBy="sprache" />
      </SettingsSection>

      <SettingsSection title={t.settings.amount}>
        <NewPerDayForm>
          <Suspense fallback={<NewPerDayFieldSkeleton />}>
            <NewPerDayField />
          </Suspense>
        </NewPerDayForm>
      </SettingsSection>

      <SettingsSection title={t.settings.extraCards.title}>
        <Suspense fallback={<ExtraCardsSkeleton />}>
          <ExtraCardsField />
        </Suspense>
      </SettingsSection>

      <SettingsSection title={t.settings.password.title}>
        <ChangePasswordForm />
      </SettingsSection>

      <SettingsSection title={t.auth.signOut}>
        <SignOutButton />
      </SettingsSection>

      <Suspense fallback={<DeleteAccountSectionSkeleton />}>
        <DeleteAccountSection />
      </Suspense>
    </div>
  );
}
