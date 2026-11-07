import { describe, expect, it, vi } from "vitest";
import GigWorkPage from "@/app/(main)/laws/gig-work/page";
import BcpPage from "@/app/(main)/laws/bcp/page";
import FreelancePage from "@/app/(main)/laws/freelance-rosai/page";
import sitemap from "@/app/sitemap";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
import { isAdEligiblePath } from "@/lib/analytics-privacy";
import { UNFINISHED_PUBLIC_READING_PATHS } from "@/lib/public-reading-status";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); },
}));

describe("unfinished public reading boundaries", () => {
  it("does not publish outline-only pages or expose them in discovery and ads", async () => {
    for (const page of [BcpPage, GigWorkPage, FreelancePage]) {
      expect(() => page()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    }
    const urls = (await sitemap()).map(({ url }) => new URL(url).pathname);
    for (const path of UNFINISHED_PUBLIC_READING_PATHS) {
      expect(isPublicRouteAvailable(path)).toBe(false);
      expect(isPublicRouteAvailable(`${path}?from=nav`)).toBe(false);
      expect(isAdEligiblePath(path)).toBe(false);
      expect(urls).not.toContain(path);
    }
  });
});
