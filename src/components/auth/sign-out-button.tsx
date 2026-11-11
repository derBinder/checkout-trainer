"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await authClient.signOut().catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="outline" size="xl" onClick={handleClick} disabled={pending}>
      Abmelden
    </Button>
  );
}
