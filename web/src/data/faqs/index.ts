import type { FAQ, FAQCategory } from "@/types/faq";
import { FAQ_BATCH_1_LAW } from "./faq-batch-1-law";
import { FAQ_BATCH_2_MANAGEMENT } from "./faq-batch-2-management";
import { FAQ_BATCH_3_CHEMICAL } from "./faq-batch-3-chemical";
import { FAQ_BATCH_4_HEALTH_EDUCATION } from "./faq-batch-4-health-education";

export const ALL_FAQS: FAQ[] = [
  ...FAQ_BATCH_1_LAW,
  ...FAQ_BATCH_2_MANAGEMENT,
  ...FAQ_BATCH_3_CHEMICAL,
  ...FAQ_BATCH_4_HEALTH_EDUCATION,
];

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
