import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { COURT_CASES } from "@/data/court-cases";
import { latestIsoDate, isIsoDate } from "@/lib/sitemap/lastmod";

/**
 * 柱C-3-3 回帰テスト: どの sitemap にも収載されていなかった実在 indexable ページの
 * 追加（/court-cases・/whats-new・/site-records 系）を固定し、欠落の再発を防ぐ。
 *
 * 旧状態: これらのページは page.tsx として実在し indexable だが、sitemap.ts にも
 * 子 sitemap(-articles/-circulars/-equipment) にも一切含まれず、検索エンジンに
 * 発見されにくい孤立ページだった。
 */
const BASE = "https://www.anzen-ai-portal.jp";

describe("sitemap.xml（柱C-3-3 欠落ページ追加）", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);
  const urlSet = new Set(urls);

  const has = (path: string) => urlSet.has(`${BASE}${path}`);

  it("新着ハブ /whats-new を収載する", () => {
    expect(has("/whats-new")).toBe(true);
  });

  it("労災裁判例の一覧・責任解説ページを収載する", () => {
    expect(has("/court-cases")).toBe(true);
    expect(has("/court-cases/employer-liability")).toBe(true);
  });

  it("印刷専用ページ /court-cases/print は robots noindex のため収載しない", () => {
    expect(has("/court-cases/print")).toBe(false);
  });

  it("個別判例ページ（/court-cases/[id]）を全件収載する", () => {
    for (const c of COURT_CASES) {
      expect(has(`/court-cases/${c.id}`)).toBe(true);
    }
    const courtCaseDetailUrls = urls.filter((u) =>
      /\/court-cases\/[^/]+$/.test(u.replace(`${BASE}`, "")),
    );
    // 一覧・解説・印刷を除いた個別判例URLが COURT_CASES と1対1
    const detailIds = courtCaseDetailUrls
      .map((u) => u.replace(`${BASE}/court-cases/`, ""))
      .filter((id) => id !== "employer-liability" && id !== "print");
    expect(new Set(detailIds).size).toBe(COURT_CASES.length);
  });

  it("記録キット（/site-records ハブ＋全サブページ）を収載する", () => {
    const expected = [
      "/site-records",
      "/site-records/patrol",
      "/site-records/near-miss",
      "/site-records/inspection",
      "/site-records/committee",
      "/site-records/induction",
      "/site-records/monthly",
      "/site-records/procedure",
      "/site-records/incident-report",
      "/site-records/qualifications",
      "/site-records/calendar",
    ];
    for (const path of expected) {
      expect(has(path)).toBe(true);
    }
  });

  it("URL の重複がない（二重掲載ゼロ）", () => {
    expect(urlSet.size).toBe(urls.length);
  });
});

/**
 * 柱C-3-3 追補2 回帰テスト: 孤立していた実在 indexable ページの追加を固定。
 * - /accident-news（重大災害事例ブラウザ・死亡災害DB類型検索・自己canonical・revalidate）
 * - /heat-illness-prevention/{acclimatization,log,poster}
 *   （令和7年6月改正安衛則対応の実在ツールページ・自己canonical・PageJsonLd付）
 * - /ky/paper（KY入力の正規ページ・robots index:true・/pdf の permanentRedirect 先）
 * これらは page.tsx として実在し indexable だが、いずれの sitemap にも含まれていなかった。
 * あわせて「収載してはいけない」境界（redirect スタブ / リリース前デモ / 印刷専用）を
 * 明示的にロックし、機械的な全ページ追加＝誤収載の再発を防ぐ。
 */
describe("sitemap.xml（柱C-3-3 追補2: 追加した孤立ページと非収載境界）", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);
  const urlSet = new Set(urls);
  const has = (path: string) => urlSet.has(`${BASE}${path}`);
  const entryFor = (path: string) => entries.find((e) => e.url === `${BASE}${path}`);

  it("重大災害事例ブラウザ /accident-news を収載する", () => {
    expect(has("/accident-news")).toBe(true);
  });

  it("熱中症対策ハブの実在サブページ3本を収載する", () => {
    expect(has("/heat-illness-prevention/acclimatization")).toBe(true);
    expect(has("/heat-illness-prevention/log")).toBe(true);
    expect(has("/heat-illness-prevention/poster")).toBe(true);
  });

  it("KY入力の正規ページ /ky/paper を収載する（robots index:true の実在ページ）", () => {
    expect(has("/ky/paper")).toBe(true);
  });

  it("非収載境界: /pdf は /ky/paper への permanentRedirect スタブのため収載しない", () => {
    // リダイレクト元URLは掲載せず、実体URL /ky/paper のみを収載する
    expect(has("/pdf")).toBe(false);
  });

  it("/accident-news の lastmod が死亡災害DBの更新日（/accidents と同一）に追従する", () => {
    const accidentNews = entryFor("/accident-news");
    const accidents = entryFor("/accidents");
    expect(accidentNews?.lastModified).toBeDefined();
    // 死亡災害DB由来のため /accidents と同一の accidentsDataUpdated を共有する
    expect(accidentNews?.lastModified).toBe(accidents?.lastModified);
  });

  it("非収載境界: redirect スタブ・リリース前デモ・印刷専用は収載しない", () => {
    // /about/cases → /about、/quick-start → /quick の redirect() スタブ（実体URLでない）
    expect(has("/about/cases")).toBe(false);
    expect(has("/quick-start")).toBe(false);
    // /organization は「正式リリース前のデモ版」モック
    expect(has("/organization")).toBe(false);
    // 印刷専用ユーティリティ
    expect(has("/accident-news/print")).toBe(false);
  });
});

/**
 * A-3 回帰テスト: サイトマップの役割分担。個別の通達/保護具/記事ページは専用の
 * 子サイトマップ（sitemap-circulars/-equipment/-articles.xml）が正本として出力するため、
 * 本体 sitemap.xml には直書きしない（同一URLの二重掲載＝役割崩壊を防止）。
 * セクションのランディングページ（/circulars・/equipment-finder）は本体に残す。
 */
describe("sitemap.xml（A-3 役割分担: 子サイトマップとの二重掲載なし）", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);
  const urlSet = new Set(urls);
  const has = (path: string) => urlSet.has(`${BASE}${path}`);

  it("個別の通達ページ（/circulars/<id>）を本体 sitemap.xml に直書きしない", () => {
    const circularDetails = urls.filter((u) =>
      /\/circulars\/[^/]+$/.test(u.replace(`${BASE}`, "")),
    );
    expect(circularDetails).toEqual([]);
  });

  it("個別の保護具ページ（/equipment/<id>）を本体 sitemap.xml に直書きしない", () => {
    const equipmentDetails = urls.filter((u) =>
      /\/equipment\/[^/]+$/.test(u.replace(`${BASE}`, "")),
    );
    expect(equipmentDetails).toEqual([]);
  });

  it("セクションのランディングページは本体に残す", () => {
    expect(has("/circulars")).toBe(true);
    expect(has("/equipment-finder")).toBe(true);
  });
});

/**
 * 柱C-3-4 回帰テスト: lastmod 動的化。各ページの lastmod が固定値ではなく
 * 「データの実更新日」に追従し、かつ未来日（将来施行日など）が混入しないことを固定する。
 */
describe("sitemap.xml（柱C-3-4 lastmod 動的化）", () => {
  const entries = sitemap();
  const today = new Date().toISOString().slice(0, 10);
  const find = (path: string) => entries.find((e) => e.url === `${BASE}${path}`);
  const lastmodOf = (path: string) => {
    const lm = find(path)?.lastModified;
    return typeof lm === "string" ? lm : String(lm);
  };

  it("全エントリの lastmod が YYYY-MM-DD 形式である", () => {
    for (const e of entries) {
      expect(isIsoDate(e.lastModified), `${e.url} -> ${String(e.lastModified)}`).toBe(true);
    }
  });

  it("未来日の lastmod が一件も無い（将来施行日が lastmod を未来に飛ばさない）", () => {
    for (const e of entries) {
      expect(String(e.lastModified) <= today, `${e.url} は未来日`).toBe(true);
    }
  });

  it("/court-cases 一覧の lastmod が判例の最新判決日に一致する", () => {
    const expected = latestIsoDate(
      COURT_CASES.map((c) => c.date),
      "2026-06-06",
      today,
    );
    expect(lastmodOf("/court-cases")).toBe(expected);
  });

  it("個別判例の lastmod が各判例の判決日に追従する", () => {
    for (const c of COURT_CASES) {
      const expected = latestIsoDate([c.date], "2026-06-06", today);
      expect(lastmodOf(`/court-cases/${c.id}`)).toBe(expected);
    }
  });

  it("トップ / の lastmod が主要データ源ページの lastmod 以上（全体の最大値）", () => {
    const top = lastmodOf("/");
    for (const path of ["/laws", "/circulars", "/court-cases", "/accidents", "/whats-new"]) {
      expect(top >= lastmodOf(path), `top(${top}) < ${path}(${lastmodOf(path)})`).toBe(true);
    }
  });

  it("動的化した主要ページの lastmod が旧固定値のままではない（データ追従の確認）", () => {
    // 旧実装は / と /laws が 2026-04-19、/whats-new が 2026-06-11 固定だった。
    // データに 2026-04-19 より新しい判例（2026-06-06）等が存在するため、
    // トップ・/laws のどちらかは必ず旧固定値より新しくなっているはず。
    expect(lastmodOf("/") >= "2026-06-06").toBe(true);
  });
});
