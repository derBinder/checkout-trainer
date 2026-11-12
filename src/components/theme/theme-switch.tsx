"use client";

import { useSyncExternalStore } from "react";
import { useDictionary } from "@/i18n/client";
import type { ThemeSetting } from "@/lib/theme";
import { readThemeSetting, saveThemeSetting, subscribeThemeSetting } from "./theme-store";

const OPTIONS: ThemeSetting[] = ["system", "light", "dark"];

const serverSetting = (): ThemeSetting => "system";

/** Dreiteiliger Schalter aus echten Radio-Knöpfen: Pfeiltasten und Screenreader funktionieren von selbst. */
export function ThemeSwitch({ labelledBy }: { labelledBy: string }) {
  const t = useDictionary().settings.theme;
  const setting = useSyncExternalStore(subscribeThemeSetting, readThemeSetting, serverSetting);

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-3 rounded-panel bg-muted p-1">
      {OPTIONS.map((value) => (
        <label
          key={value}
          className="flex h-12 cursor-pointer items-center justify-center rounded-field text-sm font-semibold text-muted-foreground transition-colors select-none hover:text-foreground has-checked:bg-accent has-checked:font-bold has-checked:text-accent-foreground has-focus-visible:outline-2 has-focus-visible:outline-ring"
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={setting === value}
            onChange={() => saveThemeSetting(value)}
            className="sr-only"
          />
          {t[value]}
        </label>
      ))}
    </div>
  );
}
