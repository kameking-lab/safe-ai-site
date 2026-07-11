import { QUIZ_BY_TYPE } from "@/data/hazard-slides/quiz-by-type";
import { CANONICAL_HAZARD_TYPES } from "@/lib/accidents/type-normalization";
import type { LearningTheme } from "@/lib/types/operations";

/**
 * 災害の型別 基礎クイズ（Eラーニングテーマ）。
 *
 * 問題プールは教育スライドと同じ正本（QUIZ_BY_TYPE）から自動生成する
 * （手書きの複製を作らない＝スライド側の更新に自動追従）。
 * 出題は死亡件数上位の主要8型＋熱中症を含む高温・低温（教育の定番）に絞る。
 */

const THEME_SLUGS = [
  "fall",
  "caught-in",
  "struck-by",
  "collapse",
  "flying-falling-object",
  "trip",
  "hot-cold-contact",
  "electric-shock",
] as const;

export const elearningHazardTypesTheme: LearningTheme[] = [
  {
    id: "el-hazard-types",
    title: "災害の型別 基礎（墜落・はさまれ・転倒ほか）",
    sourceType: "事故DB",
    description:
      "厚労省「事故の型」の主要8型（墜落・転落／はさまれ・巻き込まれ／激突され／崩壊・倒壊／飛来・落下／転倒／高温・低温／感電）の基本対策を確認します。各型の統計と対策は「災害の型別 教育スライド」で学べます。",
    level: "入門",
    questions: THEME_SLUGS.flatMap((slug) => {
      const t = CANONICAL_HAZARD_TYPES.find((c) => c.slug === slug);
      return QUIZ_BY_TYPE[slug].map((q) => ({
        ...q,
        // テーマ内でどの型の設問か分かるよう接頭辞を付ける（正本の設問文は不変）
        question: t ? `【${t.short}】${q.question}` : q.question,
      }));
    }),
  },
];
