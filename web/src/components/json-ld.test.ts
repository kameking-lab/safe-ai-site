import { describe, expect, it } from "vitest";
import {
  organizationSchema,
  webSiteSchema,
  ORG_ID,
  WEBSITE_ID,
  articleListSchema,
  newsArticleSchema,
  newsArticleListSchema,
  serviceSchema,
  howToSchema,
  breadcrumbSchema,
  legalDocumentSchema,
  webPageSchema,
  faqPageSchema,
  productCollectionSchema,
  courseListSchema,
  datasetSchema,
  qaPageSchema,
  definedTermSetSchema,
  quizSchema,
  dataCatalogSchema,
  webApplicationSchema,
} from "./json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/seo-metadata";

/**
 * 柱C-4 JSON-LD ヘルパー回帰テスト。
 * - 構造化データの不変条件（@context/@type・position 1始まり・slice上限・
 *   サイト名/URLの一貫性・SearchAction の /search 正規化・OG画像フォールバック）を固定。
 * - サイトURL/サイト名は seo-metadata.ts の単一ソースに集約済み。ハードコード回帰を防ぐ。
 */

const DEFAULT_OG = `${SITE_URL}/api/og`;

describe("organizationSchema / webSiteSchema", () => {
  it("Organization は schema.org の正準フィールドを備える", () => {
    const s = organizationSchema();
    expect(s["@context"]).toBe("https://schema.org");
    expect(s["@type"]).toBe("Organization");
    expect(s.name).toBe(SITE_NAME);
    expect(s.url).toBe(SITE_URL);
    expect(s.logo).toMatchObject({
      "@type": "ImageObject",
      url: `${SITE_URL}/apple-touch-icon.png`,
      width: 180,
      height: 180,
    });
    // 主要エンティティは安定 @id で同定する（グラフ集約の基点）。
    expect(s["@id"]).toBe(ORG_ID);
    expect(ORG_ID).toBe(`${SITE_URL}/#organization`);
    // 自己参照 sameAs（同定価値ゼロ・バリデータ smell）は付与しない。
    expect(s.sameAs).toBeUndefined();
  });

  it("WebSite は @id を持ち publisher で Organization を参照する", () => {
    const s = webSiteSchema();
    expect(s["@id"]).toBe(WEBSITE_ID);
    expect(WEBSITE_ID).toBe(`${SITE_URL}/#website`);
    // インライン再宣言ではなく @id 参照で正準 Organization ノードへ結ぶ。
    expect(s.publisher).toEqual({ "@id": ORG_ID });
  });

  it("WebSite の SearchAction は /search に正規化されている", () => {
    const s = webSiteSchema();
    expect(s["@type"]).toBe("WebSite");
    expect(s.name).toBe(SITE_NAME);
    const action = s.potentialAction as {
      "@type": string;
      target: { urlTemplate: string };
      "query-input": string;
    };
    expect(action["@type"]).toBe("SearchAction");
    expect(action.target.urlTemplate).toBe(
      `${SITE_URL}/search?q={search_term_string}`,
    );
    expect(action.target.urlTemplate).toContain("/search?q=");
    expect(action.target.urlTemplate).not.toContain("/law-search");
    expect(action["query-input"]).toBe("required name=search_term_string");
  });
});

describe("エンティティグラフ: 発行主体ノードの @id 集約", () => {
  // 各スキーマが author/publisher/provider として出す「自サイト組織」ノードは、
  // 全て正準 Organization ノード（ORG_ID）を指し、重複ノードへ分裂しないこと。
  it("Article/NewsArticle リストの author・publisher が ORG_ID を指す", () => {
    const els = articleListSchema([
      { headline: "x", datePublished: "2026-01-01", url: `${SITE_URL}/x` },
    ]).itemListElement as Array<{
      item: { author: { "@id": string }; publisher: { "@id": string } };
    }>;
    expect(els[0].item.author["@id"]).toBe(ORG_ID);
    expect(els[0].item.publisher["@id"]).toBe(ORG_ID);

    const nels = newsArticleListSchema([
      { headline: "x", datePublished: "2026-01-01", url: `${SITE_URL}/x` },
    ]).itemListElement as Array<{
      item: { author: { "@id": string }; publisher: { "@id": string } };
    }>;
    expect(nels[0].item.author["@id"]).toBe(ORG_ID);
    expect(nels[0].item.publisher["@id"]).toBe(ORG_ID);
  });

  it("個別 NewsArticle の publisher が ORG_ID を指す", () => {
    const s = newsArticleSchema({
      headline: "見出し",
      description: "説明",
      url: `${SITE_URL}/news/1`,
      datePublished: "2026-01-01",
      dateModified: "2026-02-01",
      authorName: "編集部",
    });
    expect((s.publisher as { "@id": string })["@id"]).toBe(ORG_ID);
  });

  it("WebPage の isPartOf=WEBSITE_ID・publisher=ORG_ID を参照する", () => {
    const s = webPageSchema({
      name: "ページ",
      description: "説明",
      url: `${SITE_URL}/p`,
    });
    expect((s.isPartOf as { "@id": string })["@id"]).toBe(WEBSITE_ID);
    expect((s.publisher as { "@id": string })["@id"]).toBe(ORG_ID);
  });

  it("WebApplication の provider が ORG_ID を指す", () => {
    const s = webApplicationSchema({
      name: "ツール",
      description: "説明",
      url: `${SITE_URL}/tool`,
    });
    expect((s.provider as { "@id": string })["@id"]).toBe(ORG_ID);
  });
});

describe("breadcrumbSchema", () => {
  it("position は 1 始まりで name/item を写像する", () => {
    const s = breadcrumbSchema([
      { name: "ホーム", url: SITE_URL },
      { name: "事故DB", url: `${SITE_URL}/accidents` },
    ]);
    expect(s["@type"]).toBe("BreadcrumbList");
    const els = s.itemListElement as Array<{
      "@type": string;
      position: number;
      name: string;
      item: string;
    }>;
    expect(els).toHaveLength(2);
    expect(els[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "ホーム",
      item: SITE_URL,
    });
    expect(els[1].position).toBe(2);
    expect(els[1].item).toBe(`${SITE_URL}/accidents`);
  });

  it("空配列でも壊れない", () => {
    const s = breadcrumbSchema([]);
    expect(s.itemListElement).toEqual([]);
  });
});

describe("articleListSchema / newsArticleListSchema", () => {
  const many = Array.from({ length: 15 }, (_, i) => ({
    headline: `記事${i}`,
    datePublished: "2026-01-01",
    url: `${SITE_URL}/a/${i}`,
  }));

  it("ItemList は最大10件に丸める", () => {
    expect((articleListSchema(many).itemListElement as unknown[]).length).toBe(10);
    expect((newsArticleListSchema(many).itemListElement as unknown[]).length).toBe(10);
  });

  it("image 欠落時は OG フォールバック画像を当てる", () => {
    const els = articleListSchema([
      { headline: "x", datePublished: "2026-01-01", url: `${SITE_URL}/x` },
    ]).itemListElement as Array<{ item: { image: string } }>;
    expect(els[0].item.image).toBe(DEFAULT_OG);
  });

  it("image 指定時はそれを優先する", () => {
    const els = newsArticleListSchema([
      {
        headline: "x",
        datePublished: "2026-01-01",
        url: `${SITE_URL}/x`,
        image: `${SITE_URL}/custom.png`,
      },
    ]).itemListElement as Array<{ item: { image: string } }>;
    expect(els[0].item.image).toBe(`${SITE_URL}/custom.png`);
  });
});

describe("newsArticleSchema", () => {
  const base = {
    headline: "見出し",
    description: "説明",
    url: `${SITE_URL}/news/1`,
    datePublished: "2026-01-01",
    dateModified: "2026-02-01",
    authorName: "編集部",
  };

  it("必須フィールドと publisher ロゴ寸法を備える", () => {
    const s = newsArticleSchema(base);
    expect(s["@type"]).toBe("NewsArticle");
    expect(s.inLanguage).toBe("ja");
    expect(s.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": base.url });
    expect(s.publisher).toMatchObject({
      name: SITE_NAME,
      logo: { width: 180, height: 180 },
    });
  });

  it("image/keywords は与えられた時だけ出力する", () => {
    const without = newsArticleSchema(base);
    expect(without.image).toBeUndefined();
    expect(without.keywords).toBeUndefined();

    const withExtras = newsArticleSchema({
      ...base,
      image: `${SITE_URL}/i.png`,
      keywords: ["安全", "労災"],
    });
    expect(withExtras.image).toEqual([`${SITE_URL}/i.png`]);
    expect(withExtras.keywords).toBe("安全, 労災");
  });
});

describe("serviceSchema", () => {
  const base = {
    name: "プロプラン",
    description: "説明",
    url: `${SITE_URL}/pricing`,
    serviceType: "SaaS",
  };

  it("priceFrom 無しなら offers を出さない", () => {
    const s = serviceSchema(base);
    expect(s["@type"]).toBe("Service");
    expect(s.offers).toBeUndefined();
    expect(s.areaServed).toEqual({ "@type": "Country", name: "Japan" });
  });

  it("priceFrom 有りなら税抜き offer を付ける", () => {
    const s = serviceSchema({ ...base, priceFrom: 1980 });
    expect(s.offers).toMatchObject({
      "@type": "Offer",
      price: 1980,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      priceSpecification: { valueAddedTaxIncluded: false },
    });
  });
});

describe("howToSchema", () => {
  it("step は 1 始まりの position を付ける", () => {
    const s = howToSchema({
      name: "手順",
      description: "説明",
      steps: [
        { name: "A", text: "aa" },
        { name: "B", text: "bb" },
      ],
    });
    expect(s["@type"]).toBe("HowTo");
    const steps = s.step as Array<{ position: number; name: string }>;
    expect(steps.map((x) => x.position)).toEqual([1, 2]);
  });
});

describe("legalDocumentSchema", () => {
  it("任意フィールドは存在時のみ出力する", () => {
    const minimal = legalDocumentSchema({
      url: `${SITE_URL}/circulars/1`,
      title: "通達",
      noticeNumber: null,
      issuer: null,
      issuedDate: null,
      description: "説明",
    });
    expect(minimal["@type"]).toBe("LegalDocument");
    expect(minimal.identifier).toBeUndefined();
    expect(minimal.author).toBeUndefined();
    expect(minimal.datePublished).toBeUndefined();
    expect(minimal.inLanguage).toBe("ja");

    const full = legalDocumentSchema({
      url: `${SITE_URL}/circulars/2`,
      title: "通達2",
      noticeNumber: "基発0001",
      issuer: "厚生労働省",
      issuedDate: "2026-01-01",
      description: "説明",
    });
    expect(full.identifier).toBe("基発0001");
    expect(full.datePublished).toBe("2026-01-01");
    expect(full.author).toMatchObject({ "@type": "Organization", name: "厚生労働省" });
  });

  it("監修者（労働安全衛生コンサルタント）をcontributorとして常に出力する", () => {
    const schema = legalDocumentSchema({
      url: `${SITE_URL}/circulars/3`,
      title: "通達3",
      noticeNumber: null,
      issuer: null,
      issuedDate: null,
      description: "説明",
    });
    expect(schema.contributor).toMatchObject({
      "@type": "Person",
      name: "労働安全衛生コンサルタント（登録番号260022）",
      url: `${SITE_URL}/about`,
    });
  });
});

describe("webPageSchema", () => {
  it("isPartOf に WebSite を据え keywords は任意", () => {
    const s = webPageSchema({
      name: "ページ",
      description: "説明",
      url: `${SITE_URL}/p`,
    });
    expect(s["@type"]).toBe("WebPage");
    expect(s.isPartOf).toMatchObject({ "@type": "WebSite", name: SITE_NAME, url: SITE_URL });
    expect(s.keywords).toBeUndefined();

    const withKw = webPageSchema({
      name: "ページ",
      description: "説明",
      url: `${SITE_URL}/p`,
      keywords: ["a", "b"],
    });
    expect(withKw.keywords).toBe("a, b");
  });

  it("contributor は明示的に true を渡した時だけ監修者Personを出力する", () => {
    const withoutContributor = webPageSchema({
      name: "ページ",
      description: "説明",
      url: `${SITE_URL}/p`,
    });
    expect(withoutContributor.contributor).toBeUndefined();

    const withContributor = webPageSchema({
      name: "ページ",
      description: "説明",
      url: `${SITE_URL}/p`,
      contributor: true,
    });
    expect(withContributor.contributor).toMatchObject({
      "@type": "Person",
      name: "労働安全衛生コンサルタント（登録番号260022）",
      url: `${SITE_URL}/about`,
    });
  });
});

describe("faqPageSchema / productCollectionSchema / definedTermSetSchema / quizSchema", () => {
  it("FAQPage は最大20件で Question/Answer 構造", () => {
    const qa = Array.from({ length: 25 }, (_, i) => ({
      question: `Q${i}`,
      answer: `A${i}`,
    }));
    const s = faqPageSchema(qa);
    expect(s["@type"]).toBe("FAQPage");
    const main = s.mainEntity as Array<{
      "@type": string;
      acceptedAnswer: { "@type": string; text: string };
    }>;
    expect(main).toHaveLength(20);
    expect(main[0]["@type"]).toBe("Question");
    expect(main[0].acceptedAnswer).toEqual({ "@type": "Answer", text: "A0" });
  });

  it("FAQPage は opts.contributor=true の時だけ監修者Personを出力する", () => {
    const qa = [{ question: "Q", answer: "A" }];
    expect(faqPageSchema(qa).contributor).toBeUndefined();
    expect(faqPageSchema(qa, { contributor: false }).contributor).toBeUndefined();
    expect(faqPageSchema(qa, { contributor: true }).contributor).toMatchObject({
      "@type": "Person",
      name: "労働安全衛生コンサルタント（登録番号260022）",
    });
  });

  it("ProductCollection は最大20件で brand を任意出力", () => {
    const products = Array.from({ length: 22 }, (_, i) => ({
      name: `P${i}`,
      url: `${SITE_URL}/g/${i}`,
    }));
    const s = productCollectionSchema({ name: "商品", url: `${SITE_URL}/goods`, products });
    const els = s.itemListElement as Array<{ item: { brand?: unknown } }>;
    expect(els).toHaveLength(20);
    expect(els[0].item.brand).toBeUndefined();

    const withBrand = productCollectionSchema({
      name: "商品",
      url: `${SITE_URL}/goods`,
      products: [{ name: "P", url: `${SITE_URL}/g/1`, brand: "B" }],
    });
    const branded = withBrand.itemListElement as Array<{ item: { brand: unknown } }>;
    expect(branded[0].item.brand).toEqual({ "@type": "Brand", name: "B" });
  });

  it("DefinedTermSet は最大50件", () => {
    const terms = Array.from({ length: 60 }, (_, i) => ({
      name: `T${i}`,
      description: `D${i}`,
    }));
    const s = definedTermSetSchema({ name: "用語", url: `${SITE_URL}/glossary`, terms });
    expect((s.hasDefinedTerm as unknown[]).length).toBe(50);
  });

  it("Quiz は正解選択肢を acceptedAnswer に据える", () => {
    const s = quizSchema({
      name: "テスト",
      description: "説明",
      url: `${SITE_URL}/quiz`,
      questions: [
        { text: "Q", choices: ["ア", "イ", "ウ"], correct: 1, explanation: "解説" },
      ],
    });
    expect(s["@type"]).toBe("Quiz");
    const parts = s.hasPart as Array<{
      acceptedAnswer: { text: string; comment?: { text: string } };
    }>;
    expect(parts[0].acceptedAnswer.text).toBe("イ");
    expect(parts[0].acceptedAnswer.comment).toEqual({ "@type": "Comment", text: "解説" });
  });
});

describe("courseListSchema / datasetSchema / qaPageSchema / dataCatalogSchema", () => {
  it("CourseList は provider を正準 Organization ノード（ORG_ID）へ集約", () => {
    const s = courseListSchema([{ name: "講座", description: "説明" }]);
    const els = s.itemListElement as Array<{ item: { provider: { name: string; url: string } } }>;
    expect(els[0].item.provider).toEqual({
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      url: SITE_URL,
    });
  });

  it("Dataset は任意フィールドを存在時のみ出力", () => {
    const minimal = datasetSchema({ name: "DS", description: "d", url: `${SITE_URL}/ds` });
    expect(minimal["@type"]).toBe("Dataset");
    expect(minimal.license).toBeUndefined();
    expect(minimal.keywords).toBeUndefined();
    expect(minimal.creator).toMatchObject({ name: SITE_NAME, url: SITE_URL });

    const full = datasetSchema({
      name: "DS",
      description: "d",
      url: `${SITE_URL}/ds`,
      license: "https://example.com/license",
      keywords: ["k"],
      isBasedOn: [{ name: "src", url: `${SITE_URL}/src` }],
    });
    expect(full.license).toBe("https://example.com/license");
    expect(full.isBasedOn).toEqual([
      { "@type": "Dataset", name: "src", url: `${SITE_URL}/src` },
    ]);
  });

  it("QAPage / DataCatalog の基本型", () => {
    expect(qaPageSchema({ name: "q", description: "d", url: `${SITE_URL}/q` })["@type"]).toBe(
      "QAPage",
    );
    const cat = dataCatalogSchema({
      name: "catalog",
      description: "d",
      url: `${SITE_URL}/c`,
      datasets: [{ name: "DS", url: `${SITE_URL}/ds` }],
    });
    expect(cat["@type"]).toBe("DataCatalog");
    expect((cat.dataset as unknown[]).length).toBe(1);
  });
});

describe("エンティティグラフ: 低頻度 provider/creator ノードの @id 集約", () => {
  // provider / creator / isPartOf として自サイト組織・サイトを指す低頻度スキーマも、
  // 主要エンティティ（#704）と同じ正準 ORG_ID / WEBSITE_ID を参照し、name/url を
  // インライン再宣言する重複ノードへ分裂しないこと。@id を欠くと検索エンジンから
  // 「別の組織/サイト」に見え、ナレッジグラフのブランド同定シグナルが希釈される。
  const orgRef = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
  };
  const websiteRef = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
  };

  it("Service の provider が ORG_ID を指す", () => {
    const s = serviceSchema({
      name: "プラン",
      description: "d",
      url: `${SITE_URL}/pricing`,
      serviceType: "SaaS",
    });
    expect(s.provider).toEqual(orgRef);
  });

  it("Dataset / DataCatalog の creator が ORG_ID を指す", () => {
    const ds = datasetSchema({ name: "DS", description: "d", url: `${SITE_URL}/ds` });
    expect(ds.creator).toEqual(orgRef);
    const cat = dataCatalogSchema({
      name: "catalog",
      description: "d",
      url: `${SITE_URL}/c`,
      datasets: [{ name: "DS", url: `${SITE_URL}/ds` }],
    });
    expect(cat.creator).toEqual(orgRef);
  });

  it("Quiz の provider が ORG_ID を指す", () => {
    const s = quizSchema({
      name: "テスト",
      description: "d",
      url: `${SITE_URL}/quiz`,
      questions: [{ text: "Q", choices: ["ア", "イ"], correct: 0 }],
    });
    expect(s.provider).toEqual(orgRef);
  });

  it("QAPage の isPartOf=WEBSITE_ID・publisher=ORG_ID を参照する", () => {
    const s = qaPageSchema({ name: "q", description: "d", url: `${SITE_URL}/q` });
    expect(s.isPartOf).toEqual(websiteRef);
    expect(s.publisher).toEqual(orgRef);
  });
});

describe("webApplicationSchema", () => {
  const base = {
    name: "ツール",
    description: "説明",
    url: `${SITE_URL}/tool`,
  };

  it("既定は無料 BusinessApplication で mentions/SearchAction 無し", () => {
    const s = webApplicationSchema(base);
    expect(s["@type"]).toBe("WebApplication");
    expect(s.applicationCategory).toBe("BusinessApplication");
    expect(s.isAccessibleForFree).toBe(true);
    expect(s.offers).toMatchObject({ price: "0", priceCurrency: "JPY" });
    expect(s.mentions).toBeUndefined();
    expect(s.potentialAction).toBeUndefined();
  });

  it("mentions と searchUrlTemplate は与えられた時のみ出力", () => {
    const s = webApplicationSchema({
      ...base,
      mentions: [{ name: "他機能", url: `${SITE_URL}/other` }],
      searchUrlTemplate: `${SITE_URL}/chatbot?q={search_term_string}`,
      featureList: ["f1"],
    });
    expect((s.mentions as unknown[]).length).toBe(1);
    expect((s.potentialAction as { "@type": string })["@type"]).toBe("SearchAction");
    expect(s.featureList).toEqual(["f1"]);
  });
});
