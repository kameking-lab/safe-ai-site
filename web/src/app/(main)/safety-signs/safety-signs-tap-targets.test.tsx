import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { permanentRedirect, notFound } = vi.hoisted(() => ({
  permanentRedirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

vi.mock("next/navigation", () => ({ permanentRedirect, notFound }));

import SafetySignsHubPage, { metadata } from "./page";
import CategoryPage from "./category/[category]/page";
import IndustryPage from "./industry/[industry]/page";
import SignPage, {
  generateStaticParams,
} from "./sign/[id]/page";

describe("/safety-signs fail-closed publication boundary", () => {
  it("keeps the status hub noindex and provides the official JISC destination", () => {
    const { container } = render(<SafetySignsHubPage />);
    expect(metadata.robots).toMatchObject({ index: false });
    expect(
      screen
        .getByRole("link", { name: /日本産業標準調査会/ })
        .getAttribute("href"),
    ).toBe("https://www.jisc.go.jp/");
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });

  it("redirects category/industry pages and generates no detail routes", () => {
    expect(() => CategoryPage()).toThrow("redirect:/safety-signs");
    expect(() => IndustryPage()).toThrow("redirect:/safety-signs");
    expect(generateStaticParams()).toEqual([]);
    expect(() => SignPage()).toThrow("not-found");
  });
});
