import { describe, it, expect } from "vitest";
import {
  searchItems,
  countByCategory,
  buildSearchIndex,
  CATEGORY_META,
  SEARCH_CATEGORIES,
  getSearchDocumentTypeLabel,
  type SearchItem,
} from "./search-index";

const ITEMS: SearchItem[] = [
  {
    id: "a",
    title: "アーク溶接",
    subtitle: "特別教育 安衛則36条",
    category: "education",
    url: "/edu/arc",
  },
  {
    id: "b",
    title: "アーク溶接機の点検",
    subtitle: "感電災害",
    category: "accident",
    url: "/acc/arc",
  },
  {
    id: "c",
    title: "酸素欠乏",
    subtitle: "酸欠 特別教育",
    category: "education",
    url: "/edu/o2",
  },
  {
    id: "d",
    title: "トルエン",
    subtitle: "CAS 108-88-3 有機溶剤",
    category: "chemical",
    url: "/chem/toluene",
  },
  {
    id: "e",
    title: "基発0401第1号",
    subtitle: "通達 化学物質",
    category: "notice",
    url: "/notice/1",
  },
];

describe("searchItems", () => {
  it("空クエリは空配列を返す", () => {
    expect(searchItems(ITEMS, "", "all")).toEqual([]);
    expect(searchItems(ITEMS, "   ", "all")).toEqual([]);
  });

  it("完全一致 > 前方一致 > 部分一致 > subtitle一致 の順にスコアリングする", () => {
    const results = searchItems(ITEMS, "アーク溶接", "all");
    // 'アーク溶接'(完全一致, 100) が 'アーク溶接機の点検'(前方一致, 80) より上位
    expect(results.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("subtitle のみ一致もヒットする", () => {
    const results = searchItems(ITEMS, "酸欠", "all");
    expect(results.map((r) => r.id)).toContain("c");
  });

  it("カテゴリ指定でプールを絞り込む", () => {
    const edu = searchItems(ITEMS, "特別教育", "education");
    expect(edu.every((r) => r.category === "education")).toBe(true);
    // 'a'(subtitle に特別教育) と 'c'(subtitle に特別教育) がヒット、accident の 'b' は除外
    expect(edu.map((r) => r.id).sort()).toEqual(["a", "c"]);
  });

  it("表記ゆれ（全角・小書き・長音）を正規化して一致させる", () => {
    // 全角英数・ハイフン種別が違っても CAS 番号でヒット
    expect(searchItems(ITEMS, "108-88-3", "all").map((r) => r.id)).toContain(
      "d",
    );
  });

  it("limit 既定は 10、明示でそれを超える件数を返せる", () => {
    const many: SearchItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `n${i}`,
      title: `溶接作業 ${i}`,
      subtitle: "訓練",
      category: "education",
      url: `/x/${i}`,
    }));
    expect(searchItems(many, "溶接", "all")).toHaveLength(10);
    expect(searchItems(many, "溶接", "all", 100)).toHaveLength(25);
  });

  // T1: cross-search エンジン（AND＋シノニム＋keywords）への載せ替え規約。
  // 旧実装はクエリ全体を 1 つの部分文字列として扱い、2 語クエリが全滅していた。
  it("複数語クエリは全語 AND（全語がどこかに当たった項目のみ採用）", () => {
    const items: SearchItem[] = [
      {
        id: "x",
        title: "足場の作業床",
        subtitle: "安衛則563条",
        category: "law",
        url: "/x",
        keywords: ["足場", "作業床"],
      },
      {
        id: "y",
        title: "足場の組立て",
        subtitle: "特別教育",
        category: "law",
        url: "/y",
        keywords: ["足場"],
      },
      {
        id: "z",
        title: "天井クレーン",
        subtitle: "作業床のない設備",
        category: "law",
        url: "/z",
        keywords: ["作業床"],
      },
    ];
    // 「足場 作業床」は両語を満たす x のみ（y=作業床なし・z=足場なし は除外）
    expect(searchItems(items, "足場 作業床", "all").map((r) => r.id)).toEqual([
      "x",
    ]);
  });

  it("keywords に当たる語でもヒットする（title/subtitle に出ない別名）", () => {
    const items: SearchItem[] = [
      {
        id: "k",
        title: "第563条",
        subtitle: "安衛則",
        category: "law",
        url: "/k",
        keywords: ["作業床", "足場"],
      },
    ];
    // title/subtitle には無い「作業床」が keywords 経由でヒット
    expect(searchItems(items, "作業床", "all").map((r) => r.id)).toContain("k");
  });

  it("シノニム展開が効く（アスベスト→石綿／石綿則）", () => {
    const items: SearchItem[] = [
      {
        id: "s",
        title: "石綿則 第3条",
        subtitle: "石綿障害予防規則 事前調査",
        category: "law",
        url: "/s",
        keywords: ["石綿", "事前調査"],
      },
    ];
    // 口語「アスベスト」は query-expansion で「石綿」「石綿則」へ展開され条文に届く
    expect(searchItems(items, "アスベスト", "all").map((r) => r.id)).toContain(
      "s",
    );
  });
});

describe("countByCategory", () => {
  it("空クエリは全カテゴリ0", () => {
    const c = countByCategory(ITEMS, "");
    expect(c.all).toBe(0);
    expect(c.education).toBe(0);
  });

  it("カテゴリ別に集計し all は合計に一致する", () => {
    const c = countByCategory(ITEMS, "アーク溶接");
    expect(c.education).toBe(1); // 'a'
    expect(c.accident).toBe(1); // 'b'
    expect(c.all).toBe(c.education + c.accident);
  });
});

describe("CATEGORY_META", () => {
  it("全カテゴリにラベルと配色を持つ", () => {
    for (const key of [
      "law",
      "plain",
      "notice",
      "chemical",
      "education",
      "accident",
      "precedent",
      "glossary",
      "faq",
      "sign",
    ] as const) {
      expect(CATEGORY_META[key].label).toBeTruthy();
      expect(CATEGORY_META[key].bgColor).toMatch(/^bg-/);
      expect(CATEGORY_META[key].textColor).toMatch(/^text-/);
    }
  });
});

describe("SEARCH_CATEGORIES — カテゴリタブ単一ソースのドリフト固定", () => {
  // /search タブと ⌘K パレットが共有する表示順配列。CATEGORY_META（ラベル・配色の正本）と
  // 集合が一致しなければ、どちらかのUIで新カテゴリのタブが欠落／幽霊タブが出る。
  const metaKeys = Object.keys(CATEGORY_META).sort();

  it("CATEGORY_META の全キーを過不足なく網羅する（両方向ドリフト検知）", () => {
    const tabKeys = [...SEARCH_CATEGORIES].sort();
    // メタに足したのにタブへ出し忘れ／タブにあるのにメタが無い、の両方を1つの等価で検知。
    expect(tabKeys).toEqual(metaKeys);
  });

  it("重複カテゴリを含まない（同一タブの二重描画を防ぐ）", () => {
    expect(new Set(SEARCH_CATEGORIES).size).toBe(SEARCH_CATEGORIES.length);
  });

  it("件数バッジ集計 countByCategory のキーと整合する（未集計カテゴリを防ぐ）", () => {
    // 空クエリでも全カテゴリのキーが 0 で初期化されていること＝タブに出す全カテゴリが集計対象。
    const counts = countByCategory([], "");
    for (const cat of SEARCH_CATEGORIES) {
      expect(counts[cat]).toBe(0);
    }
  });
});

describe("buildSearchIndex — 用語集（glossary）の収載", () => {
  it("@/data/glossary の語が glossary カテゴリで /glossary へリンクされる", async () => {
    const index = await buildSearchIndex();
    const glossary = index.filter((i) => i.category === "glossary");
    // 4 バッチ＝152 語を収載（基礎語は /glossary 本体直書きのため対象外）
    expect(glossary.length).toBeGreaterThanOrEqual(150);
    expect(glossary.every((i) => i.url === "/glossary")).toBe(true);
    expect(glossary.every((i) => i.id.startsWith("glossary-"))).toBe(true);
  });

  it("用語名・読み（かな）・定義語のいずれからもヒットする", async () => {
    const index = await buildSearchIndex();
    // 用語名で完全一致（バッチ1 法令語）
    expect(searchItems(index, "労働基準法", "glossary").length).toBeGreaterThan(
      0,
    );
    // subtitle に読みと定義冒頭を載せているため、かな読みでも引ける
    const byReading = searchItems(index, "ろうどうきじゅんほう", "glossary");
    expect(byReading.some((i) => i.title === "労働基準法")).toBe(true);
  });

  it("countByCategory の all は glossary を含む全カテゴリ合計に一致する", async () => {
    const index = await buildSearchIndex();
    const c = countByCategory(index, "安全");
    expect(c.all).toBe(
      c.law +
        c.plain +
        c.revision +
        c.notice +
        c.chemical +
        c.equipment +
        c.education +
        c.accident +
        c.precedent +
        c.glossary +
        c.faq +
        c.sign +
        c.article +
        c.feature,
    );
  });
});

describe("buildSearchIndex — FAQ の収載", () => {
  it("一次資料を再確認するまで旧FAQを検索結果へ出さない", async () => {
    const [index, faqMod] = await Promise.all([
      buildSearchIndex(),
      import("@/data/faqs"),
    ]);
    const faqItems = index.filter((i) => i.category === "faq");
    expect(faqMod.ALL_FAQS).toEqual([]);
    expect(faqItems).toEqual([]);
    expect(
      index.some((i) => i.url === "/faq" || i.url.startsWith("/faq/")),
    ).toBe(false);
  });
});

describe("buildSearchIndex — 安全標識（sign）の収載", () => {
  it("規格・法令・図版権利を再確認するまで旧標識を検索結果へ出さない", async () => {
    const [index, signMod] = await Promise.all([
      buildSearchIndex(),
      import("@/data/safety-signs"),
    ]);
    const signItems = index.filter((i) => i.category === "sign");
    expect(signMod.SAFETY_SIGNS).toEqual([]);
    expect(signItems).toEqual([]);
    expect(
      index.some(
        (i) => i.url === "/safety-signs" || i.url.startsWith("/safety-signs/"),
      ),
    ).toBe(false);
  });
});

describe("buildSearchIndex — 法改正記事（article）の収載", () => {
  it("公開済み記事が article カテゴリで /articles/<slug> へ深リンクされる（横断検索から丸ごと欠落していた穴の是正）", async () => {
    const [index, { getPublishedArticleSearchEntries }] = await Promise.all([
      buildSearchIndex(),
      import("@/lib/articles-search-source"),
    ]);
    const articleItems = index.filter((i) => i.category === "article");
    // ブラウザ安全な射影源の公開済みエントリを漏れなく収載＝件数一致（欠落 0）
    expect(articleItems.length).toBe(getPublishedArticleSearchEntries().length);
    expect(articleItems.length).toBeGreaterThanOrEqual(1);
    expect(articleItems.every((i) => i.id.startsWith("article-"))).toBe(true);
    // 深リンク先は個別記事のみ＝裸 /articles 一覧には落とさない
    expect(articleItems.every((i) => i.url.startsWith("/articles/"))).toBe(
      true,
    );
    expect(articleItems.some((i) => i.url === "/articles")).toBe(false);
    // subtitle（記事概要）が結果一覧で内容判別に足る
    expect(articleItems.every((i) => i.subtitle.length > 0)).toBe(true);
  });

  it("深リンク先 slug 集合が正本 getPublishedArticleSlugs に解決する（幽霊URL 0＝generateStaticParams 一致）", async () => {
    const [index, { getPublishedArticleSlugs }] = await Promise.all([
      buildSearchIndex(),
      import("@/lib/articles"),
    ]);
    // 詳細 /articles/[slug] の generateStaticParams は getPublishedArticleSlugs() を返し、
    // 未知/未公開 slug は getPublishedArticleBySlug が null→notFound()。収載集合＝解決集合を固定。
    const canonical = new Set(getPublishedArticleSlugs());
    const linkedSlugs = index
      .filter((i) => i.category === "article")
      .map((i) => i.url.replace(/^\/articles\//, ""));
    expect(linkedSlugs.every((s) => canonical.has(s))).toBe(true);
    // 公開済み記事を漏れなく収載＝双方向一致（soft404 ゼロ・発見性の穴ゼロ）
    expect(new Set(linkedSlugs)).toEqual(canonical);
  });

  it("タグ・キーワードから引け、結果が該当記事へ着地する", async () => {
    const index = await buildSearchIndex();
    // タグ「熱中症」で法改正記事がヒット
    const heat = searchItems(index, "熱中症", "article");
    expect(heat.length).toBeGreaterThan(0);
    expect(
      heat.some((i) => i.url === "/articles/heat-stroke-2025-mandatory"),
    ).toBe(true);
    // 隔離中のフルハーネス記事は検索へ出さない
    const harness = searchItems(index, "フルハーネス", "article");
    expect(
      harness.some((i) => i.url === "/articles/fullharness-2022-revision"),
    ).toBe(false);
  });
});

describe("buildSearchIndex — 機能ページ（feature）の収載", () => {
  it("FLAGSHIP_FEATURES の主要機能が feature カテゴリで収載される（機能名 0 件だった穴の是正）", async () => {
    const [index, { getSitePageSearchEntries }, { FLAGSHIP_FEATURES }] =
      await Promise.all([
        buildSearchIndex(),
        import("@/lib/site-pages-search-source"),
        import("@/config/flagship-nav"),
      ]);
    const featureItems = index.filter((i) => i.category === "feature");
    // feature カテゴリは FLAGSHIP 目的地ページ（id=page-*）と病態別ガイド（id=illness-guide-*）の
    // 2 源を持つ。FLAGSHIP 射影源のエントリを漏れなく収載＝件数一致（欠落 0）は page-* に限定して固定。
    const pageItems = featureItems.filter((i) => i.id.startsWith("page-"));
    expect(pageItems.length).toBe(getSitePageSearchEntries().length);
    expect(pageItems.length).toBeGreaterThanOrEqual(FLAGSHIP_FEATURES.length);
    // url はベースパス（ハッシュ・クエリを含まない）＝実在ルートへ解決（drift ガードで機械固定）。
    // subtitle 非空は feature カテゴリ全体（目的地ページ＋病態別ガイド）で担保する。
    expect(featureItems.every((i) => /^\/[^#?]*$/.test(i.url))).toBe(true);
    expect(featureItems.every((i) => i.subtitle.length > 0)).toBe(true);
  });

  it("機能名クエリは公開機能だけへ到達する", async () => {
    const index = await buildSearchIndex();
    expect(
      searchItems(index, "サイネージ", "feature").some(
        (i) => i.url === "/signage",
      ),
    ).toBe(true);
    expect(
      searchItems(index, "化学物質RA", "feature").some(
        (i) => i.url === "/chemical-ra",
      ),
    ).toBe(true);
    expect(
      searchItems(index, "作業環境測定", "feature").some(
        (i) => i.url === "/work-environment-measurement",
      ),
    ).toBe(false);
    expect(searchItems(index, "事故 分析", "feature")).toEqual([]);
    expect(
      searchItems(index, "重大災害", "feature").some(
        (item) => item.url === "/accident-news",
      ),
    ).toBe(true);
  });

  it("補充: FLAGSHIP 外の助成金ハブが「助成金」「補助金」で着地する（0 件だった穴の是正）", async () => {
    const index = await buildSearchIndex();
    expect(
      searchItems(index, "助成金", "feature").some(
        (i) => i.url === "/subsidies",
      ),
    ).toBe(true);
    expect(
      searchItems(index, "補助金", "feature").some(
        (i) => i.url === "/subsidies",
      ),
    ).toBe(true);
    // 試算ツールも支給額シミュレーションの語で着地する
    expect(
      searchItems(index, "助成金 試算", "feature").some(
        (i) => i.url === "/subsidies/calculator",
      ),
    ).toBe(true);
  });

  it("補充: 対象4類型のペルソナ別ポータルが立場名クエリで着地する（0 件だった穴の是正）", async () => {
    const index = await buildSearchIndex();
    // 立場名（現場監督/一人親方/安全担当/コンサル）で自分専用の入口ハブ /for/<persona> へ着地。
    const lands = (q: string, url: string) =>
      searchItems(index, q, "feature").some((i) => i.url === url);
    expect(lands("職長", "/for/construction")).toBe(true);
    expect(lands("現場代理人", "/for/construction")).toBe(true);
    expect(lands("一人親方", "/for/solo")).toBe(true);
    expect(lands("安全衛生担当", "/for/manager")).toBe(true);
    expect(lands("社労士", "/for/consultant")).toBe(true);
    expect(lands("労働安全コンサルタント", "/for/consultant")).toBe(true);
  });
});

describe("buildSearchIndex — 建設計算コーナー（feature）の収載＋現場語での着地", () => {
  it("独立検証済みの低リスク算術4件だけを収載する", async () => {
    const [index, { getCalcSearchEntries }, registry] = await Promise.all([
      buildSearchIndex(),
      import("@/lib/construction-calc/search-source"),
      import("@/lib/construction-calc/registry"),
    ]);
    const entries = getCalcSearchEntries();
    const calcItems = index.filter((i) => i.id.startsWith("calc-"));
    const expectedSlugs = [
      "concrete-volume",
      "rebar-mass",
      "slope-ratio-convert",
      "soil-volume-conversion",
    ];
    expect(registry.CONSTRUCTION_CALCULATORS.map((c) => c.slug).sort()).toEqual(
      expectedSlugs,
    );
    expect(
      entries.map((entry) => entry.url.replace("/construction-calc/", "")).sort(),
    ).toEqual(expectedSlugs);
    expect(
      calcItems.map((item) => item.url.replace("/construction-calc/", "")).sort(),
    ).toEqual(expectedSlugs);
    expect(registry.QUARANTINED_CONSTRUCTION_CALCULATORS.length).toBe(25);
  });

  it("法令適合・構造・電気・玉掛け判断を返す旧計算機を収載しない", async () => {
    const index = await buildSearchIndex();
    const quarantined = [
      "/construction-calc/safety-net-check",
      "/construction-calc/sling-wire-load",
      "/construction-calc/scaffold-tankan-check",
      "/construction-calc/excavation-slope",
      "/construction-calc/cable-ampacity",
    ];
    for (const url of quarantined) {
      expect(index.some((item) => item.url === url)).toBe(false);
    }
  });
});

describe("buildSearchIndex — 治療と仕事の両立支援 病態別ガイド（feature）の収載", () => {
  it("ILLNESS_CATEGORIES の全疾患が feature カテゴリで illness-guide 深リンクへ着地（幽霊URL 0）", async () => {
    const [index, { ILLNESS_CATEGORIES }] = await Promise.all([
      buildSearchIndex(),
      import("@/data/illness-considerations"),
    ]);
    const guideItems = index.filter((i) => i.id.startsWith("illness-guide-"));
    // 収載集合＝正本の全疾患（欠落 0・水増し 0）
    expect(guideItems.length).toBe(ILLNESS_CATEGORIES.length);
    expect(guideItems.length).toBeGreaterThanOrEqual(6);
    expect(guideItems.every((i) => i.category === "feature")).toBe(true);
    // 全 url が generateStaticParams（dynamicParams=false）の解決集合へ着地＝幽霊URL 0。
    const validUrls = new Set(
      ILLNESS_CATEGORIES.map(
        (c) => `/treatment-work-balance/illness-guide/${c.id}`,
      ),
    );
    expect(guideItems.every((i) => validUrls.has(i.url))).toBe(true);
    // 親ハブ止まりでなく疾患別の深リンクである（発見性の穴＝疾患名 0 件の是正）。
    expect(guideItems.every((i) => i.url !== "/treatment-work-balance")).toBe(
      true,
    );
    expect(guideItems.every((i) => i.subtitle.length > 0)).toBe(true);
  });

  it("疾患名クエリで個別ガイドへ着地する（がん・脳卒中・糖尿病）", async () => {
    const index = await buildSearchIndex();
    expect(
      searchItems(index, "がん 両立支援", "feature").some(
        (i) => i.url === "/treatment-work-balance/illness-guide/cancer",
      ),
    ).toBe(true);
    expect(
      searchItems(index, "脳卒中 復職", "feature").some(
        (i) => i.url === "/treatment-work-balance/illness-guide/stroke",
      ),
    ).toBe(true);
    expect(
      searchItems(index, "糖尿病 就業配慮", "feature").some(
        (i) => i.url === "/treatment-work-balance/illness-guide/diabetes",
      ),
    ).toBe(true);
  });
});

describe("buildSearchIndex — 通達（notice）の個別詳細への深リンク", () => {
  it("全 notice が /circulars/<id> へ深リンクし、裸 /resources?q= は使わない", async () => {
    const index = await buildSearchIndex();
    const notices = index.filter((i) => i.category === "notice");
    expect(notices.length).toBeGreaterThan(0);
    // 旧実装の /resources?q=（q を無視＝全件一覧へ落ちる）が残っていないこと
    expect(notices.every((i) => i.url.startsWith("/circulars/"))).toBe(true);
    expect(notices.some((i) => i.url.includes("/resources"))).toBe(false);
    // url の id と item.id（notice-<id>）が対応する
    expect(
      notices.every(
        (i) => i.url === `/circulars/${i.id.replace(/^notice-/, "")}`,
      ),
    ).toBe(true);
  });

  it("深リンク先 id 集合が正本 mhlwNotices に解決する（幽霊URL 0）", async () => {
    const index = await buildSearchIndex();
    const { publicMhlwNotices: mhlwNotices } =
      await import("@/data/public-mhlw-notices");
    const canonical = new Set(mhlwNotices.map((n) => n.id));
    const linkedIds = index
      .filter((i) => i.category === "notice")
      .map((i) => i.url.replace(/^\/circulars\//, ""));
    // 詳細 /circulars/[id] の generateStaticParams が解決する集合と一致＝soft404 ゼロ
    expect(linkedIds.every((id) => canonical.has(id))).toBe(true);
    expect(linkedIds.length).toBe(mhlwNotices.length);
  });
});

describe("buildSearchIndex — 化学物質（chemical）の個別詳細への深リンク", () => {
  it("名称+CAS exact queryは同一canonicalを重複表示せず詳細レコードを代表にする", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "トルエン 108-88-3", "all", 10);
    const canonical = "/chemical-database/108-88-3";

    expect(results[0]?.id).toBe("chem-mock-cs-002");
    expect(results.filter((item) => item.url === canonical)).toHaveLength(1);
    expect(results.some((item) => item.id === "chem-mhlw-108-88-3-skin")).toBe(
      false,
    );
  });

  it("canonical 詳細を持つ CAS は /chemical-database/<cas> へ深リンクする", async () => {
    const index = await buildSearchIndex();
    const chemicals = index.filter((i) => i.category === "chemical");
    expect(chemicals.length).toBeGreaterThan(0);
    const detailLinked = chemicals.filter((i) =>
      i.url.startsWith("/chemical-database/"),
    );
    // 濃度基準DB収載（≒95%）が canonical 個別詳細へ深リンクされる
    expect(detailLinked.length).toBeGreaterThan(0);
  });

  it("深リンク先 CAS はすべて濃度基準DBのキー集合に解決する（幽霊URL 0）", async () => {
    const index = await buildSearchIndex();
    const casKeys = (
      await import("@/lib/cross-search/chemical-detail-cas.json")
    ).default as string[];
    const canonical = new Set(casKeys);
    const linkedCas = index
      .filter(
        (i) =>
          i.category === "chemical" && i.url.startsWith("/chemical-database/"),
      )
      .map((i) =>
        decodeURIComponent(i.url.replace(/^\/chemical-database\//, "")),
      );
    // 詳細 /chemical-database/[cas] が notFound() で弾かない CAS のみ＝soft404 ゼロ
    expect(linkedCas.length).toBeGreaterThan(0);
    expect(linkedCas.every((cas) => canonical.has(cas))).toBe(true);
  });

  it("濃度基準DB未収載の CAS は一覧クエリページへフォールバックする（取り逃さない）", async () => {
    const index = await buildSearchIndex();
    const fallback = index.filter(
      (i) =>
        i.category === "chemical" && i.url.startsWith("/chemical-database?q="),
    );
    // フォールバックも化学物質ヒットとして残る＝未収載でも 0 件にしない
    expect(fallback.every((i) => i.url.includes("q="))).toBe(true);
  });
});

describe("buildSearchIndex — 法令条文（law）の収載", () => {
  it("curated 中核法令が law カテゴリで /law-search へ深リンクされる", async () => {
    const index = await buildSearchIndex();
    // law カテゴリの収載集合は「curated 条文（/law-search 深リンク）」＋
    // 「法令ナビ 別表インデックス（/law-navi/beppyo#アンカー）」の2系のみ
    //（docs/horei-navi-foundation-2026-07-11 §2-5。別表は法令内容＝条文と同じ権威ティア）。
    const laws = index.filter(
      (i) => i.category === "law" && !i.id.startsWith("law-navi-beppyo-"),
    );
    const beppyo = index.filter(
      (i) => i.category === "law" && i.id.startsWith("law-navi-beppyo-"),
    );
    // curated 中核（厚労省PDF補完=mhlwLawArticles を除く）で数百条規模を収載
    expect(laws.length).toBeGreaterThanOrEqual(300);
    expect(laws.every((i) => i.id.startsWith("law-"))).toBe(true);
    // 条文は全件が /law-search への深リンク（条番号があれば law= と art= の両方を持つ）
    expect(laws.every((i) => i.url.startsWith("/law-search?law="))).toBe(true);
    expect(laws.some((i) => i.url.includes("&art="))).toBe(true);
    // 別表は全件が /law-navi/beppyo のアンカーへ（幽霊URL 0）
    expect(beppyo.length).toBeGreaterThanOrEqual(9);
    expect(beppyo.every((i) => i.url.startsWith("/law-navi/beppyo#"))).toBe(
      true,
    );
  });

  it("法令名・略称・条番号・条文見出し語のいずれからもヒットする", async () => {
    const index = await buildSearchIndex();
    // 略称（安衛則）— 前方一致で title にヒット
    expect(searchItems(index, "安衛則", "law").length).toBeGreaterThan(0);
    // 正式名称（subtitle 先頭に full law 名を載せている）
    expect(
      searchItems(index, "労働安全衛生規則", "law").length,
    ).toBeGreaterThan(0);
    // 条文見出し語（例: 安全管理者の選任）が subtitle からヒット
    expect(searchItems(index, "安全管理者", "law").length).toBeGreaterThan(0);
  });

  it("深リンク URL が law-search-panel と同形（law=正式名称 & art=条番号）で当該条文に解決する", async () => {
    const index = await buildSearchIndex();
    const anzeiHit = searchItems(index, "安全管理者の選任", "law")[0];
    expect(anzeiHit).toBeTruthy();
    // law= は full law 名（パネルの filter が a.law === selectedLaw で照合するため）
    expect(anzeiHit.url).toContain(
      `law=${encodeURIComponent("労働安全衛生規則")}`,
    );
    expect(anzeiHit.url).toMatch(/&art=/);
  });

  it("厚労省PDF補完（バンドル名）は law カテゴリに混入しない", async () => {
    const index = await buildSearchIndex();
    const laws = index.filter((i) => i.category === "law");
    // mhlwLawArticles の law 値（文書バンドル名）は除外済み＝条文 title は略称+条番号のみ
    expect(laws.every((i) => i.title.length > 0)).toBe(true);
    // id 重複なし（law|条番号 のユニーク化）
    const ids = new Set(laws.map((i) => i.id));
    expect(ids.size).toBe(laws.length);
  });
});

describe("buildSearchIndex — 法改正（revision）の収載", () => {
  it("正本 lawRevisionCores（placeholder除外）と ID 集合が一致する", async () => {
    const { lawRevisionCores } = await import("@/data/mock/law-revisions");
    const index = await buildSearchIndex();
    const revisions = index.filter((i) => i.category === "revision");
    expect(revisions.length).toBeGreaterThan(0);
    // 収載集合＝正本の（読込失敗 placeholder を除いた）ユニーク id 集合。
    const canonical = new Set(
      lawRevisionCores
        .filter((r) => !r.id.startsWith("lr-fallback"))
        .map((r) => r.id),
    );
    const indexIds = new Set(
      revisions.map((i) => i.id.replace(/^revision-/, "")),
    );
    expect(indexIds).toEqual(canonical);
    // 読込失敗 placeholder（lr-fallback-*）は索引に載せない。
    expect(revisions.some((i) => i.id.includes("lr-fallback"))).toBe(false);
  });

  it("個別詳細ページ未実装のため全件 /laws 一覧ハブへリンクする（幽霊URL 0）", async () => {
    const index = await buildSearchIndex();
    const revisions = index.filter((i) => i.category === "revision");
    expect(revisions.length).toBeGreaterThan(0);
    // /laws は実在ハブ。glossary→/glossary・faq→/faq と同じく一覧へ寄せる。
    expect(revisions.every((i) => i.url === "/laws")).toBe(true);
    expect(revisions.every((i) => i.id.startsWith("revision-"))).toBe(true);
  });

  it("これまで 0 件だった法改正名クエリが revision カテゴリで発見できる", async () => {
    const index = await buildSearchIndex();
    // 実データのタイトルに literal で存在する語（石綿障害予防規則・クレーン等安全規則）。
    expect(searchItems(index, "石綿", "revision").length).toBeGreaterThan(0);
    expect(searchItems(index, "クレーン", "revision").length).toBeGreaterThan(
      0,
    );
    // 発見先が /laws へ着地する（検索経由で法改正一覧へ到達できる）。
    expect(
      searchItems(index, "石綿", "revision").every((i) => i.url === "/laws"),
    ).toBe(true);
  });
});

describe("buildSearchIndex — 事故個票の隔離", () => {
  it("一次資料との本文一致を再検証するまで事故カテゴリを0件にする", async () => {
    const index = await buildSearchIndex();
    const accident = index.filter((i) => i.category === "accident");
    expect(accident).toEqual([]);
  });

  it("事故DB本体だけを検索可能にし、詳細・分析の隔離URLを混入させない", async () => {
    const index = await buildSearchIndex();
    expect(index.some((item) => item.url === "/accidents")).toBe(true);
    expect(
      index.some(
        (item) =>
          item.url.startsWith("/accidents/") ||
          item.url.startsWith("/accidents-reports") ||
          item.url.startsWith("/accidents-analytics"),
      ),
    ).toBe(false);
  });
});

describe("buildSearchIndex — 未検証の商品カタログ隔離", () => {
  it("商品・メーカー・規格適合を一次資料確認できるまで検索結果へ出さない", async () => {
    const { getAllEquipment, getEquipmentById, getQuarantinedEquipmentCount } =
      await import("@/lib/equipment-recommendation");
    const index = await buildSearchIndex();
    const equipment = index.filter((i) => i.category === "equipment");

    expect(getQuarantinedEquipmentCount()).toBeGreaterThan(0);
    expect(getAllEquipment()).toEqual([]);
    expect(getEquipmentById("eq-0001")).toBeUndefined();
    expect(equipment).toEqual([]);
    expect(searchItems(index, "フルハーネス", "equipment")).toEqual([]);
  });
});

describe("buildSearchIndex — Eラーニング（education）の全テーマ収載＋個別テーマ深リンク", () => {
  it("出典・監修・学習効果を再確認するまで旧テーマを収載しない", async () => {
    const index = await buildSearchIndex();
    expect(
      index.filter((item) => item.id.startsWith("edu-")),
    ).toEqual([]);
    expect(
      index.some(
        (item) =>
          item.url === "/e-learning" || item.url.startsWith("/e-learning?"),
      ),
    ).toBe(false);
  });
});

// T1（診断書 05-search-egov.md）: /search・⌘K を cross-search エンジンへ載せ替えた後、
// 2 語クエリが目的条文へ収束することを本番インデックスで固定する。旧実装ではこれらが全滅していた。
describe("T1: 2語クエリが目的条文へ収束する（本番インデックス回帰）", () => {
  // 目的の条文（law カテゴリ・当該法令への深リンク）が上位 rank 位以内に出ることを検証。
  const CASES: {
    query: string;
    lawShort: string;
    artFragment: string;
    rank: number;
  }[] = [
    {
      query: "石綿 事前調査",
      lawShort: "石綿則",
      artFragment: "第3条",
      rank: 3,
    },
    {
      query: "クレーン 過負荷",
      lawShort: "クレーン則",
      artFragment: "第23条",
      rank: 3,
    },
    {
      query: "足場 作業床",
      lawShort: "安衛則",
      artFragment: "第563条",
      rank: 3,
    },
    // T8 の意図（「就業制限」1位＝安衛法61条）も同エンジンで満たされることを併記。
    { query: "就業制限", lawShort: "安衛法", artFragment: "第61条", rank: 1 },
  ];

  it.each(CASES)(
    "「$query」→ $lawShort $artFragment が $rank位以内・1件以上",
    async ({ query, lawShort, artFragment, rank }) => {
      const index = await buildSearchIndex();
      const results = searchItems(index, query, "all", 10);
      expect(results.length).toBeGreaterThan(0);
      const top = results.slice(0, rank);
      const hit = top.find(
        (r) => r.category === "law" && r.title === `${lawShort} ${artFragment}`,
      );
      expect(
        hit,
        `「${query}」上位${rank}件に ${lawShort} ${artFragment} が無い: ${top.map((r) => r.title).join(" / ")}`,
      ).toBeTruthy();
      // 目的条文へ深リンク（幽霊URL なし＝/law-search?law=&art=）
      expect(hit?.url).toContain("/law-search?law=");
      expect(hit?.url).toContain("&art=");
    },
  );
});

// T2（診断書 05-search-egov.md / O8-b）: 条番号クエリパーサを通した生クエリが
// 該当条文をトップ表示することを本番インデックスで固定する。e-Gov でも 0 件になる
// 「安衛法61条」等をトップ着地させるのが本タスクの勝ち筋（比較 a,b）。
describe("T2: 条番号クエリが該当条文をトップ表示（本番インデックス回帰）", () => {
  // top=1 は 1 位に当該条文（law・指定法令 or 条番号一致）が出ること。
  const CASES: { query: string; title: string }[] = [
    { query: "安衛法61条", title: "安衛法 第61条" },
    { query: "安衛法 88条", title: "安衛法 第88条" },
    { query: "安衛則563条", title: "安衛則 第563条" },
  ];

  it.each(CASES)("「$query」→ 1位が $title", async ({ query, title }) => {
    const index = await buildSearchIndex();
    const results = searchItems(index, query, "all", 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.category).toBe("law");
    expect(results[0]?.title).toBe(title);
    expect(results[0]?.url).toContain("/law-search?law=");
    expect(results[0]?.url).toContain("&art=");
  });

  it("漢数字「第六十一条」は 1位が 第61条 の法令条文（法令名指定なしでも着地）", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "第六十一条", "all", 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.category).toBe("law");
    expect(results[0]?.title).toMatch(/ 第61条$/);
  });

  it.each([
    "安衛法 第61条",
    "安衛法61条",
    "労働安全衛生法 61条",
    "労働安全衛生法６１条",
    "法第61条",
    "第六十一条",
    "就業制限 安衛法第61条",
    "フォークリフト 資格 第61条",
  ])("「%s」は一次条文を1位、関連政令・省令を上位5件へ出す", async (query) => {
    const index = await buildSearchIndex();
    const results = searchItems(index, query, "all", 10);
    const topFive = results.slice(0, 5);

    expect(results[0]?.id).toBe("law-労働安全衛生法|第61条");
    expect(topFive.some((item) => item.id === "law-労働安全衛生法施行令|第20条")).toBe(true);
    expect(topFive.some((item) => item.id === "law-navi-beppyo-anei-soku-beppyo-3")).toBe(true);
    expect(topFive.filter((item) => item.category === "plain")).toHaveLength(1);
    expect(
      topFive.some(
        (item) =>
          / 第61条(?:（現場ことば）)?$/.test(item.title) &&
          !["law-労働安全衛生法|第61条", "plain-347AC0000000057-第61条"].includes(item.id),
      ),
    ).toBe(false);
    expect(
      topFive.some(
        (item) =>
          item.verification === "quarantine" ||
          item.informationKind === "synthetic" ||
          item.provenance === "synthetic",
      ),
    ).toBe(false);
  });

  it("別法令を明示した第61条照会は安衛法へ上書きしない", async () => {
    const index = await buildSearchIndex();
    expect(searchItems(index, "労働基準法 第61条", "all", 10)[0]?.title).toBe(
      "労基法 第61条",
    );
    expect(
      searchItems(index, "クレーン等安全規則 第61条", "all", 10)[0]?.title,
    ).toBe("クレーン則 第61条");
  });

  it("曖昧な「クレーン 第61条」は安衛法61条へ強制せず、クレーン則の一次条文を返す", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "クレーン 第61条", "all", 10);
    expect(results[0]?.title).toBe("クレーン則 第61条");
    expect(results[0]?.id).not.toBe("law-労働安全衛生法|第61条");
    expect(results.slice(0, 5).map((item) => item.id)).toContain(
      "law-労働安全衛生法|第61条",
    );
  });

  it("資格文脈を明示した「クレーン 資格 第61条」は安衛法の就業制限へ着地する", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "クレーン 資格 第61条", "all", 10);
    expect(results[0]?.id).toBe("law-労働安全衛生法|第61条");
  });
});

describe("getSearchDocumentTypeLabel", () => {
  it.each([
    [{ ...ITEMS[0], category: "law", title: "安衛法 第61条" }, "法律"],
    [{ ...ITEMS[0], category: "law", title: "安衛令 第20条" }, "政令"],
    [{ ...ITEMS[0], category: "law", title: "安衛則 別表第3", informationKind: "primary" }, "省令"],
    [{ ...ITEMS[0], category: "notice" }, "通達・通知"],
    [{ ...ITEMS[0], category: "plain" }, "解説"],
  ] as const)("資料区分を明示する", (item, expected) => {
    expect(getSearchDocumentTypeLabel(item as SearchItem)).toBe(expected);
  });
});

// T3（診断書 05-search-egov.md / O8-c）: 法令名かな読みを正略称へ展開し、e-Gov も当サイトも
// 0 件だった「あんえいほう」等（比較 c＝現場のうろ覚え・音声入力）を該当条文へ着地させる。
// 正式名称・別略称は O8-a で解決済みのため、本タスクの本丸は「読み」で 0→ヒットにすること。
describe("T3: 法令名かな読みが該当法令の条文へ着地（本番インデックス回帰）", () => {
  // かな読み → その法令（lawShort）の条文が law カテゴリで 1 件以上ヒットする。
  const READINGS: { query: string; lawShort: string }[] = [
    { query: "あんえいほう", lawShort: "安衛法" },
    { query: "あんえいそく", lawShort: "安衛則" },
    { query: "くれーんそく", lawShort: "クレーン則" },
    { query: "ゆうきそく", lawShort: "有機則" },
    { query: "とっかそく", lawShort: "特化則" },
    { query: "さんけつそく", lawShort: "酸欠則" },
  ];

  it.each(READINGS)(
    "「$query」で $lawShort の条文がヒットする（読みで 0→ヒット）",
    async ({ query, lawShort }) => {
      const index = await buildSearchIndex();
      const results = searchItems(index, query, "law", 10);
      expect(results.length).toBeGreaterThan(0);
      // 全件が当該法令の条文（title が「<略称> 第N条」形）で、他法令へ流れない。
      expect(results.every((r) => r.title.startsWith(`${lawShort} `))).toBe(
        true,
      );
    },
  );

  it("読み＋条番号「あんえいほう 88条」は 1位が 安衛法 第88条（O8-b と相乗）", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "あんえいほう 88条", "all", 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.category).toBe("law");
    expect(results[0]?.title).toBe("安衛法 第88条");
    expect(results[0]?.url).toContain("&art=");
  });

  it("正式名称・別略称は従来どおり（読み展開が既存ヒットを奪わない回帰）", async () => {
    const index = await buildSearchIndex();
    // 正式名称（O8-a で解決済み）: 1位が 安衛則 第563条 のまま
    const full = searchItems(index, "労働安全衛生規則 第563条", "all", 10);
    expect(full[0]?.title).toBe("安衛則 第563条");
    // 2 語 AND（読みでない通常語）も不変
    expect(
      searchItems(index, "石綿 事前調査", "all", 10).length,
    ).toBeGreaterThan(0);
  });
});

describe("buildSearchIndex — 教育コース（education）の /education/<slug> 収載", () => {
  it("法定区分・適用条件を再確認するまで旧コースを収載しない", async () => {
    const index = await buildSearchIndex();
    expect(
      index.filter((item) => item.id.startsWith("education-course-")),
    ).toEqual([]);
    expect(index.some((item) => item.url.startsWith("/education/"))).toBe(false);
  });
});

// 法令ナビ（docs/horei-navi-foundation-2026-07-11）: 4クエリ着地の回帰固定。
// 診断 2026-07-11 の欠落（爪のやつ=0件・フォークリフト=通達が条文を押し流す・
// 別表の意味インデックス不在・別表第三の漢数字ゆらぎ）を、分野ページ/別表の収載と
// クエリ正規化・シノニム展開で解消した状態を機械固定する。
describe("buildSearchIndex — 法令ナビ分野ページ・別表の収載と着地", () => {
  it("分野ページを feature カテゴリで収載し /law-navi/topics/<id> へリンクする", async () => {
    const index = await buildSearchIndex();
    const topics = index.filter((i) => i.id.startsWith("law-navi-topic-"));
    expect(topics.length).toBeGreaterThanOrEqual(1);
    expect(topics.every((i) => i.category === "feature")).toBe(true);
    expect(topics.every((i) => i.url.startsWith("/law-navi/topics/"))).toBe(
      true,
    );
  });

  it("「フォークリフト」で分野ページが最上位に着地する（通達より上）", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "フォークリフト", "all", 10);
    expect(results[0]?.id).toBe("law-navi-topic-forklift");
  });

  it("「爪のやつ」（俗称・言い回し付き）で分野ページと条文に着地する", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "爪のやつ", "all", 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((i) => i.id === "law-navi-topic-forklift")).toBe(true);
  });

  it("「ツメの機械」（別の言い回し）でも分野ページに着地する（固定フレーズ過学習でない）", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "ツメの機械", "all", 10);
    expect(results.some((i) => i.id === "law-navi-topic-forklift")).toBe(true);
  });

  it("「35条」「三十五条」は同一の条文着地（安衛法35条 重量表示を含む）", async () => {
    const index = await buildSearchIndex();
    const arabic = searchItems(index, "35条", "law", 20);
    const kanji = searchItems(index, "三十五条", "law", 20);
    expect(arabic.map((i) => i.id)).toEqual(kanji.map((i) => i.id));
    expect(arabic.some((i) => i.id === "law-労働安全衛生法|第35条")).toBe(true);
  });

  it("別表を law カテゴリで収載し「別表第3」＝「別表第三」で特定化学物質へ着地する", async () => {
    const index = await buildSearchIndex();
    const arabic = searchItems(index, "別表第3", "all", 10);
    const kanji = searchItems(index, "別表第三", "all", 10);
    const hitArabic = arabic.find(
      (i) => i.id === "law-navi-beppyo-anei-rei-beppyo-3",
    );
    const hitKanji = kanji.find(
      (i) => i.id === "law-navi-beppyo-anei-rei-beppyo-3",
    );
    expect(hitArabic, "別表第3で意味インデックスに着地しない").toBeDefined();
    expect(
      hitKanji,
      "別表第三（漢数字）で意味インデックスに着地しない",
    ).toBeDefined();
    expect(hitArabic?.title).toContain("特定化学物質");
    expect(hitArabic?.url).toBe("/law-navi/beppyo#anei-rei-beppyo-3");
  });

  it("「有機溶剤 別表」（意味からの2語AND）で別表第6の2へ着地する", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "有機溶剤 別表", "all", 10);
    expect(
      results.some((i) => i.id === "law-navi-beppyo-anei-rei-beppyo-6-2"),
    ).toBe(true);
  });

  // 別表全展開（LN-D2）: 則・じん肺則等の別表が意味から引ける
  it("「粉じん 別表」「じん肺 別表」「裾切値」で該当別表へ着地する（LN-D2 完了条件）", async () => {
    const index = await buildSearchIndex();
    const funjin = searchItems(index, "粉じん 別表", "all", 10);
    expect(
      funjin.some((i) => i.id === "law-navi-beppyo-funjin-soku-beppyo-1"),
    ).toBe(true);
    const jinpai = searchItems(index, "じん肺 別表", "all", 10);
    expect(
      jinpai.some((i) => i.id === "law-navi-beppyo-jinpai-soku-beppyo"),
    ).toBe(true);
    const susokiri = searchItems(index, "裾切値", "all", 10);
    expect(
      susokiri.some((i) => i.id === "law-navi-beppyo-anei-soku-beppyo-2"),
    ).toBe(true);
  });

  // 分野第2陣（2026-07-11 全域展開）: 各分野の代表俗称が分野ページへ着地する
  // （ローカル実測に基づく機械固定。1位固定は名前=代表形の完全一致設計、
  //  上位3位は keyword 一致＋カテゴリ同点解決の設計余地を許容）。
  it("第2陣13分野: 代表俗称で分野ページが最上位に着地する", async () => {
    const index = await buildSearchIndex();
    const TOP1: ReadonlyArray<readonly [string, string]> = [
      ["クレーン", "crane"],
      ["ラフター", "crane"],
      ["玉掛け", "tamagake"],
      ["足場", "ashiba"],
      ["フルハーネス", "fall-arrest"],
      ["酸欠", "sanketsu"],
      ["シンナー", "yuki-solvent"],
      ["粉じん", "funjin"],
      ["石綿", "asbestos"],
      ["熱中症", "heatstroke"],
      ["暑さ指数", "heatstroke"],
    ];
    for (const [q, topicId] of TOP1) {
      const results = searchItems(index, q, "all", 10);
      expect(
        results[0]?.id,
        `「${q}」の1位が law-navi-topic-${topicId} でない`,
      ).toBe(`law-navi-topic-${topicId}`);
    }
  });

  it("漏電は正確な一次条文を1位にし、分野解説も上位に残す", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "漏電", "all", 10);

    expect(results[0]?.id).toBe("law-労働安全衛生規則|第333条");
    expect(results[0]).toMatchObject({
      informationKind: "primary",
      provenance: "official",
      sourceUrl: "https://laws.e-gov.go.jp/law/347M50002000032",
    });
    expect(
      results.slice(0, 5).some((item) => item.id === "law-navi-topic-denki"),
    ).toBe(true);
  });

  it("第2陣13分野: 俗称・別名で分野ページが上位3位以内に着地する", async () => {
    const index = await buildSearchIndex();
    const TOP3: ReadonlyArray<readonly [string, string]> = [
      ["スリング", "tamagake"],
      ["ワイヤ", "tamagake"],
      ["ハーネス", "fall-arrest"],
      ["マンホール", "sanketsu"],
      ["特化物", "tokka"],
      ["有機溶剤", "yuki-solvent"],
      ["アスベスト", "asbestos"],
      ["感電", "denki"],
      ["ユンボ", "kensetsu-kikai"],
      ["重機", "kensetsu-kikai"],
      ["高所作業車", "kosho-sagyosha"],
    ];
    for (const [q, topicId] of TOP3) {
      const results = searchItems(index, q, "all", 10);
      const pos = results.findIndex(
        (i) => i.id === `law-navi-topic-${topicId}`,
      );
      expect(
        pos >= 0 && pos < 3,
        `「${q}」で law-navi-topic-${topicId} が上位3位以内に無い（実測: ${pos === -1 ? "圏外" : pos + 1}位）`,
      ).toBe(true);
    }
  });
});

// CR2-S2（酷評01縫い目3）: 現場ことば版が /search・⌘K から丸ごと不可視だった穴の是正。
// 表示可否は getFreshPlainArticle（fidelity verified ＋ 原文ハッシュ一致）に一元化。
describe("buildSearchIndex — 現場ことば版（plain）の収載", () => {
  it("現場ことば版は law とは別の plain カテゴリで収載され、法令ナビの条ページへ深リンクする", async () => {
    const index = await buildSearchIndex();
    const plainItems = index.filter((i) => i.category === "plain");
    expect(plainItems.length).toBeGreaterThan(0);
    for (const p of plainItems) {
      expect(p.title).toContain("（現場ことば）");
      expect(p.url).toMatch(/^\/law-navi\//);
    }
  });

  it("「研削といし」は現場ことばタブ（category=plain）で安衛則第118条にヒットする", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "研削といし", "plain", 10);
    const plainHit = results.find(
      (r) => r.title === "安衛則 第118条（現場ことば）",
    );
    expect(
      plainHit,
      `結果: ${results.map((r) => r.title).join(" / ")}`,
    ).toBeTruthy();
    expect(plainHit?.url).toBe("/law-navi/347M50002000032/118");
  });

  it("「囲い」は現場ことばタブ（category=plain）で安衛則第519条にヒットする", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "囲い", "plain", 10);
    const plainHit = results.find(
      (r) => r.title === "安衛則 第519条（現場ことば）",
    );
    expect(
      plainHit,
      `結果: ${results.map((r) => r.title).join(" / ")}`,
    ).toBeTruthy();
  });

  it("広いクエリでも原文条文を先に保ち、対応する現場ことば版を直後に表示する", async () => {
    const index = await buildSearchIndex();
    // 「研削といし」は education/glossary/notice/law だけで上位10件が埋まる広いクエリ。
    const results = searchItems(index, "研削といし", "all", 10);
    expect(results.length).toBe(10);
    const originalIndex = results.findIndex(
      (r) => r.category === "law" && r.title === "安衛則 第118条",
    );
    const plainIndex = results.findIndex(
      (r) =>
        r.category === "plain" && r.title === "安衛則 第118条（現場ことば）",
    );
    expect(originalIndex).toBeGreaterThanOrEqual(0);
    expect(plainIndex).toBeGreaterThan(originalIndex);
    expect(plainIndex).toBeLessThan(10);
  });

  it("余り枠があるクエリでは all 集約結果にも現場ことばヒットが出る（ID固有のためcategoryタブ不要な狭いクエリ）", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(
      index,
      "安衛則 第118条 研削といし 試運転",
      "all",
      10,
    );
    expect(
      results.some(
        (r) =>
          r.category === "plain" && r.title === "安衛則 第118条（現場ことば）",
      ),
    ).toBe(true);
  });

  it("「足場 作業床」は原文条文（law・T1）が引き続き上位3位以内に出る（plain 追加が既存回帰を崩さない）", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "足場 作業床", "all", 10);
    const top = results.slice(0, 3);
    expect(
      top.some((r) => r.category === "law" && r.title === "安衛則 第563条"),
    ).toBe(true);
  });

  it("「安衛法61条」は引き続き1位が原文条文（law）で、plain がその座を奪わない", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "安衛法61条", "all", 10);
    expect(results[0]?.category).toBe("law");
    expect(results[0]?.title).toBe("安衛法 第61条");
  });

  it("同一権威カテゴリが上位を占める騒音検索で第588条を上位10件から押し出さない", async () => {
    const index = await buildSearchIndex();
    const results = searchItems(index, "騒音 耳栓", "all", 10);
    expect(
      results.some(
        (result) =>
          result.title.includes("騒音") ||
          result.title.includes("安衛則 第588条"),
      ),
      `上位10件: ${results.map((result) => `[${result.category}]${result.title}`).join(" / ")}`,
    ).toBe(true);
  });
});
