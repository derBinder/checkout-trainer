"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Passwortfeld mit Auge-Knopf rechts im Feld. */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  function toggle() {
    const input = wrapper.current?.querySelector("input");
    const focused = input !== null && input === document.activeElement;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    flushSync(() => setVisible((current) => !current));
    // Beim Wechsel des Typs setzen manche Browser die Einfügemarke zurück.
    if (focused && start !== null && end !== null) {
      input.setSelectionRange(start, end);
    }
  }

  return (
    <div ref={wrapper} className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-14", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="absolute top-0.5 right-0.5 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        aria-pressed={visible}
        // Fokus bleibt beim Tippen mit Maus oder Finger im Feld.
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
    </div>
  );
}
