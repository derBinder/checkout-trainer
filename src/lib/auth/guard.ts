import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./index";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  status: "pending" | "active" | "blocked";
  role: string;
  newPerDay: number;
};

/** Der Status kommt bei jedem Aufruf frisch aus der Datenbank (kein Cookie-Cache). */
export async function getSessionUser(): Promise<SessionUser | null> {
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
}

export async function requireActiveUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/anmelden");
  if (u.status !== "active") redirect("/warten");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireActiveUser();
  if (u.role !== "admin") notFound();
  return u;
}
