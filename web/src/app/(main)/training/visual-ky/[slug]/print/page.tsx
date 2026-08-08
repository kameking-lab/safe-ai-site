import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VisualKyPrintAction } from "@/components/visual-ky/print-action";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  getVisualKyScenarioBySlug,
} from "@/data/visual-ky";

const HUB_PATH = "/training/visual-ky";
const FORMATS = [
  ["problem", "問題だけ"],
  ["worksheet", "問題＋記入欄"],
  ["answer", "解答・解説"],
  ["morning", "朝礼用1枚"],
  ["script", "講師進行台本"],
  ["participant", "参加者配布用"],
] as const;
type PrintFormat = (typeof FORMATS)[number][0];

function normalizeFormat(value: string | string[] | undefined): PrintFormat {
  const raw = Array.isArray(value) ? value[0] : value;
  return FORMATS.some(([id]) => id === raw) ? (raw as PrintFormat) : "worksheet";
}

export function generateStaticParams() {
  return PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => ({
    slug: scenario.slug,
  }));
}

export const dynamicParams = false;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario) return {};
  return {
    title: `${scenario.shortTitle}｜印刷・配布`,
    description: `${scenario.shortTitle}のA4印刷用問題、記入欄、解説、講師台本です。`,
    alternates: { canonical: `${HUB_PATH}/${scenario.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function VisualKyPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario || !PUBLIC_VISUAL_KY_SCENARIOS.some((item) => item.id === scenario.id)) {
    notFound();
  }
  const format = normalizeFormat(query.format);
  const showProblem = ["problem", "worksheet", "participant"].includes(format);
  const showWorksheet = ["worksheet", "participant"].includes(format);
  const showAnswer = format === "answer";
  const showScript = format === "script";
  const showMorning = format === "morning";
  const selectedLabel = FORMATS.find(([id]) => id === format)?.[1] ?? "問題＋記入欄";
  const printTimestamp = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "long",
    timeStyle: "short",
    hour12: false,
  }).format(new Date());

  return (
    <div className="mx-auto max-w-5xl bg-white px-4 py-6 text-slate-950 sm:px-6 print:max-w-none print:p-0">
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          .visual-ky-print-sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .visual-ky-print-break { break-before: page; }
        }
      `}</style>
      <nav className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:hidden" aria-label="印刷形式">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href={`${HUB_PATH}/${scenario.slug}`}
              className="font-bold text-teal-800 underline decoration-2 underline-offset-4"
            >
              問題画面へ戻る
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              HTMLを正本とし、印刷ダイアログから紙またはPDFへ出力します。色だけに依存しないため、カラー・白黒のどちらでも利用できます。現在: {selectedLabel}
            </p>
          </div>
          <VisualKyPrintAction
            scenarioId={scenario.id}
            category={scenario.category}
            difficulty={scenario.difficulty}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FORMATS.map(([id, label]) => (
            <Link
              key={id}
              href={`${HUB_PATH}/${scenario.slug}/print?format=${id}`}
              aria-current={format === id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-xl border px-3 py-2 text-sm font-bold ${
                format === id
                  ? "border-teal-800 bg-teal-800 text-white"
                  : "border-slate-300 bg-white text-slate-800"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <article className="visual-ky-print-sheet">
        <header className="border-b-2 border-slate-950 pb-4">
          <p className="text-xs font-black tracking-wider">
            5分でできる ビジュアルKYT · {scenario.id} · {selectedLabel}
          </p>
          <h1 className="mt-2 text-3xl font-black">{scenario.shortTitle}</h1>
          <p className="mt-2 text-sm leading-6">{scenario.title}</p>
          <p className="mt-2 text-xs">
            難易度 {scenario.difficulty}／目安 {scenario.estimatedMinutes}分／
            作成・更新 {scenario.updatedDate}
          </p>
        </header>

        {showProblem ? (
          <section className="mt-5" aria-labelledby="print-problem-heading">
            <h2 id="print-problem-heading" className="text-xl font-black">
              この場面の危険は何ですか
            </h2>
            <div className="relative mt-3 aspect-video overflow-hidden border-2 border-slate-950">
              <Image
                src={scenario.image.src}
                alt={scenario.image.alt}
                fill
                priority
                loading="eager"
                sizes="190mm"
                className="object-cover"
              />
            </div>
            <p className="mt-3 text-sm leading-6">
              <strong>画像の説明：</strong>
              {scenario.image.fullDescription}
            </p>
          </section>
        ) : null}

        {showWorksheet ? (
          <section className="mt-5" aria-labelledby="worksheet-heading">
            <h2 id="worksheet-heading" className="text-xl font-black">
              危険・理由・対策を書き出す
            </h2>
            <div className="mt-3 grid gap-3">
              {[1, 2, 3].map((number) => (
                <div key={number} className="grid grid-cols-[2rem_1fr_1fr] border border-slate-700">
                  <div className="flex items-center justify-center border-r border-slate-700 font-black">
                    {number}
                  </div>
                  <div className="min-h-20 border-r border-slate-700 p-2 text-xs">
                    危険・事故につながる理由
                  </div>
                  <div className="min-h-20 p-2 text-xs">先に行う対策</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="min-h-16 border border-slate-700 p-2">今日の行動目標</div>
              <div className="min-h-16 border border-slate-700 p-2">確認者・確認日時</div>
            </div>
          </section>
        ) : null}

        {showAnswer ? (
          <section className={`${showProblem ? "visual-ky-print-break" : ""} mt-5`} aria-labelledby="print-answer-heading">
            <h2 id="print-answer-heading" className="text-xl font-black">
              解答・解説
            </h2>
            <p className="mt-3 border border-slate-700 p-3 text-sm leading-6">
              {scenario.answerExplanation}
            </p>
            <div className="mt-4 space-y-3">
              {scenario.hazards.map((hazard, index) => (
                <article key={hazard.id} className="break-inside-avoid border border-slate-700 p-3">
                  <h3 className="font-black">
                    {index + 1}. {hazard.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6">
                    <strong>危険：</strong>{hazard.what} {hazard.why}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    <strong>事故：</strong>{hazard.possibleAccident}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    <strong>先に：</strong>{hazard.firstAction}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    <strong>工学的対策：</strong>{hazard.engineeringControls.join("／")}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    <strong>管理的対策：</strong>{hazard.administrativeControls.join("／")}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    <strong>PPE：</strong>{hazard.ppe.join("／")}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    <strong>中止条件：</strong>{hazard.stopEscalationConditions.join("／")}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {showMorning ? (
          <section className="mt-5" aria-labelledby="morning-sheet-heading">
            <h2 id="morning-sheet-heading" className="text-xl font-black">
              朝礼用1枚：見つける・共有する・今日の行動を決める
            </h2>
            <div className="mt-3 grid grid-cols-[1.15fr_0.85fr] gap-4">
              <div>
                <div className="relative aspect-video overflow-hidden border-2 border-slate-950">
                  <Image
                    src={scenario.image.src}
                    alt={scenario.image.alt}
                    fill
                    priority
                    loading="eager"
                    sizes="120mm"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-xs leading-5">
                  問い: {scenario.facilitator.openingQuestion}
                </p>
              </div>
              <div className="space-y-2">
                {scenario.hazards.slice(0, 3).map((hazard, index) => (
                  <article key={hazard.id} className="break-inside-avoid border border-slate-700 p-2 text-xs leading-5">
                    <h3 className="font-black">
                      {index + 1}. {hazard.title}
                    </h3>
                    <p>{hazard.firstAction}</p>
                  </article>
                ))}
              </div>
            </div>
            <p className="mt-3 border-2 border-slate-950 p-3 text-sm font-bold leading-6">
              今日のまとめ: {scenario.facilitator.summary}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="min-h-14 border border-slate-700 p-2">
                今日、最初に行う対策:
              </div>
              <div className="min-h-14 border border-slate-700 p-2">
                作業中止条件・確認者:
              </div>
            </div>
          </section>
        ) : null}

        {showScript ? (
          <section className="mt-5" aria-labelledby="print-script-heading">
            <h2 id="print-script-heading" className="text-xl font-black">
              講師進行台本
            </h2>
            <ScriptBlock title="学習目標" items={scenario.facilitator.learningObjectives} />
            <ScriptBlock title="最初の問いかけ" items={[scenario.facilitator.openingQuestion]} />
            <ScriptBlock title="参加者への追加質問" items={scenario.facilitator.followUpQuestions} />
            <ScriptBlock title="回答を出すタイミング" items={[scenario.facilitator.revealCue]} />
            <ScriptBlock title="よくある誤答" items={scenario.facilitator.commonMistakes} />
            <ScriptBlock title="5分コース" items={scenario.facilitator.coursePlans.five} />
            <ScriptBlock title="10分コース" items={scenario.facilitator.coursePlans.ten} />
            <ScriptBlock title="15分コース" items={scenario.facilitator.coursePlans.fifteen} />
            <ScriptBlock title="まとめ" items={[scenario.facilitator.summary]} />
            <ScriptBlock
              title="関連法令"
              items={scenario.relatedLaws.map(
                (item) => `${item.label}（${item.locator}）`,
              )}
            />
            <ScriptBlock
              title="関連する事故参考例"
              items={scenario.relatedAccidents.map(
                (item) =>
                  `${item.label}（${item.id}。編集再構成した参考例で、公式個票そのものではなく、架空のKYT場面とも別）`,
              )}
            />
          </section>
        ) : null}

        <footer className="mt-6 border-t-2 border-slate-950 pt-3 text-[0.68rem] leading-5">
          <p>
            {scenario.syntheticDisclosure} サイト独自解説・未監修。法定教育記録、資格、修了証、現場承認を代替しません。
            KYへ転記する場合は、現場条件と一次資料を人が確認してください。
          </p>
          <p className="mt-1">
            出典: {scenario.officialSources.map((source) => `${source.organization}「${source.title}」（${source.locator}、URL確認日 ${source.checkedDate}）`).join("／")}
          </p>
          <p className="mt-1">
            画像権利: 本教材用に作成。出典・注意書き・画像権利表示を残す場合に限り社内複製・配布可。
            印刷用画面生成時点（JST）: {printTimestamp}
          </p>
        </footer>
      </article>
    </div>
  );
}

function ScriptBlock({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="mt-4 break-inside-avoid border border-slate-700 p-3">
      <h3 className="font-black">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
