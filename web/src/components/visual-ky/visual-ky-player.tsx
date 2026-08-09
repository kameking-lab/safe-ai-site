"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  FileText,
  Focus,
  RotateCcw,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { VisualKyScenario } from "@/data/visual-ky/schema";
import { getVisualKyCategory } from "@/data/visual-ky/categories";
import { trackVisualKyEvent } from "@/lib/visual-ky/analytics";
import { MascotGuide } from "@/components/mascot-guide";
import { KyHandoffLink } from "@/components/ky-handoff-link";

type PlayerPhase = "observe" | "select" | "explain" | "measures" | "summary";

const PHASES: readonly { id: PlayerPhase; label: string }[] = [
  { id: "observe", label: "見る" },
  { id: "select", label: "危険を選ぶ" },
  { id: "explain", label: "解説" },
  { id: "measures", label: "対策" },
  { id: "summary", label: "まとめ" },
] as const;

const hierarchyLabels = {
  elimination: "除去",
  substitution: "代替",
  engineering: "工学的対策",
  administrative: "管理的対策",
  ppe: "PPE",
} as const;

const PAN_CONTROLS = [
  { label: "左へ移動", icon: ArrowLeft, dx: -8, dy: 0 },
  { label: "上へ移動", icon: ArrowUp, dx: 0, dy: -8 },
  { label: "下へ移動", icon: ArrowDown, dx: 0, dy: 8 },
  { label: "右へ移動", icon: ArrowRight, dx: 8, dy: 0 },
] as const;

const ACTION_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-bold text-slate-900 hover:border-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-teal-400 dark:hover:text-teal-100 forced-colors:border-[LinkText]";

const subscribeToClientReady = () => () => {};

export function VisualKyPlayer({
  scenario,
  nextHref,
  priority = false,
}: {
  scenario: VisualKyScenario;
  nextHref: string;
  priority?: boolean;
}) {
  const [phase, setPhase] = useState<PlayerPhase>("observe");
  const [selectedHotspots, setSelectedHotspots] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedMeasures, setSelectedMeasures] = useState<Set<string>>(
    () => new Set(),
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageFailed, setImageFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [noHazardAcknowledged, setNoHazardAcknowledged] = useState(false);
  const [noMeasureAcknowledged, setNoMeasureAcknowledged] = useState(false);
  const isInteractive = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );
  const explanationHeadingRef = useRef<HTMLHeadingElement>(null);
  const category = getVisualKyCategory(scenario.category);
  const selectedHazardCount = useMemo(
    () =>
      scenario.hotspots.filter(
        (spot) =>
          spot.hazardId !== null && selectedHotspots.has(spot.id),
      ).length,
    [scenario.hotspots, selectedHotspots],
  );
  const sourceById = useMemo(
    () =>
      new Map(
        scenario.officialSources.map((source) => [source.id, source]),
      ),
    [scenario.officialSources],
  );
  const selectedMeasureOptions = useMemo(
    () =>
      scenario.countermeasureOptions.filter((option) =>
        selectedMeasures.has(option.id),
      ),
    [scenario.countermeasureOptions, selectedMeasures],
  );
  const selectedHazardDrafts = useMemo(() => {
    const byId = new Map(scenario.hazards.map((hazard) => [hazard.id, hazard]));
    return scenario.hotspots.flatMap((hotspot) => {
      if (!selectedHotspots.has(hotspot.id) || !hotspot.hazardId) return [];
      const hazard = byId.get(hotspot.hazardId);
      return hazard ? [{ id: hazard.id, title: hazard.title }] : [];
    });
  }, [scenario.hazards, scenario.hotspots, selectedHotspots]);

  useEffect(() => {
    trackVisualKyEvent("visual_ky_view", {
      scenarioId: scenario.id,
      category: scenario.category,
      difficulty: scenario.difficulty,
      ctaPosition: "scenario",
    });
  }, [scenario.category, scenario.difficulty, scenario.id]);

  function markStarted() {
    if (started) return;
    setStarted(true);
    trackVisualKyEvent("visual_ky_start", {
      scenarioId: scenario.id,
      category: scenario.category,
      difficulty: scenario.difficulty,
      ctaPosition: "player",
      completionState: "started",
    });
  }

  function selectHotspot(hotspotId: string) {
    markStarted();
    setSelectedHotspots((current) => {
      const next = new Set(current);
      if (next.has(hotspotId)) next.delete(hotspotId);
      else next.add(hotspotId);
      if (next.size > 0) setNoHazardAcknowledged(false);
      trackVisualKyEvent("visual_ky_hazard_select", {
        scenarioId: scenario.id,
        category: scenario.category,
        difficulty: scenario.difficulty,
        completionState: "started",
        answerCount: next.size,
      });
      return next;
    });
  }

  function revealAnswer() {
    if (selectedHotspots.size === 0 && !noHazardAcknowledged) return;
    markStarted();
    setPhase("explain");
    trackVisualKyEvent("visual_ky_answer_reveal", {
      scenarioId: scenario.id,
      category: scenario.category,
      difficulty: scenario.difficulty,
      completionState: "revealed",
      answerCount: selectedHazardCount,
    });
    window.setTimeout(() => explanationHeadingRef.current?.focus(), 0);
  }

  function completeTraining() {
    if (selectedMeasures.size === 0 && !noMeasureAcknowledged) return;
    setPhase("summary");
    trackVisualKyEvent("visual_ky_complete", {
      scenarioId: scenario.id,
      category: scenario.category,
      difficulty: scenario.difficulty,
      completionState: "completed",
      answerCount: selectedHazardCount,
    });
  }

  function movePan(dx: number, dy: number) {
    setPan((current) => ({
      x: Math.max(-35, Math.min(35, current.x + dx)),
      y: Math.max(-35, Math.min(35, current.y + dy)),
    }));
  }

  const stepIndex = PHASES.findIndex((item) => item.id === phase);

  return (
    <section
      aria-labelledby="visual-ky-player-heading"
      data-visual-ky-ready={isInteractive ? "true" : "false"}
      className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-slate-700 uppercase dark:text-slate-200">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {scenario.id} · {category.label}
          </p>
          <h2
            id="visual-ky-player-heading"
            className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
          >
            {scenario.title}
          </h2>
        </div>
        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {scenario.estimatedMinutes}分 · {scenario.difficulty}
        </span>
      </div>

      <ol
        aria-label="学習の進み具合"
        className="mt-5 grid grid-cols-5 gap-1 text-center text-[0.7rem] font-bold sm:text-xs"
      >
        {PHASES.map((item, index) => (
          <li
            key={item.id}
            aria-current={item.id === phase ? "step" : undefined}
            className={`rounded-lg border px-1 py-2 ${
              index <= stepIndex
                ? "border-teal-700 bg-teal-700 text-white forced-colors:border-[Highlight] forced-colors:bg-[Highlight]"
                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            }`}
          >
            <span className="sr-only">手順{index + 1}: </span>
            {item.label}
          </li>
        ))}
      </ol>

      {phase === "observe" ? (
        <div className="mt-6 rounded-2xl border-2 border-teal-200 bg-teal-50 p-5 dark:border-teal-900 dark:bg-teal-950/30">
          <div className="flex items-start gap-3">
            <Eye className="mt-1 h-6 w-6 shrink-0 text-teal-800 dark:text-teal-300" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">
                まず30秒、場面全体を見ます
              </h3>
              <p className="mt-2 leading-7 text-slate-700 dark:text-slate-200">
                「何が危険か」「なぜ事故につながるか」「最初に何を止めるか」を考えてください。
                全部見つけなくても完了できます。
              </p>
              <button
                type="button"
                disabled={!isInteractive}
                onClick={() => {
                  markStarted();
                  setPhase("select");
                }}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-bold text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
              >
                イラストから危険を探す
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p id="image-control-help" className="text-sm font-bold text-slate-700 dark:text-slate-200">
            拡大 {Math.round(zoom * 100)}%（画像操作は解答に影響しません）
          </p>
          <div className="flex flex-wrap gap-2" aria-label="画像の拡大・移動">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
              aria-label="画像を拡大"
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, zoom - 0.25);
                setZoom(next);
                if (next === 1) setPan({ x: 0, y: 0 });
              }}
              aria-label="画像を縮小"
              disabled={zoom === 1}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <ZoomOut className="h-5 w-5" aria-hidden="true" />
            </button>
            {PAN_CONTROLS.map(({ label, icon: Icon, dx, dy }) => (
              <button
                key={label}
                type="button"
                onClick={() => movePan(dx, dy)}
                aria-label={label}
                disabled={zoom === 1}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              aria-label="画像表示をリセット"
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900"
          aria-describedby="visual-ky-scene-description image-control-help"
        >
          {imageFailed ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
              <div>
                <ShieldAlert className="mx-auto h-10 w-10" aria-hidden="true" />
                <p className="mt-3 font-black">画像を読み込めませんでした</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                  下の「画像を見ないで学ぶ」に同じ場面説明と全解説があります。
                </p>
              </div>
            </div>
          ) : (
            <div
              className="absolute inset-0 transition-transform motion-reduce:transition-none"
              style={{
                transform: `translate(${pan.x}%, ${pan.y}%) scale(${zoom})`,
              }}
            >
              <Image
                src={scenario.image.src}
                alt={scenario.image.alt}
                fill
                priority={priority}
                loading={priority ? "eager" : "lazy"}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1120px"
                className="object-cover"
                onError={() => setImageFailed(true)}
              />
              {phase !== "observe"
                ? scenario.hotspots.map((hotspot, index) => {
                    const selected = selectedHotspots.has(hotspot.id);
                    const revealed = phase === "explain" || phase === "measures" || phase === "summary";
                    const correct = hotspot.hazardId !== null;
                    return (
                      <button
                        key={hotspot.id}
                        type="button"
                        onClick={() => selectHotspot(hotspot.id)}
                        disabled={phase !== "select"}
                        aria-pressed={selected}
                        aria-label={`候補${index + 1}: ${hotspot.label}${selected ? "、選択済み" : ""}`}
                        className={`absolute inline-flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] text-sm font-black shadow-lg disabled:cursor-default focus-visible:z-20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 ${
                          revealed
                            ? correct
                              ? "border-white bg-rose-700 text-white"
                              : "border-white bg-slate-800 text-white"
                            : selected
                              ? "border-white bg-teal-800 text-white"
                              : "border-white bg-slate-950/70 text-white"
                        } forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]`}
                        style={{
                          left: `clamp(1.375rem, ${hotspot.x}%, calc(100% - 1.375rem))`,
                          top: `clamp(1.375rem, ${hotspot.y}%, calc(100% - 1.375rem))`,
                          width: `${Math.max(44, hotspot.radius * 9)}px`,
                          height: `${Math.max(44, hotspot.radius * 9)}px`,
                        }}
                      >
                        {revealed && correct ? (
                          <Check className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                        <span className="sr-only">
                          {revealed
                            ? correct
                              ? "、危険箇所"
                              : "、この場面では直ちに危険とはしていない箇所"
                            : ""}
                        </span>
                      </button>
                    );
                  })
                : null}
            </div>
          )}
        </div>
        <p
          id="visual-ky-scene-description"
          className="mt-3 rounded-xl bg-slate-100 p-4 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <strong>画像の詳しい説明：</strong>
          {scenario.image.fullDescription}
        </p>
      </div>

      {phase === "select" ? (
        <section aria-labelledby="hotspot-list-heading" className="mt-6">
          <div className="flex items-center gap-2">
            <Focus className="h-5 w-5 text-teal-800 dark:text-teal-300" aria-hidden="true" />
            <h3 id="hotspot-list-heading" className="text-lg font-black text-slate-950 dark:text-white">
              危険と思う候補を選ぶ
            </h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            画像の丸印または下の一覧を選べます。見え方にかかわらず同じ操作と情報を利用できます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {scenario.hotspots.map((hotspot, index) => {
              const selected = selectedHotspots.has(hotspot.id);
              return (
                <button
                  key={hotspot.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectHotspot(hotspot.id)}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border-2 p-3 text-left font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 ${
                    selected
                      ? "border-teal-800 bg-teal-50 text-teal-950 dark:bg-teal-950 dark:text-teal-50"
                      : "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  } forced-colors:border-[ButtonText]`}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-current">
                    {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </span>
                  {hotspot.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200" aria-live="polite">
            {selectedHotspots.size}か所を選択中。確信がなくても解説へ進めます。
          </p>
          {selectedHotspots.size === 0 ? (
            <label className="mt-3 flex min-h-11 items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">
              <input
                type="checkbox"
                checked={noHazardAcknowledged}
                onChange={(event) =>
                  setNoHazardAcknowledged(event.target.checked)
                }
                className="mt-0.5 h-6 w-6 shrink-0 accent-amber-700"
              />
              危険なしと判断して解説へ進む（解説で見落としを再確認します）
            </label>
          ) : null}
          <button
            type="button"
            onClick={revealAnswer}
            disabled={selectedHotspots.size === 0 && !noHazardAcknowledged}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 py-3 font-black text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300 sm:w-auto"
          >
            予想を確定して解説を見る
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {phase === "explain" || phase === "measures" || phase === "summary" ? (
        <section className="mt-8" aria-labelledby="answer-heading">
          <h3
            id="answer-heading"
            ref={explanationHeadingRef}
            tabIndex={-1}
            className="text-2xl font-black text-slate-950 outline-none dark:text-white"
          >
            危険と優先対策の解説
          </h3>
          <p className="mt-3 rounded-xl border border-teal-300 bg-teal-50 p-4 leading-7 text-teal-950 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-50">
            {scenario.answerExplanation}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            あなたは危険{scenario.hazards.length}件のうち
            {selectedHazardCount}件に対応する候補を選びました。見逃しは責めず、次の行動へつなげます。
          </p>
          <div className="mt-5 space-y-4">
            {scenario.hazards.map((hazard, index) => {
              const hazardSources = hazard.sourceIds
                .map((sourceId) => sourceById.get(sourceId))
                .filter((source) => source !== undefined);
              return (
                <article
                  key={hazard.id}
                  className="rounded-2xl border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                <h4 className="text-lg font-black text-slate-950 dark:text-white">
                  {index + 1}. {hazard.title}
                </h4>
                <dl className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-2">
                  <div>
                    <dt className="font-black text-rose-800 dark:text-rose-300">何が危険か</dt>
                    <dd>{hazard.what}</dd>
                  </div>
                  <div>
                    <dt className="font-black text-rose-800 dark:text-rose-300">なぜ危険か</dt>
                    <dd>{hazard.why}</dd>
                  </div>
                  <div>
                    <dt className="font-black text-rose-800 dark:text-rose-300">つながる事故</dt>
                    <dd>{hazard.possibleAccident}</dd>
                  </div>
                  <div>
                    <dt className="font-black text-teal-800 dark:text-teal-300">先に行う対策</dt>
                    <dd>{hazard.firstAction}</dd>
                  </div>
                </dl>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {[
                    ["工学的対策", hazard.engineeringControls],
                    ["管理的対策", hazard.administrativeControls],
                    ["PPE", hazard.ppe],
                  ].map(([label, items]) => (
                    <div key={String(label)} className="rounded-xl bg-white p-4 dark:bg-slate-950">
                      <p className="font-black text-slate-950 dark:text-white">{String(label)}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                        {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
                  <p className="font-black text-amber-950 dark:text-amber-100">
                    作業中止・エスカレーション
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-950 dark:text-amber-50">
                    {hazard.stopEscalationConditions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    この危険の一次資料
                  </p>
                  <ul className="mt-2 space-y-3 text-xs leading-5 text-slate-700 dark:text-slate-300">
                    {hazardSources.map((source) => (
                      <li key={source.id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sky-800 underline dark:text-sky-300"
                        >
                          {source.organization}「{source.title}」
                        </a>
                        <span className="block">該当箇所: {source.locator}</span>
                        <span className="block">
                          適用範囲: {source.applicableScope}
                        </span>
                        <span className="block">
                          URL確認日:{" "}
                          <time dateTime={source.checkedDate}>
                            {source.checkedDate}
                          </time>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    サイト独自解説（未監修）。現場条件と資料の適用を人が確認してください。
                  </p>
                </div>
              </article>
              );
            })}
          </div>
          <aside className="mt-5 rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <h4 className="font-black text-slate-950 dark:text-white">
              選択肢{scenario.hotspots.findIndex((item) => item.id === scenario.distractor.hotspotId) + 1}について
            </h4>
            <p className="mt-2 text-sm leading-6">{scenario.distractor.explanation}</p>
          </aside>
          {phase === "explain" ? (
            <button
              type="button"
              onClick={() => setPhase("measures")}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-black text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 sm:w-auto"
            >
              対策を選ぶ
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </section>
      ) : null}

      {phase === "measures" ? (
        <section className="mt-8" aria-labelledby="measure-heading">
          <h3 id="measure-heading" className="text-xl font-black text-slate-950 dark:text-white">
            現場で先に行う対策を選ぶ
          </h3>
          <p className="mt-2 leading-7 text-slate-700 dark:text-slate-200">
            PPEや注意だけに頼らず、危険源の除去・設備対策を先に検討します。複数選択できます。
          </p>
          <fieldset className="mt-4 grid gap-3">
            <legend className="sr-only">対策候補</legend>
            {scenario.countermeasureOptions.map((measure) => {
              const selected = selectedMeasures.has(measure.id);
              return (
                <label
                  key={measure.id}
                  className={`flex min-h-11 cursor-pointer gap-3 rounded-xl border-2 p-4 ${
                    selected
                      ? "border-teal-800 bg-teal-50 dark:bg-teal-950/40"
                      : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      setSelectedMeasures((current) => {
                        const next = new Set(current);
                        if (next.has(measure.id)) next.delete(measure.id);
                        else next.add(measure.id);
                        if (next.size > 0) setNoMeasureAcknowledged(false);
                        return next;
                      })
                    }
                    className="mt-0.5 h-6 w-6 shrink-0 accent-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
                  />
                  <span>
                    <span className="font-black text-slate-950 dark:text-white">
                      {measure.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {hierarchyLabels[measure.hierarchy]} · {measure.rationale}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          {selectedMeasures.size === 0 ? (
            <label className="mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">
              <input
                type="checkbox"
                checked={noMeasureAcknowledged}
                onChange={(event) =>
                  setNoMeasureAcknowledged(event.target.checked)
                }
                className="mt-0.5 h-6 w-6 shrink-0 accent-amber-700"
              />
              対策をまだ選べないため、未選択として記録し優先候補を解説で確認する
            </label>
          ) : null}
          <button
            type="button"
            onClick={completeTraining}
            disabled={selectedMeasures.size === 0 && !noMeasureAcknowledged}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-black text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 sm:w-auto"
          >
            まとめへ進む
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {phase === "summary" ? (
        <section className="mt-8" aria-labelledby="summary-heading">
          <h3 id="summary-heading" className="sr-only">
            5分KYTを完了しました
          </h3>
          <MascotGuide
            variant="success"
            title="5分KYTを完了しました"
            message={
              <>
                <p>
                  見つけた数より、作業中止条件と優先対策を現場で確かめることが大切です。法定教育・正式な修了証・現場承認は代替しません。
                </p>
                <p className="mt-2 font-bold" role="status">
                  この画面での選択や完了状態は保存・送信しません。
                </p>
              </>
            }
            action={
              <Link
                href={nextHref}
                prefetch={false}
                className="portal-button-primary"
                onClick={() =>
                  trackVisualKyEvent("visual_ky_next_action", {
                    scenarioId: scenario.id,
                    category: scenario.category,
                    difficulty: scenario.difficulty,
                    ctaPosition: "next",
                    completionState: "completed",
                  })
                }
              >
                次の問題へ
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          <section
            className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
            aria-labelledby="measure-feedback-heading"
          >
            <h4
              id="measure-feedback-heading"
              className="text-lg font-black text-slate-950 dark:text-white"
            >
              選んだ対策の振り返り
            </h4>
            {selectedMeasureOptions.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                対策未選択として明示確認しました。下の優先候補を、設備・作業方法・現場条件に合わせて人が確認してください。
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {selectedMeasureOptions.map((option) => (
                  <li
                    key={option.id}
                    className="rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <p className="font-black text-slate-950 dark:text-white">
                      {option.recommended ? "優先候補" : "見直し候補"}：{option.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {option.rationale}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm font-black text-teal-950 dark:text-teal-100">
              この問題の優先候補
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {scenario.countermeasureOptions
                .filter((option) => option.recommended)
                .map((option) => (
                  <li key={option.id}>
                    {option.label}（{hierarchyLabels[option.hierarchy]}）
                  </li>
                ))}
            </ul>
          </section>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <KyHandoffLink
              handoff={{
                source: "visual-kyt",
                scenarioId: scenario.id,
                workCategory: scenario.industry.includes("建設業")
                  ? "construction"
                  : scenario.industry.includes("製造業")
                    ? "manufacturing"
                    : scenario.industry.includes("運輸交通業")
                      ? "transport"
                      : scenario.industry.includes("化学工業")
                        ? "chemical"
                        : "unknown",
                workDraft: scenario.shortTitle,
                hazardDrafts: selectedHazardDrafts,
                measureDrafts: selectedMeasureOptions.map((option) => ({
                  id: option.id,
                  text: option.label,
                  level:
                    option.hierarchy === "substitution"
                      ? "elimination"
                      : option.hierarchy,
                })),
              }}
              className={ACTION_LINK_CLASS}
              onClick={() => {
                trackVisualKyEvent("visual_ky_next_action", {
                  scenarioId: scenario.id,
                  category: scenario.category,
                  difficulty: scenario.difficulty,
                  ctaPosition: "ky_prefill",
                  completionState: "completed",
                });
              }}
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
                この問題でKYを作る
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </KyHandoffLink>
            <ActionLink
              href={`/training/visual-ky/${scenario.slug}/print`}
              label="朝礼用に印刷する"
              icon={FileText}
              onClick={() => trackVisualKyEvent("visual_ky_print", {
                scenarioId: scenario.id,
                category: scenario.category,
                difficulty: scenario.difficulty,
                ctaPosition: "summary",
                completionState: "completed",
              })}
            />
          </div>
          <details className="mt-3 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">その他の操作</summary>
            <div className="grid gap-3 border-t border-slate-200 py-3 sm:grid-cols-3 dark:border-slate-700">
              <ActionLink
                href={scenario.relatedAccidents[0].href}
                label="関連する事故を見る"
                icon={ShieldAlert}
                onClick={() => trackVisualKyEvent("visual_ky_next_action", {
                  scenarioId: scenario.id,
                  category: scenario.category,
                  difficulty: scenario.difficulty,
                  ctaPosition: "accident",
                  completionState: "completed",
                })}
              />
              <ActionLink
                href={scenario.relatedLaws[0].href}
                label="関連法令を見る"
                icon={CircleHelp}
                onClick={() => trackVisualKyEvent("visual_ky_next_action", {
                  scenarioId: scenario.id,
                  category: scenario.category,
                  difficulty: scenario.difficulty,
                  ctaPosition: "law",
                  completionState: "completed",
                })}
              />
              <ActionLink
                href="/education-certification/finder"
                label="必要資格を確認する"
                icon={Check}
                onClick={() => trackVisualKyEvent("visual_ky_next_action", {
                  scenarioId: scenario.id,
                  category: scenario.category,
                  difficulty: scenario.difficulty,
                  ctaPosition: "qualification",
                  completionState: "completed",
                })}
              />
            </div>
          </details>
        </section>
      ) : null}
      <details className="mt-5 rounded-xl border border-slate-300 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">教材について</summary>
        <p className="border-t border-slate-200 py-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:text-slate-200">
          {scenario.syntheticDisclosure}
        </p>
      </details>
    </section>
  );
}

function ActionLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof ChevronRight;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={ACTION_LINK_CLASS}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
