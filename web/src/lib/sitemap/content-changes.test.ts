import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import {
  LAWS_REVISION_LIST_BASELINE,
  ROUTE_CONTENT_CHANGES,
  lawRevisionListFingerprint,
  lawsRevisionListChangedOn,
} from "./content-changes";

const ROUTES = ["/laws", "/chatbot", "/chemical-ra", "/chemical-database", "/chemical-ra/product-search"];

function lastmodAt(now: string): Record<string, string> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  const entries = sitemap();
  vi.useRealTimers();
  return Object.fromEntries(
    ROUTES.map((route) => {
      const entry = entries.find((candidate) => new URL(candidate.url).pathname === route);
      return [route, String(entry?.lastModified)];
    }),
  );
}

afterEach(() => vi.useRealTimers());

describe("sitemap lastmod は実際の内容変更日だけを使う", () => {
  it("traces /laws, /chatbot and chemical pages to recorded content changes", () => {
    expect(lastmodAt("2026-10-11T09:00:00+09:00")).toEqual({
      "/laws": "2026-10-05",
      "/chatbot": "2026-10-08",
      "/chemical-ra": "2026-10-11",
      "/chemical-database": "2026-08-08",
      "/chemical-ra/product-search": "2026-08-08",
    });
  });

  it("does not move when the build day or clock advances", () => {
    const today = lastmodAt("2026-10-11T09:00:00+09:00");
    expect(lastmodAt("2026-10-12T09:00:00+09:00")).toEqual(today);
    expect(lastmodAt("2027-04-01T09:00:00+09:00")).toEqual(today);
  });

  it("keeps the /chatbot date at or after the newest confirmed source-content change", () => {
    const newestSourceChange = verifiedLawArticles
      .map((article) => article.sourceContentChangedOn)
      .filter((date): date is string => typeof date === "string")
      .sort()
      .at(-1);
    expect(newestSourceChange).toBeDefined();
    expect(ROUTE_CONTENT_CHANGES["/chatbot"].changedOn >= newestSourceChange!).toBe(true);
  });

  it("ignores a re-fetch whose displayed revision list is unchanged", () => {
    expect(lawRevisionListFingerprint(lawRevisionCores)).toBe(LAWS_REVISION_LIST_BASELINE.fingerprint);
    expect(lawsRevisionListChangedOn(lawRevisionCores, "2026-11-30T03:00:00.000Z")).toBe("2026-10-05");
  });

  it("uses the ingesting fetch date only when the displayed list actually changes", () => {
    const changed = lawRevisionCores.map((revision, index) =>
      index === 0 ? { ...revision, enforcement_date: "2027-04-01" } : revision,
    );
    expect(lawRevisionListFingerprint(changed)).not.toBe(LAWS_REVISION_LIST_BASELINE.fingerprint);
    expect(lawsRevisionListChangedOn(changed, "2026-11-30T03:00:00.000Z")).toBe("2026-11-30");
  });
});
