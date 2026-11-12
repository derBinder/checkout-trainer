import { cache } from "react";
import { listUsers } from "@/app/[lang]/(app)/admin/admin-users";
import { INTL_LOCALE, type Locale } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { USER_LIST, USER_ROW, UserRowDetails } from "./admin-parts";
import { UserActions } from "./user-actions";

/** Registrierdatum in der Schreibweise der Sprache, nach Berliner Zeit. */
export function formatCreated(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(date);
}

/**
 * Prüft zuerst den Zugriff: Nur das aktive Betreiberkonto bekommt die Liste,
 * alle anderen werden umgeleitet. Die Actions prüfen die Rechte noch einmal.
 */
const loadUsers = cache(async () => {
  await requireAdmin();
  return listUsers(db);
});

/** Alle Konten mit ihren Aktionen. */
export async function UserList() {
  const users = await loadUsers();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <ul className={USER_LIST}>
      {users.map((u) => (
        <li key={u.id} className={USER_ROW}>
          <UserRowDetails
            name={u.name}
            email={u.email}
            meta={
              <>
                <span className="font-semibold text-foreground">
                  {t.admin.status[u.status] ?? u.status}
                </span>
                {" · "}
                {t.admin.registered(formatCreated(u.createdAt, locale))}
              </>
            }
          />
          {u.role === "admin" ? (
            <p className="text-sm text-muted-foreground">{t.admin.operatorAccount}</p>
          ) : (
            <UserActions userId={u.id} name={u.name} status={u.status} />
          )}
        </li>
      ))}
    </ul>
  );
}
