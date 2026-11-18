import { Suspense } from "react";
import { AdminNavItem } from "@/components/admin-nav-item";
import { AppNav } from "@/components/app-nav";
import { SessionRefresh } from "@/components/session-refresh";

/**
 * Gerüst der angemeldeten Seiten, ohne Sitzungsabfrage: Es wird vorgerendert und
 * enthält keine Nutzerdaten. Jede Seite prüft den Zugriff in ihren Datenbausteinen.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SessionRefresh />
      <AppNav
        adminItem={
          // Kein sichtbarer Platzhalter: Der Eintrag erscheint nur beim Betreiber nachträglich.
          <Suspense fallback={null}>
            <AdminNavItem />
          </Suspense>
        }
      />
      <main className="mx-auto w-full max-w-2xl px-page pt-10 pb-nav-clearance md:pt-12 md:pb-16">
        {children}
      </main>
    </>
  );
}
