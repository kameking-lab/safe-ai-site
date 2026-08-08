import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mhlwNotices } from "@/data/mhlw-notices";
import { publicMhlwNotices } from "@/data/public-mhlw-notices";
import { searchRelevantNotices } from "@/lib/notice-search";
import { buildSearchIndex } from "@/lib/search-index";
import { GET as getCircularSitemap } from "@/app/sitemap-circulars.xml/route";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

import CircularDetailPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "./page";

const QUARANTINED_IDS = ["mhlw-notice-0870", "mhlw-notice-0969", "mhlw-notice-1069"];

describe("quarantined circular hard 404 boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables dynamic params and emits only public static params", () => {
    expect(dynamicParams).toBe(false);
    const ids = new Set(generateStaticParams().map(({ id }) => id));
    for (const id of QUARANTINED_IDS) expect(ids.has(id)).toBe(false);
    expect(ids.size).toBe(publicMhlwNotices.length);
  });

  it.each(QUARANTINED_IDS)("returns notFound for direct URL data resolution: %s", async (id) => {
    await expect(CircularDetailPage({ params: Promise.resolve({ id }) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it.each(QUARANTINED_IDS)("returns notFound before metadata or JSON-LD can expose data: %s", async (id) => {
    await expect(generateMetadata({ params: Promise.resolve({ id }) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
  });

  it("renders a transparent secondary-index detail but emits no LegalDocument JSON-LD", async () => {
    const notice = publicMhlwNotices[0];
    render(await CircularDetailPage({ params: Promise.resolve({ id: notice.id }) }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(notice.title);
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: notice.id }),
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("個別照合済みの基発0520第6号は公式PDFと照合範囲を示してindex可能にする", async () => {
    const id = "mhlw-notice-0014";
    render(await CircularDetailPage({ params: Promise.resolve({ id }) }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "労働安全衛生規則の一部を改正する省令の施行等について",
    );
    expect(screen.getByText("一次資料照合済み")).not.toBeNull();
    expect(screen.getByText("2026-08-02 独立一次資料照合")).not.toBeNull();
    expect(screen.getByText("専門・法務監修は未実施")).not.toBeNull();
    expect(
      document.querySelector('[data-evidence-verification="primarySourceMatched"]'),
    ).not.toBeNull();
    const pdfLinks = screen.getAllByRole("link", { name: /公式PDF/ });
    expect(
      pdfLinks.some(
        (link) =>
          link.getAttribute("href") ===
          "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
      ),
    ).toBe(true);
    const metadata = await generateMetadata({ params: Promise.resolve({ id }) });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("excludes quarantine IDs from sitemap, global search, and notice RAG", async () => {
    const sitemap = await (await getCircularSitemap()).text();
    const searchIndex = await buildSearchIndex();
    for (const id of QUARANTINED_IDS) {
      const record = mhlwNotices.find((notice) => notice.id === id);
      expect(record).toBeDefined();
      expect(sitemap).not.toContain(`/circulars/${id}`);
      expect(searchIndex.some((item) => item.url === `/circulars/${id}`)).toBe(false);
      expect(searchRelevantNotices(record?.title ?? "", 500).some((hit) => hit.id === id)).toBe(false);
    }
  });
});
