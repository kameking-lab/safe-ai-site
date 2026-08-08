export type AnswerFirstRagHoldoutCase = {
  id: string;
  surface: "rag" | "law-search";
  query: string;
  requiredTop5: readonly string[];
  requiredPrefix?: readonly string[];
  forbiddenTop5?: readonly string[];
  forbiddenLawShorts?: readonly string[];
};

/**
 * 2026-08-03 answer-first改修の固定holdout。
 * 2026-08-02の既存220件gold/checksumとは分離し、既存セットを結果に合わせて
 * 書き換えずに、広い質問・follow-up解決後クエリ・誤字・周辺法令を評価する。
 */
export const ANSWER_FIRST_RAG_HOLDOUT_2026_08_03 = [
  {
    id: "AFRAG-001-electric-qualification-broad",
    surface: "rag",
    query: "電気作業の資格は？",
    requiredTop5: [
      "電気工事士法第3条",
      "電気工事士法第2条",
      "安衛法第59条",
      "安衛則第36条",
    ],
    requiredPrefix: [
      "電気工事士法第3条",
      "電気工事士法第2条",
      "安衛法第59条",
      "安衛則第36条",
    ],
    forbiddenLawShorts: ["酸欠則", "有機則", "石綿則", "特化則"],
  },
  {
    id: "AFRAG-002-electric-work-chief-followup-resolved",
    surface: "rag",
    query: "電気作業で作業主任者の選任が必要か",
    requiredTop5: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
    requiredPrefix: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
    forbiddenLawShorts: ["酸欠則", "有機則", "石綿則", "特化則"],
  },
  {
    id: "AFRAG-003-forklift-qualification-broad",
    surface: "rag",
    query: "フォークリフトの資格は？",
    requiredTop5: [
      "安衛法第59条",
      "安衛則第36条",
      "安衛法第61条",
      "安衛令第20条",
      "安衛則第41条",
    ],
    forbiddenTop5: ["安衛則第151条の21", "安衛則第151条の5", "安衛則第151条の14"],
  },
  {
    id: "AFRAG-004-scaffold-handrail",
    surface: "rag",
    query: "足場の手すり高さは？",
    requiredTop5: ["安衛則第563条", "安衛則第552条"],
    requiredPrefix: ["安衛則第563条", "安衛則第552条"],
  },
  {
    id: "AFRAG-005-handrail-ambiguous",
    surface: "rag",
    query: "手すりは？",
    requiredTop5: ["安衛則第563条", "安衛則第552条"],
    requiredPrefix: ["安衛則第563条", "安衛則第552条"],
  },
  {
    id: "AFRAG-006-opening-handrail",
    surface: "rag",
    query: "開口部の手すりは？",
    requiredTop5: ["安衛則第519条"],
    requiredPrefix: ["安衛則第519条"],
  },
  {
    id: "AFRAG-007-organic-solvent-indoor",
    surface: "rag",
    query: "有機溶剤を屋内で使う",
    requiredTop5: ["有機則第5条", "有機則第6条", "有機則第8条", "有機則第9条"],
    requiredPrefix: ["有機則第5条", "有機則第6条", "有機則第8条", "有機則第9条"],
  },
  {
    id: "AFRAG-008-special-organic-solvent-surrounding-law",
    surface: "rag",
    query: "特別有機溶剤を屋内で使う",
    requiredTop5: ["有機則第5条", "特化則第38条の8"],
  },
  {
    id: "AFRAG-009-aerial-work-platform-broad",
    surface: "rag",
    query: "高所作業車は特別教育いる？",
    requiredTop5: [
      "安衛令第10条",
      "安衛則第36条",
      "安衛法第59条",
      "安衛法第61条",
      "安衛令第20条",
    ],
  },
  {
    id: "AFRAG-010-forklift-typo",
    surface: "rag",
    query: "フォークリフ卜の資格は？",
    requiredTop5: ["安衛則第36条", "安衛令第20条"],
  },
  {
    id: "AFRAG-011-organic-solvent-typo",
    surface: "rag",
    query: "有機ようざいを屋内で使う",
    requiredTop5: ["有機則第5条", "有機則第6条", "有機則第8条", "有機則第9条"],
    forbiddenTop5: ["有機則第29条"],
  },
  {
    id: "AFRAG-012-old-kanji-law-and-item",
    surface: "rag",
    query: "安衞則第三十六条第四号",
    requiredTop5: ["安衛則第36条"],
    requiredPrefix: ["安衛則第36条"],
  },
  {
    id: "AFLAW-001-electric-qualification-natural",
    surface: "law-search",
    query: "電気作業の資格は？",
    requiredTop5: [
      "安衛法第59条",
      "安衛則第36条",
      "電気工事士法第3条",
      "電気工事士法第2条",
    ],
    requiredPrefix: [
      "安衛法第59条",
      "安衛則第36条",
      "電気工事士法第3条",
      "電気工事士法第2条",
    ],
  },
  {
    id: "AFLAW-002-electric-work-chief-natural",
    surface: "law-search",
    query: "電気作業で作業主任者の選任が必要か",
    requiredTop5: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
    requiredPrefix: ["安衛法第14条", "安衛令第6条", "安衛則第350条"],
  },
  {
    id: "AFLAW-003-scaffold-handrail-natural",
    surface: "law-search",
    query: "足場の手すり高さは？",
    requiredTop5: ["安衛則第563条", "安衛則第552条"],
    requiredPrefix: ["安衛則第563条", "安衛則第552条"],
  },
  {
    id: "AFLAW-004-organic-solvent-indoor-natural",
    surface: "law-search",
    query: "有機溶剤を屋内で使う",
    requiredTop5: ["有機則第5条", "有機則第6条", "有機則第8条", "有機則第9条"],
    requiredPrefix: ["有機則第5条", "有機則第6条", "有機則第8条", "有機則第9条"],
  },
  {
    id: "AFLAW-005-forklift-qualification-natural",
    surface: "law-search",
    query: "フォークリフトの資格は？",
    requiredTop5: [
      "安衛法第59条",
      "安衛則第36条",
      "安衛法第61条",
      "安衛令第20条",
      "安衛則第41条",
    ],
  },
  {
    id: "AFLAW-006-old-kanji-law-and-item",
    surface: "law-search",
    query: "安衞則第三十六条第四号",
    requiredTop5: ["安衛則第36条"],
    requiredPrefix: ["安衛則第36条"],
  },
] as const satisfies readonly AnswerFirstRagHoldoutCase[];
