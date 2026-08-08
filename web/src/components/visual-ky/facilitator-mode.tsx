"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Expand,
  FileText,
  Printer,
  Shuffle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { VisualKyScenario } from "@/data/visual-ky/schema";
import { trackVisualKyEvent } from "@/lib/visual-ky/analytics";
import { SafeQrButton } from "./safe-qr-button";

type CourseLength = "five" | "ten" | "fifteen";

const courseLabels: Record<CourseLength, string> = {
  five: "5分",
  ten: "10分",
  fifteen: "15分",
};

export function VisualKyFacilitatorMode({
  scenario,
  canonicalUrl,
  nextHref,
  randomHref,
}: {
  scenario: VisualKyScenario;
  canonicalUrl: string;
  nextHref: string;
  randomHref: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [courseLength, setCourseLength] = useState<CourseLength>("five");
  const [projectOnly, setProjectOnly] = useState(false);
  const [fullscreenStatus, setFullscreenStatus] = useState("");

  useEffect(() => {
    trackVisualKyEvent("visual_ky_facilitator_start", {
      scenarioId: scenario.id,
      category: scenario.category,
      difficulty: scenario.difficulty,
      ctaPosition: "facilitator",
      completionState: "started",
    });
  }, [scenario.category, scenario.difficulty, scenario.id]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (document.fullscreenElement !== containerRef.current) {
        setProjectOnly(false);
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
  }, []);

  async function enterFullscreen(problemOnly: boolean) {
    if (!containerRef.current?.requestFullscreen) {
      setProjectOnly(false);
      setFullscreenStatus(
        "このブラウザーでは全画面表示を開始できません。通常表示で続けられます。",
      );
      return;
    }
    setProjectOnly(problemOnly);
    try {
      await containerRef.current.requestFullscreen();
      setFullscreenStatus(
        problemOnly
          ? "問題投影モードを全画面で開始しました。"
          : "ファシリテーターモードを全画面で開始しました。",
      );
    } catch {
      setProjectOnly(false);
      setFullscreenStatus(
        "ブラウザーが全画面表示を開始できませんでした。通常表示で続けられます。",
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-950 text-white print:bg-white print:text-slate-950"
    >
      {!projectOnly ? (
        <header className="border-b border-slate-700 bg-slate-950 px-4 py-4 print:hidden sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.15em] text-teal-300 uppercase">
              Facilitator mode · {scenario.id}
            </p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">
              {scenario.shortTitle}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => enterFullscreen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-bold hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <Expand className="h-5 w-5" aria-hidden="true" />
              問題だけを投影
            </button>
            <button
              type="button"
              onClick={() => enterFullscreen(false)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-bold hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <Expand className="h-5 w-5" aria-hidden="true" />
              全画面
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-bold hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <Printer className="h-5 w-5" aria-hidden="true" />
              印刷
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-[1600px] text-xs text-slate-300" role="status">
          {fullscreenStatus}
        </p>
        </header>
      ) : null}

      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0">
        <section
          className={
            projectOnly
              ? "block"
              : "grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.6fr)] print:block"
          }
        >
          <div>
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 print:rounded-none print:border-slate-400">
              <Image
                src={scenario.image.src}
                alt={scenario.image.alt}
                fill
                priority
                loading="eager"
                sizes="(max-width: 1280px) 100vw, 70vw"
                className="object-cover"
              />
              {showAnswer
                ? scenario.hotspots.map((spot, index) => (
                    <span
                      key={spot.id}
                      className={`absolute inline-flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-sm font-black shadow-xl ${
                        spot.hazardId
                          ? "bg-rose-700 text-white"
                          : "bg-slate-900 text-white"
                      } forced-colors:border-[CanvasText]`}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    >
                      {index + 1}
                    </span>
                  ))
                : null}
            </div>
            <p className="mt-3 rounded-xl bg-slate-900 p-4 text-sm leading-7 text-slate-200 print:bg-white print:text-slate-950">
              <strong>画像の説明：</strong>
              {scenario.image.fullDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setShowAnswer((value) => !value)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 font-black text-slate-950 hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
              >
                {showAnswer ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
                {showAnswer ? "答えを隠す" : "答えを表示"}
              </button>
              <Link
                href={nextHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-bold hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
              >
                次の問題
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href={randomHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-bold hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
              >
                <Shuffle className="h-5 w-5" aria-hidden="true" />
                ランダム問題
              </Link>
              <Link
                href={`/training/visual-ky/${scenario.slug}/print`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-bold hover:border-teal-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
              >
                <FileText className="h-5 w-5" aria-hidden="true" />
                印刷用進行台本
              </Link>
            </div>

            {showAnswer ? (
              <section className="mt-6 rounded-2xl border border-teal-500 bg-slate-900 p-5 print:border-slate-400 print:bg-white">
                <h2 className="text-2xl font-black">危険源と優先対策</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {scenario.hazards.map((hazard, index) => (
                    <article key={hazard.id} className="rounded-xl bg-slate-800 p-4 print:border print:border-slate-300 print:bg-white">
                      <h3 className="font-black">
                        {index + 1}. {hazard.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-200 print:text-slate-950">
                        {hazard.what}
                      </p>
                      <p className="mt-2 text-sm font-bold leading-6 text-teal-200 print:text-slate-950">
                        先に: {hazard.firstAction}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {!projectOnly ? (
            <aside className="space-y-4 print:mt-6">
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 print:border-slate-400 print:bg-white">
                <h2 className="text-lg font-black">コース時間</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 print:hidden">
                  {(["five", "ten", "fifteen"] as const).map((length) => (
                    <button
                      key={length}
                      type="button"
                      aria-pressed={courseLength === length}
                      onClick={() => setCourseLength(length)}
                      className={`min-h-11 rounded-xl border px-3 py-2 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white ${
                        courseLength === length
                          ? "border-teal-300 bg-teal-400 text-slate-950"
                          : "border-slate-600"
                      }`}
                    >
                      {courseLabels[length]}
                    </button>
                  ))}
                </div>
                <ol className="mt-4 space-y-2 text-sm leading-6">
                  {scenario.facilitator.coursePlans[courseLength].map((item) => (
                    <li key={item} className="rounded-lg bg-slate-800 p-3 print:border print:border-slate-300 print:bg-white">
                      {item}
                    </li>
                  ))}
                </ol>
              </section>

              <FacilitatorPanel
                title="学習目標"
                items={scenario.facilitator.learningObjectives}
              />
              <FacilitatorPanel
                title="最初の問いかけ"
                items={[scenario.facilitator.openingQuestion]}
              />
              <FacilitatorPanel
                title="追加質問"
                items={scenario.facilitator.followUpQuestions}
              />
              <FacilitatorPanel
                title="回答を出すタイミング"
                items={[scenario.facilitator.revealCue]}
              />
              <FacilitatorPanel
                title="よくある誤答"
                items={scenario.facilitator.commonMistakes}
              />
              <FacilitatorPanel
                title="まとめ"
                items={[scenario.facilitator.summary]}
              />
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 print:border-slate-400 print:bg-white">
                <h2 className="text-lg font-black">関連法令</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200 print:text-slate-950">
                  {scenario.relatedLaws.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="inline-flex min-h-11 items-center font-bold text-teal-200 underline underline-offset-4 print:text-slate-950"
                      >
                        {item.label}（{item.locator}）
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 print:border-slate-400 print:bg-white">
                <h2 className="text-lg font-black">関連する事故参考例</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200 print:text-slate-950">
                  {scenario.relatedAccidents.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="inline-flex min-h-11 items-center font-bold text-teal-200 underline underline-offset-4 print:text-slate-950"
                      >
                        {item.label}（{item.id}）
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-5 text-slate-400 print:text-slate-700">
                  事故参考例は編集再構成で、公式個票そのものではありません。上の架空のKYT場面とも別です。
                </p>
              </section>
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 print:hidden">
                <h2 className="text-lg font-black">参加者へ共有</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  QRにはこの問題の公開URLだけを入れます。個人情報、query、token、進捗は含みません。
                </p>
                <div className="mt-4">
                  <SafeQrButton canonicalUrl={canonicalUrl} />
                </div>
              </section>
            </aside>
          ) : null}
        </section>

        {!projectOnly ? (
          <footer className="mt-8 border-t border-slate-700 pt-5 text-xs leading-5 text-slate-300 print:border-slate-400 print:text-slate-800">
            {scenario.syntheticDisclosure} 本資料は法定教育記録・資格・修了証ではありません。
            出典確認日 {scenario.reviewedDate}／画像権利: この教材用に作成／
            印刷時点はブラウザーの印刷情報で確認してください。
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function FacilitatorPanel({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 print:border-slate-400 print:bg-white">
      <h2 className="text-lg font-black">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-200 print:text-slate-950">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
