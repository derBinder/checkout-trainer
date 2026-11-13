// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./use-wake-lock";

type Sentinel = { released: boolean; release: ReturnType<typeof vi.fn> };

let sentinels: Sentinel[];
let request: ReturnType<typeof vi.fn>;
let visibility: DocumentVisibilityState;

function sentinel(): Sentinel {
  const s: Sentinel = {
    released: false,
    release: vi.fn(async () => {
      s.released = true;
    }),
  };
  sentinels.push(s);
  return s;
}

function installWakeLock(impl: () => Promise<Sentinel> = async () => sentinel()) {
  request = vi.fn(impl);
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
}

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}

const flush = () => act(async () => {});

beforeEach(() => {
  sentinels = [];
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  installWakeLock();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "wakeLock");
});

describe("useWakeLock", () => {
  it("fordert beim Start eine Bildschirmsperre an", async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("screen");
  });

  it("fordert nichts an, solange die Sitzung nicht läuft", async () => {
    renderHook(() => useWakeLock(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it("gibt die Sperre beim Verlassen frei", async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it("gibt die Sperre frei, wenn die Sitzung endet", async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
    await flush();
    rerender({ active: false });
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it("fordert nach der Rückkehr auf die Seite neu an", async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    // Der Browser gibt die Sperre beim Verbergen selbst frei.
    sentinels[0].released = true;
    setVisibility("hidden");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("fordert bei Rückkehr nicht doppelt an, solange die Sperre noch gilt", async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fordert erst an, wenn eine verborgene Seite sichtbar wird", async () => {
    visibility = "hidden";
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).not.toHaveBeenCalled();
    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("gibt eine erst nach dem Verlassen erteilte Sperre sofort frei", async () => {
    let grant!: (s: Sentinel) => void;
    installWakeLock(() => new Promise<Sentinel>((resolve) => (grant = resolve)));
    const { unmount } = renderHook(() => useWakeLock(true));
    unmount();
    const late = sentinel();
    await act(async () => grant(late));
    expect(late.release).toHaveBeenCalledTimes(1);
  });

  it("hört nach dem Verlassen nicht mehr auf Sichtbarkeit", async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("bleibt still ohne Wake-Lock-API", async () => {
    Reflect.deleteProperty(navigator, "wakeLock");
    const error = vi.spyOn(console, "error");
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
    expect(error).not.toHaveBeenCalled();
  });

  it("bleibt still, wenn der Browser ablehnt", async () => {
    installWakeLock(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    const error = vi.spyOn(console, "error");
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
    expect(request).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("bleibt still, wenn die Freigabe fehlschlägt", async () => {
    installWakeLock(async () => {
      const s = sentinel();
      s.release.mockRejectedValue(new Error("already released"));
      return s;
    });
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
    await flush();
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });
});
