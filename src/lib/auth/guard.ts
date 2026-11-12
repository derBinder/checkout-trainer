import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./index";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  status: "pending" | "active" | "blocked";
  role: string;
  newPerDay: number;
};

/**
 * Der Status kommt pro Anfrage frisch aus der Datenbank (kein Cookie-Cache).
 * cache(): Layout und Seite derselben Anfrage teilen sich eine Abfrage.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & {
    status: SessionUser["status"];
    role?: string | null;
    newPerDay: number;
  };
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    status: u.status,
    role: u.role ?? "user",
    newPerDay: u.newPerDay,
  };
});

export async function requireActiveUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/anmelden");
  if (u.status !== "active") redirect("/warten");
  return u;
}

/**
 * Nur das aktive Betreiberkonto. Ein aktiver Nicht-Betreiber landet auf /heute:
 * Mit Cache Components steht der Status 200 schon fest, bevor diese Prüfung
 * läuft, eine echte 404 gibt es nicht mehr (Entscheidung des Auftraggebers).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireActiveUser();
  if (u.role !== "admin") redirect("/heute");
  return u;
}
