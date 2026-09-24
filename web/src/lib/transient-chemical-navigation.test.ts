import { afterEach, expect, it, vi } from "vitest";
import { beginTransientChemicalNavigation, consumeTransientChemicalNavigation, isExactTransientChemicalUrl } from "./transient-chemical-navigation";
afterEach(() => { consumeTransientChemicalNavigation(); vi.useRealTimers(); });
it("expires the data-free authorization and consumes it once", () => {
  vi.useFakeTimers();
  expect(consumeTransientChemicalNavigation()).toBe(false);
  beginTransientChemicalNavigation();
  expect(consumeTransientChemicalNavigation()).toBe(true);
  expect(consumeTransientChemicalNavigation()).toBe(false);
  beginTransientChemicalNavigation();
  vi.advanceTimersByTime(15_001);
  expect(consumeTransientChemicalNavigation()).toBe(false);
});
it.each(["/chemical-ra?name=トルエン#chemical-ra-start", "/chemical-ra?cas=108-88-3#chemical-ra-start", "/chemical-ra#other", "/chemical-ra", "/chatbot", "https://other.example/chemical-ra#chemical-ra-start", null])("does not authorize a different or data-bearing URL: %s", (url) => {
  expect(isExactTransientChemicalUrl(url)).toBe(false);
});
it("accepts only the fixed same-origin destination", () => {
  expect(isExactTransientChemicalUrl("/chemical-ra#chemical-ra-start")).toBe(true);
});
