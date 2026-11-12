// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field";

describe("Field", () => {
  it("gruppiert Feldsatz, Legende, Inhalt und Titel", () => {
    render(
      <FieldSet>
        <FieldLegend>Ziel</FieldLegend>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Doppel</FieldTitle>
            <FieldDescription>Hinweis</FieldDescription>
          </FieldContent>
        </Field>
      </FieldSet>,
    );
    const legend = screen.getByText("Ziel");
    expect(legend.tagName).toBe("LEGEND");
    expect(legend.getAttribute("data-variant")).toBe("legend");
    expect(screen.getByRole("group", { name: "Ziel" }).tagName).toBe("FIELDSET");
    const field = screen.getByText("Doppel").closest("[data-slot=field]");
    expect(field?.getAttribute("role")).toBe("group");
    expect(field?.getAttribute("data-orientation")).toBe("horizontal");
  });

  it("kann die Legende als Beschriftung zeigen", () => {
    render(
      <fieldset>
        <FieldLegend variant="label">Rest</FieldLegend>
      </fieldset>,
    );
    expect(screen.getByText("Rest").getAttribute("data-variant")).toBe("label");
  });

  it("verbindet die Beschriftung mit ihrem Feld", () => {
    render(
      <Field>
        <FieldLabel htmlFor="x">Rest</FieldLabel>
        <input id="x" />
      </Field>,
    );
    expect(screen.getByLabelText("Rest").id).toBe("x");
  });
});

describe("FieldSeparator", () => {
  it("zeigt einen Text in der Trennlinie nur, wenn es einen gibt", () => {
    const { container, rerender } = render(<FieldSeparator />);
    const separator = container.querySelector("[data-slot=field-separator]");
    expect(separator?.getAttribute("data-content")).toBe("false");
    expect(container.querySelector("[data-slot=field-separator-content]")).toBeNull();

    rerender(<FieldSeparator>oder</FieldSeparator>);
    expect(separator?.getAttribute("data-content")).toBe("true");
    expect(screen.getByText("oder").getAttribute("data-slot")).toBe(
      "field-separator-content",
    );
  });
});

describe("FieldError", () => {
  it("zeigt nichts ohne Inhalt und ohne Fehler", () => {
    const { container, rerender } = render(<FieldError />);
    expect(container.innerHTML).toBe("");
    rerender(<FieldError errors={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("bevorzugt eigenen Inhalt vor der Fehlerliste", () => {
    render(<FieldError errors={[{ message: "aus der Liste" }]}>Eigener Text</FieldError>);
    expect(screen.getByRole("alert").textContent).toBe("Eigener Text");
  });

  it("zeigt eine einzelne Meldung als Text, doppelte nur einmal", () => {
    render(<FieldError errors={[{ message: "Zu kurz." }, { message: "Zu kurz." }]} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Zu kurz.");
    expect(alert.querySelector("ul")).toBeNull();
  });

  it("listet mehrere Meldungen auf und überspringt leere", () => {
    render(
      <FieldError
        errors={[{ message: "Zu kurz." }, undefined, { message: "Keine Zahl." }]}
      />,
    );
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Zu kurz.", "Keine Zahl."]);
  });
});
