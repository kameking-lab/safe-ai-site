import type { LearningQuestion, LearningTheme } from "@/lib/types/operations";

type ThemeDef = {
  id: string;
  title: string;
  sourceType: LearningTheme["sourceType"];
  level: LearningTheme["level"];
  keyword: string;
};

const THEME_DEFS: ThemeDef[] = [
  { id: "el-fall", title: "高所作業・墜落制止", sourceType: "事故DB", level: "重点", keyword: "高所" },
  { id: "el-scaffold", title: "足場の組立て・使用・解体", sourceType: "事故DB", level: "重点", keyword: "足場" },
  { id: "el-crane", title: "クレーン・玉掛け・揚重", sourceType: "事故DB", level: "重点", keyword: "揚重" },
  { id: "el-elec", title: "電気・停電・検電・感電防止", sourceType: "法改正", level: "標準", keyword: "電気" },
  { id: "el-lockout", title: "ロックアウト・エネルギー隔離", sourceType: "事故DB", level: "重点", keyword: "LOTO" },
  { id: "el-heat", title: "熱中症・WBGT・屋外作業", sourceType: "現場リスク", level: "標準", keyword: "熱中症" },
  { id: "el-confined", title: "酸欠・硫化水素・タンク内作業", sourceType: "事故DB", level: "重点", keyword: "酸欠" },
  { id: "el-fire", title: "火気・溶接・防火", sourceType: "事故DB", level: "標準", keyword: "火気" },
  { id: "el-fork", title: "フォークリフト・車両誘導", sourceType: "事故DB", level: "標準", keyword: "フォーク" },
  { id: "el-dust", title: "粉じん・化学物質・呼吸防护", sourceType: "法改正", level: "標準", keyword: "粉じん" },
  { id: "el-asbestos", title: "アスベスト・レベル分類・除去", sourceType: "法改正", level: "重点", keyword: "アスベスト" },
  { id: "el-ky", title: "KY・リスクアセスメント実践", sourceType: "現場リスク", level: "入門", keyword: "KY" },
];

const POOL_A = [
  "最も不適切な初動はどれか。",
  "現場監督が最優先で確認すべきはどれか。",
  "作業員が取るべき行動として適切なのはどれか。",
  "法令・ルールの趣旨に最も沿うのはどれか。",
  "再発防止で最も効果が高いのはどれか。",
  "朝礼で共有すべき内容として適切なのはどれか。",
  "記録・証跡として重要なのはどれか。",
  "PPEの選定で誤りやすいのはどれか。",
  "第三者被害を防ぐ観点で正しいのはどれか。",
  "緊急時の連絡・退避で適切なのはどれか。",
];

function buildOptions(keyword: string, qIndex: number): { options: string[]; correctIndex: number; explanation: string } {
  const wrongA = `${keyword}に関係ない手順だけ口頭で伝える`;
  const wrongB = `体調が悪くても${keyword}作業は続行する`;
  const good = `リスクを言語化し、措置・責任者・確認方法まで落とし込む（${keyword}）`;
  const rot = qIndex % 3;
  const options =
    rot === 0 ? [wrongA, good, wrongB] : rot === 1 ? [good, wrongB, wrongA] : [wrongB, wrongA, good];
  const correctIndex = options.indexOf(good);
  return {
    options,
    correctIndex,
    explanation: `${keyword}では、曖昧な指示より具体的なリスクと対策のセット化が重要です。`,
  };
}

function buildQuestions(theme: ThemeDef): LearningQuestion[] {
  return Array.from({ length: 10 }, (_, i) => {
    const stem = POOL_A[i % POOL_A.length]!;
    const { options, correctIndex, explanation } = buildOptions(theme.keyword, i + i * 7);
    return {
      id: `${theme.id}-q${i + 1}`,
      question: `【${theme.keyword}】${stem}`,
      options,
      correctIndex,
      explanation,
    };
  });
}

export const elearningThemesCatalog: LearningTheme[] = THEME_DEFS.map((t) => ({
  id: t.id,
  title: t.title,
  sourceType: t.sourceType,
  description: `${t.keyword}を中心に、現場で即効く判断を10問で確認します。`,
  level: t.level,
  questions: buildQuestions(t),
}));
