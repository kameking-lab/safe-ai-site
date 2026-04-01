"use client";

type HomeValueHeroProps = {
  onJumpToRisk?: () => void;
  onJumpToLaws?: () => void;
  onJumpToChat?: () => void;
};

export function HomeValueHero({
  onJumpToRisk,
  onJumpToLaws,
  onJumpToChat,
}: HomeValueHeroProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="ホームの価値案内">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">
        今日の安全判断を、1画面で。
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        現場責任者・安全担当向けに、今日のリスク確認、法改正チェック、AI要約と質問をすぐ使える形でまとめています。
      </p>

      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <li className="rounded-lg bg-emerald-50 px-3 py-2">
          <span className="font-semibold text-emerald-800">今日の現場リスク:</span>{" "}
          地域ごとの天気・警報から、朝礼で伝える注意点をすぐ確認
        </li>
        <li className="rounded-lg bg-sky-50 px-3 py-2">
          <span className="font-semibold text-sky-800">法改正チェック:</span>{" "}
          重要な改正を一覧で見て、影響範囲を短時間で把握
        </li>
        <li className="rounded-lg bg-amber-50 px-3 py-2">
          <span className="font-semibold text-amber-800">AI要約 / 質問チャット:</span>{" "}
          現場向けに要点を掴み、疑問をその場で整理
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onJumpToRisk}
          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          今日の現場リスクを見る
        </button>
        <button
          type="button"
          onClick={onJumpToLaws}
          className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
        >
          法改正を確認する
        </button>
        <button
          type="button"
          onClick={onJumpToChat}
          className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
        >
          質問チャットを使う
        </button>
      </div>
    </section>
  );
}
