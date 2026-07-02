import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { egovLawRevisions } from "@/data/law-revisions/egov-revisions-loaded";
import { mockSummaryService } from "@/lib/services/summary-service";

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

function requestFor(revisionId: string) {
  return new NextRequest(
    `http://localhost/api/summaries?revisionId=${encodeURIComponent(revisionId)}`
  );
}

describe("GET /api/summaries — 一覧に出る全改正が要約404にならない", () => {
  beforeEach(() => {
    // APIキー無し環境（CI相当）＝ヒューリスティック生成パスを検証
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = ORIGINAL_KEY;
    }
  });

  it("法改正一覧（統合リスト）の全IDが ok:true を返す（e-Gov ETLの自動追加分を含む回帰ガード）", async () => {
    // 2026-06-29: e-Gov ETL が lr-egov-* を先頭に積んだ際、fallback探索が
    // realLawRevisions 単独だったため先頭カードの要約が404になりCIが恒常failした。
    expect(lawRevisionCores.length).toBeGreaterThan(0);
    for (const revision of lawRevisionCores) {
      const res = await GET(requestFor(revision.id));
      expect(res.status, `revisionId=${revision.id}`).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        data?: { summary?: { threeLineSummary?: string[] } };
      };
      expect(body.ok, `revisionId=${revision.id}`).toBe(true);
      expect(body.data?.summary?.threeLineSummary?.length ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("e-Gov自動取込の改正が1件以上存在し、その先頭IDが要約可能", async () => {
    expect(egovLawRevisions.length).toBeGreaterThan(0);
    const res = await GET(requestFor(egovLawRevisions[0].id));
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("実在しないIDは従来どおり404", async () => {
    const res = await GET(requestFor("lr-no-such-id"));
    expect(res.status).toBe(404);
  });
});

describe("mockSummaryService — lr-egov-* の汎用スタブ", () => {
  it("lr-egov-* はmockモードでも404にならない", async () => {
    const result = await mockSummaryService.getSummaryByRevisionId({
      revisionId: "lr-egov-322AC0000000049-20260624",
    });
    expect(result.ok).toBe(true);
  });
});
