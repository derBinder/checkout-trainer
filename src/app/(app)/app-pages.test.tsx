// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Die Seiten sind Gerüste: Datenbausteine und Formulare haben eigene Tests und
// stehen hier als Platzhalter. Bei `loading.value` warten die Datenbausteine
// endlos, dann zeigt die Seite ihre Skeletons.
const loading = vi.hoisted(() => ({ value: false }));
const pathname = vi.hoisted(() => ({ value: "/heute" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

async function dataStub(text: string) {
  const { use } = await import("react");
  const never = new Promise<never>(() => {});
  return function DataStub() {
    if (loading.value) use(never);
    return <p>{text}</p>;
  };
}

vi.mock("@/components/today/today-data", async () => ({
  TodayOverview: await dataStub("Heutige Karten"),
  TodayStreak: await dataStub("Serie heute"),
}));
vi.mock("@/components/stats/stats-data", async () => ({
  StatsOverview: await dataStub("Lernstände"),
  StatsStreak: await dataStub("Serie Statistik"),
}));
vi.mock("@/components/study/study-data", async () => ({
  StudySessionData: await dataStub("Lernsitzung"),
}));
vi.mock("@/components/admin/admin-data", async () => ({
  UserList: await dataStub("Nutzerliste"),
}));
vi.mock("@/components/settings/settings-data", async () => ({
  NewPerDayField: await dataStub("Feld Neue Karten"),
  DeleteAccountSection: await dataStub("Abschnitt Konto löschen"),
}));
vi.mock("@/components/admin-nav-item", async () => ({
  AdminNavItem: await dataStub("Verwaltung"),
}));
vi.mock("@/components/settings/new-per-day-form", () => ({
  NewPerDayForm: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
}));
vi.mock("@/components/settings/change-password-form", () => ({
  ChangePasswordForm: () => <p>Formular Passwort</p>,
}));
vi.mock("@/components/auth/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Abmelden</button>,
}));
vi.mock("@/components/theme/theme-switch", () => ({
  ThemeSwitch: ({ labelledBy }: { labelledBy: string }) => (
    <div role="radiogroup" aria-labelledby={labelledBy} />
  ),
}));

const { default: TodayPage } = await import("./heute/page");
const { default: StatsPage, metadata: statsMetadata } = await import("./statistik/page");
const { default: StudyPage } = await import("./lernen/page");
const { default: AdminPage, metadata: adminMetadata } = await import("./verwaltung/page");
const { default: SettingsPage, metadata: settingsMetadata } = await import("./einstellungen/page");
const { default: AppLayout } = await import("./layout");
const { default: AppError } = await import("./error");

const busy = (container: HTMLElement) => container.querySelectorAll('[aria-busy="true"]').length;

beforeEach(() => {
  loading.value = false;
  pathname.value = "/heute";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Heute", () => {
  it("zeigt Überschrift, Serie und Übersicht", () => {
    render(<TodayPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Heute" })).toBeTruthy();
    expect(screen.getByText("Serie heute")).toBeTruthy();
    expect(screen.getByText("Heutige Karten")).toBeTruthy();
  });

  it("zeigt Skeletons, solange die Daten laden", () => {
    loading.value = true;
    const { container } = render(<TodayPage />);
    expect(screen.getByRole("heading", { name: "Heute" })).toBeTruthy();
    expect(screen.queryByText("Heutige Karten")).toBeNull();
    expect(busy(container)).toBeGreaterThanOrEqual(2);
  });
});

describe("Statistik", () => {
  it("zeigt Überschrift, Serie und Lernstände", () => {
    render(<StatsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Statistik" })).toBeTruthy();
    expect(screen.getByText("Serie Statistik")).toBeTruthy();
    expect(screen.getByText("Lernstände")).toBeTruthy();
    expect(statsMetadata.title).toBe("Statistik · Checkout-Trainer");
  });

  it("zeigt Skeletons, solange die Daten laden", () => {
    loading.value = true;
    const { container } = render(<StatsPage />);
    expect(screen.queryByText("Lernstände")).toBeNull();
    expect(busy(container)).toBeGreaterThanOrEqual(2);
  });
});

describe("Lernen", () => {
  it("zeigt die Lernsitzung", () => {
    render(<StudyPage />);
    expect(screen.getByText("Lernsitzung")).toBeTruthy();
  });

  it("zeigt das Gerüst der Lernseite, solange die Karten laden", () => {
    loading.value = true;
    const { container } = render(<StudyPage />);
    expect(screen.getByRole("link", { name: "Lernen beenden" })).toBeTruthy();
    expect(busy(container)).toBe(1);
  });
});

describe("Verwaltung", () => {
  it("zeigt Überschrift und Nutzerliste", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Verwaltung" })).toBeTruthy();
    expect(screen.getByText("Nutzerliste")).toBeTruthy();
    expect(adminMetadata.title).toBe("Verwaltung · Checkout-Trainer");
  });

  it("zeigt ein Skeleton, solange die Liste lädt", () => {
    loading.value = true;
    const { container } = render(<AdminPage />);
    expect(screen.queryByText("Nutzerliste")).toBeNull();
    expect(busy(container)).toBe(1);
  });
});

describe("Einstellungen", () => {
  it("zeigt alle Abschnitte", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeTruthy();
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual(["Darstellung", "Lernmenge", "Passwort ändern", "Abmelden"]);
    expect(screen.getByRole("radiogroup", { name: "Darstellung" })).toBeTruthy();
    expect(screen.getByText("Feld Neue Karten")).toBeTruthy();
    expect(screen.getByText("Formular Passwort")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeTruthy();
    expect(screen.getByText("Abschnitt Konto löschen")).toBeTruthy();
    expect(settingsMetadata.title).toBe("Einstellungen · Checkout-Trainer");
  });

  it("zeigt Skeletons für gespeicherte Werte und das Löschen, solange sie laden", () => {
    loading.value = true;
    const { container } = render(<SettingsPage />);
    expect(screen.queryByText("Feld Neue Karten")).toBeNull();
    expect(screen.queryByText("Abschnitt Konto löschen")).toBeNull();
    expect(screen.getByText("Formular Passwort")).toBeTruthy();
    expect(busy(container)).toBeGreaterThanOrEqual(2);
  });
});

describe("Layout der angemeldeten Seiten", () => {
  it("zeigt Navigation und Seiteninhalt", () => {
    render(
      <AppLayout>
        <h1>Inhalt</h1>
      </AppLayout>,
    );
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    expect(nav.textContent).toContain("Heute");
    expect(nav.textContent).toContain("Verwaltung");
    expect(screen.getByRole("main").textContent).toBe("Inhalt");
  });

  it("lässt den Betreiber-Eintrag ohne Platzhalter weg, solange er lädt", () => {
    loading.value = true;
    render(
      <AppLayout>
        <h1>Inhalt</h1>
      </AppLayout>,
    );
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    expect(nav.textContent).not.toContain("Verwaltung");
  });
});

describe("Fehlerseite der angemeldeten Seiten", () => {
  it("meldet den Fehler, protokolliert ihn und lädt auf Wunsch neu", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = new Error("Datenbank antwortet nicht");
    render(<AppError error={error} retry={retry} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Das hat nicht geklappt." })).toBeTruthy();
    expect(log).toHaveBeenCalledWith(error);
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/heute");

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
