import { cache } from "react";
import { listUsers } from "@/app/(app)/verwaltung/admin-users";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { USER_LIST, USER_ROW, UserRowDetails } from "./admin-parts";
import { UserActions } from "./user-actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "wartend",
  active: "aktiv",
  blocked: "gesperrt",
};

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});

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
                  {STATUS_LABEL[u.status] ?? u.status}
                </span>
                {" · registriert am "}
                {dateFormat.format(u.createdAt)}
              </>
            }
          />
          {u.role === "admin" ? (
            <p className="text-sm text-muted-foreground">Betreiberkonto</p>
          ) : (
            <UserActions userId={u.id} name={u.name} status={u.status} />
          )}
        </li>
      ))}
    </ul>
  );
}
