/**
 * Phase 4: 条文ID → 関連通達/リーフレット/MLIT 資料 マッピングDB
 *
 * 既存の `searchRelevantNotices(query)` (notice-search.ts) はクエリベースで
 * カテゴリ・キーワードから通達を抽出する。
 * 本マッピングは **AI 応答が特定の条文を引用した場合**、その条文に紐づく
 * 関連通達/リーフレット/MLIT 資源を確実に添付するための静的マッピング。
 *
 * キー: article-registry.ts と同じ正規化キー `${lawShort}|${articleNumKey}`
 *   - 例: "安衛則|563"  = 労働安全衛生規則 第563条 (足場の手すり等)
 *   - 例: "安衛法|57-3" = 労働安全衛生法 第57条の3 (化学物質RA)
 *
 * 値: 関連通達 ID 配列, リーフレット ID 配列, MLIT 資源 ID 配列, 拘束力レベル
 *
 * 収録方針:
 *   - 建設業頻出条文を優先 (足場/墜落/掘削/クレーン/化学物質/石綿/熱中症)
 *   - 主要 60+ マッピング、Phase 1f 以降で拡張可能
 *   - 該当ジャンルの通達/リーフレットを 最大 3-5 件指定
 *   - 個別 noticeId 指定が困難なものは noticeCategory で動的解決
 */

import {
  mhlwNotices,
  type MhlwNotice,
} from "@/data/mhlw-notices";
import { mhlwLeaflets, type MhlwLeaflet } from "@/data/mhlw-leaflets";
import {
  mlitResources,
  type MlitResource,
} from "@/data/mlit-resources";

/** mhlw-notices.ts の category フィールド値 */
type NoticeCategory = string;

/** 拘束力レベル (UI バッジ色分け用) */
export type ArticleNoticeBindingLevel = "binding" | "guidance" | "reference";

/** 条文に対する関連資料マッピング */
export type ArticleNoticeMapEntry = {
  /** 正規化キー: "<lawShort>|<articleNumKey>" */
  articleKey: string;
  /** 表示用ラベル (例: "安衛則 第563条 足場の手すり") */
  topicLabel: string;
  /**
   * 個別指定する通達 ID (mhlw-notices.ts の id)。
   * 空配列の場合は noticeCategory から動的に拾う。
   */
  noticeIds: string[];
  /**
   * カテゴリベースで該当通達を自動追加 (最大 N 件)
   * noticeIds と合算して上限 5 件で打ち切り
   */
  noticeCategory?: NoticeCategory;
  /** リーフレット ID (mhlw-leaflets.ts の id) */
  leafletIds: string[];
  /** MLIT 資源 ID (mlit-resources.ts の id、所管省庁が国交省の場合) */
  mlitResourceIds: string[];
  /** 全体的な拘束力レベル */
  bindingLevel: ArticleNoticeBindingLevel;
};

export const ARTICLE_NOTICE_MAP: ArticleNoticeMapEntry[] = [
  // ===== 安衛則 足場・墜落関係 (建設業核心) =====
  {
    articleKey: "安衛則|518",
    topicLabel: "安衛則 第518条 高さ2m以上の作業床",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|519",
    topicLabel: "安衛則 第519条 高さ2m以上の囲い等",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|520",
    topicLabel: "安衛則 第520条 要求性能墜落制止用器具",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|521",
    topicLabel: "安衛則 第521条 安全帯等の取付設備",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|563",
    topicLabel: "安衛則 第563条 足場の作業床・手すり",
    noticeIds: ["mhlw-notice-0044", "mhlw-notice-0080"],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|564",
    topicLabel: "安衛則 第564条 足場の組立て等の作業",
    noticeIds: ["mhlw-notice-0080"],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|566",
    topicLabel: "安衛則 第566条 足場の組立て等作業主任者",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|567",
    topicLabel: "安衛則 第567条 足場の点検",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|570",
    topicLabel: "安衛則 第570条 鋼管足場",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|571",
    topicLabel: "安衛則 第571条 鋼管足場の構造",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|575",
    topicLabel: "安衛則 第575条 木造の足場",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛則 化学物質RA / SDS関係 =====
  {
    articleKey: "安衛法|57",
    topicLabel: "安衛法 第57条 表示等",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|57-2",
    topicLabel: "安衛法 第57条の2 文書の交付等",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|57-3",
    topicLabel: "安衛法 第57条の3 化学物質リスクアセスメント",
    noticeIds: ["mhlw-notice-0005", "mhlw-notice-0006"],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|34-2-7",
    topicLabel: "安衛則 第34条の2の7 リスクアセスメント実施時期",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|577-2",
    topicLabel: "安衛則 第577条の2 濃度基準値・健康障害防止措置",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|577-3",
    topicLabel: "安衛則 第577条の3 ばく露低減措置",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|594-2",
    topicLabel: "安衛則 第594条の2 皮膚等障害化学物質",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|594-3",
    topicLabel: "安衛則 第594条の3 不浸透性保護具",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 熱中症関係 =====
  {
    articleKey: "安衛則|612-2",
    topicLabel: "安衛則 第612条の2 暑熱業務 (熱中症対策)",
    noticeIds: ["mhlw-notice-0001", "mhlw-notice-0101", "mhlw-notice-0130"],
    noticeCategory: "heat-stroke",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 石綿関係 =====
  {
    articleKey: "石綿則|3",
    topicLabel: "石綿則 第3条 事前調査",
    noticeIds: ["mhlw-notice-0059", "mhlw-notice-0083"],
    noticeCategory: "asbestos",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "石綿則|5",
    topicLabel: "石綿則 第5条 作業計画",
    noticeIds: ["mhlw-notice-0085"],
    noticeCategory: "asbestos",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "石綿則|6",
    topicLabel: "石綿則 第6条 作業計画の届出",
    noticeIds: [],
    noticeCategory: "asbestos",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "石綿則|14",
    topicLabel: "石綿則 第14条 隔離・湿潤化",
    noticeIds: [],
    noticeCategory: "asbestos",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "石綿則|27",
    topicLabel: "石綿則 第27条 石綿作業主任者",
    noticeIds: [],
    noticeCategory: "asbestos",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== クレーン則 =====
  {
    articleKey: "クレーン則|29",
    topicLabel: "クレーン則 第29条 性能検査",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "クレーン則|34",
    topicLabel: "クレーン則 第34条 定期自主検査 (1年以内ごと)",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "クレーン則|35",
    topicLabel: "クレーン則 第35条 定期自主検査 (1か月以内ごと)",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "クレーン則|36",
    topicLabel: "クレーン則 第36条 作業開始前点検",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "クレーン則|76",
    topicLabel: "クレーン則 第76条 移動式クレーン定期自主検査",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛則 掘削関係 =====
  {
    articleKey: "安衛則|355",
    topicLabel: "安衛則 第355条 掘削箇所の調査",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|356",
    topicLabel: "安衛則 第356条 掘削面の勾配",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|361",
    topicLabel: "安衛則 第361条 地山崩壊・土石落下防止",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|365",
    topicLabel: "安衛則 第365条 地山掘削作業主任者",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛法 安全衛生教育・体制 =====
  {
    articleKey: "安衛法|10",
    topicLabel: "安衛法 第10条 総括安全衛生管理者",
    noticeIds: [],
    noticeCategory: "training",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|12",
    topicLabel: "安衛法 第12条 衛生管理者",
    noticeIds: [],
    noticeCategory: "training",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|13",
    topicLabel: "安衛法 第13条 産業医",
    noticeIds: [],
    noticeCategory: "health-checkup",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|14",
    topicLabel: "安衛法 第14条 作業主任者",
    noticeIds: [],
    noticeCategory: "training",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|59",
    topicLabel: "安衛法 第59条 安全衛生教育",
    noticeIds: ["mhlw-notice-0024", "mhlw-notice-0032"],
    noticeCategory: "training",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|60",
    topicLabel: "安衛法 第60条 職長教育",
    noticeIds: ["mhlw-notice-0093"],
    noticeCategory: "training",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛法 健康診断 =====
  {
    articleKey: "安衛法|66",
    topicLabel: "安衛法 第66条 健康診断",
    noticeIds: [],
    noticeCategory: "health-checkup",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|66-8",
    topicLabel: "安衛法 第66条の8 面接指導 (長時間労働)",
    noticeIds: [],
    noticeCategory: "mental-health",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛法|66-10",
    topicLabel: "安衛法 第66条の10 ストレスチェック",
    noticeIds: [],
    noticeCategory: "mental-health",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛法 リスクアセスメント (28条の2 / 57条の3) =====
  {
    articleKey: "安衛法|28-2",
    topicLabel: "安衛法 第28条の2 一般リスクアセスメント努力義務",
    noticeIds: [],
    noticeCategory: "general",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "guidance",
  },

  // ===== 有機則 =====
  {
    articleKey: "有機則|5",
    topicLabel: "有機則 第5条 第1種有機溶剤",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "有機則|33",
    topicLabel: "有機則 第33条 呼吸用保護具",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 特化則 =====
  {
    articleKey: "特化則|3",
    topicLabel: "特化則 第3条 第1類物質の製造許可",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "特化則|36",
    topicLabel: "特化則 第36条 作業環境測定",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "特化則|38-21",
    topicLabel: "特化則 第38条の21 化学物質管理者",
    noticeIds: [],
    noticeCategory: "chemicals",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 酸欠則 =====
  {
    articleKey: "酸欠則|3",
    topicLabel: "酸欠則 第3条 作業環境測定",
    noticeIds: [],
    noticeCategory: "general",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "酸欠則|5",
    topicLabel: "酸欠則 第5条 換気",
    noticeIds: [],
    noticeCategory: "general",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "酸欠則|11",
    topicLabel: "酸欠則 第11条 作業主任者",
    noticeIds: [],
    noticeCategory: "general",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 粉じん則 =====
  {
    articleKey: "粉じん則|4",
    topicLabel: "粉じん則 第4条 作業環境改善・呼吸用保護具",
    noticeIds: ["mhlw-notice-0036", "mhlw-notice-0077"],
    noticeCategory: "dust",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 電離則 =====
  {
    articleKey: "電離則|3",
    topicLabel: "電離則 第3条 管理区域",
    noticeIds: ["mhlw-notice-0009", "mhlw-notice-0067"],
    noticeCategory: "radiation",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== じん肺法 =====
  {
    articleKey: "じん肺法|7",
    topicLabel: "じん肺法 第7条 じん肺健康診断",
    noticeIds: [],
    noticeCategory: "dust",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛則 機械等 =====
  {
    articleKey: "安衛則|107",
    topicLabel: "安衛則 第107条 機械の清掃・給油等",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|110",
    topicLabel: "安衛則 第110条 動力遮断装置",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|151-3",
    topicLabel: "安衛則 第151条の3 フォークリフト前照灯・後照灯",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|151-24",
    topicLabel: "安衛則 第151条の24 フォークリフト定期自主検査",
    noticeIds: [],
    noticeCategory: "machinery",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },

  // ===== 安衛則 受動喫煙対策 =====
  {
    articleKey: "安衛法|68-2",
    topicLabel: "安衛法 第68条の2 受動喫煙対策",
    noticeIds: [],
    noticeCategory: "smoking",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "guidance",
  },

  // ===== 安衛則 一般 =====
  {
    articleKey: "安衛則|527",
    topicLabel: "安衛則 第527条 移動はしごの構造",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|528",
    topicLabel: "安衛則 第528条 脚立の構造",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|536",
    topicLabel: "安衛則 第536条 高所からの物体投下",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|537",
    topicLabel: "安衛則 第537条 物体落下による危険防止",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|538",
    topicLabel: "安衛則 第538条 立入禁止",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
  {
    articleKey: "安衛則|539",
    topicLabel: "安衛則 第539条 保護帽の着用",
    noticeIds: [],
    noticeCategory: "construction",
    leafletIds: [],
    mlitResourceIds: [],
    bindingLevel: "binding",
  },
];

const MAP_BY_KEY = new Map<string, ArticleNoticeMapEntry>();
for (const e of ARTICLE_NOTICE_MAP) {
  MAP_BY_KEY.set(e.articleKey, e);
}

/** 全 mhlw-notices をカテゴリ別にインデックス化 (動的解決用) */
const NOTICES_BY_CATEGORY = new Map<NoticeCategory, MhlwNotice[]>();
for (const n of mhlwNotices) {
  const list = NOTICES_BY_CATEGORY.get(n.category) ?? [];
  list.push(n);
  NOTICES_BY_CATEGORY.set(n.category, list);
}

const NOTICE_BY_ID = new Map<string, MhlwNotice>();
for (const n of mhlwNotices) NOTICE_BY_ID.set(n.id, n);

const LEAFLET_BY_ID = new Map<string, MhlwLeaflet>();
for (const l of mhlwLeaflets) LEAFLET_BY_ID.set(l.id, l);

const MLIT_BY_ID = new Map<string, MlitResource>();
for (const m of mlitResources) MLIT_BY_ID.set(m.id, m);

/**
 * 条文キー (例: "安衛則|563") を渡すと、関連通達/リーフレット/MLIT 資源を返す。
 * - 個別 noticeIds + noticeCategory の上位 N 件を結合して最大 maxNotices 件
 */
export function lookupArticleNoticeMap(
  articleKey: string,
  maxNotices = 5,
  maxLeaflets = 5,
): {
  entry: ArticleNoticeMapEntry | null;
  notices: MhlwNotice[];
  leaflets: MhlwLeaflet[];
  mlitResources: MlitResource[];
} {
  const entry = MAP_BY_KEY.get(articleKey) ?? null;
  if (!entry) {
    return { entry: null, notices: [], leaflets: [], mlitResources: [] };
  }
  // 個別指定通達
  const noticeSeen = new Set<string>();
  const notices: MhlwNotice[] = [];
  for (const id of entry.noticeIds) {
    const n = NOTICE_BY_ID.get(id);
    if (n && !noticeSeen.has(n.id)) {
      notices.push(n);
      noticeSeen.add(n.id);
    }
  }
  // カテゴリベース補完 (発出日が新しい順)
  if (entry.noticeCategory && notices.length < maxNotices) {
    const catNotices = (NOTICES_BY_CATEGORY.get(entry.noticeCategory) ?? [])
      .slice()
      .sort((a, b) => (b.issuedDate ?? "").localeCompare(a.issuedDate ?? ""));
    for (const n of catNotices) {
      if (notices.length >= maxNotices) break;
      if (noticeSeen.has(n.id)) continue;
      notices.push(n);
      noticeSeen.add(n.id);
    }
  }
  const trimmedNotices = notices.slice(0, maxNotices);

  // リーフレット
  const leaflets: MhlwLeaflet[] = [];
  for (const id of entry.leafletIds.slice(0, maxLeaflets)) {
    const l = LEAFLET_BY_ID.get(id);
    if (l) leaflets.push(l);
  }

  // MLIT
  const mlitOut: MlitResource[] = [];
  for (const id of entry.mlitResourceIds) {
    const m = MLIT_BY_ID.get(id);
    if (m) mlitOut.push(m);
  }

  return { entry, notices: trimmedNotices, leaflets, mlitResources: mlitOut };
}

/** すべての登録済みキー (テスト・デバッグ用) */
export function getAllArticleNoticeKeys(): string[] {
  return Array.from(MAP_BY_KEY.keys());
}

/** マッピング件数 */
export const ARTICLE_NOTICE_MAP_COUNT = ARTICLE_NOTICE_MAP.length;
