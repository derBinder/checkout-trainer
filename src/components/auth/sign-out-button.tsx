"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "./auth-error";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setError(authErrorMessage(error));
        setPending(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Keine Verbindung. Du bist noch angemeldet.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="xl" onClick={handleClick} disabled={pending}>
        Abmelden
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
