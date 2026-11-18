"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";

/**
 * Better Auth verlängert die Sitzung höchstens einmal am Tag, und das Cookie nur
 * in einer Antwort, die Cookies setzen darf. Die Abfrage über die Auth-Route
 * leistet das, die Sitzungsprüfung der Seiten nicht.
 */
export function SessionRefresh() {
  useEffect(() => {
    void authClient.getSession();
  }, []);
  return null;
}
