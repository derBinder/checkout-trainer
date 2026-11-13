"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { PASSWORD_TOGGLE_ATTRIBUTE } from "./form-values";

/** Passwortfeld mit Auge-Knopf rechts im Feld. */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const t = useDictionary().form;
  const [visible, setVisible] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const fallbackId = useId();
  const inputId = props.id ?? fallbackId;

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
        id={inputId}
        type={visible ? "text" : "password"}
        // Im sichtbaren Zustand ist das Feld ein Textfeld: Wörterbuch und
        // Korrektur dürfen das Passwort nie sehen oder verändern.
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="none"
        className={cn("pr-14", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="absolute top-0.5 right-0.5 text-muted-foreground hover:text-foreground"
        aria-label={visible ? t.hidePassword : t.showPassword}
        aria-pressed={visible}
        {...{ [PASSWORD_TOGGLE_ATTRIBUTE]: inputId }}
        // Fokus bleibt beim Tippen mit Maus oder Finger im Feld.
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
    </div>
  );
}
