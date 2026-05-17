import type { IllnessCondition } from "@/types/illness-consideration";

export const INTRACTABLE_DISEASE_CONDITIONS: IllnessCondition[] = [
  {
    id: "intractable-ms",
    category: "intractable-disease",
    name: "多発性硬化症（MS）",
    overview:
      "再発と寛解を繰り返す中枢神経の自己免疫疾患。症状が多彩で、視覚障害・運動障害・疲労感への配慮が必要。",
    treatmentPatterns: [
      "疾患修飾薬（DMT）の長期使用",
      "再発時のステロイドパルス療法",
      "外来定期通院（1〜3ヶ月ごと）",
    ],
    workConsiderations: [
      "視覚・運動症状の状態に応じて業務難易度を調整",
      "強い疲労（MSフォグ）を考慮し集中業務の時間を区切る",
      "高温環境（ウートホフ現象）を避ける",
    ],
    timeConsiderations: [
      "短時間勤務制度の柔軟運用",
      "再発時の臨時休暇取得",
      "通院日の半日休暇",
    ],
    environmentConsiderations: [
      "屋内温度を一定に保つ（高温暴露回避）",
      "段差・滑りやすい床面の改修",
      "視覚補助具・休憩室の整備",
    ],
    communicationPoints: [
      "再発時の連絡フロー・産業医面談",
      "難病医療費助成制度の活用を本人と確認",
      "症状日毎の変動を周囲が理解",
    ],
  },
  {
    id: "intractable-parkinson",
    category: "intractable-disease",
    name: "パーキンソン病",
    overview:
      "運動症状（振戦・筋固縮・無動）に加えて、薬効の波（wearing-off現象）が日内変動として現れる。",
    treatmentPatterns: [
      "L-DOPA・ドパミンアゴニストの長期内服",
      "数時間ごとの服薬",
      "外来通院（1〜3ヶ月ごと）",
    ],
    workConsiderations: [
      "細かい手作業・速い動作を要する業務を見直し",
      "薬効の良い時間帯に重要業務を集中配置",
      "転倒リスクの高い作業を回避",
    ],
    timeConsiderations: [
      "服薬時間を業務スケジュールに組み込む",
      "通院・診察日の柔軟取得",
      "症状の日内変動を考慮したシフト設計",
    ],
    environmentConsiderations: [
      "段差・滑りやすい床の改修",
      "手すり・椅子の配置",
      "音声入力ソフト等のIT支援",
    ],
    communicationPoints: [
      "症状の日内変動を上司・周囲が理解",
      "服薬遅延が体調に直結することを共有",
      "難病医療費助成制度・障害者雇用制度の活用",
    ],
  },
  {
    id: "intractable-ibd",
    category: "intractable-disease",
    name: "炎症性腸疾患（クローン病・潰瘍性大腸炎）",
    overview:
      "腹痛・下痢・血便を繰り返す慢性疾患。トイレアクセス・食事制限・ストレス管理が中心。",
    treatmentPatterns: [
      "免疫抑制剤・生物学的製剤の継続",
      "外来通院・点滴治療（数週間ごと）",
      "増悪時の入院加療",
    ],
    workConsiderations: [
      "トイレが利用しやすい執務環境",
      "長時間移動を伴う業務の見直し",
      "ストレス・過労が増悪要因となるため業務量管理",
    ],
    timeConsiderations: [
      "通院・点滴治療日の柔軟取得",
      "増悪時の臨時休暇制度",
    ],
    environmentConsiderations: [
      "個室トイレ・休憩室の整備",
      "食事時間を確保できる勤務シフト",
    ],
    communicationPoints: [
      "プライバシー配慮（症状を周囲に詳細共有しない）",
      "本人同意の上で上司にのみ概要共有",
      "難病医療費助成・特定疾患の活用",
    ],
  },
  {
    id: "intractable-rheumatoid-arthritis",
    category: "intractable-disease",
    name: "関節リウマチ",
    overview:
      "関節の慢性炎症で疼痛・可動域制限が継続する。朝のこわばり・冷えに弱いといった日内変動への配慮が必要。",
    treatmentPatterns: [
      "メトトレキサート等の継続内服",
      "生物学的製剤（注射・点滴）",
      "外来通院・リハビリ",
    ],
    workConsiderations: [
      "細かい手作業の頻度・継続時間を見直し",
      "重量物取扱の制限",
      "PC操作はトラックボール・音声入力等の補助具",
    ],
    timeConsiderations: [
      "朝のこわばりを考慮したフレックス出勤",
      "通院日の柔軟取得",
    ],
    environmentConsiderations: [
      "保温・防寒（夏季の冷房過剰回避）",
      "段差・階段の少ない動線",
      "ユニバーサルデザインの工具・設備",
    ],
    communicationPoints: [
      "症状の日内・週内変動を上司・産業医と共有",
      "難病・障害者雇用制度の活用",
    ],
  },
  {
    id: "intractable-renal-dialysis",
    category: "intractable-disease",
    name: "慢性腎不全（透析療法）",
    overview:
      "週3回の血液透析が必須となるため、勤務スケジュールの大幅調整が必要。透析日との両立支援が中心。",
    treatmentPatterns: [
      "週3回・1回4時間程度の血液透析",
      "シャント管理",
      "食事・水分制限",
    ],
    workConsiderations: [
      "シャント側上肢に負荷をかけない作業配置",
      "重量物取扱・打撲リスク作業を見直し",
      "塩分・水分摂取の自己管理を妨げない作業環境",
    ],
    timeConsiderations: [
      "透析日に合わせたシフト（半日勤務・遅出勤）",
      "夜間透析を利用する場合は通常勤務可",
      "透析後の疲労を考慮した翌日業務調整",
    ],
    environmentConsiderations: [
      "緊急時の医療連絡網",
      "シャント保護のための作業姿勢",
    ],
    communicationPoints: [
      "透析スケジュールに合わせた勤務制度を就業規則に反映",
      "障害者手帳・障害者雇用制度の活用",
    ],
  },
  {
    id: "intractable-sle",
    category: "intractable-disease",
    name: "全身性エリテマトーデス（SLE）",
    overview:
      "自己免疫疾患で多臓器に症状が現れる。紫外線・感染・過労が増悪要因となるため、環境制御が中心。",
    treatmentPatterns: [
      "ステロイド・免疫抑制剤の継続",
      "1〜3ヶ月ごとの外来通院",
      "増悪時の入院加療",
    ],
    workConsiderations: [
      "屋外業務・紫外線曝露の制限",
      "過労となる長時間業務の回避",
      "感染リスクの高い業務環境を見直し",
    ],
    timeConsiderations: [
      "短時間勤務・残業制限の制度活用",
      "通院・検査日の柔軟取得",
    ],
    environmentConsiderations: [
      "UVカットフィルム・遮光カーテン",
      "屋外作業時の長袖・帽子",
      "感染対策の徹底",
    ],
    communicationPoints: [
      "難病医療費助成制度の活用",
      "増悪兆候（発熱・発疹・倦怠感）への早期対応",
    ],
  },
];
