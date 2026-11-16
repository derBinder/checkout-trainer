import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("startet als eigenständige App im Scope der ganzen Seite", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.scope).toBe("/");
    expect(m.start_url).toBe("/");
  });
});
