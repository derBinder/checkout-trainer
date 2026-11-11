import { firstInvalid } from "@/lib/validation/field-errors";
import { type FieldSchema, validateField } from "@/lib/validation/schemas";

export type FieldSpec = { name: string; schema: FieldSchema };

/** Meldung je Feld oder null. Fehlende Werte zählen als leer. */
export function validateValues(
  fields: FieldSpec[],
  values: Record<string, unknown>,
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  for (const { name, schema } of fields) {
    errors[name] = validateField(schema, values[name] ?? "");
  }
  return errors;
}

/** Liest die Werte aus dem Formular selbst, damit auch Autofill zählt. */
export function validateFormData(
  fields: FieldSpec[],
  formData: FormData,
): Record<string, string | null> {
  return validateValues(fields, Object.fromEntries(formData));
}

/** Erstes fehlerhaftes Feld in der Reihenfolge von `fields`, für den Fokus. */
export function firstInvalidField(
  fields: FieldSpec[],
  errors: Record<string, string | null>,
): string | null {
  return firstInvalid(
    fields.map((field) => field.name),
    errors,
  );
}

/** Wert für aria-describedby: Beschreibung und, nur bei einem Fehler, die Fehler-ID. */
export function describedBy(
  descriptionId: string | undefined,
  errorId: string,
  hasError: boolean,
): string | undefined {
  const ids = [descriptionId, hasError ? errorId : undefined].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/** Am Auge-Knopf eines Passwortfelds, Wert: die ID des Felds. */
export const PASSWORD_TOGGLE_ATTRIBUTE = "data-password-toggle-for";

type BlurTarget = { getAttribute(name: string): string | null };

/**
 * Ein Wechsel vom Feld auf seinen eigenen Auge-Knopf zählt nicht als
 * Verlassen, sonst erschiene beim Tabben aus dem leeren Feld ein Hinweis.
 */
export function leavesField(
  fieldId: string,
  relatedTarget: BlurTarget | null,
): boolean {
  if (!fieldId || !relatedTarget) return true;
  return relatedTarget.getAttribute(PASSWORD_TOGGLE_ATTRIBUTE) !== fieldId;
}
