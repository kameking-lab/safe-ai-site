import { SafetyNotePurchaseLink } from "./note-purchase-link";

interface NoteGuide {
  key: string;
  courseIds: readonly string[];
  title: string;
  purpose: string;
  access: "free" | "paid-preview";
  purchase?: {
    priceJpy: number;
    audience: string;
    outcome: string;
    freeDifference: string;
    contentScope: string;
  };
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
    purchase: {
      priceJpy: 1280,
      audience: "第一種衛生管理者の公表問題を解き、次に復習する論点を整理したい人向けです。",
      outcome: "2025年10月・2026年4月掲載分の計88問を分類した出題表と、誤答から戻る条文を確認する自己チェック表で、復習の順番を決められます。",
      freeDifference: "無料講座は根拠付きの独自問題を1問ずつ確認します。この教材は公表2回分を横断して論点を整理し、法令・計算の独自12問で復習する記事です。",
      contentScope: "公表問題の本文・選択肢・正答の転載やPDF配布はありません。12問は独自問題です。第二種専用の教材ではありません。",
    },
  },
  {
    key: "n45654cd0b84d",
    courseIds: ["occupational-safety-consultant"],
    title: "労働安全コンサルタント機械安全：再発防止を答案に変える3事例",
    purpose: "機械安全の筆記答案を、事例の条件と対策の理由を結び付けて書く",
    access: "paid-preview",
    purchase: {
      priceJpy: 980,
      audience: "労働安全コンサルタントの機械安全を学び、対策の列挙から理由を説明する筆記答案へ進みたい人向けです。",
      outcome: "3つの独自の仮想事例・計9問に取り組み、答案例・誤答の修正・点検表を使って、自分の答案と条件変更後の再答案を作ります。",
      freeDifference: "無料講座は選択式問題と、公式記述問題へのリンク・非採点の構成確認を使えます。この教材は仮想事例ごとの答案例と訂正、条件を変えた書き直しまで扱います。",
      contentScope: "公表問題の再現、公式採点基準、口述対策は含みません。実機の操作・修理や安全判断に使う教材ではありません。",
    },
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
            {guide.purchase ? (
              <>
                <p className="mt-3 font-black text-slate-950 dark:text-white">
                  単品 {guide.purchase.priceJpy.toLocaleString("ja-JP")}円（2026年10月7日確認）
                </p>
                <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  <div><dt className="font-bold">対象者</dt><dd>{guide.purchase.audience}</dd></div>
                  <div><dt className="font-bold">購入後に作れるもの</dt><dd>{guide.purchase.outcome}</dd></div>
                  <div><dt className="font-bold">無料講座との違い</dt><dd>{guide.purchase.freeDifference}</dd></div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{guide.purchase.contentScope}</p>
                <SafetyNotePurchaseLink noteKey={guide.key} title={guide.title} courseId={courseId} />
              </>
            ) : (
            <a
              href={`https://note.com/anzen_ai_jp/n/${guide.key}?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=safety_learning&utm_content=${guide.key}`}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200"
            >
              {guide.access === "free" ? "noteで無料記事を読む" : "noteで無料部分を読む"} ↗
              <span className="sr-only">（新しいタブで開きます）</span>
            </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">価格と公開範囲はnoteの表示を確認してください。</p>
    </section>
  );
}
