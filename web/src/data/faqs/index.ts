import type { FAQ, FAQCategory } from "@/types/faq";

/**
 * 2026-07-24 fail-closed:
 * 旧200問には法令番号、資格試験問題数、制度境界の誤対応が複数確認された。
 * 質問単位で一次資料URL・適用時点・人手レビューを持つallowlistへ移行するまで、
 * 公開ページ、JSON-LD、横断検索、AI groundingへ一件も渡さない。
 */
export const ALL_FAQS: FAQ[] = [];

export function getFAQsByCategory(category: FAQCategory): FAQ[] {
  return ALL_FAQS.filter((faq) => faq.category === category);
}

export function searchFAQs(query: string): FAQ[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ALL_FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.tags?.some((t) => t.toLowerCase().includes(q))
  );
}

export function getFAQById(id: string): FAQ | undefined {
  return ALL_FAQS.find((faq) => faq.id === id);
}
