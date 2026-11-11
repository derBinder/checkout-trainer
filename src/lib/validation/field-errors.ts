export type FieldErrorsState = {
  touched: Record<string, true>;
  errors: Record<string, string | null>;
};

export type FieldErrorsAction =
  | { type: "blur"; name: string; error: string | null }
  | { type: "change"; name: string; error: string | null }
  | { type: "submit"; errors: Record<string, string | null> }
  | { type: "reset" };

export const initialFieldErrors: FieldErrorsState = {
  touched: {},
  errors: {},
};

export function fieldErrorsReducer(
  state: FieldErrorsState,
  action: FieldErrorsAction,
): FieldErrorsState {
  switch (action.type) {
    case "blur":
      return {
        touched: { ...state.touched, [action.name]: true },
        errors: { ...state.errors, [action.name]: action.error },
      };
    case "change":
      // Erst nach dem ersten Verlassen des Felds, sonst kein Hinweis beim Tippen.
      if (!state.touched[action.name]) return state;
      return {
        ...state,
        errors: { ...state.errors, [action.name]: action.error },
      };
    case "submit": {
      const touched: Record<string, true> = { ...state.touched };
      for (const name of Object.keys(action.errors)) touched[name] = true;
      return { touched, errors: { ...state.errors, ...action.errors } };
    }
    case "reset":
      return initialFieldErrors;
  }
}

/** Erstes fehlerhaftes Feld in Formularreihenfolge, für den Fokus nach dem Abschicken. */
export function firstInvalid(
  order: string[],
  errors: Record<string, string | null>,
): string | null {
  return order.find((name) => errors[name]) ?? null;
}
