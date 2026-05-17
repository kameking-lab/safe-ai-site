import type { IllnessCondition } from "@/types/illness-consideration";

export const MENTAL_HEALTH_CONDITIONS: IllnessCondition[] = [
  {
    id: "mental-depression-returning",
    category: "mental-health",
    name: "うつ病（復職期）",
    overview:
      "休職を経て復職するフェーズ。再発予防のため、段階的な業務付与と継続的な体調確認が必須。",
    treatmentPatterns: [
      "抗うつ薬の継続内服",
      "2週間〜1ヶ月ごとの外来通院",
      "リワークプログラム・心理療法の継続",
    ],
    workConsiderations: [
      "復職初月は補助業務・単純業務中心、徐々に責任業務へ",
      "判断業務・対外折衝業務は段階的に再開",
      "業務量を客観的指標で計測（残業時間・件数）",
    ],
    timeConsiderations: [
      "復職当初は短時間勤務（4〜6時間）",
      "1〜3ヶ月かけてフルタイムへ段階移行",
      "残業は原則禁止、通院日の柔軟取得",
    ],
    environmentConsiderations: [
      "刺激の少ない執務スペース",
      "テレワーク併用で通勤負荷を軽減",
      "孤立を防ぐ業務配置（在宅と出社のバランス）",
    ],
    communicationPoints: [
      "週1回程度の上司・産業医・本人による振り返り",
      "睡眠・気分・集中力の自己評価ツールを活用",
      "再休職時の連絡フロー・基準を事前に明確化",
    ],
  },
  {
    id: "mental-depression-active",
    category: "mental-health",
    name: "うつ病（治療継続・就労継続）",
    overview:
      "休職に至らず治療と就労を並行するフェーズ。早期発見・早期対応で重症化を防ぐ。",
    treatmentPatterns: [
      "外来通院（月1〜2回）",
      "服薬調整に伴う副作用変動",
      "心理療法の継続",
    ],
    workConsiderations: [
      "ノルマ・締切のプレッシャーを段階的に調整",
      "1日のタスクを3〜5項目に絞り込む",
      "新規プロジェクト責任者の交代を一時検討",
    ],
    timeConsiderations: [
      "残業時間の上限を明文化（月20時間以内等）",
      "通院日として月2日程度の半日休暇",
    ],
    environmentConsiderations: [
      "上司・産業医との相談しやすい体制",
      "テレワーク・フレックスの活用",
    ],
    communicationPoints: [
      "ストレスチェック結果と連動した産業医面談",
      "本人と相談の上で周囲への情報共有範囲を決める",
    ],
  },
  {
    id: "mental-anxiety-panic",
    category: "mental-health",
    name: "不安障害・パニック障害",
    overview:
      "発作的な強い不安が業務遂行に影響するケース。発作誘因の回避と発作時対応が中心。",
    treatmentPatterns: [
      "SSRI等の継続内服",
      "認知行動療法・暴露療法",
      "頓服薬（抗不安薬）の使用",
    ],
    workConsiderations: [
      "閉鎖空間（密閉会議室）・公共交通機関での業務を見直し",
      "対外プレゼン・大規模会議の頻度を調整",
      "発作時に離席できる業務配置",
    ],
    timeConsiderations: [
      "通勤ラッシュを避ける時差出勤",
      "重要会議の連続配置を回避",
    ],
    environmentConsiderations: [
      "退避できるスペース（休憩室・個室）",
      "発作時の連絡先・対応手順を本人が携帯",
    ],
    communicationPoints: [
      "発作時の対応を上司・近隣同僚と共有（本人同意の範囲）",
      "外部支援機関（EAP）の活用",
    ],
  },
  {
    id: "mental-bipolar",
    category: "mental-health",
    name: "双極性障害",
    overview:
      "うつ状態と躁状態を周期的に呈する病態。気分の波を察知し、再発を未然に防ぐ仕組みが要。",
    treatmentPatterns: [
      "気分安定薬（リチウム等）の長期内服",
      "血中濃度測定のための定期通院",
      "心理教育・家族支援",
    ],
    workConsiderations: [
      "躁状態時の過剰な業務拡張・対外発言を抑制する仕組み",
      "うつ状態時の業務量調整を即時実施できる体制",
      "重要な意思決定（人事・契約）は気分安定時に",
    ],
    timeConsiderations: [
      "睡眠リズムを保つため夜勤・深夜業を見直し",
      "繁忙期と通院期を重ねない配置",
    ],
    environmentConsiderations: [
      "刺激の調整可能な執務環境",
      "周囲が気分変動を察知しやすい配置",
    ],
    communicationPoints: [
      "本人・家族・主治医・産業医の連携体制",
      "気分の波を早期察知するセルフモニタリングツール",
    ],
  },
  {
    id: "mental-adjustment-disorder",
    category: "mental-health",
    name: "適応障害",
    overview:
      "明確なストレス因（職場環境・対人関係）に対する反応として現れる。原因への対処が両立支援の要。",
    treatmentPatterns: [
      "短期内服（抗不安薬・睡眠導入薬）",
      "心理療法・カウンセリング",
      "ストレス因の除去・軽減",
    ],
    workConsiderations: [
      "ストレス因（特定の業務・対人関係）からの一時離脱",
      "配置転換の検討",
      "業務量・期限の見直し",
    ],
    timeConsiderations: [
      "短時間勤務での復職",
      "段階的な勤務時間延長",
    ],
    environmentConsiderations: [
      "ハラスメント要因が特定されている場合は加害者側との分離",
      "相談窓口・外部EAPの周知",
    ],
    communicationPoints: [
      "本人の希望を踏まえた配置転換の協議",
      "ハラスメント疑い事案では社内通報窓口と連携",
    ],
  },
  {
    id: "mental-developmental-disorder",
    category: "mental-health",
    name: "発達障害（ASD・ADHD）",
    overview:
      "成人期に診断・自覚に至り、職場での支援を希望するケース。本人の強みを活かす業務設計と環境調整が中心。",
    treatmentPatterns: [
      "必要に応じた薬物療法（ADHD治療薬等）",
      "ジョブコーチ・就労支援機関の活用",
      "本人の特性に応じた認知行動療法",
    ],
    workConsiderations: [
      "業務を細分化・構造化し、優先順位を可視化",
      "マルチタスクよりシングルタスク中心",
      "強みを活かす業務（精緻な分析・専門領域）を主に配置",
    ],
    timeConsiderations: [
      "集中時間と休憩を本人のリズムに合わせて設計",
      "突発タスク・割り込みの頻度を抑制",
    ],
    environmentConsiderations: [
      "騒音・視覚刺激を抑える個別ブース",
      "聴覚過敏に配慮（イヤーマフ・指向性マイク）",
      "業務手順の可視化（マニュアル・チェックリスト）",
    ],
    communicationPoints: [
      "本人特性の周囲への共有（本人同意の範囲）",
      "障害者雇用枠・合理的配慮義務の活用",
      "ジョブコーチ・地域障害者職業センターと連携",
    ],
  },
];
