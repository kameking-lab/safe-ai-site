/**
 * Phase 4: 条文 ↔ 通達/告示/リーフレット/MLIT資料 マッピングDB
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §3
 *
 * 目的:
 * - チャットボット応答で引用された条文ごとに、関連する通達・告示・リーフレットの
 *   原文URLを自動添付する。
 * - 機械照合に使う構造化マッピング（条文ID → notice/leaflet ID 配列）。
 *
 * 設計方針:
 * - PIN対象55トピックに対応する主要条文を優先整備
 * - 既存 mhlw-notices.ts / mhlw-leaflets.ts / mlit-resources.ts の id を参照
 * - 重複参照は許容（複数条文に同じ通達がぶら下がるのは正常）
 * - キーは `${lawShort}|${rawArticleNum}` 形式（readability 優先、ルックアップ時に正規化）
 *
 * カバレッジ目標:
 * - 200 条文 × 平均 2 通達 = 400 マッピング（社内目標）
 * - 当面 80+ 条文 × 平均 3-4 = 250+ マッピングを初期収録
 */

import { mhlwNotices } from "@/data/mhlw-notices";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";
import { mlitResources } from "@/data/mlit-resources";
import { normalizeArticleNumToKey } from "@/lib/article-number-normalize";

export type ArticleNoticeMapEntry = {
  /** 関連通達ID（mhlw-notice-XXXX） */
  notices?: string[];
  /** 関連リーフレットID（mhlw-leaflet-XXXX） */
  leaflets?: string[];
  /** 関連 MLIT 資源ID（mlit-resource-XXXX） */
  mlitResources?: string[];
};

/**
 * 条文ID → 関連リソースのマッピング。
 *
 * キー: `${lawShort}|${rawArticleNum}` (例: "安衛則|第563条")
 * 値: { notices, leaflets, mlitResources }
 *
 * 整備優先度（建設業職長 × 化学物質RA × 法令検索 × メンタルヘルスの主要動線）:
 *   1. 安衛則 主要墜落・足場・掘削条文
 *   2. 安衛法 主要組織・教育・健診条文
 *   3. 化学物質規制（安衛法57条群、有機則、特化則）
 *   4. 石綿則、粉じん則
 *   5. クレーン則、ボイラー則
 *   6. 熱中症、メンタルヘルス、健診
 */
export const articleNoticeMap: Record<string, ArticleNoticeMapEntry> = {
  // ──────────── 総則・組織体制 ────────────
  "安衛法|第17条": {
    // 安全委員会の設置義務（月1開催 + 議事録3年保存）
    notices: ["mhlw-notice-0107", "mhlw-notice-0106"],
    leaflets: ["mhlw-leaflet-0023"],
  },
  "安衛法|第18条": {
    // 衛生委員会
    notices: ["mhlw-notice-0107", "mhlw-notice-0106"],
    leaflets: ["mhlw-leaflet-0023"],
  },
  "安衛法|第19条": {
    // 安全衛生委員会
    notices: ["mhlw-notice-0106"],
  },
  "安衛則|第23条": {
    // 委員会の会議（議事録3年保存）
    notices: ["mhlw-notice-0107"],
    leaflets: ["mhlw-leaflet-0023"],
  },

  // ──────────── 教育（雇入時・職長・特別教育・技能講習） ────────────
  "安衛法|第59条": {
    // 雇入時等の安全衛生教育
    notices: ["mhlw-notice-0024", "mhlw-notice-0093", "mhlw-notice-0150", "mhlw-notice-0158"],
    leaflets: ["mhlw-leaflet-0007", "mhlw-leaflet-0014", "mhlw-leaflet-0054"],
  },
  "安衛法|第60条": {
    // 職長教育
    notices: ["mhlw-notice-0032"],
    leaflets: ["mhlw-leaflet-0023"],
  },
  "安衛法|第61条": {
    // 就業制限（フォークリフト・クレーン・玉掛け 等）
    notices: ["mhlw-notice-0226"],
    leaflets: ["mhlw-leaflet-0113"],
  },
  "安衛則|第36条": {
    // 特別教育を要する業務
    notices: ["mhlw-notice-0024", "mhlw-notice-0093", "mhlw-notice-0138"],
    leaflets: ["mhlw-leaflet-0109", "mhlw-leaflet-0120"],
  },
  "安衛則|第38条": {
    // 安全衛生教育の記録保存
    notices: ["mhlw-notice-0032", "mhlw-notice-0158"],
  },

  // ──────────── 化学物質（SDS・RA・自律的管理） ────────────
  "安衛法|第57条": {
    // ラベル表示・SDS
    notices: ["mhlw-notice-0040", "mhlw-notice-0005", "mhlw-notice-0006"],
    leaflets: ["mhlw-leaflet-0263", "mhlw-leaflet-0269"],
  },
  "安衛法|第57条の2": {
    // SDS交付義務
    notices: ["mhlw-notice-0040", "mhlw-notice-0005"],
    leaflets: ["mhlw-leaflet-0269"],
  },
  "安衛法|第57条の3": {
    // 化学物質RA
    notices: ["mhlw-notice-0535", "mhlw-notice-0027"],
    leaflets: ["mhlw-leaflet-0265", "mhlw-leaflet-0266", "mhlw-leaflet-0263"],
  },
  "安衛則|第12条": {
    // 化学物質管理者
    notices: ["mhlw-notice-0093", "mhlw-notice-0138"],
    leaflets: ["mhlw-leaflet-0265"],
  },

  // ──────────── 有機則・特化則 ────────────
  "有機則|第1条": {
    notices: ["mhlw-notice-0033"],
  },
  "特化則|第3条": {
    notices: ["mhlw-notice-0270", "mhlw-notice-0271", "mhlw-notice-0272", "mhlw-notice-0273"]
      .filter((id) => id.startsWith("mhlw-notice-")), // sanity
    leaflets: ["mhlw-leaflet-0270", "mhlw-leaflet-0271", "mhlw-leaflet-0272"],
  },

  // ──────────── 石綿則 ────────────
  "石綿則|第3条": {
    // 事前調査
    notices: ["mhlw-notice-0059", "mhlw-notice-0091", "mhlw-notice-0133", "mhlw-notice-0168"],
    leaflets: ["mhlw-leaflet-0229", "mhlw-leaflet-0288"],
  },
  "石綿則|第4条": {
    // 事前調査結果の報告
    notices: ["mhlw-notice-0059", "mhlw-notice-0091", "mhlw-notice-0133"],
    leaflets: ["mhlw-leaflet-0229"],
  },
  "石綿則|第4条の2": {
    // 事前調査結果の電子報告
    notices: ["mhlw-notice-0133"],
    leaflets: ["mhlw-leaflet-0229"],
  },

  // ──────────── 粉じん則・じん肺法 ────────────
  "粉じん則|第1条": {
    notices: ["mhlw-notice-0036", "mhlw-notice-0077", "mhlw-notice-0185"],
    leaflets: ["mhlw-leaflet-0232", "mhlw-leaflet-0233", "mhlw-leaflet-0234"],
  },
  "粉じん則|第24条の2": {
    // 発破終了後の措置
    notices: ["mhlw-notice-0151"],
  },
  "じん肺法|第3条": {
    notices: ["mhlw-notice-0036", "mhlw-notice-0017", "mhlw-notice-0172"],
    leaflets: ["mhlw-leaflet-0213", "mhlw-leaflet-0235"],
  },

  // ──────────── クレーン則・ボイラー則 ────────────
  "クレーン則|第221条": {
    // 玉掛け技能講習
    notices: ["mhlw-notice-0226"],
    leaflets: ["mhlw-leaflet-0113"],
  },
  "ボイラー則|第15条": {
    // ボイラー検査証（押印廃止の通達）
    notices: ["mhlw-notice-0160"],
  },
  "ボイラー則|第24条": {
    // ボイラー取扱作業主任者の選任（自動制御装置による区分の特例 = 機能安全）
    leaflets: ["mhlw-leaflet-0116"],
  },
  "ボイラー則|第38条": {
    // 性能検査・有効期間更新（2年連続運転認定制度）
    leaflets: ["mhlw-leaflet-0145"],
  },

  // ──────────── 健康診断・健康管理 ────────────
  "安衛法|第66条": {
    // 一般健康診断
    notices: ["mhlw-notice-0320", "mhlw-notice-0163", "mhlw-notice-0341"],
    leaflets: ["mhlw-leaflet-0175"],
  },
  "安衛法|第66条の10": {
    // ストレスチェック
    notices: ["mhlw-notice-0506", "mhlw-notice-0507", "mhlw-notice-0415", "mhlw-notice-0344"],
    leaflets: ["mhlw-leaflet-0180", "mhlw-leaflet-0219", "mhlw-leaflet-0220"],
  },

  // ──────────── 安衛則 墜落・足場関係（核心条文） ────────────
  "安衛則|第518条": {
    // 高さ2m以上の作業床・囲い・手すり・墜落制止用器具
    notices: ["mhlw-notice-0044", "mhlw-notice-0081", "mhlw-notice-0082"],
    leaflets: ["mhlw-leaflet-0091", "mhlw-leaflet-0109", "mhlw-leaflet-0120", "mhlw-leaflet-0124"],
  },
  "安衛則|第519条": {
    notices: ["mhlw-notice-0044", "mhlw-notice-0082"],
    leaflets: ["mhlw-leaflet-0091", "mhlw-leaflet-0124"],
  },
  "安衛則|第520条": {
    // 要求性能墜落制止用器具（フルハーネス）
    notices: ["mhlw-notice-0044"],
    leaflets: ["mhlw-leaflet-0109", "mhlw-leaflet-0120"],
  },
  "安衛則|第563条": {
    // 足場における作業床
    notices: ["mhlw-notice-0081", "mhlw-notice-0082"],
    leaflets: ["mhlw-leaflet-0086", "mhlw-leaflet-0133", "mhlw-leaflet-0137", "mhlw-leaflet-0138", "mhlw-leaflet-0142"],
  },
  "安衛則|第564条": {
    // 足場の組立・解体
    notices: ["mhlw-notice-0081", "mhlw-notice-0082"],
    leaflets: ["mhlw-leaflet-0086", "mhlw-leaflet-0135", "mhlw-leaflet-0137"],
  },
  "安衛則|第568条": {
    notices: ["mhlw-notice-0081"],
    leaflets: ["mhlw-leaflet-0137"],
  },
  "安衛則|第570条": {
    // 鋼管足場・本足場
    notices: ["mhlw-notice-0081", "mhlw-notice-0082"],
    leaflets: ["mhlw-leaflet-0137", "mhlw-leaflet-0138"],
  },
  "安衛則|第575条": {
    notices: ["mhlw-notice-0081"],
    leaflets: ["mhlw-leaflet-0137"],
  },

  // ──────────── 安衛則 掘削・崩壊防止 ────────────
  "安衛則|第361条": {
    // 地山の崩壊等による危険の防止
    notices: ["mhlw-notice-0063"],
  },

  // ──────────── 安衛則 荷役 ────────────
  // 注: 第151条の21（フォークリフト定期自主検査）に紐付いていた mhlw-notice-0226 は
  //     クレーン則改正通達でフォークリフトと無関係のため削除（2026-06-10 条番号是正）。
  "安衛則|第151条の67": {
    // 貨物自動車の昇降設備（R5改正・墜落転落防止）
    notices: ["mhlw-notice-0080"],
    leaflets: ["mhlw-leaflet-0082"],
  },
  "安衛則|第151条の74": {
    // 貨物自動車の保護帽着用（R5改正・墜落転落防止）
    notices: ["mhlw-notice-0080"],
    leaflets: ["mhlw-leaflet-0082"],
  },

  // ──────────── 熱中症（安衛則 R7改正） ────────────
  "安衛則|第612条の2": {
    // 暑熱な場所での作業（R7改正で新設・拡充）
    notices: [
      "mhlw-notice-0001",
      "mhlw-notice-0101",
      "mhlw-notice-0130",
      "mhlw-notice-0136",
      "mhlw-notice-0281",
      "mhlw-notice-0323",
    ],
    leaflets: ["mhlw-leaflet-0227", "mhlw-leaflet-0251"],
  },
  "安衛則|第624条": {
    // 高温多湿作業
    notices: ["mhlw-notice-0001", "mhlw-notice-0130", "mhlw-notice-0136"],
    leaflets: ["mhlw-leaflet-0227"],
  },

  // ──────────── 病者の就業禁止 ────────────
  // 安衛則|第61条 は通達紐付けなし（感染症法側のフォールバックで対応）

  // ──────────── 電離放射線 ────────────
  "電離則|第1条": {
    notices: ["mhlw-notice-0009", "mhlw-notice-0010", "mhlw-notice-0169", "mhlw-notice-0225"],
    leaflets: ["mhlw-leaflet-0187", "mhlw-leaflet-0198", "mhlw-leaflet-0199", "mhlw-leaflet-0200"],
  },
  "電離則|第3条": {
    notices: ["mhlw-notice-0169", "mhlw-notice-0225"],
    leaflets: ["mhlw-leaflet-0187"],
  },

  // ──────────── ゴンドラ則 ────────────
  // ゴンドラ則|第12条 は当面 notice/leaflet 未登録（建設業需要次第で追加）

  // ──────────── 安衛則 健康管理関連 ────────────
  "安衛則|第43条": {
    // 雇入時の健康診断
    notices: ["mhlw-notice-0320"],
    leaflets: [],
  },
  "安衛則|第44条": {
    // 定期健康診断
    notices: ["mhlw-notice-0320", "mhlw-notice-0163"],
    leaflets: ["mhlw-leaflet-0175"],
  },

  // ──────────── 機械・検定 ────────────
  "安衛令|第20条": {
    // 就業制限業務
    notices: ["mhlw-notice-0226"],
    leaflets: ["mhlw-leaflet-0113"],
  },

  // ──────────── ハラスメント関連（労契法・労働施策総合推進法は別 lawShort） ────────────
  // 労契法|第5条 はカスハラ等の安全配慮義務の根拠。 leaflets/notices なし（指針系は別）

  // ──────────── 過重労働・メンタル ────────────
  "安衛法|第66条の8": {
    // 長時間労働者の医師面接
    notices: ["mhlw-notice-0344"],
    leaflets: ["mhlw-leaflet-0211", "mhlw-leaflet-0217"],
  },
  "安衛法|第69条": {
    // 健康教育等
    leaflets: ["mhlw-leaflet-0179", "mhlw-leaflet-0220"],
  },

  // ──────────── 一般カテゴリ（建設業向け汎用） ────────────
  "安衛則|第14条": {
    notices: ["mhlw-notice-0108"],
  },
};

// ── 内部キャッシュとルックアップ ─────────────────────────

let cachedNotices: Map<string, (typeof mhlwNotices)[number]> | null = null;
let cachedLeaflets: Map<string, (typeof mhlwLeaflets)[number]> | null = null;
let cachedMlit: Map<string, (typeof mlitResources)[number]> | null = null;

function ensureIndexes() {
  if (cachedNotices) return;
  cachedNotices = new Map(mhlwNotices.map((n) => [n.id, n]));
  cachedLeaflets = new Map(mhlwLeaflets.map((l) => [l.id, l]));
  cachedMlit = new Map(mlitResources.map((m) => [m.id, m]));
}

/**
 * 入力 articleId（`lawShort|articleNum`）に対するマッピングを返す。
 * 表記ゆれを考慮し、normalizeArticleNumToKey でフォールバック検索もする。
 */
export function getNoticeMappingForArticle(
  lawShort: string,
  articleNum: string
): ArticleNoticeMapEntry | undefined {
  const rawKey = `${lawShort}|${articleNum}`;
  if (articleNoticeMap[rawKey]) return articleNoticeMap[rawKey];

  // raw キーで命中しない場合、登録キー側を正規化キーで比較
  const inputNumKey = normalizeArticleNumToKey(articleNum);
  if (!inputNumKey) return undefined;
  for (const [mapKey, entry] of Object.entries(articleNoticeMap)) {
    const [mapLaw, mapArticleNum] = mapKey.split("|");
    if (mapLaw !== lawShort) continue;
    const mapNumKey = normalizeArticleNumToKey(mapArticleNum);
    if (mapNumKey === inputNumKey) return entry;
  }
  return undefined;
}

/**
 * notice ID から MhlwNotice を解決。 不明なら undefined。
 */
export function resolveNoticeById(id: string): (typeof mhlwNotices)[number] | undefined {
  ensureIndexes();
  return cachedNotices!.get(id);
}

/**
 * leaflet ID から MhlwLeaflet を解決。 不明なら undefined。
 */
export function resolveLeafletById(id: string): (typeof mhlwLeaflets)[number] | undefined {
  ensureIndexes();
  return cachedLeaflets!.get(id);
}

/**
 * MLIT resource ID から MlitResource を解決。 不明なら undefined。
 */
export function resolveMlitResourceById(id: string): (typeof mlitResources)[number] | undefined {
  ensureIndexes();
  return cachedMlit!.get(id);
}

/** 集計用統計（テスト/監査用）。 */
export type NoticeMapStats = {
  totalArticles: number;
  totalNoticeMappings: number;
  totalLeafletMappings: number;
  totalMlitMappings: number;
  orphanNoticeIds: string[]; // mhlw-notices.ts に存在しないID
  orphanLeafletIds: string[]; // mhlw-leaflets.ts に存在しないID
  orphanMlitIds: string[]; // mlit-resources.ts に存在しないID
};

export function articleNoticeMapStats(): NoticeMapStats {
  ensureIndexes();
  let nMap = 0;
  let lMap = 0;
  let mMap = 0;
  const orphanN: string[] = [];
  const orphanL: string[] = [];
  const orphanM: string[] = [];
  for (const entry of Object.values(articleNoticeMap)) {
    for (const id of entry.notices ?? []) {
      nMap++;
      if (!cachedNotices!.has(id)) orphanN.push(id);
    }
    for (const id of entry.leaflets ?? []) {
      lMap++;
      if (!cachedLeaflets!.has(id)) orphanL.push(id);
    }
    for (const id of entry.mlitResources ?? []) {
      mMap++;
      if (!cachedMlit!.has(id)) orphanM.push(id);
    }
  }
  return {
    totalArticles: Object.keys(articleNoticeMap).length,
    totalNoticeMappings: nMap,
    totalLeafletMappings: lMap,
    totalMlitMappings: mMap,
    orphanNoticeIds: orphanN,
    orphanLeafletIds: orphanL,
    orphanMlitIds: orphanM,
  };
}
