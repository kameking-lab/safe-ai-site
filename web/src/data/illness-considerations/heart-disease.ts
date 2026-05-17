import type { IllnessCondition } from "@/types/illness-consideration";

export const HEART_DISEASE_CONDITIONS: IllnessCondition[] = [
  {
    id: "heart-ischemic",
    category: "heart-disease",
    name: "虚血性心疾患（心筋梗塞・狭心症）術後",
    overview:
      "PCI（経皮的冠動脈形成術）・CABG等の治療後、心臓リハビリを経て復職するケース。身体負荷量の上限と再発予防が両立支援の要。",
    treatmentPatterns: [
      "抗血小板薬・スタチン等の長期内服",
      "外来心臓リハビリ（数ヶ月）",
      "心機能評価のための定期検査",
    ],
    workConsiderations: [
      "重量物取扱（おおむね10kg以上）の制限",
      "屋外高温・寒冷作業の負荷を低減",
      "強いいきみ・全身運動を伴う作業を見直し",
    ],
    timeConsiderations: [
      "復職当初は1日4〜6時間の短時間勤務",
      "残業・深夜業の原則禁止",
      "心臓リハビリ通院日の柔軟取得（週1〜2回×8〜12週）",
    ],
    environmentConsiderations: [
      "高温・寒冷曝露の緩和（空調・休憩室）",
      "AED・救急連絡経路の整備",
      "段差・階段の少ない動線",
    ],
    communicationPoints: [
      "主治医意見書で『METs上限』『就業上の措置』を明示",
      "産業医面談で日常業務の負荷量を擦り合わせ",
      "胸痛・動悸時の即時対応フローを本人・周囲で共有",
    ],
  },
  {
    id: "heart-failure-chronic",
    category: "heart-disease",
    name: "慢性心不全",
    overview:
      "心機能低下が長期に続き、増悪・寛解を繰り返す状態。日常業務での過負荷予防と早期受診体制が中心。",
    treatmentPatterns: [
      "利尿薬・β遮断薬等の長期内服",
      "1〜3ヶ月ごとの外来定期受診",
      "増悪時の入院加療",
    ],
    workConsiderations: [
      "立ちっぱなし・長時間歩行の制限",
      "高負荷作業の頻度を低減",
      "業務量を一定に保ち、突発的な負荷を回避",
    ],
    timeConsiderations: [
      "短時間勤務制度を継続的に活用",
      "夜勤・交代制勤務の見直し",
    ],
    environmentConsiderations: [
      "高温多湿・低温環境の緩和",
      "塩分管理を意識した社員食堂連携",
    ],
    communicationPoints: [
      "体重急増（うっ血の兆候）等のセルフモニタリングを共有",
      "増悪時の即時受診ルートを確保",
    ],
  },
  {
    id: "heart-arrhythmia",
    category: "heart-disease",
    name: "不整脈（房室ブロック・心房細動）",
    overview:
      "ペースメーカ植込み後または抗不整脈薬で管理中のケース。電磁干渉・抗凝固管理が職場特有の論点。",
    treatmentPatterns: [
      "ペースメーカ植込み・チェック（半年〜1年ごと）",
      "抗凝固薬（DOAC・ワルファリン）の内服",
      "心電図モニタリング",
    ],
    workConsiderations: [
      "強磁場発生設備・誘導加熱機器の近接作業を回避",
      "出血リスクの高い作業（刃物・打撲を伴う作業）の見直し",
      "高所作業時はめまい・失神への備え",
    ],
    timeConsiderations: [
      "通院日・デバイスチェック日の柔軟取得",
      "夜勤シフトの再評価",
    ],
    environmentConsiderations: [
      "強磁場機器・溶接機の近傍配置を避ける",
      "AED・救急対応の整備",
    ],
    communicationPoints: [
      "ペースメーカ手帳の所持を本人と確認",
      "電磁干渉に関するメーカー指針を職場で共有",
      "抗凝固薬服用中の止血対応を周囲が理解",
    ],
  },
  {
    id: "heart-post-cardiac-surgery",
    category: "heart-disease",
    name: "弁置換術・大血管術後",
    overview:
      "開心術後、長期にわたって抗凝固管理・身体活動制限が求められる。胸骨癒合期間の作業制限がポイント。",
    treatmentPatterns: [
      "ワルファリン等の抗凝固薬を長期内服",
      "INR定期測定（月1〜2回）",
      "心エコー・心機能評価の定期実施",
    ],
    workConsiderations: [
      "術後3〜6ヶ月は重量物・両腕での強い動作を制限",
      "胸部に衝撃が加わる業務（防護衣の重量含む）を回避",
      "怪我による出血リスクの高い作業を再評価",
    ],
    timeConsiderations: [
      "復職当初は短時間勤務、徐々に通常勤務へ",
      "通院日（INR測定含む）の柔軟取得",
    ],
    environmentConsiderations: [
      "段差・階段昇降の少ない動線",
      "緊急時連絡網と医療機関アクセスの整備",
    ],
    communicationPoints: [
      "出血時の対応フローを周囲が理解",
      "胸骨癒合状況・運動許容量を主治医意見書で確認",
    ],
  },
];
