"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary, useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "./auth-error";

export function SignOutButton() {
  const router = useRouter();
  const localePath = useLocalePath();
  const t = useDictionary().auth;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setError(authErrorMessage(error, t));
        setPending(false);
        return;
      }
      router.replace(localePath(ROUTES.home));
      router.refresh();
    } catch {
      setError(t.signOutNoConnection);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" size="xl" onClick={handleClick} disabled={pending}>
        {t.signOut}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
