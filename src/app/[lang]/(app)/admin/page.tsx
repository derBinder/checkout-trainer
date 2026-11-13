import type { Metadata } from "next";
import { Suspense } from "react";
import { UserList } from "@/components/admin/admin-data";
import { ADMIN_BODY } from "@/components/admin/admin-parts";
import { UserListSkeleton } from "@/components/admin/admin-skeleton";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.nav.admin}${t.common.titleSuffix}` };
}

/**
 * Gerüst ohne Datenzugriff. Die Nutzerliste prüft den Zugriff selbst: Nicht-Betreiber
 * werden umgeleitet und erhalten sie nie.
 */
export default async function AdminPage() {
  const t = await getDictionary();
  return (
    <div className={ADMIN_BODY}>
      <h1 className="type-display text-3xl">{t.nav.admin}</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  );
}
