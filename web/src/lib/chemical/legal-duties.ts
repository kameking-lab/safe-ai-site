/**
 * 法令区分 → 事業者の主要義務・対策のマッピング（一窓化 2026-07-11）
 *
 * 「該当法令が分かったら、次に何をすべきか」を条文参照つきで返す。
 * 内容は各特別則の広く知られた基本義務に限定し、条番号＋e-Gov法令リンクで
 * 一次情報へ誘導する（条文本文の転載はしない・網羅を主張しない）。
 * 表示側は必ず「最終確認は条文で」の注記を添えること。
 */
import type { RegulationTag } from "@/lib/regulation-tag-labels";

export type LegalDuty = {
  /** 義務・措置の短い名称 */
  name: string;
  /** 根拠（規則名＋条番号） */
  basis: string;
  /** e-Gov 法令ページ */
  url: string;
  /** 頻度・補足 */
  note?: string;
};

const TOKKA_URL = "https://laws.e-gov.go.jp/law/347M50002000039";
const YUKI_URL = "https://laws.e-gov.go.jp/law/347M50002000036";
const NAMARI_URL = "https://laws.e-gov.go.jp/law/347M50002000037";
const SEKIMEN_URL = "https://laws.e-gov.go.jp/law/417M60000100021";
const FUNJIN_URL = "https://laws.e-gov.go.jp/law/354M50002000018";
const SANKETSU_URL = "https://laws.e-gov.go.jp/law/347M50002000042";
const DOKUGEKI_URL = "https://laws.e-gov.go.jp/law/325AC0000000303";
const ANEIHO_URL = "https://laws.e-gov.go.jp/law/347AC0000000057";
const ANEISOKU_URL = "https://laws.e-gov.go.jp/law/347M50002000032";
const KAKANHO_URL = "https://laws.e-gov.go.jp/law/411AC0000000086";

/** 特別則タグ → 主要義務（法定義務ベース。健診の該非は health-checkup-from-tags が正） */
export const DUTIES_BY_TAG: Partial<Record<RegulationTag, LegalDuty[]>> = {
  "tokutei-1": [
    { name: "製造の許可（厚生労働大臣）", basis: "安衛法56条", url: ANEIHO_URL },
    { name: "特定化学物質作業主任者の選任", basis: "特化則27条・28条", url: TOKKA_URL },
    { name: "作業環境測定と結果の評価", basis: "特化則36条・36条の2", url: TOKKA_URL, note: "6か月以内ごと" },
    { name: "発散抑制措置（密閉・局所排気等）", basis: "特化則3条〜5条", url: TOKKA_URL },
  ],
  "tokutei-2": [
    { name: "発散抑制措置（密閉・局所排気装置等）", basis: "特化則4条・5条", url: TOKKA_URL },
    { name: "特定化学物質作業主任者の選任", basis: "特化則27条・28条", url: TOKKA_URL },
    { name: "作業環境測定と結果の評価", basis: "特化則36条・36条の2", url: TOKKA_URL, note: "6か月以内ごと" },
    { name: "特定化学物質健康診断", basis: "特化則39条", url: TOKKA_URL, note: "6か月以内ごと（対象範囲は令22条による）" },
  ],
  "tokutei-3": [
    { name: "漏えい防止措置（特定化学設備等）", basis: "特化則13条〜26条", url: TOKKA_URL, note: "大量漏えいによる急性中毒の防止が目的" },
    { name: "特定化学物質作業主任者の選任", basis: "特化則27条・28条", url: TOKKA_URL },
    { name: "退避等・立入禁止措置", basis: "特化則23条・24条", url: TOKKA_URL },
  ],
  "yuki-1": [
    { name: "密閉設備または局所排気装置等の設置", basis: "有機則5条", url: YUKI_URL },
    { name: "有機溶剤作業主任者の選任", basis: "有機則19条", url: YUKI_URL },
    { name: "作業環境測定", basis: "有機則28条", url: YUKI_URL, note: "6か月以内ごと" },
    { name: "有機溶剤等健康診断", basis: "有機則29条", url: YUKI_URL, note: "6か月以内ごと" },
    { name: "有機溶剤等の区分の表示（色分け等）", basis: "有機則25条", url: YUKI_URL, note: "第一種＝赤" },
  ],
  "yuki-2": [
    { name: "密閉設備または局所排気装置等の設置", basis: "有機則5条", url: YUKI_URL },
    { name: "有機溶剤作業主任者の選任", basis: "有機則19条", url: YUKI_URL },
    { name: "作業環境測定", basis: "有機則28条", url: YUKI_URL, note: "6か月以内ごと" },
    { name: "有機溶剤等健康診断", basis: "有機則29条", url: YUKI_URL, note: "6か月以内ごと" },
    { name: "有機溶剤等の区分の表示（色分け等）", basis: "有機則25条", url: YUKI_URL, note: "第二種＝黄" },
  ],
  "yuki-3": [
    { name: "タンク等内部業務での換気・保護具", basis: "有機則5条・32条・33条", url: YUKI_URL, note: "第三種はタンク等の内部業務が中心" },
    { name: "有機溶剤作業主任者の選任", basis: "有機則19条", url: YUKI_URL },
    { name: "健康診断（タンク等内部業務に限る）", basis: "有機則29条", url: YUKI_URL },
  ],
  namari: [
    { name: "局所排気装置等の発散抑制", basis: "鉛則2章", url: NAMARI_URL },
    { name: "鉛作業主任者の選任", basis: "鉛則33条", url: NAMARI_URL },
    { name: "作業環境測定", basis: "鉛則52条", url: NAMARI_URL, note: "1年以内ごと" },
    { name: "鉛健康診断", basis: "鉛則53条", url: NAMARI_URL, note: "6か月以内ごと" },
  ],
  yonalkyl: [
    { name: "四アルキル鉛等作業主任者の選任", basis: "四アルキル鉛則14条", url: "https://laws.e-gov.go.jp/law/347M50002000038" },
    { name: "保護具の使用", basis: "四アルキル鉛則2条〜13条", url: "https://laws.e-gov.go.jp/law/347M50002000038" },
    { name: "四アルキル鉛健康診断", basis: "四アルキル鉛則22条", url: "https://laws.e-gov.go.jp/law/347M50002000038", note: "6か月以内ごと" },
  ],
  sekimen: [
    { name: "事前調査（建築物等の解体・改修）", basis: "石綿則3条", url: SEKIMEN_URL },
    { name: "作業計画・届出", basis: "石綿則4条・5条", url: SEKIMEN_URL },
    { name: "特別教育", basis: "石綿則27条", url: SEKIMEN_URL },
    { name: "石綿健康診断・記録40年保存", basis: "石綿則40条〜41条", url: SEKIMEN_URL },
  ],
  funjin: [
    { name: "発散抑制設備・湿潤化", basis: "粉じん則2章", url: FUNJIN_URL },
    { name: "特別教育", basis: "粉じん則22条", url: FUNJIN_URL },
    { name: "呼吸用保護具の使用", basis: "粉じん則27条", url: FUNJIN_URL },
  ],
  sankketsu: [
    { name: "作業前の酸素濃度等の測定", basis: "酸欠則3条", url: SANKETSU_URL },
    { name: "換気（酸素18%以上の保持）", basis: "酸欠則5条", url: SANKETSU_URL },
    { name: "酸素欠乏危険作業主任者の選任", basis: "酸欠則11条", url: SANKETSU_URL },
  ],
};

/** 毒劇法（designated時）の基本義務 */
export const DOKUGEKI_DUTIES: LegalDuty[] = [
  { name: "施錠保管・盗難紛失防止", basis: "毒劇法11条", url: DOKUGEKI_URL },
  { name: "容器・被包への「医薬用外」表示", basis: "毒劇法12条", url: DOKUGEKI_URL, note: "毒物=赤地白字／劇物=白地赤字" },
  { name: "譲渡手続（書面）・交付の制限", basis: "毒劇法14条・15条", url: DOKUGEKI_URL },
  { name: "廃棄基準の遵守", basis: "毒劇法15条の2", url: DOKUGEKI_URL },
];

/** 化管法（PRTR）designated時 */
export const KAKANHO_DUTIES: Record<1 | 2, LegalDuty[]> = {
  1: [
    { name: "排出量・移動量の届出（年間取扱量1トン以上等）", basis: "化管法5条", url: KAKANHO_URL },
    { name: "SDSの提供", basis: "化管法14条", url: KAKANHO_URL },
  ],
  2: [{ name: "SDSの提供", basis: "化管法14条", url: KAKANHO_URL }],
};

/** リスクアセスメント対象物（ラベル・SDS義務物質）の共通義務 */
export const RA_TARGET_DUTIES: LegalDuty[] = [
  { name: "リスクアセスメントの実施（義務）", basis: "安衛法57条の3", url: ANEIHO_URL },
  { name: "ラベル表示・SDS交付", basis: "安衛法57条・57条の2", url: ANEIHO_URL },
  { name: "ばく露低減措置（濃度基準値以下の管理等）", basis: "安衛則577条の2", url: ANEISOKU_URL },
];

/** どの物質にも共通するリスク低減の優先順位（非該当物質にも提示） */
export const HIERARCHY_OF_CONTROLS: { step: string; detail: string }[] = [
  { step: "1. 代替", detail: "より有害性の低い物質・製品への変更を検討する" },
  { step: "2. 工学的対策", detail: "密閉化・局所排気装置・全体換気で発散源を絶つ" },
  { step: "3. 管理的対策", detail: "作業手順の改善・立入制限・作業時間の短縮" },
  { step: "4. 保護具", detail: "呼吸用保護具・不浸透性手袋等（上記を尽くした上での最後の砦）" },
];
