import { EDUCATION_CONTEXTS, type EducationSlug } from "@/data/education-context";
import { AccidentsByCategory } from "@/components/education/AccidentsByCategory";
import { RelatedLawUpdates } from "@/components/education/RelatedLawUpdates";
import { ChecklistDownload } from "@/components/education/ChecklistDownload";

type Props = {
  slug: EducationSlug;
};

/**
 * 各教育コース詳細ページ末尾に挿入する「業種別統計＋事故事例＋関連法令＋チェックリスト＋監修者コメント」のセット。
 */
export function EducationContextSections({ slug }: Props) {
  const ctx = EDUCATION_CONTEXTS[slug];
  if (!ctx) return null;

  return (
    <>
      <AccidentsByCategory context={ctx} limit={4} />
      <RelatedLawUpdates context={ctx} limit={4} />
      <ChecklistDownload context={ctx} />
    </>
  );
}
