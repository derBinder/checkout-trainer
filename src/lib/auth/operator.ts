import type { SessionUser } from "./guard";

/** Freigeschaltetes Betreiberkonto: dieselbe Bedingung wie requireAdmin, ohne Umleitung. */
export function isActiveOperator(user: SessionUser | null): boolean {
  return user?.status === "active" && user.role === "admin";
}
