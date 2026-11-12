import type { Metadata } from "next";
import { Suspense } from "react";
import { UserList } from "@/components/admin/admin-data";
import { ADMIN_BODY } from "@/components/admin/admin-parts";
import { UserListSkeleton } from "@/components/admin/admin-skeleton";

export const metadata: Metadata = { title: "Verwaltung · Checkout-Trainer" };

/**
 * Gerüst ohne Datenzugriff. Die Nutzerliste prüft den Zugriff selbst: Nicht-Betreiber
 * werden umgeleitet und erhalten sie nie.
 */
export default function AdminPage() {
  return (
    <div className={ADMIN_BODY}>
      <h1 className="type-display text-3xl">Verwaltung</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </div>
  );
}
