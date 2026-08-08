import {
  HOME_ACCIDENT_TYPE_LABELS,
  HOME_ACCIDENT_WORK_LABELS,
  type HomeAccidentType,
  type HomeAccidentWorkCategory,
} from "@/lib/home/home-accident-context";

export function HomeAccidentContextBanner({
  headline,
  accidentType,
  workCategory,
}: {
  headline: string;
  accidentType: HomeAccidentType;
  workCategory: HomeAccidentWorkCategory;
}) {
  return (
    <section
      aria-labelledby="home-accident-context-title"
      className="mt-3 rounded-xl border-2 border-rose-700 bg-rose-50 p-4 text-rose-950"
      data-home-accident-context=""
    >
      <p className="text-xs font-black tracking-wide">参照元：ホームの事故情報</p>
      <h2 id="home-accident-context-title" className="mt-1 text-lg font-black">
        {headline}
      </h2>
      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div className="flex gap-1">
          <dt className="font-black">事故型：</dt>
          <dd>{HOME_ACCIDENT_TYPE_LABELS[accidentType]}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="font-black">作業カテゴリ：</dt>
          <dd>{HOME_ACCIDENT_WORK_LABELS[workCategory]}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm font-black">
        事故型と作業カテゴリを候補として読み込みました。
      </p>
      <p className="mt-1 text-xs font-bold leading-5">
        現場条件を人が確認してください。事故本文・危険源・対策は自動入力せず、承認済みにもしていません。
      </p>
    </section>
  );
}
