// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const getSession = vi.fn(async () => ({ data: null, error: null }));
vi.mock("@/lib/auth/client", () => ({ authClient: { getSession: () => getSession() } }));

const { SessionRefresh } = await import("./session-refresh");

it("fragt die Sitzung einmal beim Laden ab, damit Better Auth das Cookie verlängern kann", () => {
  const { container } = render(<SessionRefresh />);
  expect(getSession).toHaveBeenCalledTimes(1);
  expect(container.childElementCount).toBe(0);
});
