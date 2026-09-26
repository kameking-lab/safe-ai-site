interface NoteGuide {
  key: string;
  courseIds: readonly string[];
  title: string;
  purpose: string;
  access: "free" | "paid-preview";
}

const NOTE_GUIDES: readonly NoteGuide[] = [
  {
    key: "n286d5c187239",
    courseIds: ["first-class-health-officer", "second-class-health-officer"],
    title: "衛生管理者試験の当日｜試験時間の使い方、途中退室、持ち物と受験票",
    purpose: "当日の持ち物、時間配分、途中退室を確認する",
    access: "free",
  },
  {
    key: "n8fa962d280cd",
    courseIds: ["first-class-health-officer"],
    title: "第一種衛生管理者 公表問題2回分（2025年10月・2026年4月）｜論点別に並べ直した出題表と誤答しやすい12問",
    purpose: "公表問題を解いた後、論点別に弱点を復習する",
    access: "paid-preview",
  },
  {
    key: "n1f60da5385ea",
    courseIds: ["occupational-health-consultant"],
    title: "労働衛生コンサルタント 筆記 労働衛生関係法令｜公表問題4年分を条文別に並べ直した出題表と12問",
    purpose: "法令科目を条文別に復習する",
    access: "paid-preview",
  },
];

export function RelatedSafetyNoteGuides({ courseId }: { courseId: string }) {
  const guides = NOTE_GUIDES.filter((guide) => guide.courseIds.includes(courseId));
  if (guides.length === 0) return null;

  return (
    <section className="mt-10 rounded-3xl border-2 border-slate-300 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-900 sm:p-7" aria-labelledby="related-safety-note-title">
      <h2 id="related-safety-note-title" className="text-2xl font-black text-slate-950 dark:text-white">運営者のnote記事（PR）</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        問題演習の後に、試験準備や復習の進め方を確認できます。有料記事は無料部分で対象と内容を確かめてから判断してください。
      </p>
      <ul className="mt-4 space-y-3">
        {guides.map((guide) => (
          <li key={guide.key} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-950">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {guide.access === "free" ? "無料記事" : "有料記事・無料部分あり"}
            </p>
            <h3 className="mt-1 font-black text-slate-950 dark:text-white">{guide.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{guide.purpose}</p>
            <a
              href={`https://note.com/anzen_ai_jp/n/${guide.key}?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=safety_learning&utm_content=${guide.key}`}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200"
            >
              {guide.access === "free" ? "noteで無料記事を読む" : "noteで無料部分を読む"} ↗
              <span className="sr-only">（新しいタブで開きます）</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">価格と公開範囲はnoteの表示を確認してください。</p>
    </section>
  );
}
