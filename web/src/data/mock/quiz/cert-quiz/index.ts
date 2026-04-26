/**
 * 資格試験別100問クイズ - 中央レジストリ
 * 10資格 × 100問 = 1,000問
 */
import type { CertQuizMeta, CertQuizQuestion } from "./types";

import { questions as anzenArchQs } from "./anzen-arch";
import { questions as anzenCivilQs } from "./anzen-civil";
import { questions as envMeasure1stQs } from "./env-measure-1st";
import { questions as health1stQs } from "./health-1st";
import { questions as health2ndQs } from "./health-2nd";
import { questions as healthConsultantQs } from "./health-consultant";
import { questions as hyperbaricQs } from "./hyperbaric";
import { questions as sanketsu2ndQs } from "./sanketsu-2nd";
import { questions as tokuChemQs } from "./toku-chem";
import { questions as yukiYozaiQs } from "./yuki-yozai";

export type CertQuizSlug =
  | "health-1st"
  | "health-2nd"
  | "anzen-civil"
  | "anzen-arch"
  | "health-consultant"
  | "env-measure-1st"
  | "hyperbaric"
  | "sanketsu-2nd"
  | "toku-chem"
  | "yuki-yozai";

interface CertQuizDataset extends CertQuizMeta {
  id: CertQuizSlug;
  questions: CertQuizQuestion[];
}

export const CERT_QUIZZES: readonly CertQuizDataset[] = [
  {
    id: "health-1st",
    name: "第一種衛生管理者",
    shortName: "第一種衛生",
    description: "全業種対象の衛生管理者国家資格。有害業務含む。",
    color: "from-emerald-500 to-teal-600",
    topics: ["関係法令（有害含む）", "労働衛生（有害含む）", "労働生理"],
    difficulty: "標準",
    questions: health1stQs,
  },
  {
    id: "health-2nd",
    name: "第二種衛生管理者",
    shortName: "第二種衛生",
    description: "有害業務以外の業種対象の衛生管理者。",
    color: "from-emerald-400 to-emerald-500",
    topics: ["関係法令", "労働衛生", "労働生理"],
    difficulty: "入門",
    questions: health2ndQs,
  },
  {
    id: "anzen-civil",
    name: "労働安全コンサルタント（土木）",
    shortName: "安全コン土木",
    description: "労働安全のスペシャリスト国家資格・土木専門区分。",
    color: "from-orange-500 to-amber-600",
    topics: ["産業安全一般", "関係法令", "土木専門"],
    difficulty: "最難関",
    questions: anzenCivilQs,
  },
  {
    id: "anzen-arch",
    name: "労働安全コンサルタント（建築）",
    shortName: "安全コン建築",
    description: "労働安全のスペシャリスト国家資格・建築専門区分。",
    color: "from-orange-500 to-red-600",
    topics: ["産業安全一般", "関係法令", "建築専門"],
    difficulty: "最難関",
    questions: anzenArchQs,
  },
  {
    id: "health-consultant",
    name: "労働衛生コンサルタント",
    shortName: "衛生コン",
    description: "労働衛生のスペシャリスト国家資格。",
    color: "from-cyan-500 to-blue-600",
    topics: ["労働衛生一般", "関係法令", "健康管理", "作業環境管理"],
    difficulty: "最難関",
    questions: healthConsultantQs,
  },
  {
    id: "env-measure-1st",
    name: "第一種作業環境測定士",
    shortName: "第一種作環",
    description: "作業環境測定の国家資格・分析含む。",
    color: "from-purple-500 to-fuchsia-600",
    topics: ["デザイン・サンプリング", "分析概論", "鉱物粉じん", "特化物", "金属", "有機溶剤"],
    difficulty: "難関",
    questions: envMeasure1stQs,
  },
  {
    id: "hyperbaric",
    name: "高圧室内作業主任者",
    shortName: "高圧室内",
    description: "圧気工法・潜函作業の主任者免許。",
    color: "from-blue-500 to-indigo-600",
    topics: ["関係法令", "圧気工法", "高気圧障害", "再圧救護", "送気"],
    difficulty: "標準",
    questions: hyperbaricQs,
  },
  {
    id: "sanketsu-2nd",
    name: "酸素欠乏・硫化水素危険作業主任者（第二種）",
    shortName: "酸欠2種",
    description: "酸欠＋硫化水素発生危険場所の主任者技能講習。",
    color: "from-rose-500 to-pink-600",
    topics: ["関係法令", "酸欠", "硫化水素", "換気", "保護具", "救出"],
    difficulty: "入門",
    questions: sanketsu2ndQs,
  },
  {
    id: "toku-chem",
    name: "特定化学物質作業主任者",
    shortName: "特化物",
    description: "特化物・四アルキル鉛等を取り扱う作業の主任者技能講習。",
    color: "from-amber-500 to-yellow-600",
    topics: ["特化則", "物質性質", "健診", "局排", "保護具"],
    difficulty: "標準",
    questions: tokuChemQs,
  },
  {
    id: "yuki-yozai",
    name: "有機溶剤作業主任者",
    shortName: "有機溶剤",
    description: "有機溶剤を使用する屋内作業の主任者技能講習。",
    color: "from-lime-500 to-green-600",
    topics: ["有機則", "性質分類", "健診", "局排", "保護具"],
    difficulty: "標準",
    questions: yukiYozaiQs,
  },
] as const;

export const CERT_QUIZ_SLUGS: readonly CertQuizSlug[] = CERT_QUIZZES.map(
  (c) => c.id,
);

export function getCertQuiz(slug: string): CertQuizDataset | undefined {
  return CERT_QUIZZES.find((c) => c.id === slug);
}

export function getCertQuizMeta(slug: string): CertQuizMeta | undefined {
  const c = getCertQuiz(slug);
  if (!c) return undefined;
  // questions を除いたメタのみ返す
  const { questions: _q, ...meta } = c;
  return meta;
}

/** 全資格の問題数合計 */
export function getTotalQuestionCount(): number {
  return CERT_QUIZZES.reduce((sum, c) => sum + c.questions.length, 0);
}
