/**
 * Build the small public-search excerpt set from committed e-Gov full-text
 * snapshots.
 *
 * This script never summarizes or rewrites an article. It verifies the
 * snapshot-level SHA-256 used by egov-fulltext-fetch.ts, selects an explicit
 * allowlist, and copies the exact article text into a compact generated file.
 *
 * Run from web/:
 *   node scripts/etl/build-egov-verified-excerpts.mjs
 *   node scripts/etl/build-egov-verified-excerpts.mjs --check
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SNAPSHOT_DIR = join(process.cwd(), "src/data/laws-fulltext");
const OUTPUT_FILE = join(
  process.cwd(),
  "src/data/laws/egov-verified-excerpts.generated.ts",
);
const CORPUS_OUTPUT_FILE = join(
  process.cwd(),
  "src/data/laws/egov-verified-corpus.generated.ts",
);

const LAW_TARGETS = [
  {
    lawId: "335AC0000000139",
    displayLaw: "電気工事士法",
    lawShort: "電気工事士法",
    articles: [
      {
        articleNum: "第2条",
        keywords: [
          "電気工事",
          "一般用電気工作物等",
          "自家用電気工作物",
          "軽微な工事",
          "資格",
        ],
      },
      {
        articleNum: "第3条",
        keywords: [
          "第一種電気工事士",
          "第二種電気工事士",
          "特種電気工事資格者",
          "特殊電気工事資格者",
          "認定電気工事従事者",
          "電気作業の資格",
        ],
      },
    ],
  },
  {
    lawId: "347AC0000000057",
    displayLaw: "労働安全衛生法",
    lawShort: "安衛法",
    articles: [
      {
        articleNum: "第15条の3",
        keywords: [
          "店社安全衛生管理者",
          "建設業",
          "特定元方事業者",
          "店社",
          "選任",
        ],
      },
    ],
  },
  {
    lawId: "347CO0000000318",
    displayLaw: "労働安全衛生法施行令",
    lawShort: "安衛令",
    articles: [
      {
        articleNum: "第10条",
        keywords: [
          "高所作業車",
          "作業床の高さ",
          "最高高さ",
          "最も高く上昇",
          "2メートル以上",
        ],
      },
      {
        articleNum: "第19条",
        keywords: [
          "職長教育",
          "職長等の教育",
          "対象業種",
          "建設業",
          "製造業",
        ],
      },
    ],
  },
  {
    lawId: "347M50002000032",
    displayLaw: "労働安全衛生規則",
    lawShort: "安衛則",
    articles: [
      {
        articleNum: "第41条",
        keywords: [
          "就業制限",
          "資格",
          "別表第三",
          "技能講習",
          "フォークリフト",
        ],
      },
      {
        articleNum: "第96条",
        keywords: ["事故報告", "事故報告書", "重大事故", "労働基準監督署"],
      },
      {
        articleNum: "第117条",
        keywords: ["研削といし", "研削盤", "グラインダー", "砥石", "覆い"],
      },
      {
        articleNum: "第131条",
        keywords: [
          "プレス機械",
          "動力プレス",
          "シャー",
          "安全囲い",
          "安全装置",
        ],
      },
      {
        articleNum: "第151条の21",
        keywords: [
          "フォークリフト",
          "定期自主検査",
          "年次検査",
          "一年以内",
        ],
      },
      {
        articleNum: "第164条",
        keywords: [
          "車両系建設機械",
          "主たる用途",
          "用途外使用",
          "パワーショベル",
          "ユンボ",
          "荷を吊る",
        ],
      },
      {
        articleNum: "第194条の22",
        keywords: [
          "高所作業車",
          "作業床",
          "要求性能墜落制止用器具",
          "安全帯",
        ],
      },
      {
        articleNum: "第332条",
        keywords: [
          "交流アーク溶接機",
          "自動電撃防止装置",
          "アーク溶接",
          "感電防止",
        ],
      },
      {
        articleNum: "第333条",
        keywords: [
          "漏電",
          "漏電遮断装置",
          "漏電遮断器",
          "感電防止",
          "可搬式",
        ],
      },
      {
        articleNum: "第352条",
        keywords: [
          "電気機械器具",
          "使用前点検",
          "絶縁用保護具",
          "活線作業",
        ],
      },
      {
        articleNum: "第350条",
        keywords: [
          "電気作業",
          "作業の指揮者",
          "作業主任者",
          "停電作業",
          "活線作業",
          "活線近接作業",
        ],
      },
      {
        articleNum: "第588条",
        keywords: [
          "騒音",
          "著しい騒音",
          "屋内作業場",
          "作業環境測定",
        ],
      },
      {
        articleNum: "第552条",
        keywords: [
          "架設通路",
          "手すり",
          "中桟",
          "85センチメートル",
          "35センチメートル",
          "50センチメートル",
        ],
      },
      {
        articleNum: "第563条",
        keywords: [
          "足場",
          "作業床",
          "手すり",
          "中桟",
          "墜落防止設備",
          "高さ2メートル",
        ],
      },
      {
        articleNum: "第574条",
        keywords: [
          "つり足場",
          "吊り足場",
          "作業床",
          "つりワイヤロープ",
          "安全係数",
        ],
      },
    ],
  },
  {
    lawId: "347M50002000039",
    displayLaw: "特定化学物質障害予防規則",
    lawShort: "特化則",
    articles: [
      {
        articleNum: "第48条",
        keywords: [
          "第一類物質",
          "第1類物質",
          "特定化学物質",
          "製造許可",
          "プラント",
        ],
      },
    ],
  },
  {
    lawId: "347M50002000042",
    displayLaw: "酸素欠乏症等防止規則",
    lawShort: "酸欠則",
    articles: [
      {
        articleNum: "第11条",
        keywords: [
          "酸素欠乏危険作業主任者",
          "酸欠作業",
          "作業主任者",
          "技能講習",
          "資格",
        ],
      },
    ],
  },
  {
    lawId: "347M50002000043",
    displayLaw: "事務所衛生基準規則",
    lawShort: "事務所則",
    articles: [
      {
        articleNum: "第2条",
        keywords: ["気積", "一人当たり", "事務所", "空気", "換気"],
      },
    ],
  },
  {
    lawId: "347M50002000036",
    displayLaw: "有機溶剤中毒予防規則",
    lawShort: "有機則",
    articles: [
      { articleNum: "第5条", keywords: ["局所排気装置", "設置義務"] },
      {
        articleNum: "第8条",
        keywords: [
          "臨時の有機溶剤業務",
          "適用除外",
          "タンク内部",
          "全体換気装置",
        ],
      },
      {
        articleNum: "第9条",
        keywords: [
          "短時間有機溶剤業務",
          "設備の特例",
          "全体換気装置",
          "送気マスク",
        ],
      },
      { articleNum: "第19条", keywords: ["有機溶剤作業主任者", "選任"] },
      { articleNum: "第20条", keywords: ["局所排気装置", "定期自主検査"] },
      { articleNum: "第25条", keywords: ["有機溶剤", "掲示"] },
      { articleNum: "第29条", keywords: ["有機溶剤健康診断", "特殊健康診断"] },
      { articleNum: "第30条", keywords: ["有機溶剤健康診断", "項目"] },
    ],
  },
  {
    lawId: "347M50002000041",
    displayLaw: "電離放射線障害防止規則",
    lawShort: "電離則",
    articles: [
      { articleNum: "第3条", keywords: ["管理区域", "標識", "放射線"] },
      { articleNum: "第56条", keywords: ["電離放射線健康診断", "特殊健康診断"] },
    ],
  },
  {
    lawId: "417M60000100021",
    displayLaw: "石綿障害予防規則",
    lawShort: "石綿則",
    articles: [
      { articleNum: "第3条", keywords: ["石綿事前調査", "アスベスト", "解体"] },
      { articleNum: "第36条", keywords: ["石綿", "記録", "保存"] },
      { articleNum: "第40条", keywords: ["石綿健康診断", "特殊健康診断"] },
    ],
  },
  {
    lawId: "354M50002000018",
    displayLaw: "粉じん障害防止規則",
    lawShort: "粉じん則",
    articles: [
      { articleNum: "第4条", keywords: ["特定粉じん発生源", "局所排気"] },
      { articleNum: "第22条", keywords: ["粉じん", "作業"] },
      { articleNum: "第27条", keywords: ["呼吸用保護具", "粉じん"] },
    ],
  },
  {
    lawId: "347M50002000035",
    displayLaw: "ゴンドラ安全規則",
    lawShort: "ゴンドラ則",
    articles: [
      { articleNum: "第10条", keywords: ["ゴンドラ", "設置届"] },
      { articleNum: "第12条", keywords: ["ゴンドラ操作", "特別教育"] },
    ],
  },
  {
    lawId: "347M50002000033",
    displayLaw: "ボイラー及び圧力容器安全規則",
    lawShort: "ボイラー則",
    articles: [
      { articleNum: "第10条", keywords: ["ボイラー", "設置届"] },
      { articleNum: "第23条", keywords: ["ボイラー取扱作業主任者", "選任"] },
      { articleNum: "第24条", keywords: ["ボイラー取扱作業主任者", "職務"] },
      { articleNum: "第25条", keywords: ["ボイラー取扱作業主任者", "資格"] },
      { articleNum: "第32条", keywords: ["ボイラー", "定期自主検査"] },
    ],
  },
  {
    lawId: "361M50002000003",
    displayLaw: "女性労働基準規則",
    lawShort: "女性則",
    articles: [
      { articleNum: "第2条", keywords: ["女性", "妊産婦", "就業制限"] },
      { articleNum: "第3条", keywords: ["女性", "重量物"] },
    ],
  },
  {
    lawId: "329M50002000013",
    displayLaw: "年少者労働基準規則",
    lawShort: "年少者則",
    articles: [
      { articleNum: "第7条", keywords: ["年少者", "重量物"] },
      { articleNum: "第8条", keywords: ["年少者", "危険業務", "就業制限"] },
    ],
  },
  {
    lawId: "347AC0000000113",
    displayLaw: "雇用の分野における男女の均等な機会及び待遇の確保等に関する法律",
    lawShort: "均等法",
    articles: [
      { articleNum: "第11条", keywords: ["セクシュアルハラスメント", "セクハラ"] },
      { articleNum: "第11条の3", keywords: ["妊娠", "出産", "ハラスメント", "マタハラ"] },
    ],
  },
  {
    lawId: "347M50002000037",
    displayLaw: "鉛中毒予防規則",
    lawShort: "鉛則",
    articles: [
      { articleNum: "第5条", keywords: ["鉛業務", "ばく露防止", "換気"] },
    ],
  },
  {
    lawId: "350AC0000000028",
    displayLaw: "作業環境測定法",
    lawShort: "作環測法",
    articles: [
      { articleNum: "第3条", keywords: ["作業環境測定", "作業環境測定士"] },
    ],
  },
  {
    lawId: "347M50002000034",
    displayLaw: "クレーン等安全規則",
    lawShort: "クレーン則",
    articles: [
      {
        articleNum: "第70条の2",
        keywords: [
          "移動式クレーン",
          "定格荷重",
          "表示",
          "運転者",
          "玉掛け",
        ],
      },
    ],
  },
  {
    lawId: "322AC0000000049",
    displayLaw: "労働基準法",
    lawShort: "労基法",
    articles: [
      {
        articleNum: "第39条",
        keywords: [
          "年次有給休暇",
          "年休",
          "有給",
          "有休",
          "年五日",
          "時季指定",
        ],
      },
      {
        articleNum: "第66条",
        keywords: [
          "妊産婦",
          "時間外労働",
          "休日労働",
          "深夜業",
          "請求",
        ],
      },
    ],
  },
  {
    lawId: "322AC0000000050",
    displayLaw: "労働者災害補償保険法",
    lawShort: "労災保険法",
    articles: [
      {
        articleNum: "第13条",
        keywords: [
          "療養補償給付",
          "療養の給付",
          "療養の費用",
          "労災指定病院",
        ],
      },
      {
        articleNum: "第15条",
        keywords: [
          "障害補償給付",
          "障害補償年金",
          "障害補償一時金",
          "障害等級",
        ],
      },
    ],
  },
  {
    lawId: "335AC0000000030",
    displayLaw: "じん肺法",
    lawShort: "じん肺法",
    articles: [
      {
        articleNum: "第23条",
        keywords: ["じん肺管理区分", "管理四", "管理4", "療養", "合併症"],
      },
    ],
  },
  {
    lawId: "341AC0000000132",
    displayLaw: "労働施策総合推進法",
    lawShort: "労施法",
    articles: [
      {
        articleNum: "第30条の2",
        keywords: [
          "パワーハラスメント",
          "パワハラ",
          "優越的な関係",
          "雇用管理上の措置",
          "相談",
        ],
      },
    ],
  },
  {
    lawId: "403AC0000000076",
    displayLaw: "育児・介護休業法",
    lawShort: "育介法",
    articles: [
      {
        articleNum: "第16条の2",
        keywords: [
          "子の看護等休暇",
          "子の看護休暇",
          "看護休暇",
          "申出",
        ],
      },
    ],
  },
  {
    lawId: "360AC0000000088",
    displayLaw:
      "労働者派遣事業の適正な運営の確保及び派遣労働者の保護等に関する法律",
    lawShort: "派遣法",
    articles: [
      {
        articleNum: "第45条",
        keywords: [
          "派遣労働者",
          "派遣元",
          "派遣先",
          "安全衛生教育",
          "労働安全衛生法の適用",
        ],
      },
    ],
  },
];

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalArticlesJson(snapshot) {
  return JSON.stringify(
    snapshot.articles.map((article) => ({
      articleNum: article.articleNum,
      caption: article.caption,
      isDeleted: article.isDeleted,
      paragraphs: article.paragraphs,
      text: article.text,
      sortKey: article.sortKey,
    })),
  );
}

function canonicalArticleJson(article) {
  return JSON.stringify({
    articleNum: article.articleNum,
    caption: article.caption,
    isDeleted: article.isDeleted,
    paragraphs: article.paragraphs,
    text: article.text,
    sortKey: article.sortKey,
  });
}

function captionToTitle(caption) {
  const trimmed = String(caption ?? "").trim();
  const match = /^（([\s\S]*)）$/.exec(trimmed);
  return match ? match[1] : trimmed;
}

function loadAndVerifySnapshot(lawId) {
  const path = join(SNAPSHOT_DIR, `${lawId}.json`);
  const snapshot = JSON.parse(readFileSync(path, "utf8"));
  if (snapshot.lawId !== lawId) {
    throw new Error(`${lawId}: lawId mismatch (${snapshot.lawId})`);
  }
  const computed = sha256(canonicalArticlesJson(snapshot));
  if (computed !== snapshot.sha256) {
    throw new Error(`${lawId}: snapshot sha256 mismatch`);
  }
  if (!/^[a-f0-9]{64}$/.test(snapshot.sha256)) {
    throw new Error(`${lawId}: invalid snapshot sha256`);
  }
  if (!snapshot.revisionId || !snapshot.fetchedAt) {
    throw new Error(`${lawId}: missing revisionId/fetchedAt`);
  }
  if (Number.isNaN(Date.parse(snapshot.fetchedAt))) {
    throw new Error(`${lawId}: invalid fetchedAt`);
  }
  return snapshot;
}

const excerpts = [];
const verifiedCorpus = [];
const emittedKeys = new Set();
const corpusKeys = new Set();

for (const target of LAW_TARGETS) {
  const snapshot = loadAndVerifySnapshot(target.lawId);
  const requestedByArticle = new Map(
    target.articles.map((requested) => [requested.articleNum, requested]),
  );
  for (const article of snapshot.articles) {
    if (article.isDeleted || !article.text?.trim()) continue;
    const key = `${target.displayLaw}|${article.articleNum}`;
    if (corpusKeys.has(key)) {
      throw new Error(`duplicate verified corpus article: ${key}`);
    }
    corpusKeys.add(key);
    const requested = requestedByArticle.get(article.articleNum);
    verifiedCorpus.push({
      law: target.displayLaw,
      lawShort: target.lawShort,
      articleNum: article.articleNum,
      articleTitle: captionToTitle(article.caption),
      text: article.text,
      keywords: [
        target.lawShort,
        article.articleNum,
        `${target.lawShort}${article.articleNum}`,
        ...(requested?.keywords ?? []),
      ],
      sourceKind: "egov-fulltext-snapshot",
      sourceUrl: `https://laws.e-gov.go.jp/law/${target.lawId}`,
      sourceLawId: target.lawId,
      sourceRevisionId: snapshot.revisionId,
      sourceFetchedAt: snapshot.fetchedAt,
      sourceHash: snapshot.sha256,
      contentHash: sha256(canonicalArticleJson(article)),
      verificationStatus: "snapshot-hash-verified",
      humanReviewStatus: "not-reviewed",
    });
  }

  for (const requested of target.articles) {
    const record = verifiedCorpus.find(
      (candidate) =>
        candidate.sourceLawId === target.lawId &&
        candidate.articleNum === requested.articleNum,
    );
    if (!record) {
      throw new Error(`${target.lawId}: missing ${requested.articleNum}`);
    }
    const key = `${target.displayLaw}|${requested.articleNum}`;
    if (emittedKeys.has(key)) throw new Error(`duplicate excerpt: ${key}`);
    emittedKeys.add(key);
    excerpts.push(record);
  }
}

const generated =
  `/* eslint-disable */\n` +
  `// This file is generated by scripts/etl/build-egov-verified-excerpts.mjs.\n` +
  `// Exact e-Gov snapshot text only. Do not edit by hand.\n` +
  `import type { LawArticle } from "./law-types";\n\n` +
  `export const egovVerifiedExcerpts: LawArticle[] = ${JSON.stringify(
    excerpts,
    null,
    2,
  )};\n`;

const generatedCorpus =
  `/* eslint-disable */\n` +
  `// This file is generated by scripts/etl/build-egov-verified-excerpts.mjs.\n` +
  `// Exact, non-deleted e-Gov snapshot text for server-side RAG only. Do not edit by hand.\n` +
  `import type { LawArticle } from "./law-types";\n\n` +
  `export const verifiedLawArticles: LawArticle[] = ${JSON.stringify(
    verifiedCorpus,
    null,
    2,
  )};\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(OUTPUT_FILE, "utf8");
  if (current !== generated) {
    throw new Error(
      "egov-verified-excerpts.generated.ts is stale; run the generator",
    );
  }
  const currentCorpus = readFileSync(CORPUS_OUTPUT_FILE, "utf8");
  if (currentCorpus !== generatedCorpus) {
    throw new Error(
      "egov-verified-corpus.generated.ts is stale; run the generator",
    );
  }
  console.log(
    `verified ${excerpts.length} search excerpts and ${verifiedCorpus.length} server RAG articles`,
  );
} else {
  writeFileSync(OUTPUT_FILE, generated, "utf8");
  writeFileSync(CORPUS_OUTPUT_FILE, generatedCorpus, "utf8");
  console.log(
    `wrote ${excerpts.length} search excerpts and ${verifiedCorpus.length} server RAG articles`,
  );
}
