import { unstable_rethrow } from "next/navigation";
import { AdminNavLink } from "@/components/app-nav";
import { getSessionUser, type SessionUser } from "@/lib/auth/guard";
import { isActiveOperator } from "@/lib/auth/operator";

/**
 * Betreiber-Eintrag der Navigation. Liest die Sitzung zur Anfragezeit, deshalb
 * hinter einer eigenen Suspense-Grenze. Leitet nie um: Die Prüfung mit Umleitung
 * machen die Datenbausteine der Seiten.
 */
export async function AdminNavItem() {
  let user: SessionUser | null;
  try {
    user = await getSessionUser();
  } catch (error) {
    // Steuerfehler von Next (etwa eine Umleitung) weiterreichen.
    unstable_rethrow(error);
    // Das Layout liegt außerhalb von error.tsx: Scheitert die Sitzungsabfrage,
    // fehlt nur dieser Eintrag, Navigation und Seite bleiben bedienbar.
    console.error(error);
    return null;
  }
  return isActiveOperator(user) ? <AdminNavLink /> : null;
}
