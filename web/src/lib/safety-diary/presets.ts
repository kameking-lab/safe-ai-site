import type { IndustryPreset } from "./schema";

export type IndustryPresetData = {
  id: IndustryPreset;
  label: string;
  /** 作業内容のサジェスト */
  workSuggestions: string[];
  /** 業者カテゴリのサジェスト */
  contractorSuggestions: string[];
  /** よくある必要資格 */
  qualifications: string[];
  /** 予想災害カテゴリ */
  predictedDisasters: string[];
};

export const INDUSTRY_PRESET_DATA: Record<IndustryPreset, IndustryPresetData> = {
  construction: {
    id: "construction",
    label: "建設",
    workSuggestions: [
      "型枠組立",
      "鉄筋組立",
      "コンクリート打設",
      "足場組立・解体",
      "外壁塗装",
      "クレーン作業",
      "土工事・掘削",
    ],
    contractorSuggestions: ["元請", "型枠工", "鉄筋工", "とび工", "電気", "設備"],
    qualifications: [
      "フルハーネス特別教育",
      "玉掛け技能講習",
      "足場の組立等作業主任者",
      "車両系建設機械運転技能講習",
    ],
    predictedDisasters: ["墜落・転落", "崩壊・倒壊", "飛来・落下", "重機との接触"],
  },
  manufacturing: {
    id: "manufacturing",
    label: "製造",
    workSuggestions: [
      "プレス機械作業",
      "切断・研削",
      "溶接作業",
      "塗装・薬品取扱",
      "搬送・運搬",
      "設備点検・保全",
    ],
    contractorSuggestions: ["元請", "外注加工", "保全外注", "派遣"],
    qualifications: [
      "アーク溶接特別教育",
      "プレス機械作業主任者",
      "化学物質管理者",
      "有機溶剤作業主任者",
    ],
    predictedDisasters: ["はさまれ・巻き込まれ", "切れ・こすれ", "化学物質ばく露", "感電"],
  },
  healthcare: {
    id: "healthcare",
    label: "医療福祉",
    workSuggestions: [
      "入浴介助",
      "移乗介助",
      "薬剤調製",
      "感染症対応",
      "夜勤対応",
    ],
    contractorSuggestions: ["常勤", "派遣", "委託清掃"],
    qualifications: ["介護福祉士", "看護師", "ノーリフティングケア研修"],
    predictedDisasters: ["腰痛", "転倒", "感染症ばく露", "暴力・暴言"],
  },
  transport: {
    id: "transport",
    label: "運輸",
    workSuggestions: [
      "長距離運行",
      "配送業務",
      "フォークリフト荷役",
      "倉庫内ピッキング",
      "車両整備",
    ],
    contractorSuggestions: ["元請", "傭車", "倉庫委託"],
    qualifications: ["フォークリフト運転技能講習", "玉掛け技能講習", "中型/大型自動車免許"],
    predictedDisasters: ["交通事故", "墜落・転落（荷台）", "はさまれ", "腰痛"],
  },
  it: {
    id: "it",
    label: "IT",
    workSuggestions: [
      "ソフトウェア開発",
      "サーバー保守",
      "データセンター作業",
      "夜間メンテナンス",
    ],
    contractorSuggestions: ["元請", "業務委託", "派遣"],
    qualifications: ["低圧電気取扱業務特別教育"],
    predictedDisasters: ["VDT障害", "メンタル不調", "感電（DC作業）"],
  },
  other: {
    id: "other",
    label: "その他",
    workSuggestions: [],
    contractorSuggestions: [],
    qualifications: [],
    predictedDisasters: [],
  },
};

/** 作業内容から必要資格を簡易推定 */
export function estimateQualifications(workContent: string, industry: IndustryPreset): string[] {
  const preset = INDUSTRY_PRESET_DATA[industry];
  const guesses = new Set<string>();
  const text = workContent.toLowerCase();

  // 共通ルール
  if (/(高所|足場|墜落|フルハーネス)/.test(workContent)) {
    guesses.add("フルハーネス特別教育");
  }
  if (/(玉掛|クレーン|吊り)/.test(workContent)) {
    guesses.add("玉掛け技能講習");
  }
  if (/(溶接)/.test(workContent)) {
    guesses.add("アーク溶接特別教育");
  }
  if (/(フォークリフト)/.test(workContent)) {
    guesses.add("フォークリフト運転技能講習");
  }
  if (/(有機溶剤|塗装|薬品)/.test(workContent)) {
    guesses.add("有機溶剤作業主任者");
  }
  if (/(電気|感電|低圧|配線)/.test(text)) {
    guesses.add("低圧電気取扱業務特別教育");
  }

  // 業種固有の推奨も加える
  for (const q of preset.qualifications) {
    // 完全一致やキーワード含有でヒットさせる
    if (workContent.includes(q.replace(/(技能講習|特別教育|作業主任者)/g, ""))) {
      guesses.add(q);
    }
  }

  return [...guesses];
}
