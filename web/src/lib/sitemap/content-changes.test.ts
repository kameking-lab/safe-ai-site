import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import {
  LAWS_REVISION_LIST_LAST_VERIFIED_ON,
  LAWS_REVISION_LIST_VERSIONS,
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
    expect(lastmodAt("2026-10-13T09:00:00+09:00")).toEqual({
      "/laws": "2026-10-13",
      "/chatbot": "2026-10-11",
      "/chemical-ra": "2026-10-13",
      "/chemical-database": "2026-10-13",
      "/chemical-ra/product-search": "2026-08-08",
    });
  });

  it("does not move when the build day or clock advances", () => {
    const today = lastmodAt("2026-10-13T09:00:00+09:00");
    expect(lastmodAt("2026-10-14T09:00:00+09:00")).toEqual(today);
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

  it("maps the current displayed revision list to its verified change date", () => {
    const fingerprint = lawRevisionListFingerprint(lawRevisionCores);
    expect(LAWS_REVISION_LIST_VERSIONS[fingerprint]?.changedOn).toBe("2026-10-13");
    expect(lawsRevisionListChangedOn(lawRevisionCores)).toBe("2026-10-13");
  });

  it("never advances /laws for the same unregistered list on later re-fetches", () => {
    const changed = lawRevisionCores.map((revision, index) =>
      index === 0 ? { ...revision, enforcement_date: "2027-04-01" } : revision,
    );
    expect(LAWS_REVISION_LIST_VERSIONS[lawRevisionListFingerprint(changed)]).toBeUndefined();
    // 同じ内容を別の取得時刻で2回評価しても日付は進まない（取得時刻は入力に使わない）。
    const firstFetch = lawsRevisionListChangedOn(changed);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-15T03:00:00Z"));
    const laterFetch = lawsRevisionListChangedOn(changed);
    vi.useRealTimers();
    expect(firstFetch).toBe(LAWS_REVISION_LIST_LAST_VERIFIED_ON);
    expect(laterFetch).toBe(firstFetch);
  });

  it("does not use egov-revisions fetchedAt as a content-change date", async () => {
    vi.resetModules();
    vi.doMock("@/data/law-revisions/egov-revisions-loaded", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("@/data/law-revisions/egov-revisions-loaded")>();
      return {
        ...original,
        egovRevisionsMeta: { ...original.egovRevisionsMeta, fetchedAt: "2027-02-01T03:00:00.000Z" },
      };
    });
    const { lawsRevisionListChangedOn: reloaded } = await import("./content-changes");
    expect(reloaded()).toBe("2026-10-13");
    vi.doUnmock("@/data/law-revisions/egov-revisions-loaded");
    vi.resetModules();
  });
});
