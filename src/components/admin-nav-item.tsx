import { AdminNavLink } from "@/components/app-nav";
import { getSessionUser } from "@/lib/auth/guard";
import { isActiveOperator } from "@/lib/auth/operator";

/**
 * Betreiber-Eintrag der Navigation. Liest die Sitzung zur Anfragezeit, deshalb
 * hinter einer eigenen Suspense-Grenze. Leitet nie um: Die Prüfung mit Umleitung
 * machen die Datenbausteine der Seiten.
 */
export async function AdminNavItem() {
  const user = await getSessionUser();
  return isActiveOperator(user) ? <AdminNavLink /> : null;
}
