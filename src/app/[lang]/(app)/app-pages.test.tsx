// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { version } from "../../../../package.json";
import { I18nProvider } from "@/i18n/client";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}
function wrapperEn({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="en">{children}</I18nProvider>;
}

// Sprache aus dem ersten URL-Segment, hier umschaltbar.
const rootParams = vi.hoisted(() => ({ lang: "de" }));
vi.mock("next/root-params", () => ({ lang: async () => rootParams.lang }));

// Die Seiten sind Gerüste: Datenbausteine und Formulare haben eigene Tests und
// stehen hier als Platzhalter. Bei `loading.value` warten die Datenbausteine
// endlos, dann zeigt die Seite ihre Skeletons.
const loading = vi.hoisted(() => ({ value: false }));
const pathname = vi.hoisted(() => ({ value: "/de/today" }));

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
vi.mock("@/components/practice/practice-data", async () => ({
  PracticeData: await dataStub("Übungsauswahl"),
}));
vi.mock("@/components/admin/admin-data", async () => ({
  UserList: await dataStub("Nutzerliste"),
}));
vi.mock("@/components/settings/settings-data", async () => ({
  NewPerDayField: await dataStub("Feld Neue Karten"),
  ExtraCardsField: await dataStub("Schalter Zusatzkarten"),
  DeleteAccountSection: await dataStub("Abschnitt Konto löschen"),
}));
vi.mock("@/components/admin-nav-item", async () => ({
  AdminNavItem: await dataStub("Verwaltung"),
}));
vi.mock("@/components/session-refresh", () => ({ SessionRefresh: () => null }));
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

vi.mock("@/components/language/language-switch", () => ({
  LanguageSwitch: ({ labelledBy }: { labelledBy: string }) => (
    <div role="radiogroup" aria-labelledby={labelledBy} />
  ),
}));

const { default: TodayPage, generateMetadata: todayMetadata } = await import("./today/page");
const { default: StatsPage, generateMetadata: statsMetadata } = await import("./stats/page");
const { default: StudyPage, generateMetadata: studyMetadata } = await import("./study/page");
const { default: AdminPage, generateMetadata: adminMetadata } = await import("./admin/page");
const { default: PracticePage, generateMetadata: practiceMetadata } = await import("./practice/page");
const { default: SettingsPage, generateMetadata: settingsMetadata } = await import("./settings/page");
const { default: AppLayout } = await import("./layout");
const { default: AppError } = await import("./error");

const busy = (container: HTMLElement) => container.querySelectorAll('[aria-busy="true"]').length;

beforeEach(() => {
  rootParams.lang = "de";
  loading.value = false;
  pathname.value = "/de/today";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Heute", () => {
  it("zeigt Überschrift, Serie und Übersicht", async () => {
    render(await TodayPage(), { wrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Heute" })).toBeTruthy();
    expect(screen.getByText("Serie heute")).toBeTruthy();
    expect(screen.getByText("Heutige Karten")).toBeTruthy();
  });

  it("zeigt Skeletons, solange die Daten laden", async () => {
    loading.value = true;
    const { container } = render(await TodayPage(), { wrapper });
    expect(screen.getByRole("heading", { name: "Heute" })).toBeTruthy();
    expect(screen.queryByText("Heutige Karten")).toBeNull();
    expect(busy(container)).toBeGreaterThanOrEqual(2);
  });
});

describe("Statistik", () => {
  it("zeigt Überschrift, Serie und Lernstände", async () => {
    render(await StatsPage(), { wrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Statistik" })).toBeTruthy();
    expect(screen.getByText("Serie Statistik")).toBeTruthy();
    expect(screen.getByText("Lernstände")).toBeTruthy();
    expect((await statsMetadata()).title).toBe("Statistik · Checkout-Trainer");
  });

  it("zeigt Skeletons, solange die Daten laden", async () => {
    loading.value = true;
    const { container } = render(await StatsPage(), { wrapper });
    expect(screen.queryByText("Lernstände")).toBeNull();
    expect(busy(container)).toBeGreaterThanOrEqual(2);
  });
});

describe("Lernen", () => {
  it("setzt den Seitentitel in der Sprache der Seite", async () => {
    expect((await studyMetadata()).title).toBe("Lernen · Checkout-Trainer");
  });

  it("zeigt die Lernsitzung", async () => {
    render(<StudyPage />, { wrapper });
    expect(screen.getByText("Lernsitzung")).toBeTruthy();
  });

  it("zeigt das Gerüst der Lernseite, solange die Karten laden", async () => {
    loading.value = true;
    const { container } = render(<StudyPage />, { wrapper });
    expect(screen.getByRole("link", { name: "Lernen beenden" })).toBeTruthy();
    expect(busy(container)).toBe(1);
  });
});

describe("Üben", () => {
  it("zeigt Überschrift und Auswahl", async () => {
    render(await PracticePage(), { wrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Üben" })).toBeTruthy();
    expect(screen.getByText("Übungsauswahl")).toBeTruthy();
    expect((await practiceMetadata()).title).toBe("Üben · Checkout-Trainer");
  });

  it("zeigt ein Skeleton ohne Karteninhalte, solange die Karten laden", async () => {
    loading.value = true;
    const { container } = render(await PracticePage(), { wrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Üben" })).toBeTruthy();
    expect(screen.queryByText("Übungsauswahl")).toBeNull();
    expect(busy(container)).toBe(1);
    expect(screen.queryByRole("button", { name: "Los" })).toBeNull();
  });
});

describe("Verwaltung", () => {
  it("zeigt Überschrift und Nutzerliste", async () => {
    render(await AdminPage(), { wrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Verwaltung" })).toBeTruthy();
    expect(screen.getByText("Nutzerliste")).toBeTruthy();
    expect((await adminMetadata()).title).toBe("Verwaltung · Checkout-Trainer");
  });

  it("zeigt ein Skeleton, solange die Liste lädt", async () => {
    loading.value = true;
    const { container } = render(await AdminPage(), { wrapper });
    expect(screen.queryByText("Nutzerliste")).toBeNull();
    expect(busy(container)).toBe(1);
  });
});

describe("Einstellungen", () => {
  it("zeigt alle Abschnitte", async () => {
    const { container } = render(await SettingsPage(), { wrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeTruthy();
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual(["Darstellung", "Sprache", "Lernmenge", "Zusatzkarten", "Lernstand zurücksetzen", "Passwort ändern", "Abmelden"]);
    expect(screen.getByText("Schalter Zusatzkarten")).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Darstellung" })).toBeTruthy();
    expect(screen.getByText("Feld Neue Karten")).toBeTruthy();
    expect(screen.getByText("Formular Passwort")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeTruthy();
    expect(screen.getByText("Abschnitt Konto löschen")).toBeTruthy();
    expect((await settingsMetadata()).title).toBe("Einstellungen · Checkout-Trainer");
    // Die Version steht ganz unten, nach dem Abschnitt „Konto löschen“.
    expect(container.firstElementChild?.lastElementChild?.textContent).toBe(`Version ${version}`);
  });

  it("zeigt Skeletons für gespeicherte Werte und das Löschen, solange sie laden", async () => {
    loading.value = true;
    const { container } = render(await SettingsPage(), { wrapper });
    expect(screen.queryByText("Feld Neue Karten")).toBeNull();
    expect(screen.queryByText("Abschnitt Konto löschen")).toBeNull();
    expect(screen.queryByText("Schalter Zusatzkarten")).toBeNull();
    expect(screen.getByText("Formular Passwort")).toBeTruthy();
    expect(busy(container)).toBeGreaterThanOrEqual(3);
  });
});

describe("Layout der angemeldeten Seiten", () => {
  it("zeigt Navigation und Seiteninhalt", async () => {
    render(
      <AppLayout>
        <h1>Inhalt</h1>
      </AppLayout>,
      { wrapper },
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
      { wrapper },
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
    render(<AppError error={error} retry={retry} />, { wrapper });

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Das hat nicht geklappt." })).toBeTruthy();
    expect(log).toHaveBeenCalledWith(error);
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/de/today");

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("Angemeldete Seiten auf Englisch", () => {
  it("zeigt Überschriften und Titel der Seiten auf Englisch", async () => {
    rootParams.lang = "en";
    const pages = [
      [TodayPage, todayMetadata, "Today"],
      [StatsPage, statsMetadata, "Stats"],
      [AdminPage, adminMetadata, "Admin"],
      [SettingsPage, settingsMetadata, "Settings"],
    ] as const;
    for (const [Page, metadata, title] of pages) {
      const { unmount } = render(await Page(), { wrapper: wrapperEn });
      expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
      expect((await metadata()).title).toBe(`${title} · Checkout-Trainer`);
      unmount();
    }
  });

  it("zeigt die Abschnitte der Einstellungen auf Englisch", async () => {
    rootParams.lang = "en";
    const { container } = render(await SettingsPage(), { wrapper: wrapperEn });
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual(["Appearance", "Language", "Study amount", "Extra cards", "Reset progress", "Change password", "Sign out"]);
    expect(screen.getByRole("radiogroup", { name: "Appearance" })).toBeTruthy();
    expect(container.firstElementChild?.lastElementChild?.textContent).toBe(`Version ${version}`);
  });

  it("beschriftet Navigation und Fehlerseite auf Englisch", () => {
    pathname.value = "/en/today";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppLayout>
        <h1>Content</h1>
      </AppLayout>,
      { wrapper: wrapperEn },
    );
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav.textContent).toContain("Today");
    expect(nav.textContent).toContain("Stats");
    expect(nav.textContent).toContain("Settings");
    // Der Betreiber-Eintrag ist hier ein Platzhalter („Verwaltung“) und lädt separat.

    render(<AppError error={new Error("down")} retry={() => {}} />, { wrapper: wrapperEn });
    expect(log).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "That did not work." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to overview" }).getAttribute("href")).toBe("/en/today");
  });
});
