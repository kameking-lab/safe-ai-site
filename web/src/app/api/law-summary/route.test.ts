import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Gemini REST 呼び出し（fetchWithTimeout）をモックし、mode 別プロンプトの規約を固定する。
// 法令ナビ AI解説（docs/horei-navi-foundation-2026-07-11 §2-6）は本ルートの mode:"explain" を
// 再利用する＝後方互換（mode 省略時は従来の要約プロンプト）をここで機械固定する。
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/external/fetch-with-timeout", () => ({
  fetchWithTimeout: fetchMock,
}));

import { POST } from "./route";

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

function requestFor(body: Record<string, unknown>) {
  return new Request("http://localhost/api/law-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ARTICLE = {
  law: "労働安全衛生規則",
  articleNum: "第151条の14",
  text: "事業者は、車両系荷役運搬機械等を主たる用途以外の用途に使用してはならない。",
};

function geminiOk(text: string) {
  return {
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  } as unknown as Response;
}

describe("POST /api/law-summary — mode 別プロンプト規約", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = ORIGINAL_KEY;
    }
  });

  it("mode 省略時は従来の要約プロンプト（後方互換）", async () => {
    fetchMock.mockResolvedValueOnce(geminiOk("要約テキスト【出典】https://laws.e-gov.go.jp/law/x"));
    const res = await POST(requestFor(ARTICLE));
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as {
      contents: { parts: { text: string }[] }[];
    };
    const prompt = sent.contents[0].parts[0].text;
    expect(prompt).toContain("3〜5行で分かりやすく要約");
    expect(prompt).not.toContain("平易な日本語で解説");
    const body = (await res.json()) as { summary: string; source: string };
    expect(body.source).toBe("ai");
  });

  it("mode:'explain' は平易解説プロンプト＋根拠条文の自動添付指示（原文が正・解説は補助）", async () => {
    fetchMock.mockResolvedValueOnce(geminiOk("解説テキスト【根拠条文】…【原文】…"));
    const res = await POST(requestFor({ ...ARTICLE, mode: "explain" }));
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as {
      contents: { parts: { text: string }[] }[];
    };
    const prompt = sent.contents[0].parts[0].text;
    expect(prompt).toContain("平易な日本語で解説");
    // 根拠条文（当該条の法令名・条番号）と e-Gov 原文URLを必ず末尾に添付させる
    expect(prompt).toContain(`【根拠条文】${ARTICLE.law} ${ARTICLE.articleNum}`);
    expect(prompt).toContain("e-GovのURL");
    // 捏造防止（根拠のない義務・数値の付け足し禁止）を明示
    expect(prompt).toContain("根拠のない義務・数値を付け足さない");
  });

  it("APIキー未設定時は mode に関わらずフォールバック（条文冒頭の再掲）を返しキャッシュ可能", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await POST(requestFor({ ...ARTICLE, mode: "explain" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { summary: string; source: string };
    expect(body.source).toBe("fallback");
    expect(body.summary).toContain(ARTICLE.law);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
