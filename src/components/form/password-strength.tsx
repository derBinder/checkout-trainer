import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import {
  passwordStrength,
  type StrengthLevel,
  strengthHint,
} from "@/lib/validation/password-strength";
import { cn } from "@/lib/utils";

const FILL: Record<StrengthLevel, string> = {
  0: "bg-strength-weak",
  1: "bg-strength-fair",
  2: "bg-strength-good",
  3: "bg-strength-strong",
};

/** Nur ein Hinweis, blockiert nie. Die Zeile hat immer ihre Höhe, damit nichts springt. */
export function PasswordStrength({
  value,
  id,
}: {
  value: string;
  id?: string;
}) {
  const strength = passwordStrength(value);
  const hint =
    value === ""
      ? `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`
      : strengthHint(value);

  return (
    <div className="@container flex flex-col gap-2">
      <div aria-hidden className="h-2 overflow-hidden rounded-pill bg-border">
        <div
          className={cn(
            "h-full rounded-pill transition-all duration-200 ease-out motion-reduce:transition-none",
            strength ? FILL[strength.level] : "bg-transparent",
          )}
          style={{ width: `${strength?.percent ?? 0}%` }}
        />
      </div>
      <p
        id={id}
        aria-live="polite"
        // In schmalen Dialogen bricht der Hinweis um: dort zwei Zeilen freihalten.
        className="flex min-h-5 items-baseline justify-between gap-4 text-sm @max-xs:min-h-10"
      >
        <span className="font-bold">
          {strength ? (
            <>
              <span className="sr-only">Stärke: </span>
              {strength.label}
            </>
          ) : null}
        </span>
        <span className="text-right text-muted-foreground">{hint}</span>
      </p>
    </div>
  );
}
