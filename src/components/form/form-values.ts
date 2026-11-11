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
