import { ExternalLink } from "lucide-react";

export interface UnscoredPracticeResource {
  resourceId: string;
  title: string;
  officialQuestionUrl: string;
  topicChecklist: readonly string[];
  structureSteps: readonly string[];
  lawLinks: readonly { title: string; url: string }[];
}

export function UnscoredDescriptivePractice({
  resources,
}: {
  resources: readonly UnscoredPracticeResource[];
}) {
  if (resources.length === 0) return null;

  return (
    <section
      aria-labelledby="descriptive-practice-title"
      className="mt-10 rounded-3xl border-2 border-amber-700 bg-amber-50 p-5 text-amber-950 dark:border-amber-300 dark:bg-amber-950/30 dark:text-amber-50 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-7"
    >
      <h2 id="descriptive-practice-title" className="text-2xl font-black">
        記述式は非採点です
      </h2>
      <p className="mt-2 text-sm leading-6">
        協会から公式正答が公表されていないため、正誤判定・点数・合否予測・AI模範解答は提供しません。公式問題へのリンクと、答案を組み立てる一般的な観点だけを示します。
      </p>
      <div className="mt-5 space-y-4">
        {resources.map((resource) => {
          const helpId = `${resource.resourceId}-memo-help`;
          return (
            <details
              key={resource.resourceId}
              className="rounded-2xl border border-amber-800 bg-white p-4 text-slate-950 dark:border-amber-300 dark:bg-slate-950 dark:text-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
            >
              <summary className="min-h-11 cursor-pointer py-2 text-lg font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400">
                {resource.title}
              </summary>
              <a
                href={resource.officialQuestionUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${resource.title}の協会公式問題PDFを新しいタブで開く`}
                className="mt-2 inline-flex min-h-11 items-center gap-2 font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
              >
                協会の公式問題PDFを開く
                <span className="sr-only">（新しいタブで開きます）</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="font-black">論点チェックリスト</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                    {resource.topicChecklist.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="font-black">答案構成の一般的な手順</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
                    {resource.structureSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </div>
              </div>
              <ul className="mt-4 flex flex-wrap gap-3 text-sm">
                {resource.lawLinks.map((law) => (
                  <li key={law.url}>
                    <a
                      href={law.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 py-2 font-black text-sky-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
                    >
                      {law.title}
                      <span className="sr-only">（新しいタブで開きます）</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
              <label htmlFor={`${resource.resourceId}-memo`} className="mt-4 block font-black">
                自分用メモ（非採点）
              </label>
              <p id={helpId} className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                入力内容は保存・送信されず、このページを閉じると失われます。
              </p>
              <textarea
                id={`${resource.resourceId}-memo`}
                aria-describedby={helpId}
                rows={6}
                autoComplete="off"
                className="mt-2 w-full resize-y rounded-xl border-2 border-slate-400 bg-white p-3 text-base leading-6 text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 dark:border-slate-500 dark:bg-slate-900 dark:text-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
              />
            </details>
          );
        })}
      </div>
    </section>
  );
}
