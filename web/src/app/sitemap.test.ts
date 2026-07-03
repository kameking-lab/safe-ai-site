import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sitemap from "./sitemap";
import robots from "./robots";
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
 * 柱C-3-3 追補4 回帰テスト: 静的ルート再突合で発見した孤立ページの追加を固定。
 * - /ky/workers（作業員マスター＝KY用紙の参加者選択ツール・robots index:true・自己canonical・
 *   PageJsonLd付）。兄弟 /ky/paper と同じ KY全面再設計（#285）で追加されたが sitemap から
 *   漏れていた実在 indexable ページ。
 * あわせて「収載してはいけない」KY配下のツール状態ページ（/ky/list=保存済みKY一覧は
 * robots index:false）を境界としてロックし、機械的な全ページ追加＝誤収載を防ぐ。
 */
describe("sitemap.xml（柱C-3-3 追補4: /ky/workers 追加と KY配下の非収載境界）", () => {
  const entries = sitemap();
  const urlSet = new Set(entries.map((e) => e.url));
  const has = (path: string) => urlSet.has(`${BASE}${path}`);
  const entryFor = (path: string) => entries.find((e) => e.url === `${BASE}${path}`);

  it("作業員マスター /ky/workers を収載する（robots index:true の実在ツールページ）", () => {
    expect(has("/ky/workers")).toBe(true);
  });

  it("/ky/workers の lastmod は KY全面再設計の 2026-05-25（兄弟 /ky/paper と同節）", () => {
    expect(entryFor("/ky/workers")?.lastModified).toBe("2026-05-25");
  });

  it("非収載境界: /ky/list（保存済みKY一覧）は robots index:false のため収載しない", () => {
    expect(has("/ky/list")).toBe(false);
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

/**
 * ゴーストURL回帰ガード: sitemap() が出力する全 URL が、実在の Next.js ルート
 * （page.* を持つディレクトリ、または一致する動的セグメント）へ解決することを
 * ファイルシステムと機械突合する。
 *
 * 守る失敗モード: 当班以外（ux-records/ux-tools/ux-hub 等）がページを削除・改名した際に、
 * sitemap.ts のハンド保守された静的URL列に旧URLが取り残されると、検索エンジンへ
 * 404 のデッドURLを提出し続け、クロールバジェット浪費・Search Console エラーを招く。
 * 既存テストは「特定ページが載っている／非収載境界」だけを固定しており、
 * 「全URLが実在ルートへ解決する」逆方向のガードが皆無だった穴を埋める。
 *
 * 注: 動的ルート（[id] 等）は構造（セグメント数・動的位置）のみ突合する。
 * 動的パラメータ値の実在（例: /court-cases/[id] が COURT_CASES と1対1）は
 * 上の「柱C-3-3」describe が別途固定しているため、ここでは二重管理しない。
 */
describe("sitemap.xml（ゴーストURL回帰ガード: 全URLが実在ルートへ解決）", () => {
  const APP_DIR = dirname(fileURLToPath(import.meta.url)); // = src/app（本テストの所在）

  /** app 配下を走査し、page.* を持つルートのセグメント列（route group 除去・動的[x]保持）を集める */
  function collectRoutePatterns(dir: string = APP_DIR, segs: string[] = []): string[][] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const patterns: string[][] = [];
    if (entries.some((e) => e.isFile() && e.name.startsWith("page."))) {
      patterns.push(segs);
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      // 並列ルート(@slot)・プライベート(_folder)・route group( (x) ) はURLセグメントに寄与しない
      if (name.startsWith("@") || name.startsWith("_")) continue;
      const isGroup = name.startsWith("(") && name.endsWith(")");
      patterns.push(...collectRoutePatterns(join(dir, name), isGroup ? segs : [...segs, name]));
    }
    return patterns;
  }

  /** URL パスが、いずれかのルートパターン（静的一致 or 動的[x]セグメント）へ解決するか */
  function resolvesToRoute(pathname: string, patterns: string[][]): boolean {
    const segs = pathname.split("/").filter(Boolean);
    return patterns.some(
      (pat) =>
        pat.length === segs.length &&
        pat.every((p, i) => p === segs[i] || (p.startsWith("[") && p.endsWith("]"))),
    );
  }

  const patterns = collectRoutePatterns();
  const entries = sitemap();

  it("app 配下から page.* を持つルートを検出できている（走査のサニティ）", () => {
    // 静的ルートだけで 150 超（本監査時点で 172 静的 + 21 動的）。走査失敗の早期検知。
    expect(patterns.length).toBeGreaterThan(150);
    expect(patterns).toContainEqual([]); // ルート "/" が (main)/page.tsx から検出される
  });

  it("sitemap() の全URLが実在の page ルートへ解決する＝デッドURL0", () => {
    const unresolved = entries
      .map((e) => new URL(e.url).pathname)
      .filter((pathname) => !resolvesToRoute(pathname, patterns));
    expect(unresolved, `実在ルートへ解決しないURL: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("解決ロジックが偽陽性を出さない（構造的に存在しないパスは未解決）", () => {
    // トップレベルの動的ルートは存在しないため、未知の1階層パスは解決しない
    expect(resolvesToRoute("/this-route-does-not-exist-xyz", patterns)).toBe(false);
    // court-cases 配下に3階層のルートは無いため未解決
    expect(resolvesToRoute("/court-cases/foo/bar", patterns)).toBe(false);
    // 逆に、実在の動的ルート配下は構造一致で解決する（ガードの土台確認）
    expect(resolvesToRoute("/court-cases/any-id", patterns)).toBe(true);
  });
});

/**
 * 逆カバレッジガード（柱C-3-3 の逆方向）: 実在する **静的 indexable ページ** が
 * どの sitemap にも載っていない「発見性の穴」を機械検知する。
 *
 * 上のゴーストURLガードは sitemap → ルート（載っているURLが実在するか＝デッドURL0）を守る。
 * 本ガードは逆向き ルート → sitemap（実在するindexableページが載っているか＝欠落0）を守る。
 * 守る失敗モード: 当班以外（ux-records/ux-tools/ux-hub）が新しい公開ページを追加した際、
 * sitemap.ts のハンド保守された静的URL列へ収載し忘れると、そのページは検索エンジンから
 * 発見されにくい孤立ページのまま放置される（本ガード新設時に /profile・/organization の
 * 2 ページがまさにこの穴に落ちていたのを検出し収載した）。
 *
 * 「収載すべき」の判定は原則**機械的な除外規則**で行い、ページ単位の index 判断は各所有UI班に委ねる:
 *   (a) robots.ts の Disallow 配下（/admin/ ・/auth/ ・/dev/ ・/lms ・/api-docs ・/dpa 等。単一ソース）
 *   (b) ページ自身が `robots: { index: false }` を宣言（noindex のツール状態/印刷/検索結果ページ）
 *   (c) redirect / permanentRedirect スタブ（実体URLのみ収載し、リダイレクト元は載せない）
 * のいずれにも当たらない＝**indexable な実ページ**なら、sitemap 収載が必須。所有班が noindex に
 * したければ (b) を宣言すればガードは自動追従する（当班がページ本文の index 方針を決めるのではない）。
 *
 * (d) 例外＝当班（SEO班）が意図的に非収載とする indexable ページは {@link SEO_INTENTIONALLY_EXCLUDED}
 * に理由付きで明示列挙する。ページは index:true のまま（所有班が noindex 宣言していない）だが、
 * 発見性上の判断で sitemap から外す少数の例（正式リリース前デモ・極薄ランディング等）。ここに無い
 * 未知の indexable ページが現れたら本ガードが赤化し、「収載 or noindex or 例外追記」の判断を強制する。
 *
 * 動的ルート（[id] 等）は個別値の実在を上の柱C-3-3 / ゴーストガードが担保するため対象外。
 */
describe("sitemap.xml（逆カバレッジガード: 実在 indexable ページの欠落0）", () => {
  const APP_DIR = dirname(fileURLToPath(import.meta.url)); // = src/app

  /** app 配下を走査し、静的ルート（動的[x]を含まない）を [URLパス, page.*の絶対パス] で集める。 */
  function collectStaticRoutes(dir: string = APP_DIR, segs: string[] = []): Array<[string, string]> {
    const entries = readdirSync(dir, { withFileTypes: true });
    const out: Array<[string, string]> = [];
    const pageFile = entries.find((e) => e.isFile() && /^page\.(t|j)sx?$/.test(e.name));
    if (pageFile) out.push(["/" + segs.join("/"), join(dir, pageFile.name)]);
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      // api（非indexable）・signage（独立レイアウト＝別扱い）は横断検索/通常sitemapの対象外
      if (name === "api" || name === "signage") continue;
      if (name.startsWith("@") || name.startsWith("_")) continue; // 並列/プライベート
      const isGroup = name.startsWith("(") && name.endsWith(")");
      out.push(...collectStaticRoutes(join(dir, name), isGroup ? segs : [...segs, name]));
    }
    return out;
  }

  // robots.ts の UA:* Disallow を単一ソースとして参照（当班がここへ列を二重管理しない）。
  const commonDisallow: string[] = (() => {
    const star = robots().rules;
    const rules = Array.isArray(star) ? star : star ? [star] : [];
    const wildcard = rules.find((r) => r.userAgent === "*");
    const dis = wildcard?.disallow;
    return (Array.isArray(dis) ? dis : dis ? [dis] : []).filter((d): d is string => typeof d === "string");
  })();

  /** ルートが robots Disallow 配下か（"/admin/"→/admin 自身と配下、"/dpa"→/dpa と配下）。 */
  function isDisallowed(route: string): boolean {
    return commonDisallow.some((d) => {
      const base = d.endsWith("/") ? d.slice(0, -1) : d;
      return route === base || route.startsWith(base + "/");
    });
  }

  // (d) 当班が意図的に非収載とする indexable ページ（index:true のまま sitemap から外す少数例）。
  // 追加時は理由を必須とし、上の「非収載境界」describe の該当アサーションと対で管理する。
  const SEO_INTENTIONALLY_EXCLUDED = new Set<string>([
    // 事業所・部署ダッシュボード。「正式リリース前デモ版モック」のため公開検索面へは出さない
    // （非収載境界テストで has("/organization")===false を固定）。noindex 化されれば削除してよい。
    "/organization",
  ]);

  const staticRoutes = collectStaticRoutes().filter(([r]) => !r.includes("["));
  const sitemapPaths = new Set(sitemap().map((e) => new URL(e.url).pathname));

  /** noindex 宣言 or redirect スタブ＝収載不要。機械検知（ページ本文の index 方針は所有班マター）。 */
  function isExcludedBySource(file: string): boolean {
    const src = readFileSync(file, "utf8");
    if (/robots:\s*\{[^}]*index:\s*false/.test(src)) return true; // 明示 noindex
    if (/\b(?:permanentRedirect|redirect)\s*\(\s*["'`]/.test(src)) return true; // redirect スタブ
    return false;
  }

  it("静的ルートを十分に検出できている（走査のサニティ）", () => {
    expect(staticRoutes.length).toBeGreaterThan(150);
    expect(staticRoutes.some(([r]) => r === "/")).toBe(true);
  });

  it("robots Disallow を robots.ts から単一ソースで参照できている", () => {
    expect(commonDisallow).toContain("/admin/");
    expect(isDisallowed("/admin/health")).toBe(true);
    expect(isDisallowed("/lms")).toBe(true);
    expect(isDisallowed("/laws")).toBe(false); // 前方一致の誤爆なし（/lms が /laws を巻き込まない）
  });

  it("実在する indexable な静的ページが全て sitemap に収載されている＝欠落0", () => {
    const missing = staticRoutes
      .filter(([route]) => !sitemapPaths.has(route))
      .filter(([route]) => !isDisallowed(route))
      .filter(([route]) => !SEO_INTENTIONALLY_EXCLUDED.has(route))
      .filter(([, file]) => !isExcludedBySource(file))
      .map(([route]) => route);
    expect(
      missing,
      `indexable なのに sitemap 未収載のページ（sitemap.ts へ追加するか、所有UI班が該当ページに ` +
        `robots:{index:false} を宣言すること）: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("除外分類のサニティ（各除外機構が実在ページで機能している）", () => {
    // (a) Disallow 配下
    expect(isDisallowed("/admin/status")).toBe(true);
    // (b) noindex 宣言と (c) redirect スタブが実ファイルで検知できる
    const byRoute = new Map(staticRoutes);
    const search = byRoute.get("/search");
    const pdf = byRoute.get("/pdf");
    expect(search && isExcludedBySource(search)).toBe(true); // /search は index:false
    expect(pdf && isExcludedBySource(pdf)).toBe(true); // /pdf は permanentRedirect スタブ
    // 本ガード新設で収載した /profile は sitemap 側に載っている（回帰固定）。
    expect(sitemapPaths.has("/profile")).toBe(true);
    // (d) 意図的例外 /organization は index:true だが sitemap 非収載のまま（デモ）。
    expect(byRoute.has("/organization")).toBe(true); // ルートは実在
    const org = byRoute.get("/organization");
    expect(org && isExcludedBySource(org)).toBe(false); // noindex/redirect ではない（=例外扱いが必要）
    expect(sitemapPaths.has("/organization")).toBe(false); // sitemap には載せない
  });
});
