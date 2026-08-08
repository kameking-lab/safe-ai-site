/**
 * Legacy compatibility link. Detailed quality information belongs on its
 * dedicated page and must not compete with the conversation.
 */
export function ChatbotEvalBadge({ isEn = false }: { isEn?: boolean }) {
  return (
    <a
      href="/about/chatbot-eval"
      className="inline-flex min-h-11 items-center text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
    >
      {isEn ? "Quality and sources" : "品質と出典"}
    </a>
  );
}
