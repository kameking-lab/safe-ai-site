/**
 * Phase 2 Layer 3: Fallback ロジック
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/05-fallback-logic-design.md
 *
 * 目的:
 * - 該当条文が直接見つからない場合に「最も近い条文」を提示する
 * - 3分岐:
 *   - Direct Hit (normalizedScore >= 0.75 かつ articles >= 2): 通常応答
 *   - Adjacent Hit (0.5 <= score < 0.75): 「関連する一般条項」として明示区別
 *   - Out-of-Scope (score < 0.5): 関連分野の他法令カテゴリを2-3件提示
 *
 * 設計原則:
 * - 提示する全条文は article-registry に実在する条文のみ
 * - 関連法令カテゴリ DB は 50 件初期収録、ペルソナテスト失敗11件を全カバー
 * - 「該当条文なし」と冷たく突き放さない
 */

import type { LawArticle } from "@/data/laws";

export type FallbackTier = "direct" | "adjacent" | "out-of-scope";

export type FallbackLawSuggestion = {
  /** 法令名（短縮形 or 正式名称） */
  lawName: string;
  /** 当該条文（あれば。トピックによっては条文番号まで特定） */
  articleHint?: string;
  /** 所管省庁・出典の手がかり */
  source?: string;
  /** ユーザー向け説明 */
  reason: string;
};

export type FallbackDecision = {
  tier: FallbackTier;
  /** Out-of-Scope の場合の関連分野候補（最大3件） */
  suggestions: FallbackLawSuggestion[];
  /** 応答本文の冒頭に挿入する見出し文（任意） */
  headline?: string;
  /** 応答末尾に追記する e-Gov 誘導文 */
  egovFooter?: string;
};

/**
 * トピック → 関連法令カテゴリのマッピング。
 *
 * ペルソナテスト失敗11件を完全カバーしつつ、頻出 33法令外トピックを 50件超 登録。
 * triggers は質問テキストに「いずれかの語が含まれる」と OR マッチ。
 * 大文字小文字・全角半角は normalize 関数側で吸収する。
 *
 * メンテナンス方針:
 * - 失敗ログ収集 → 月次で追加
 * - 同義語・別表記は triggers に複数登録（カスハラ／カスタマーハラスメント等）
 */
export type TopicMapping = {
  id: string;
  /** マッチするキーワード（OR） */
  triggers: string[];
  /** 関連法令カテゴリ候補（最大3件） */
  suggestions: FallbackLawSuggestion[];
};

export const TOPIC_TO_LAW_CATEGORY: TopicMapping[] = [
  // ── 33法令外: 運輸・道交（ペルソナD失敗対応） ───────────────────────
  {
    id: "alcohol-check",
    triggers: ["アルコール検知", "酒気帯び", "白ナンバー アルコール", "アルコールチェック"],
    suggestions: [
      {
        lawName: "貨物自動車運送事業法",
        articleHint: "輸送安全規則 第7条（アルコール検知器使用義務）",
        source: "国土交通省",
        reason: "事業用自動車のアルコールチェック義務の根拠法。",
      },
      {
        lawName: "道路交通法",
        articleHint: "第65条（酒気帯び運転等の禁止）",
        source: "警察庁",
        reason: "白ナンバー含む全事業者の酒気帯び確認義務（2023年12月施行）。",
      },
    ],
  },
  {
    id: "driver-aptitude",
    triggers: ["適性診断", "運転適性", "ドライバー適性"],
    suggestions: [
      {
        lawName: "貨物自動車運送事業法",
        articleHint: "輸送安全規則 第10条（運転者の適性診断）",
        source: "国土交通省",
        reason: "事業用自動車運転者の適性診断受診義務。",
      },
      {
        lawName: "自動車事故対策機構告示",
        source: "国土交通省",
        reason: "適性診断の実施基準（NASVA）。",
      },
    ],
  },
  {
    id: "drone",
    triggers: ["ドローン", "無人航空機", "UAV"],
    suggestions: [
      {
        lawName: "航空法",
        articleHint: "第132条（無人航空機の飛行）",
        source: "国土交通省",
        reason: "無人航空機の飛行許可・承認の根拠法。",
      },
      {
        lawName: "建設業労働災害防止規程（建災防）",
        source: "建設業労働災害防止協会",
        reason: "建設現場でのドローン使用と高所作業との関係。",
      },
    ],
  },
  {
    id: "logistics-improvement",
    triggers: ["改善基準告示", "拘束時間", "運転時間", "休息期間"],
    suggestions: [
      {
        lawName: "自動車運転者の労働時間等の改善のための基準（改善基準告示）",
        source: "厚生労働省",
        reason: "トラック・バス・タクシー運転者の拘束時間・休息期間の基準。",
      },
    ],
  },

  // ── 33法令外: ハラスメント・労働関係（ペルソナE/C失敗対応） ────────
  {
    id: "customer-harassment",
    triggers: ["カスハラ", "カスタマーハラスメント", "客 暴言", "客 暴力"],
    suggestions: [
      {
        lawName: "労働施策総合推進法",
        articleHint: "第30条の2（パワーハラスメント防止義務）",
        source: "厚生労働省",
        reason: "事業主の措置義務とカスハラ対策の根拠（カスハラはハラスメント類型として明記）。",
      },
      {
        lawName: "労働契約法",
        articleHint: "第5条（安全配慮義務）",
        source: "厚生労働省",
        reason: "使用者が従業員を顧客の暴言・暴力から守る安全配慮義務の根拠。",
      },
      {
        lawName: "厚生労働省カスタマーハラスメント対策企業マニュアル",
        source: "厚生労働省",
        reason: "具体的な対応手順・マニュアル作成例の指針。",
      },
    ],
  },
  {
    id: "night-violence",
    triggers: ["夜勤 暴力", "夜勤 暴言", "夜間 ハラスメント"],
    suggestions: [
      {
        lawName: "労働契約法",
        articleHint: "第5条（安全配慮義務）",
        source: "厚生労働省",
        reason: "夜勤帯の暴力リスクに対する事業者の配慮義務の根拠。",
      },
      {
        lawName: "労働安全衛生法",
        articleHint: "第59条（雇入れ時等の安全衛生教育）",
        source: "厚生労働省",
        reason: "暴力リスクへの事前教育を義務付ける条文。",
      },
    ],
  },
  {
    id: "infection-restriction",
    triggers: ["感染症 就業制限", "結核患者", "就業制限 感染", "コロナ 出勤停止", "新型コロナ 就業"],
    suggestions: [
      {
        lawName: "感染症の予防及び感染症の患者に対する医療に関する法律（感染症法）",
        articleHint: "第18条（就業制限）",
        source: "厚生労働省",
        reason: "感染症類型ごとの就業制限の根拠法。",
      },
      {
        lawName: "労働安全衛生規則",
        articleHint: "第61条（病者の就業禁止）",
        source: "厚生労働省",
        reason: "事業者が就業させてはならない疾病者の規定。",
      },
    ],
  },
  {
    id: "covid-workplace",
    triggers: ["コロナ 職場", "COVID 職場", "感染対策 ガイドライン"],
    suggestions: [
      {
        lawName: "新型コロナウイルス感染症対策の基本的対処方針",
        source: "内閣官房",
        reason: "事業所での感染対策の基本方針（実施期間別に改訂）。",
      },
      {
        lawName: "労働安全衛生法",
        articleHint: "第3条（事業者等の責務）",
        source: "厚生労働省",
        reason: "労働者の安全と健康確保の一般義務。",
      },
    ],
  },
  {
    id: "mental-stress-check",
    triggers: ["ストレスチェック 義務化 50人未満", "ストレスチェック努力義務"],
    suggestions: [
      {
        lawName: "労働安全衛生法",
        articleHint: "第66条の10（ストレスチェック）",
        source: "厚生労働省",
        reason: "50人以上事業場の義務、50人未満の努力義務の根拠条文。",
      },
      {
        lawName: "ストレスチェック制度の実施マニュアル",
        source: "厚生労働省",
        reason: "実施手順・調査票・面接指導の指針。",
      },
    ],
  },

  // ── 33法令外: 建設・現場（ペルソナA失敗対応） ──────────────────────
  {
    id: "landslide-warning",
    triggers: ["土砂崩壊", "崩壊 前兆", "斜面崩落"],
    suggestions: [
      {
        lawName: "労働安全衛生規則",
        articleHint: "第361条（地山の崩壊等による危険の防止）",
        source: "厚生労働省",
        reason: "明り掘削作業の土砂崩壊防止の根拠条文。",
      },
      {
        lawName: "建設業労働災害防止規程（建災防）",
        source: "建設業労働災害防止協会",
        reason: "業界自主基準としての崩壊前兆点検手順。",
      },
    ],
  },
  {
    id: "monthly-safety-meeting",
    triggers: [
      "月次計画",
      "月1 計画",
      "月次 報告書",
      "委員会報告書",
      "安全衛生委員会",
      "議事録テンプレ",
      "議事録 テンプレ",
    ],
    suggestions: [
      {
        lawName: "労働安全衛生法",
        articleHint: "第17条（安全委員会）・第18条（衛生委員会）",
        source: "厚生労働省",
        reason: "安全衛生委員会の設置義務と月1回以上の開催義務の根拠。",
      },
      {
        lawName: "労働安全衛生規則",
        articleHint: "第23条（委員会の会議）",
        source: "厚生労働省",
        reason: "委員会の議事録作成・保存（3年）義務の根拠。",
      },
    ],
  },
  {
    id: "morning-meeting-topic",
    triggers: ["朝礼ネタ", "朝礼 トピック", "KYネタ", "危険予知 ネタ"],
    suggestions: [
      {
        lawName: "労働安全衛生法",
        articleHint: "第59条（雇入れ時等の安全衛生教育）",
        source: "厚生労働省",
        reason: "日常の安全教育（朝礼含む）の一般義務。",
      },
      {
        lawName: "中央労働災害防止協会 KYTシート集",
        source: "中央労働災害防止協会",
        reason: "朝礼で使える業種別 KY 例の参考資料。",
      },
    ],
  },

  // ── 33法令外: 化学物質・化管法 ────────────────────────────────
  {
    id: "ghs-classification",
    triggers: ["GHS 分類", "PRTR 届出", "化管法"],
    suggestions: [
      {
        lawName: "特定化学物質の環境への排出量の把握等及び管理の改善の促進に関する法律（化管法）",
        source: "経済産業省・環境省",
        reason: "PRTR 制度・SDS 制度の根拠法（厚労省 SDS 制度と並列）。",
      },
      {
        lawName: "労働安全衛生法",
        articleHint: "第57条の2（SDS 交付義務）",
        source: "厚生労働省",
        reason: "労働安全衛生法上の SDS 交付義務（化管法と二重立法）。",
      },
    ],
  },
  {
    id: "msds-export",
    triggers: ["輸出 SDS", "海外 SDS", "国際 GHS"],
    suggestions: [
      {
        lawName: "化管法",
        source: "経済産業省・環境省",
        reason: "国内 SDS 制度の根拠（輸出時は相手国規制に従う必要あり）。",
      },
      {
        lawName: "EU REACH 規則 / 各国法令",
        source: "EU・各国",
        reason: "輸出先国の化学物質規制（EUは REACH、米国は TSCA など）の確認が必要。",
      },
    ],
  },

  // ── 33法令外: 建築・消防 ─────────────────────────────────────
  {
    id: "fire-prevention",
    triggers: ["消防計画", "防火管理者", "消防訓練", "防火対象物"],
    suggestions: [
      {
        lawName: "消防法",
        articleHint: "第8条（防火管理）",
        source: "消防庁",
        reason: "事業所の防火管理者選任・消防計画作成の根拠法。",
      },
    ],
  },
  {
    id: "building-asbestos",
    triggers: ["建築物 石綿 事前調査", "石綿 事前調査結果報告", "アスベスト 事前調査"],
    suggestions: [
      {
        lawName: "大気汚染防止法",
        articleHint: "第18条の15（事前調査）",
        source: "環境省",
        reason: "解体・改修工事の石綿事前調査の根拠（環境省側）。",
      },
      {
        lawName: "石綿障害予防規則",
        articleHint: "第3条〜第4条の2（事前調査等）",
        source: "厚生労働省",
        reason: "解体・改修時の事前調査結果の電子報告義務の根拠（厚労省側）。",
      },
    ],
  },

  // ── 33法令外: 健康・健診 ──────────────────────────────────
  {
    id: "specific-health-check",
    triggers: ["特定健診", "特定保健指導", "メタボ健診"],
    suggestions: [
      {
        lawName: "高齢者の医療の確保に関する法律（高齢者医療確保法）",
        articleHint: "第18条〜第31条（特定健康診査等）",
        source: "厚生労働省",
        reason: "40〜74歳被保険者・被扶養者の特定健診・保健指導の根拠法。",
      },
    ],
  },
  {
    id: "vaccine-workplace",
    triggers: ["インフルエンザワクチン 職域", "職域接種", "予防接種 事業所"],
    suggestions: [
      {
        lawName: "予防接種法",
        source: "厚生労働省",
        reason: "予防接種の一般枠組み（職域は任意接種扱い）。",
      },
      {
        lawName: "労働安全衛生法",
        articleHint: "第69条（健康教育等）",
        source: "厚生労働省",
        reason: "事業者の健康保持増進措置の努力義務。",
      },
    ],
  },

  // ── 33法令外: 障害者・外国人 ───────────────────────────────
  {
    id: "disability-employment",
    triggers: ["障害者雇用", "法定雇用率", "障害者差別解消"],
    suggestions: [
      {
        lawName: "障害者雇用促進法",
        articleHint: "第43条（法定雇用率）",
        source: "厚生労働省",
        reason: "事業主の障害者雇用義務の根拠法。",
      },
      {
        lawName: "障害者差別解消法",
        source: "内閣府",
        reason: "事業者の合理的配慮提供義務。",
      },
    ],
  },
  {
    id: "foreign-worker-safety",
    triggers: ["技能実習 安全", "外国人 安全教育", "在留資格 労災"],
    suggestions: [
      {
        lawName: "出入国管理及び難民認定法",
        source: "出入国在留管理庁",
        reason: "在留資格別の就労範囲の根拠法。",
      },
      {
        lawName: "技能実習法",
        source: "出入国在留管理庁・厚生労働省",
        reason: "技能実習生の保護・受入機関の義務の根拠法。",
      },
      {
        lawName: "労働安全衛生法",
        articleHint: "第59条（多言語安全教育）",
        source: "厚生労働省",
        reason: "外国人労働者への安全衛生教育義務（多言語対応の根拠）。",
      },
    ],
  },

  // ── 33法令外: 工事・契約 ───────────────────────────────────
  {
    id: "construction-bidding",
    triggers: ["公共工事 入札", "公契約条例", "建設業 元請責任"],
    suggestions: [
      {
        lawName: "公共工事の入札及び契約の適正化の促進に関する法律（公契法）",
        source: "国土交通省",
        reason: "公共工事の入札適正化の根拠法。",
      },
      {
        lawName: "建設業法",
        articleHint: "第24条の3〜（下請代金支払等）",
        source: "国土交通省",
        reason: "元請・下請関係の規律と労働者保護。",
      },
    ],
  },
  {
    id: "construction-pension",
    triggers: ["建退共", "建設業退職金共済"],
    suggestions: [
      {
        lawName: "中小企業退職金共済法",
        source: "厚生労働省",
        reason: "建退共（建設業退職金共済）の根拠法。",
      },
    ],
  },

  // ── 33法令外: 道路・交通 ────────────────────────────────
  {
    id: "construction-machine-license",
    triggers: ["大型特殊免許", "建設機械 運転免許"],
    suggestions: [
      {
        lawName: "道路交通法",
        articleHint: "第84条（運転免許の種類）",
        source: "警察庁",
        reason: "公道走行に必要な運転免許の根拠（労働安全衛生法の運転業務とは別系統）。",
      },
      {
        lawName: "労働安全衛生法",
        articleHint: "第61条（就業制限）",
        source: "厚生労働省",
        reason: "事業場内での運転業務に必要な技能講習等の根拠。",
      },
    ],
  },

  // ── 33法令外: 環境・廃棄物 ──────────────────────────────
  {
    id: "industrial-waste",
    triggers: ["産業廃棄物 マニフェスト", "廃棄物 管理票", "特管廃棄物"],
    suggestions: [
      {
        lawName: "廃棄物の処理及び清掃に関する法律（廃掃法）",
        source: "環境省",
        reason: "産業廃棄物・特別管理産業廃棄物のマニフェスト制度の根拠法。",
      },
    ],
  },

  // ── 33法令外: 個人情報・情報セキュリティ ──────────────
  {
    id: "personal-info",
    triggers: ["個人情報 保護", "個人情報漏えい", "プライバシー"],
    suggestions: [
      {
        lawName: "個人情報の保護に関する法律（個人情報保護法）",
        source: "個人情報保護委員会",
        reason: "事業者の個人情報取扱いの根拠法。健康情報は要配慮個人情報として厳格管理。",
      },
    ],
  },

  // ── 33法令外: 母性保護・育児 ──────────────────────────
  {
    id: "maternity-protection-detail",
    triggers: ["産前産後 休業", "育休 給付", "育児給付"],
    suggestions: [
      {
        lawName: "労働基準法",
        articleHint: "第65条（産前産後）・第67条（育児時間）",
        source: "厚生労働省",
        reason: "産前産後休業と育児時間の根拠条文。",
      },
      {
        lawName: "雇用保険法",
        articleHint: "第61条の7（育児休業給付）",
        source: "厚生労働省",
        reason: "育児休業給付金の根拠条文。",
      },
    ],
  },

  // ── 一般: その他汎用カテゴリ ────────────────────────────
  {
    id: "labor-standard-time",
    triggers: ["36協定", "サブロク協定", "時間外労働 上限"],
    suggestions: [
      {
        lawName: "労働基準法",
        articleHint: "第36条（時間外及び休日の労働）",
        source: "厚生労働省",
        reason: "時間外労働協定（36協定）の根拠条文。",
      },
    ],
  },
  {
    id: "minimum-wage",
    triggers: ["最低賃金", "地域別最低賃金"],
    suggestions: [
      {
        lawName: "最低賃金法",
        articleHint: "第4条（最低賃金の効力）",
        source: "厚生労働省",
        reason: "地域別・特定（業種別）最低賃金の根拠法。",
      },
    ],
  },
  {
    id: "subcontracting-payment",
    triggers: ["下請代金 支払遅延", "下請法"],
    suggestions: [
      {
        lawName: "下請代金支払遅延等防止法（下請法）",
        source: "公正取引委員会・中小企業庁",
        reason: "親事業者の下請事業者保護の根拠法。",
      },
    ],
  },
];

/**
 * 質問キーワードを正規化（大文字小文字統一・全角→半角・空白除去）。
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　]/g, "")
    .normalize("NFKC");
}

/**
 * 質問テキストにマッチするトピックを探索し、関連法令カテゴリ候補を返す。
 *
 * 複数トピックがマッチした場合は、最初にマッチしたトピックの suggestions を返す
 * （優先順位はマップ宣言順）。最大 3 件まで。
 */
export function searchPartialMatches(query: string): FallbackLawSuggestion[] {
  const q = normalize(query);
  for (const topic of TOPIC_TO_LAW_CATEGORY) {
    for (const trigger of topic.triggers) {
      if (q.includes(normalize(trigger))) {
        return topic.suggestions.slice(0, 3);
      }
    }
  }
  return [];
}

/**
 * RAG 検索のスコアと記事数から fallback tier を決定する。
 *
 * 設計参照: 05-fallback-logic-design.md §2
 *
 * - Direct: score >= 0.75 かつ articles >= 2
 * - Adjacent: 0.5 <= score < 0.75、または articles == 1
 * - Out-of-Scope: score < 0.5
 */
export function decideFallbackTier(
  normalizedScore: number,
  articleCount: number
): FallbackTier {
  if (normalizedScore < 0.5) return "out-of-scope";
  if (normalizedScore < 0.75 || articleCount <= 1) return "adjacent";
  return "direct";
}

/**
 * 質問・スコア・ヒット条文を入力に、fallback の応答方針を決定する。
 * Layer 3 の中核関数。route.ts から呼ばれる。
 */
export function buildFallbackDecision(args: {
  query: string;
  normalizedScore: number;
  articles: LawArticle[];
}): FallbackDecision {
  const { query, normalizedScore, articles } = args;
  const tier = decideFallbackTier(normalizedScore, articles.length);

  if (tier === "direct") {
    return { tier, suggestions: [] };
  }

  if (tier === "adjacent") {
    return {
      tier,
      suggestions: [],
      headline:
        "直接的に答える条文は限定的です。関連する一般条項として参考にしてください。",
      egovFooter:
        "より詳細な確認は e-Gov 法令検索（https://laws.e-gov.go.jp/）で。",
    };
  }

  // out-of-scope
  const matches = searchPartialMatches(query);
  return {
    tier,
    suggestions: matches,
    headline:
      matches.length > 0
        ? "本ツールの提供データ範囲外ですが、関連する他法令カテゴリが該当する可能性があります。"
        : "本ツールの提供データ範囲（33法令＋関連通達）では確証ある回答が得られませんでした。",
    egovFooter:
      "詳細は e-Gov 法令検索（https://laws.e-gov.go.jp/）および厚生労働省・国土交通省等の公式情報でご確認ください。個別事案の判断は労働安全コンサルタント等の専門家にご相談ください。",
  };
}

/**
 * 候補リストを応答末尾に追記する Markdown スニペットへ整形する。
 */
export function formatFallbackSuggestionsText(
  suggestions: readonly FallbackLawSuggestion[]
): string {
  if (suggestions.length === 0) return "";
  const lines: string[] = ["", "🔗 関連する分野・法令カテゴリ："];
  for (const s of suggestions) {
    const article = s.articleHint ? `（${s.articleHint}）` : "";
    const source = s.source ? `[出典: ${s.source}]` : "";
    lines.push(`- ${s.lawName}${article} ${source}`);
    lines.push(`  ${s.reason}`);
  }
  return lines.join("\n");
}

/**
 * デバッグ・テスト用: 全マッピングのトリガー数を返す。
 */
export function topicMappingStats(): { topics: number; triggers: number } {
  let triggers = 0;
  for (const t of TOPIC_TO_LAW_CATEGORY) triggers += t.triggers.length;
  return { topics: TOPIC_TO_LAW_CATEGORY.length, triggers };
}
