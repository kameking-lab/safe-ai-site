import { describe, expect, it, vi } from "vitest";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import FAQSearchPage from "./page";

describe("/faq/search quarantine boundary", () => {
  it("redirects the retired FAQ search to the noindex status hub", () => {
    expect(() => FAQSearchPage()).toThrow("redirect:/faq");
    expect(permanentRedirect).toHaveBeenCalledWith("/faq");
  });
});
