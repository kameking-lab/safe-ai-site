import type { EquipmentCategory } from "./types";

export const harnessCategory: EquipmentCategory = {
  id: "harness",
  label: "フルハーネス",
  icon: "🪢",
  description: "墜落制止用器具（高さ6.75m超で原則必須）",
  dbCategoryIds: ["fall-protection"],
  subCategoryIncludes: ["フルハーネス", "ランヤード"],
  refineQuestions: [
    {
      id: "shape",
      label: "ハーネス形状",
      options: [
        { value: "any", label: "問わない" },
        { value: "X型", label: "X型（標準・全身ホールド）" },
        { value: "Y型", label: "Y型（軽量・装着しやすい）" },
        { value: "H型", label: "H型・第二種（堕落距離が短い）" },
      ],
    },
    {
      id: "lanyard",
      label: "ランヤード",
      options: [
        { value: "any", label: "問わない" },
        { value: "シングル", label: "シングル（巻取式）" },
        { value: "ダブル", label: "ダブル（第一種・常時接続）" },
        { value: "ショックアブソーバ", label: "ショックアブソーバ付き" },
      ],
    },
    {
      id: "useCase",
      label: "主な用途",
      options: [
        { value: "any", label: "問わない" },
        { value: "construction", label: "建設・足場・高所" },
        { value: "manufacturing", label: "工場・設備保全" },
        { value: "forestry", label: "林業・伐木" },
      ],
    },
    {
      id: "budget",
      label: "予算（1人あたり）",
      options: [
        { value: "any", label: "問わない" },
        { value: "low", label: "2万円以下" },
        { value: "mid", label: "2〜4万円" },
        { value: "high", label: "4万円以上（高機能）" },
      ],
      optional: true,
    },
  ],
};
