import { beforeEach, describe, expect, it, vi } from "vitest";
import AccidentCorpusQuarantineLayout from "../layout";
import AccidentDetailQuarantineLayout, {
  dynamic as accidentDetailDynamicMode,
} from "./layout";
import AccidentDetailPage, {
  dynamic as accidentDetailPageDynamicMode,
  generateMetadata,
} from "./page";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { isIndexableAccident } from "@/lib/seo/index-quality";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
}));

const all = getAccidentCasesDataset();

describe("/accidents/[id] 事故個票の公開境界", () => {
  beforeEach(() => {
    navigationMocks.notFound.mockClear();
  });

  it("PF-009: layoutは表示を通し、pageの一次資料境界で未確認IDを隔離する", () => {
    expect(accidentDetailDynamicMode).toBe("force-dynamic");
    expect(accidentDetailPageDynamicMode).toBe("force-dynamic");
    expect(
      AccidentCorpusQuarantineLayout({ children: <div>事故検索</div> }),
    ).toEqual(<div>事故検索</div>);
    expect(
      AccidentDetailQuarantineLayout({ children: <div>事故詳細</div> }),
    ).toEqual(<div>事故詳細</div>);
    expect(navigationMocks.notFound).not.toHaveBeenCalled();
  });

  it("公開可否ポリシーは照合済み100620だけを許可し、任意の詳細IDを拒否する", () => {
    expect(isPublicRouteAvailable("/accidents")).toBe(true);
    expect(isPublicRouteAvailable("/accidents/mhlw-100620")).toBe(true);
    expect(isPublicRouteAvailable("/accidents/mhlw-102021")).toBe(false);
  });

  it("事故個票は照合済みを含めてindex対象外を維持する", () => {
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((record) => !isIndexableAccident(record))).toBe(true);
  });

  it("MHLW形式のIDだけでは確認済み個票へ昇格しない", () => {
    const mhlwLike = all.filter((record) => /^mhlw-\d+$/.test(record.id));
    expect(mhlwLike.length).toBeGreaterThan(0);
    expect(mhlwLike.every((record) => !isIndexableAccident(record))).toBe(
      true,
    );
  });

  it.each(["mhlw-102021", "synthetic-heat-2026-001", "unknown-case"])(
    "未確認・synthetic・未知事故はmetadata生成前にnotFound: %s",
    async (id) => {
      await expect(
        generateMetadata({ params: Promise.resolve({ id }) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(navigationMocks.notFound).toHaveBeenCalledTimes(1);
    },
  );

  it("未確認事故は本文・JSON-LD・KY CTAを構築せずnotFound", async () => {
    await expect(
      AccidentDetailPage({
        params: Promise.resolve({ id: "synthetic-heat-2026-001" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("照合済み事故だけcanonical付きmetadataを返す", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "mhlw-100620" }),
    });
    expect(metadata.alternates).toEqual({
      canonical: "/accidents/mhlw-100620",
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it("出典状態を一度だけ示し、通常時に重複注意カードを並べない", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "app", "(main)", "accidents", "[id]", "page.tsx"),
      "utf8",
    );
    expect(source).not.toContain("データ種別の要約");
    expect(source).not.toContain("このページのデータ種別");
    expect(source).not.toContain("保護具の商品候補は表示していません");
    expect(source).not.toContain("公表事故そのものの再現ではありません");
    expect(source.indexOf("事故概要")).toBeLessThan(
      source.indexOf("<EvidenceCard"),
    );
    expect(source).toContain("<details");
  });
});
