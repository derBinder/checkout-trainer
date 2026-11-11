"use client";

import {
  type ChangeEventHandler,
  type FocusEventHandler,
  useCallback,
  useId,
  useReducer,
} from "react";
import {
  fieldErrorsReducer,
  firstInvalid,
  initialFieldErrors,
} from "@/lib/validation/field-errors";
import { validateField } from "@/lib/validation/schemas";
import { type FieldSpec, leavesField, validateValues } from "./form-values";

type FieldProps = {
  onBlur: FocusEventHandler<HTMLInputElement>;
  onChange: ChangeEventHandler<HTMLInputElement>;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/**
 * Hinweise je Feld: erst nach dem Verlassen oder Abschicken, danach bei jeder
 * Eingabe neu. `fields` muss in Formularreihenfolge stehen und darf sich
 * zwischen zwei Renderdurchläufen nicht ändern (Konstante außerhalb der Komponente).
 */
export function useFieldErrors(fields: FieldSpec[]) {
  const [state, dispatch] = useReducer(fieldErrorsReducer, initialFieldErrors);
  const prefix = useId();

  const errorId = useCallback(
    (name: string) => `${prefix}-${name}-error`,
    [prefix],
  );

  const validate = useCallback(
    (name: string, value: string) => {
      const spec = fields.find((field) => field.name === name);
      return spec ? validateField(spec.schema, value) : null;
    },
    [fields],
  );

  /** `descriptionId`: eine vorhandene Beschreibung, die zusätzlich verknüpft wird. */
  function fieldProps(name: string, descriptionId?: string): FieldProps {
    const error = state.errors[name] ?? null;
    const describedBy = [descriptionId, error ? errorId(name) : undefined]
      .filter(Boolean)
      .join(" ");
    return {
      onBlur: (event) => {
        const related =
          event.relatedTarget instanceof Element ? event.relatedTarget : null;
        if (!leavesField(event.currentTarget.id, related)) return;
        dispatch({
          type: "blur",
          name,
          error: validate(name, event.currentTarget.value),
        });
      },
      onChange: (event) =>
        dispatch({
          type: "change",
          name,
          error: validate(name, event.currentTarget.value),
        }),
      "aria-invalid": error !== null,
      "aria-describedby": describedBy || undefined,
    };
  }

  /** Liest die Werte aus dem Formular selbst, damit auch Autofill zählt. */
  function validateForm(form: HTMLFormElement): boolean {
    const values = Object.fromEntries(new FormData(form));
    const errors = validateValues(fields, values);
    dispatch({ type: "submit", errors });
    const first = firstInvalid(
      fields.map((field) => field.name),
      errors,
    );
    if (first === null) return true;
    const element = form.elements.namedItem(first);
    if (element instanceof HTMLElement) element.focus();
    return false;
  }

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { errors: state.errors, fieldProps, errorId, validateForm, reset };
}
