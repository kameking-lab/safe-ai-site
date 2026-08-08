import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistrar } from "./service-worker-registrar";

const originalServiceWorker = Object.getOwnPropertyDescriptor(
  window.navigator,
  "serviceWorker",
);
const originalCaches = Object.getOwnPropertyDescriptor(window, "caches");

describe("ServiceWorkerRegistrar preview safety", () => {
  afterEach(() => {
    if (originalServiceWorker) {
      Object.defineProperty(
        window.navigator,
        "serviceWorker",
        originalServiceWorker,
      );
    } else {
      Reflect.deleteProperty(window.navigator, "serviceWorker");
    }
    if (originalCaches) {
      Object.defineProperty(window, "caches", originalCaches);
    } else {
      Reflect.deleteProperty(window, "caches");
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("enabled=false unregisters same-origin workers and removes only portal caches", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const register = vi.fn();
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { register, getRegistrations },
    });
    const keys = vi.fn().mockResolvedValue(["anzen-ai-v6", "unrelated-cache"]);
    const deleteCache = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: { keys, delete: deleteCache },
    });

    render(<ServiceWorkerRegistrar enabled={false} />);

    await waitFor(() => expect(unregister).toHaveBeenCalledOnce());
    expect(register).not.toHaveBeenCalled();
    expect(deleteCache).toHaveBeenCalledWith("anzen-ai-v6");
    expect(deleteCache).not.toHaveBeenCalledWith("unrelated-cache");
  });

  it("enabled=true keeps the normal no-cache registration contract", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { register, getRegistrations: vi.fn() },
    });

    render(<ServiceWorkerRegistrar enabled />);

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }),
    );
  });
});
