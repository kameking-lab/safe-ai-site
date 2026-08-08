import { describe, expect, it } from "vitest";
import {
  googleCookieDeletionDomains,
  isGoogleOptionalCookie,
} from "./google-cookie-privacy";

describe("Google optional cookie deletion scope", () => {
  it.each(["_ga", "_ga_ABC123", "_gid", "_gat", "_gat_portal", "_gcl_au", "__gads", "__gpi", "__eoi"])(
    "recognizes %s",
    (name) => expect(isGoogleOptionalCookie(name)).toBe(true),
  );

  it("keeps domains inside production ownership and preview host", () => {
    expect(googleCookieDeletionDomains("sub.anzen-ai-portal.jp")).toEqual([
      "sub.anzen-ai-portal.jp",
      "anzen-ai-portal.jp",
    ]);
    expect(googleCookieDeletionDomains("safe-ai-git-main-user.vercel.app")).toEqual([
      "safe-ai-git-main-user.vercel.app",
    ]);
    expect(googleCookieDeletionDomains("localhost")).toEqual([]);
    expect(googleCookieDeletionDomains("unrelated.example")).toEqual([]);
  });
});
