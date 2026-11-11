import type { Metadata } from "next";
import { UserActions } from "@/components/admin/user-actions";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { listUsers } from "./admin-users";

export const metadata: Metadata = { title: "Verwaltung · Checkout-Trainer" };

const STATUS_LABEL: Record<string, string> = {
  pending: "wartend",
  active: "aktiv",
  blocked: "gesperrt",
};

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});

export default async function AdminPage() {
  // Nicht-Admins erhalten 404. Die Actions prüfen die Rechte noch einmal.
  await requireAdmin();
  const users = await listUsers(db);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="type-display text-[2rem]">Verwaltung</h1>
      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-4 rounded-card bg-muted p-4">
            <div className="flex flex-col gap-1">
              <p className="font-bold break-words">{u.name}</p>
              <p className="text-sm break-all text-muted-foreground">{u.email}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {STATUS_LABEL[u.status] ?? u.status}
                </span>
                {" · registriert am "}
                {dateFormat.format(u.createdAt)}
              </p>
            </div>
            {u.role === "admin" ? (
              <p className="text-sm text-muted-foreground">Betreiberkonto</p>
            ) : (
              <UserActions userId={u.id} name={u.name} status={u.status} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
