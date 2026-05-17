import type { IllnessCondition } from "@/types/illness-consideration";

export const DIABETES_CONDITIONS: IllnessCondition[] = [
  {
    id: "diabetes-type1",
    category: "diabetes",
    name: "1型糖尿病（インスリン療法）",
    overview:
      "外因性インスリンに依存し、低血糖・高血糖の急変リスクが日常的に存在する。インスリン管理・自己血糖測定の確保が両立支援の中心。",
    treatmentPatterns: [
      "1日複数回のインスリン注射またはポンプ療法",
      "自己血糖測定（SMBG）または持続血糖測定（CGM）",
      "1〜3ヶ月ごとの外来通院",
    ],
    workConsiderations: [
      "食事タイミングを一定に確保できる業務シフト",
      "高所作業・運転業務は低血糖発作時のリスクを評価",
      "炎天下・寒冷地での長時間作業の制限",
    ],
    timeConsiderations: [
      "食事・補食の時間を業務スケジュールに組み込む",
      "突発的な低血糖時の中断・休息を許容する就業規則",
      "通院日の半日休暇を取得しやすく",
    ],
    environmentConsiderations: [
      "インスリン・血糖測定器を保管する場所（冷蔵庫等）",
      "プライバシーが確保できる注射・測定スペース",
      "ブドウ糖等の救急食品を職場に常備",
    ],
    communicationPoints: [
      "低血糖発作時の対応（ブドウ糖摂取・救急要請）を周囲が理解",
      "本人同意の上で、上司・近隣同僚に最低限の情報を共有",
      "業務調整は本人・産業医・主治医の三者で合意",
    ],
  },
  {
    id: "diabetes-type2",
    category: "diabetes",
    name: "2型糖尿病（経口薬・食事運動療法）",
    overview:
      "食事・運動・経口薬で管理するケース。重大な急変リスクは比較的低いが、合併症予防のための継続管理が必要。",
    treatmentPatterns: [
      "経口血糖降下薬の内服",
      "3〜6ヶ月ごとの外来通院",
      "食事・運動指導の継続",
    ],
    workConsiderations: [
      "原則フルタイム勤務可、合併症進行時は再評価",
      "長時間の絶食を伴う業務シフトを見直し",
      "体重・体力管理を促せる業務配置",
    ],
    timeConsiderations: [
      "通院日（数ヶ月に1回）の柔軟取得",
      "食事時間を確保できる休憩設計",
    ],
    environmentConsiderations: [
      "社員食堂等での糖質管理メニュー",
      "歩数を稼ぎやすい動線（運動療法支援）",
    ],
    communicationPoints: [
      "健康診断結果との連動を産業医が確認",
      "服薬・血糖管理を妨げない夜勤シフト設計",
    ],
  },
  {
    id: "diabetes-with-complications",
    category: "diabetes",
    name: "糖尿病合併症（網膜症・腎症・神経障害）",
    overview:
      "視力低下・透析・しびれ等で日常業務に直接影響する段階。職務再設計と環境改修が必要。",
    treatmentPatterns: [
      "網膜症：眼科でのレーザー治療・硝子体手術",
      "腎症：透析（週3回程度）の導入",
      "神経障害：足病変予防・薬物療法",
    ],
    workConsiderations: [
      "細かい視覚作業・夜間作業を避ける（網膜症）",
      "立ち仕事・長時間歩行を制限（神経障害・足病変）",
      "重量物取扱・激しい温度変化への配慮",
    ],
    timeConsiderations: [
      "透析日（週3日）の通院時間確保（午前出勤・午後出勤の調整）",
      "短時間勤務制度の活用",
      "残業の原則禁止",
    ],
    environmentConsiderations: [
      "視覚補助（拡大表示・ハイコントラスト画面）",
      "段差・滑りやすい床面の改修",
      "適温管理・脱水予防の飲水確保",
    ],
    communicationPoints: [
      "透析スケジュールに合わせた勤務調整を人事が制度化",
      "視覚障害者用ソフト・補助具導入の助成金活用",
      "本人の希望に応じた在宅勤務の併用",
    ],
  },
];
