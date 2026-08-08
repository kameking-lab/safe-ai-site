import { isPublicRouteAvailable } from "@/lib/public-content-policy";

export type PracticalAssetCategory =
  "朝礼・KY" | "教育・資格" | "健康・化学物質" | "災害防止・運用";

export type AssetSupportLevel = "available" | "partial" | "not-available";

export type PracticalSafetyAsset = {
  id: string;
  category: PracticalAssetCategory;
  title: string;
  audience: string;
  duration: string;
  purpose: string;
  href: string;
  scope: string;
  limitations: string;
  sourceStatus: string;
  registryCheckedAt: string;
  registryReviewScope: string;
  support: {
    html: AssetSupportLevel;
    print: AssetSupportLevel;
    easyJapanese: AssetSupportLevel;
    furigana: AssetSupportLevel;
    instructorNotes: AssetSupportLevel;
    knowledgeCheck: AssetSupportLevel;
    changeHistory: AssetSupportLevel;
  };
};

const baseSupport: PracticalSafetyAsset["support"] = {
  html: "available",
  print: "partial",
  easyJapanese: "not-available",
  furigana: "not-available",
  instructorNotes: "not-available",
  knowledgeCheck: "not-available",
  changeHistory: "partial",
};

function asset(
  value: Omit<
    PracticalSafetyAsset,
    "registryCheckedAt" | "registryReviewScope" | "support"
  > & {
    support?: Partial<PracticalSafetyAsset["support"]>;
  },
): PracticalSafetyAsset {
  return {
    ...value,
    registryCheckedAt: "2026-07-24",
    registryReviewScope: "正規URL、対象者、適用範囲、限界の表示",
    support: { ...baseSupport, ...value.support },
  };
}

const linkedSourceStatus =
  "一次資料・監修状態はリンク先の出典欄で確認。出典が確認できない内容は安全判断の根拠にしない。";

/**
 * 既存の正規機能・高品質HTMLへ案内する台帳。
 * 薄い類似ページを量産せず、未整備の支援形式も明示する。
 */
export const PRACTICAL_SAFETY_ASSETS: readonly PracticalSafetyAsset[] = [
  asset({
    id: "ky-examples",
    category: "朝礼・KY",
    title: "KY記入例",
    audience: "職長、現場代理人、作業者",
    duration: "5〜10分",
    purpose: "作業条件に近い例から危険要因と対策の書き方を確認する",
    href: "/ky-examples",
    scope: "掲載済みの建設・製造・運輸等のモデルケース",
    limitations: "実現場の設備、同時作業、変更点を反映した完成帳票ではない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "ky-method",
    category: "朝礼・KY",
    title: "危険予知の進め方",
    audience: "KYを初めて進行する人、職長",
    duration: "10分",
    purpose: "危険の洗い出しから重点目標の確定までの流れを理解する",
    href: "/guides/ky-sheet",
    scope: "KY用紙の基本的な進め方と本サイトの入力手順",
    limitations: "業種固有の手順書や事業者の安全基準を置き換えない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "solo-ky",
    category: "朝礼・KY",
    title: "一人KY",
    audience: "一人親方、単独作業者",
    duration: "3〜5分",
    purpose: "単独作業前に中止条件、連絡方法、重点危険を確認する",
    href: "/for/solo",
    scope: "一人で利用できる主要機能と確認導線",
    limitations: "単独作業が禁止・制限される作業の可否判定は行わない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "new-entrant",
    category: "教育・資格",
    title: "新規入場者教育",
    audience: "新規入場者、教育担当者",
    duration: "15〜30分",
    purpose: "現場固有ルール、緊急時、危険箇所の教育記録を残す",
    href: "/site-records/induction",
    scope: "教育項目と受講記録の作成・保存",
    limitations: "法定教育の該当性、必要時間、講師要件を自動確定しない",
    sourceStatus: linkedSourceStatus,
    support: { instructorNotes: "partial", knowledgeCheck: "partial" },
  }),
  asset({
    id: "foreman",
    category: "教育・資格",
    title: "職長教育補助",
    audience: "職長候補、教育担当者",
    duration: "講習前後の補助として20〜30分",
    purpose: "教育範囲、危険性評価、指導の要点を復習する",
    href: "/education/hoteikyoiku/shokucho",
    scope: "職長等教育の学習補助",
    limitations: "登録講習・事業者教育の修了証明にはならない",
    sourceStatus: linkedSourceStatus,
    support: { instructorNotes: "partial", knowledgeCheck: "available" },
  }),
  asset({
    id: "heat-response",
    category: "健康・化学物質",
    title: "熱中症対応手順",
    audience: "全作業者、職長、安全衛生担当者",
    duration: "10分",
    purpose: "WBGT、体調、作業条件から本日の対応と緊急時の流れを確認する",
    href: "/heat-illness-prevention",
    scope: "熱中症予防、記録、暑熱順化、緊急時の確認",
    limitations: "診断や救急要請の要否を自動判定しない",
    sourceStatus: linkedSourceStatus,
    support: {
      print: "available",
      instructorNotes: "partial",
      knowledgeCheck: "partial",
    },
  }),
  asset({
    id: "emergency",
    category: "災害防止・運用",
    title: "緊急時対応",
    audience: "全作業者、職長",
    duration: "3〜5分",
    purpose: "公式警報、取得状態、緊急連絡先を確認する",
    href: "/risk",
    scope: "選択地域の気象・現場リスクと公的な緊急連絡先",
    limitations: "通信不能時の社内連絡網や現場固有の避難計画は別途必要",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "chemical-management",
    category: "健康・化学物質",
    title: "化学物質管理",
    audience: "化学物質管理者、作業責任者",
    duration: "15〜30分",
    purpose: "SDS、使用条件、換気、保護具、追加措置を構造化する",
    href: "/chemical-ra",
    scope: "独自の簡易スクリーニングと記録支援",
    limitations: "CREATE-SIMPLEとの数値互換・準拠・同等性を保証しない",
    sourceStatus: linkedSourceStatus,
    support: { print: "available" },
  }),
  asset({
    id: "sds-reading",
    category: "健康・化学物質",
    title: "SDSの読み方・確認入口",
    audience: "化学物質を扱う作業者、管理者",
    duration: "10〜15分",
    purpose: "製品名、CAS番号、危険有害性情報の確認箇所を整理する",
    href: "/chemical-database",
    scope: "収録物質の検索と公的データへの到達支援",
    limitations: "製品固有の最新SDSそのものを提供するものではない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "ppe-selection",
    category: "健康・化学物質",
    title: "保護具選定の確認項目",
    audience: "作業者、保護具着用管理責任者",
    duration: "5〜10分",
    purpose: "保護具選定前に確認する条件を整理する",
    href: "/goods",
    scope: "安全用品カテゴリと選定時の確認事項",
    limitations: "適合性、フィット、使用限界、交換時期の最終選定は行わない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "fall-prevention",
    category: "災害防止・運用",
    title: "墜落・転落",
    audience: "建設作業者、職長",
    duration: "10分",
    purpose: "作業前点検と墜落防止措置の確認観点を把握する",
    href: "/articles/fall-prevention-checklist-construction",
    scope: "建設作業のチェックリスト型解説",
    limitations: "個別設備の構造計算や作業計画の適否を判定しない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "heavy-equipment",
    category: "災害防止・運用",
    title: "重機接触",
    audience: "重機オペレーター、誘導者、周辺作業者",
    duration: "5〜10分",
    purpose: "旋回範囲、死角、誘導、同時作業に関係するKY例を探す",
    href: "/ky-examples",
    scope: "掲載済みモデルケースからの確認支援",
    limitations: "機種、地盤、作業半径に応じた作業計画を自動作成しない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "electric-shock",
    category: "教育・資格",
    title: "感電・低圧電気",
    audience: "低圧電気取扱作業者、教育担当者",
    duration: "15〜30分",
    purpose: "感電防止と特別教育の学習要点を確認する",
    href: "/education/tokubetsu/teiatsu-denki",
    scope: "低圧電気取扱業務の教育補助",
    limitations: "特別教育の実施記録や実技教育を代替しない",
    sourceStatus: linkedSourceStatus,
    support: { instructorNotes: "partial", knowledgeCheck: "available" },
  }),
  asset({
    id: "fire-explosion",
    category: "健康・化学物質",
    title: "火災・爆発の確認入口",
    audience: "可燃物・引火性物質を扱う作業者",
    duration: "10〜15分",
    purpose: "物質、温度、飛散、換気、着火源をRA入力に反映する",
    href: "/chemical-ra",
    scope: "化学物質RAに必要な作業条件の整理",
    limitations: "防爆設計、爆発圧力、消防法上の貯蔵可否を判定しない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "oxygen-deficiency",
    category: "教育・資格",
    title: "酸素欠乏症等",
    audience: "酸欠危険作業の作業者、教育担当者",
    duration: "15〜30分",
    purpose: "測定、換気、監視、救出時の危険を学習する",
    href: "/education/tokubetsu/sankesu",
    scope: "酸素欠乏危険作業の教育補助",
    limitations: "作業主任者選任、測定方法、救出計画の適否を自動判定しない",
    sourceStatus: linkedSourceStatus,
    support: { instructorNotes: "partial", knowledgeCheck: "available" },
  }),
  asset({
    id: "lower-back-pain",
    category: "健康・化学物質",
    title: "腰痛予防",
    audience: "重量物取扱、介護、長時間同一姿勢の作業者",
    duration: "10〜15分",
    purpose: "作業姿勢、重量、頻度、補助具の確認観点を学ぶ",
    href: "/education/roudoueisei/youtsu-yobou",
    scope: "職場の腰痛予防教育",
    limitations: "症状の診断や治療方針を提示しない",
    sourceStatus: linkedSourceStatus,
    support: { instructorNotes: "partial", knowledgeCheck: "available" },
  }),
  asset({
    id: "mental-health",
    category: "健康・化学物質",
    title: "メンタルヘルス",
    audience: "事業者、管理監督者、労働者",
    duration: "10〜20分",
    purpose: "相談先、事業場の体制、ストレスチェック対応を確認する",
    href: "/mental-health-management",
    scope: "事業場のメンタルヘルス管理の情報整理",
    limitations: "診断、治療、緊急時の医療判断を行わない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "foreign-workers",
    category: "教育・資格",
    title: "外国人労働者向け安全教育",
    audience: "外国人労働者を支援する担当者、教育担当者",
    duration: "15〜30分",
    purpose: "言語、在留資格、理解確認に配慮した教材を作る",
    href: "/foreign-workers/safety-training",
    scope: "多言語・図示を含む安全教育の作成支援",
    limitations: "自動翻訳だけで理解確認や法定教育の完了とは扱わない",
    sourceStatus: linkedSourceStatus,
    support: {
      easyJapanese: "available",
      furigana: "partial",
      instructorNotes: "available",
      knowledgeCheck: "partial",
    },
  }),
  asset({
    id: "elderly-workers",
    category: "健康・化学物質",
    title: "高齢労働者",
    audience: "事業者、管理監督者、高年齢労働者",
    duration: "10〜15分",
    purpose: "身体機能、作業環境、配置、教育の確認観点を整理する",
    href: "/diversity/elderly",
    scope: "高年齢労働者の安全と健康確保の情報整理",
    limitations: "年齢だけで就業可否や能力を判定しない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "traffic-accidents",
    category: "災害防止・運用",
    title: "交通労働災害",
    audience: "運輸業、営業車両利用者、運行管理担当者",
    duration: "10〜15分",
    purpose: "業種固有の重点危険と関連機能へ到達する",
    href: "/industries/transport",
    scope: "運輸業向けの事故、KY、教育、気象への案内",
    limitations: "運行経路、車両状態、運転者の健康状態を自動評価しない",
    sourceStatus: linkedSourceStatus,
  }),
  asset({
    id: "near-miss",
    category: "災害防止・運用",
    title: "ヒヤリハット",
    audience: "全作業者、安全衛生担当者",
    duration: "5〜10分",
    purpose: "事象、直接原因、背景要因、対策を記録する",
    href: "/site-records/near-miss",
    scope: "端末内または設定済み保存先への記録支援",
    limitations: "匿名性、社内報告範囲、個人情報の扱いは事業者ルールが必要",
    sourceStatus: linkedSourceStatus,
    support: { print: "available" },
  }),
  asset({
    id: "committee",
    category: "災害防止・運用",
    title: "安全衛生委員会",
    audience: "委員会事務局、事業者、労働者委員",
    duration: "15〜30分",
    purpose: "議題、審議、担当、期限、確認履歴を記録する",
    href: "/site-records/committee",
    scope: "委員会記録の作成・保存",
    limitations: "委員会設置義務、構成、開催頻度の個別判定は別途確認が必要",
    sourceStatus: linkedSourceStatus,
    support: { print: "available" },
  }),
  asset({
    id: "annual-plan",
    category: "災害防止・運用",
    title: "年次安全衛生計画",
    audience: "経営者、安全衛生担当者",
    duration: "20〜40分",
    purpose: "重点目標、実施事項、担当、時期を計画へ整理する",
    href: "/strategy/plan-generator",
    scope: "年次計画案と印刷用プレビューの作成",
    limitations: "事業場のリスク評価や労使審議を経た確定計画ではない",
    sourceStatus: linkedSourceStatus,
    support: { print: "available" },
  }),
] as const;

export const PUBLIC_PRACTICAL_SAFETY_ASSETS =
  PRACTICAL_SAFETY_ASSETS.filter((item) =>
    isPublicRouteAvailable(item.href),
  );

export const QUARANTINED_PRACTICAL_SAFETY_ASSETS =
  PRACTICAL_SAFETY_ASSETS.filter(
    (item) => !isPublicRouteAvailable(item.href),
  );

export const PRACTICAL_ASSET_CATEGORIES: readonly PracticalAssetCategory[] = [
  "朝礼・KY",
  "教育・資格",
  "健康・化学物質",
  "災害防止・運用",
] as const;
