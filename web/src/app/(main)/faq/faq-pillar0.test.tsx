import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { permanentRedirect } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ permanentRedirect }));

import FAQHubPage, { metadata } from "./page";
import FAQCategoryPage from "./[category]/page";
import FAQSearchPage from "./search/page";

describe("/faq fail-closed publication boundary", () => {
  it("marks the hub noindex and exposes official/non-AI alternatives", () => {
    const { container } = render(<FAQHubPage />);
    expect(metadata.robots).toMatchObject({ index: false });
    expect(
      screen.getByRole("link", { name: /e-Gov/i }).getAttribute("href"),
    ).toBe("https://elaws.e-gov.go.jp/");
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });

  it("redirects category and search routes instead of exposing legacy answers", () => {
    expect(() => FAQCategoryPage()).toThrow("redirect:/faq");
    expect(() => FAQSearchPage()).toThrow("redirect:/faq");
    expect(permanentRedirect).toHaveBeenCalledTimes(2);
  });
});
