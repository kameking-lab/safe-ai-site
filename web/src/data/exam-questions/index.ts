import type { ExamQuestion, ExamSubject, ExamCertification } from "./types";
import { questions as q2023sg } from "./2023-safety-general";
import { questions as q2023sl } from "./2023-safety-law";
import { questions as q2024sg } from "./2024-safety-general";
import { questions as q2024sl } from "./2024-safety-law";
import { questions as q2025sg } from "./2025-safety-general";
import { questions as q2025sl } from "./2025-safety-law";
// Batch 1: Boiler
import { questions as qBoiler1st } from "./boiler-1st";
import { questions as qBoiler2nd } from "./boiler-2nd";
import { questions as qBoilerWeldSpecial } from "./boiler-weld-special";
import { questions as qBoilerWeldNormal } from "./boiler-weld-normal";
import { questions as qBoilerMaintenance } from "./boiler-maintenance";
// Batch 2: Crane
import { questions as qCraneDerrick } from "./crane-derrick";
import { questions as qCraneOnly } from "./crane-only";
import { questions as qCraneMobile } from "./crane-mobile";
import { questions as qCraneCargo } from "./crane-cargo";
// Batch 3: Special
import { questions as qGasWelding } from "./gas-welding";
import { questions as qForestryWire } from "./forestry-wire";
import { questions as qHyperbaric } from "./hyperbaric";
import { questions as qBlasting } from "./blasting";
import { questions as qDiving } from "./diving";
// Batch 4: Radiation & Environment
import { questions as qXray } from "./xray";
import { questions as qGamma } from "./gamma";
import { questions as qEnvMeasure1st } from "./env-measure-1st";
import { questions as qEnvMeasure2nd } from "./env-measure-2nd";

export type { ExamQuestion, ExamSubject, ExamCertification };
export type { ExamCertSubject } from "./types";

// Existing 労働安全コンサルタント試験 questions (certificationId defaults to "anzen-consultant")
const legacyQuestions: ExamQuestion[] = [
  ...q2023sg,
  ...q2023sl,
  ...q2024sg,
  ...q2024sl,
  ...q2025sg,
  ...q2025sl,
].map((q) => ({ ...q, certificationId: "anzen-consultant" }));

export const ALL_QUESTIONS: ExamQuestion[] = [
  ...legacyQuestions,
  ...qBoiler1st,
  ...qBoiler2nd,
  ...qBoilerWeldSpecial,
  ...qBoilerWeldNormal,
  ...qBoilerMaintenance,
  ...qCraneDerrick,
  ...qCraneOnly,
  ...qCraneMobile,
  ...qCraneCargo,
  ...qGasWelding,
  ...qForestryWire,
  ...qHyperbaric,
  ...qBlasting,
  ...qDiving,
  ...qXray,
  ...qGamma,
  ...qEnvMeasure1st,
  ...qEnvMeasure2nd,
];

export const AVAILABLE_YEARS = [2023, 2024, 2025] as const;

/** Legacy subject labels (for backward compat with stats display) */
export const SUBJECT_LABELS: Record<string, string> = {
  "safety-general": "産業安全一般",
  "safety-law": "産業安全関係法令",
  "health-general": "労働衛生一般",
  "health-law": "労働衛生関係法令",
};

/** All examination certifications */
export const EXAM_CATEGORIES: ExamCertification[] = [
  {
    id: "anzen-consultant",
    name: "労働安全コンサルタント試験",
    shortName: "安全コンサルタント",
    category: "consultant",
    subjects: [
      { id: "safety-general", label: "産業安全一般" },
      { id: "safety-law", label: "産業安全関係法令" },
    ],
  },
  // Batch 1: Boiler
  {
    id: "boiler-1st",
    name: "特級ボイラー技士",
    shortName: "特級ボイラー技士",
    category: "boiler",
    subjects: [
      { id: "b1-structure", label: "ボイラーの構造" },
      { id: "b1-operation", label: "ボイラーの取扱い" },
      { id: "b1-fuel", label: "燃料及び燃焼" },
      { id: "b1-law", label: "関係法令" },
    ],
  },
  {
    id: "boiler-2nd",
    name: "二級ボイラー技士",
    shortName: "二級ボイラー技士",
    category: "boiler",
    subjects: [
      { id: "b2-structure", label: "ボイラーの構造" },
      { id: "b2-operation", label: "ボイラーの取扱い" },
      { id: "b2-fuel", label: "燃料及び燃焼" },
      { id: "b2-law", label: "関係法令" },
    ],
  },
  {
    id: "boiler-weld-special",
    name: "特別ボイラー溶接士",
    shortName: "特別ボイラー溶接士",
    category: "boiler",
    subjects: [
      { id: "bws-structure", label: "ボイラーの構造等" },
      { id: "bws-welding", label: "溶接法等" },
    ],
  },
  {
    id: "boiler-weld-normal",
    name: "普通ボイラー溶接士",
    shortName: "普通ボイラー溶接士",
    category: "boiler",
    subjects: [
      { id: "bwn-structure", label: "ボイラーの構造等" },
      { id: "bwn-welding", label: "溶接法等" },
    ],
  },
  {
    id: "boiler-maintenance",
    name: "ボイラー整備士",
    shortName: "ボイラー整備士",
    category: "boiler",
    subjects: [
      { id: "bm-work", label: "ボイラー整備等" },
      { id: "bm-law", label: "関係法令" },
    ],
  },
  // Batch 2: Crane
  {
    id: "crane-derrick",
    name: "クレーン・デリック運転士（限定なし）",
    shortName: "クレーン・デリック（限定なし）",
    category: "crane",
    subjects: [
      { id: "cd-knowledge", label: "クレーン等に関する知識" },
      { id: "cd-electric", label: "原動機及び電気に関する知識" },
      { id: "cd-law", label: "関係法令" },
      { id: "cd-dynamics", label: "クレーンの運転のために必要な力学に関する知識" },
    ],
  },
  {
    id: "crane-only",
    name: "クレーン・デリック運転士（クレーン限定）",
    shortName: "クレーン・デリック（クレーン限定）",
    category: "crane",
    subjects: [
      { id: "co-knowledge", label: "クレーンに関する知識" },
      { id: "co-electric", label: "原動機及び電気に関する知識" },
      { id: "co-law", label: "関係法令" },
      { id: "co-dynamics", label: "力学に関する知識" },
    ],
  },
  {
    id: "crane-mobile",
    name: "移動式クレーン運転士",
    shortName: "移動式クレーン運転士",
    category: "crane",
    subjects: [
      { id: "cm-knowledge", label: "移動式クレーンに関する知識" },
      { id: "cm-hydraulic", label: "原動機及び油圧装置に関する知識" },
      { id: "cm-law", label: "関係法令" },
      { id: "cm-dynamics", label: "力学に関する知識" },
    ],
  },
  {
    id: "crane-cargo",
    name: "揚貨装置運転士",
    shortName: "揚貨装置運転士",
    category: "crane",
    subjects: [
      { id: "cc-knowledge", label: "揚貨装置に関する知識" },
      { id: "cc-electric", label: "原動機及び電気に関する知識" },
      { id: "cc-law", label: "関係法令" },
      { id: "cc-dynamics", label: "力学に関する知識" },
    ],
  },
  // Batch 3: Special work
  {
    id: "gas-welding",
    name: "ガス溶接作業主任者",
    shortName: "ガス溶接作業主任者",
    category: "special",
    subjects: [
      { id: "gw-knowledge", label: "アセチレン溶接装置及び溶接・切断作業" },
      { id: "gw-law", label: "関係法令" },
    ],
  },
  {
    id: "forestry-wire",
    name: "林業架線作業主任者",
    shortName: "林業架線作業主任者",
    category: "special",
    subjects: [
      { id: "fw-knowledge", label: "林業架線作業に関する知識" },
      { id: "fw-law", label: "関係法令" },
    ],
  },
  {
    id: "hyperbaric",
    name: "高圧室内作業主任者",
    shortName: "高圧室内作業主任者",
    category: "special",
    subjects: [
      { id: "hb-knowledge", label: "高圧室内作業に関する知識" },
      { id: "hb-law", label: "関係法令" },
    ],
  },
  {
    id: "blasting",
    name: "発破技士",
    shortName: "発破技士",
    category: "special",
    subjects: [
      { id: "bl-knowledge", label: "発破の理論及び方法" },
      { id: "bl-law", label: "火薬類取締法" },
    ],
  },
  {
    id: "diving",
    name: "潜水士",
    shortName: "潜水士",
    category: "special",
    subjects: [
      { id: "dv-knowledge", label: "潜水業務に関する知識" },
      { id: "dv-air", label: "送気・潜降・浮上に関する知識" },
      { id: "dv-law", label: "関係法令" },
      { id: "dv-decompression", label: "高気圧障害に関する知識" },
    ],
  },
  // Batch 4: Radiation & Environment
  {
    id: "xray",
    name: "エックス線作業主任者",
    shortName: "エックス線作業主任者",
    category: "radiation",
    subjects: [
      { id: "xr-knowledge", label: "エックス線の管理に関する知識" },
      { id: "xr-law", label: "関係法令" },
      { id: "xr-measurement", label: "エックス線の測定に関する知識" },
      { id: "xr-biology", label: "放射線の生体に与える影響に関する知識" },
    ],
  },
  {
    id: "gamma",
    name: "ガンマ線透過写真撮影作業主任者",
    shortName: "ガンマ線透過写真撮影",
    category: "radiation",
    subjects: [
      { id: "gr-knowledge", label: "ガンマ線照射装置に関する知識" },
      { id: "gr-law", label: "関係法令" },
      { id: "gr-measurement", label: "放射線の測定に関する知識" },
      { id: "gr-biology", label: "放射線の生体に与える影響に関する知識" },
    ],
  },
  {
    id: "env-measure-1st",
    name: "第一種作業環境測定士",
    shortName: "第一種作業環境測定士",
    category: "environment",
    subjects: [
      { id: "em1-design", label: "デザイン・サンプリング" },
      { id: "em1-analysis", label: "分析概論" },
      { id: "em1-law", label: "関係法令" },
    ],
  },
  {
    id: "env-measure-2nd",
    name: "第二種作業環境測定士",
    shortName: "第二種作業環境測定士",
    category: "environment",
    subjects: [
      { id: "em2-design", label: "デザイン・サンプリング" },
      { id: "em2-law", label: "関係法令" },
    ],
  },
];

export function filterQuestions(opts: {
  certificationId?: string | "all";
  subject?: string | "all";
  year?: number | "all";
  shuffle?: boolean;
}): ExamQuestion[] {
  let result = ALL_QUESTIONS;
  if (opts.certificationId && opts.certificationId !== "all") {
    result = result.filter((q) => (q.certificationId ?? "anzen-consultant") === opts.certificationId);
  }
  if (opts.subject && opts.subject !== "all") {
    result = result.filter((q) => q.subject === opts.subject);
  }
  if (opts.year && opts.year !== "all") {
    result = result.filter((q) => q.year === opts.year);
  }
  if (opts.shuffle) {
    result = [...result].sort(() => Math.random() - 0.5);
  }
  return result;
}
