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
        { value: "any", label: "問わない", hint: "全形状からおすすめ表示" },
        { value: "X型", label: "X型", hint: "標準・全身ホールド。建設の標準" },
        { value: "Y型", label: "Y型", hint: "軽量。短時間作業や狭所向け" },
        { value: "H型", label: "H型", hint: "墜落距離最小限。第二種規格対応" },
      ],
    },
    {
      id: "lanyard",
      label: "ランヤード",
      options: [
        { value: "any", label: "問わない", hint: "ランヤード種類は問わない" },
        { value: "シングル", label: "シングル", hint: "巻取式。標準的な高所作業向け" },
        { value: "ダブル", label: "ダブル", hint: "第一種・常時接続。移動の多い作業向け" },
        { value: "ショックアブソーバ", label: "ショックアブソーバ付き", hint: "落下衝撃を吸収。高所からの墜落リスク高い場面に" },
      ],
    },
    {
      id: "useCase",
      label: "主な用途",
      options: [
        { value: "any", label: "問わない", hint: "用途を絞らずに比較" },
        { value: "construction", label: "建設・足場・高所", hint: "鉄骨・足場・屋根工事など" },
        { value: "manufacturing", label: "工場・設備保全", hint: "高所点検・天井クレーン保守など" },
        { value: "forestry", label: "林業・伐木", hint: "立木作業・チェーンソー作業向け" },
      ],
    },
    {
      id: "budget",
      label: "予算（1人あたり）",
      options: [
        { value: "any", label: "問わない", hint: "価格帯を絞らずに比較" },
        { value: "low", label: "2万円以下", hint: "コスト重視。最低限の機能" },
        { value: "mid", label: "2〜4万円", hint: "標準価格帯。耐久性とコスパ両立" },
        { value: "high", label: "4万円以上", hint: "高機能・軽量・高耐久モデル" },
      ],
      optional: true,
    },
  ],
};
