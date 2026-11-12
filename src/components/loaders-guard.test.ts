import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Jeder Datenbaustein ruft zuerst die Zugriffsprüfung auf. Wirft sie die
// Umleitung, darf keine Abfrage laufen: sonst kämen Nutzerdaten in die Antwort.
const queries = vi.hoisted(() => ({
  loadQueue: vi.fn(),
  loadStatsData: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({
  getSessionUser: async () => null,
  requireActiveUser: async () => redirect("/anmelden"),
  requireAdmin: async () => redirect("/anmelden"),
}));
vi.mock("@/lib/review/queries", () => ({
  loadQueue: queries.loadQueue,
  loadStatsData: queries.loadStatsData,
}));
vi.mock("@/app/(app)/verwaltung/admin-users", () => ({ listUsers: queries.listUsers }));

const { TodayOverview, TodayStreak } = await import("./today/today-data");
const { StatsOverview, StatsStreak } = await import("./stats/stats-data");
const { StudySessionData } = await import("./study/study-data");
const { NewPerDayField, DeleteAccountSection } = await import("./settings/settings-data");
const { UserList } = await import("./admin/admin-data");

async function expectRedirectWithoutQueries(load: () => Promise<unknown>) {
  const error = await load().then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toHaveProperty("digest", expect.stringMatching(/^NEXT_REDIRECT;/));
  expect(queries.loadQueue).not.toHaveBeenCalled();
  expect(queries.loadStatsData).not.toHaveBeenCalled();
  expect(queries.listUsers).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Datenbausteine ohne Zugriff", () => {
  it("today-data", async () => {
    await expectRedirectWithoutQueries(TodayOverview);
    await expectRedirectWithoutQueries(TodayStreak);
  });

  it("stats-data", async () => {
    await expectRedirectWithoutQueries(StatsOverview);
    await expectRedirectWithoutQueries(StatsStreak);
  });

  it("study-data", async () => {
    await expectRedirectWithoutQueries(StudySessionData);
  });

  it("settings-data", async () => {
    await expectRedirectWithoutQueries(NewPerDayField);
    await expectRedirectWithoutQueries(DeleteAccountSection);
  });

  it("admin-data", async () => {
    await expectRedirectWithoutQueries(UserList);
  });
});
