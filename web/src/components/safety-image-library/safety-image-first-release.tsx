import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
} from "lucide-react";

type FirstReleaseItem = {
  title: string;
  message: string;
  slug: string;
  place: string;
};

// 旧100点の先頭抽出ではなく、提供資料257〜260頁の用途分類から再設計した固定10案。
const ENTRY_FIRST_FIVE: readonly FirstReleaseItem[] = [
  { title: "吊り荷の下 立入禁止", message: "吊り荷の下には入らない", slug: "no-under-suspended-load", place: "クレーン・揚重作業" },
  { title: "重機旋回内 立入禁止", message: "重機の旋回範囲に入らない", slug: "equipment-swing-zone", place: "掘削・積込み作業" },
  { title: "開口部 立入禁止", message: "手すりの内側へ入らない", slug: "floor-opening-hazard", place: "床開口・端部" },
  { title: "車両進入禁止", message: "歩行者区画へ車両を入れない", slug: "no-vehicle-entry", place: "歩車分離区画" },
  { title: "点検中 操作禁止", message: "ロックアウトを解除しない", slug: "operation-prohibited", place: "機械の点検・清掃" },
];

const REQUIRED_FIRST_FIVE: readonly FirstReleaseItem[] = [
  { title: "保護帽を着用", message: "あごひもまで確実に", slug: "helmet-required", place: "建設・荷役・製造" },
  { title: "保護めがねを着用", message: "飛来物から目を守る", slug: "safety-glasses-required", place: "切断・研磨・薬液" },
  { title: "耳栓を着用", message: "騒音区画に入る前に", slug: "earplugs-required", place: "はつり・プレス・機械室" },
  { title: "防じんマスクを着用", message: "区分とフィットを確認", slug: "dust-mask-required", place: "粉じん・研磨作業" },
  { title: "フルハーネスを使用", message: "ランヤードを先に接続", slug: "full-body-harness-required", place: "高所・足場・屋根" },
];

function ThemeCard({ item }: { item: FirstReleaseItem }) {
  return (
    <li>
      <Link
        href={`/materials/safety-images/${item.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-600 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-white">
          <Image
            src={`/safety-images/library/previews/${item.slug}.webp`}
            alt={`${item.title}を用途別に描いた、もふもふのチワワ安全看板`}
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 1280px) 30vw, 16vw"
            className="object-contain transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-x-[8%] top-[7%] z-10 text-center text-[clamp(.58rem,1.2vw,.84rem)] font-black leading-tight text-emerald-950">
            {item.title}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h4 className="font-black text-slate-950 dark:text-white">{item.title}</h4>
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-600 dark:text-slate-300">{item.place}／{item.message}</p>
          <span className="mt-auto inline-flex min-h-11 items-center gap-1 pt-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
            文字編集・ダウンロード
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </li>
  );
}

export function SafetyImageFirstRelease() {
  return (
    <section aria-labelledby="safety-image-first-release" className="rounded-[2rem] border border-emerald-200 bg-[#f5f8f2] p-4 sm:p-7 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_11rem] lg:items-center">
        <div>
          <h2 id="safety-image-first-release" className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            現場でよく使う10枚
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            立入禁止と保護具の看板から選べます。開いて文字・言語・用紙の向きを整えてください。
          </p>
        </div>
        <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-3xl border-4 border-white bg-emerald-900 shadow-xl">
          <Image src="/mascot/mascot-pointing.webp" alt="安全看板を案内するもふもふのチワワ" fill sizes="144px" className="object-contain p-2" />
        </div>
      </div>

      <div className="mt-7 space-y-8">
        <section aria-labelledby="entry-first-five">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-rose-700 dark:text-rose-300">立入りを止める場所</p>
              <h3 id="entry-first-five" className="mt-1 text-xl font-black text-slate-950 dark:text-white">立入禁止・進入禁止 5枚</h3>
            </div>
            <Link href="/materials/safety-images/category/entry-prohibition" className="min-h-11 text-xs font-black text-rose-800 underline underline-offset-4 dark:text-rose-200">禁止表示をすべて見る</Link>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {ENTRY_FIRST_FIVE.map((item) => <ThemeCard key={item.slug} item={item} />)}
          </ul>
        </section>

        <section aria-labelledby="required-first-five">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-sky-800 dark:text-sky-300">着用・行動を伝える場所</p>
              <h3 id="required-first-five" className="mt-1 text-xl font-black text-slate-950 dark:text-white">保護具・着用指示 5枚</h3>
            </div>
            <Link href="/materials/safety-images/category/protective-equipment" className="min-h-11 text-xs font-black text-sky-900 underline underline-offset-4 dark:text-sky-200">着用表示をすべて見る</Link>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {REQUIRED_FIRST_FIVE.map((item) => <ThemeCard key={item.slug} item={item} />)}
          </ul>
        </section>
      </div>
    </section>
  );
}
