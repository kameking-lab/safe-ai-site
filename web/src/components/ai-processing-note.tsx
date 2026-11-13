/** The existing send action authorizes this request; no stored opt-in is needed. */
export function AiProcessingNote() {
  return <p data-ai-processing-note="" className="my-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300">文章はGoogle Geminiで処理します（<a href="/privacy#external-services" className="underline">プライバシー</a>）</p>;
}
