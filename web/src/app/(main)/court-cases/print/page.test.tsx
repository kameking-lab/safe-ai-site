import { describe, expect, it, vi } from "vitest";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import CourtCasesPrintPage from "./page";

describe("/court-cases/print quarantine boundary", () => {
  it("redirects the retired print corpus to the transparent quarantine hub", () => {
    expect(() => CourtCasesPrintPage()).toThrow("redirect:/court-cases");
    expect(permanentRedirect).toHaveBeenCalledWith("/court-cases");
  });
});
