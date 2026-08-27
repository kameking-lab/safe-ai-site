"use client";

import Image from "next/image";
import {
  Captions,
  ChevronLeft,
  ChevronRight,
  Expand,
  List,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  TrainingSlide,
  TrainingClaim,
  TrainingSource,
} from "@/data/safety-seminars/types";

type SpeechStatus = "idle" | "playing" | "paused" | "unavailable";

const RATE_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

function sentenceAt(text: string, charIndex: number) {
  const chunks = text.match(/[^。！？]+[。！？]?/g) ?? [text];
  let cursor = 0;
  for (const chunk of chunks) {
    const next = cursor + chunk.length;
    if (charIndex <= next) return chunk.trim();
    cursor = next;
  }
  return chunks.at(-1)?.trim() ?? text;
}

export function SafetySeminarPlayer({
  slides,
  claims,
  sources,
  audioBasePath = "/training/safety-seminars/fall-prevention/audio",
  playerLabel = "音声付き安全研修スライド",
  transcriptId = "safety-seminar-transcript",
}: {
  slides: TrainingSlide[];
  claims: TrainingClaim[];
  sources: TrainingSource[];
  audioBasePath?: string;
  playerLabel?: string;
  transcriptId?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [audioFailed, setAudioFailed] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [caption, setCaption] = useState(slides[0]?.message ?? "");
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState<(typeof RATE_OPTIONS)[number]>(1);
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingSpeechRestartRef = useRef(false);
  const currentIndexRef = useRef(0);
  const statusRef = useRef<SpeechStatus>("idle");
  const slide = slides[currentIndex];

  const claimById = useMemo(
    () => new Map(claims.map((claim) => [claim.claimId, claim])),
    [claims],
  );
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.sourceId, source])),
    [sources],
  );
  const slideSources = useMemo(() => {
    const ids = new Set<string>();
    slide.claimIds.forEach((claimId) => {
      claimById.get(claimId)?.sourceIds.forEach((sourceId) => ids.add(sourceId));
    });
    return [...ids]
      .map((sourceId) => sourceById.get(sourceId))
      .filter((source): source is TrainingSource => Boolean(source));
  }, [claimById, slide.claimIds, sourceById]);

  useEffect(() => {
    statusRef.current = speechStatus;
  }, [speechStatus]);

  const cancelSpeech = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  const resetSlideState = useCallback(
    (next: number) => {
      currentIndexRef.current = next;
      setCurrentIndex(next);
      setCaption(slides[next]?.message ?? "");
      setSpeechProgress(0);
      setAudioFailed(false);
    },
    [slides],
  );

  const speakCurrent = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setSpeechStatus("unavailable");
      return;
    }
    cancelSpeech();
    const activeSlide = slides[currentIndexRef.current];
    const utterance = new SpeechSynthesisUtterance(activeSlide.narration);
    utterance.lang = "ja-JP";
    utterance.rate = rate;
    utterance.volume = muted ? 0 : volume;
    utterance.onboundary = (event) => {
      const index = Math.max(0, event.charIndex ?? 0);
      setSpeechProgress(Math.min(99, (index / activeSlide.narration.length) * 100));
      setCaption(sentenceAt(activeSlide.narration, index));
    };
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeechProgress(100);
      if (statusRef.current !== "playing") return;
      if (currentIndexRef.current < slides.length - 1) {
        resetSlideState(currentIndexRef.current + 1);
      } else {
        setSpeechStatus("idle");
      }
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeechStatus("idle");
    };
    utteranceRef.current = utterance;
    setCaption(sentenceAt(activeSlide.narration, 0));
    window.speechSynthesis.speak(utterance);
  }, [cancelSpeech, muted, rate, resetSlideState, slides, volume]);

  useEffect(() => {
    return () => cancelSpeech();
  }, [cancelSpeech]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioFailed) return;
    audio.playbackRate = rate;
    audio.volume = volume;
    audio.muted = muted;
    if (speechStatus === "playing") {
      void audio.play().catch(() => {
        setAudioFailed(true);
        speakCurrent();
      });
    }
  }, [audioFailed, currentIndex, muted, rate, speakCurrent, speechStatus, volume]);

  const play = useCallback(() => {
    if (!audioFailed && audioRef.current) {
      void audioRef.current.play().then(
        () => setSpeechStatus("playing"),
        () => {
          setAudioFailed(true);
          setSpeechStatus("playing");
          speakCurrent();
        },
      );
      return;
    }
    if (speechStatus === "paused" && typeof window !== "undefined") {
      window.speechSynthesis.resume();
      setSpeechStatus("playing");
      return;
    }
    setSpeechStatus("playing");
    speakCurrent();
  }, [audioFailed, speakCurrent, speechStatus]);

  const pause = useCallback(() => {
    if (!audioFailed && audioRef.current) {
      audioRef.current.pause();
      setSpeechStatus("paused");
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setSpeechStatus("paused");
    }
  }, [audioFailed]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    cancelSpeech();
    setSpeechProgress(0);
    setCaption(slide.message);
    setSpeechStatus("idle");
  }, [cancelSpeech, slide.message]);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(slides.length - 1, Math.max(0, index));
      audioRef.current?.pause();
      cancelSpeech();
      resetSlideState(next);
    },
    [cancelSpeech, resetSlideState, slides.length],
  );

  const restartForSetting = useCallback(
    (callback: () => void) => {
      const wasPlaying = statusRef.current === "playing";
      const wasPaused = statusRef.current === "paused";
      if (audioFailed && wasPlaying) pendingSpeechRestartRef.current = true;
      cancelSpeech();
      callback();
      if (audioFailed && wasPaused) setSpeechStatus("idle");
      else if (wasPlaying) setSpeechStatus("playing");
    },
    [audioFailed, cancelSpeech],
  );

  useEffect(() => {
    if (
      !pendingSpeechRestartRef.current ||
      !audioFailed ||
      speechStatus !== "playing"
    )
      return;
    pendingSpeechRestartRef.current = false;
    let active = true;
    queueMicrotask(() => {
      if (active) speakCurrent();
    });
    return () => {
      active = false;
    };
  }, [audioFailed, muted, rate, speakCurrent, speechStatus, volume]);

  const enterFullscreen = useCallback(async () => {
    if (playerRef.current?.requestFullscreen) await playerRef.current.requestFullscreen();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, a, input, select, summary, textarea, [contenteditable='true']")
      )
        return;
      if (event.key === "ArrowRight") goTo(currentIndexRef.current + 1);
      if (event.key === "ArrowLeft") goTo(currentIndexRef.current - 1);
      if (event.key === " ") {
        event.preventDefault();
        if (statusRef.current === "playing") pause();
        else play();
      }
      if (event.key.toLowerCase() === "m")
        restartForSetting(() => setMuted((value) => !value));
      if (event.key.toLowerCase() === "c") setCaptionsVisible((value) => !value);
      if (event.key.toLowerCase() === "f") void enterFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterFullscreen, goTo, pause, play, restartForSetting]);

  return (
    <section
      ref={playerRef}
      aria-labelledby="seminar-player-title"
      className="overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-950 text-white shadow-2xl print:border-0 print:shadow-none"
    >
      <h2 id="seminar-player-title" className="sr-only">
        {playerLabel}
      </h2>
      <div className="relative min-h-[680px] overflow-hidden bg-slate-950 p-5 sm:min-h-[620px] sm:p-8 lg:aspect-video lg:min-h-0 lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 10% 15%, #0f766e 0, transparent 30%), radial-gradient(circle at 88% 80%, #f97316 0, transparent 24%)",
          }}
        />
        <div className="relative flex h-full flex-col">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-300">
                {slide.kicker}
              </p>
              <p className="mt-1 inline-flex rounded-full border border-white/20 px-2 py-1 text-[11px] font-bold text-slate-200">
                {slide.label}
              </p>
            </div>
            <p className="font-mono text-sm text-slate-300">
              {String(slide.number).padStart(2, "0")} / {slides.length}
            </p>
          </header>
          <div className="mt-3 grid min-h-0 flex-1 items-center gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
            <div>
              <h3 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-5xl">
                {slide.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-200 sm:text-base lg:text-xl lg:leading-8">
                {slide.message}
              </p>
              {slide.body.length ? (
                <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-300 sm:text-sm">
                  {slide.body.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <SlideVisual slide={slide} />
          </div>
          <p className="mt-2 truncate text-[10px] text-slate-400">
            出典: {slideSources.map((source) => source.sourceId).join(" / ") || "サイト独自構成"}
          </p>
        </div>
      </div>

      {captionsVisible ? (
        <div
          role="status"
          aria-live="polite"
          className="border-y border-slate-700 bg-black/80 px-4 py-3 text-center text-sm font-bold leading-6 text-white"
        >
          {caption}
        </div>
      ) : null}

      <div className="space-y-4 bg-slate-900 p-4 sm:p-5">
        <audio
          ref={audioRef}
          preload="metadata"
          src={`${audioBasePath}/slide-${String(slide.number).padStart(2, "0")}.mp3`}
          onError={() => {
            setAudioFailed(true);
            if (
              typeof window === "undefined" ||
              !("speechSynthesis" in window) ||
              !("SpeechSynthesisUtterance" in window)
            ) {
              setSpeechStatus("unavailable");
            } else if (statusRef.current === "playing") {
              speakCurrent();
            }
          }}
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = rate;
            event.currentTarget.volume = volume;
            event.currentTarget.muted = muted;
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
            const progress = Math.min(100, (audio.currentTime / audio.duration) * 100);
            setSpeechProgress(progress);
            setCaption(
              sentenceAt(
                slide.narration,
                Math.floor((progress / 100) * slide.narration.length),
              ),
            );
          }}
          onEnded={() => {
            setSpeechProgress(100);
            if (currentIndexRef.current < slides.length - 1) {
              resetSlideState(currentIndexRef.current + 1);
            } else {
              setSpeechStatus("idle");
            }
          }}
        />
        <div className="flex items-center gap-3" aria-label="教材の進捗">
          <span className="w-14 text-xs font-bold text-slate-300">
            {currentIndex + 1}/{slides.length}
          </span>
          <div
            role="progressbar"
            aria-label="教材全体の進捗"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              ((currentIndex + speechProgress / 100) / slides.length) * 100,
            )}
            aria-valuetext={`${currentIndex + 1}枚目、スライド内${Math.round(speechProgress)}%`}
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700"
          >
            <div
              className="h-full bg-teal-400 transition-[width] motion-reduce:transition-none"
              style={{
                width: `${((currentIndex + speechProgress / 100) / slides.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ControlButton
            label="前のスライド"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            icon={ChevronLeft}
          />
          {speechStatus === "playing" ? (
            <ControlButton label="一時停止" onClick={pause} icon={Pause} primary />
          ) : (
            <ControlButton
              label={speechStatus === "paused" ? "再開" : "再生"}
              onClick={play}
              disabled={speechStatus === "unavailable"}
              icon={Play}
              primary
            />
          )}
          <ControlButton label="停止" onClick={stop} icon={RotateCcw} />
          <ControlButton
            label="次のスライド"
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === slides.length - 1}
            icon={ChevronRight}
          />
          <ControlButton
            label={muted ? "ミュート解除" : "ミュート"}
            onClick={() => restartForSetting(() => setMuted((value) => !value))}
            icon={muted ? VolumeX : Volume2}
          />
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-3 text-sm font-bold">
            音量
            <input
              aria-label="音量"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                restartForSetting(() => setVolume(next));
              }}
              className="w-20 accent-teal-400"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-3 text-sm font-bold">
            速度
            <select
              aria-label="再生速度"
              value={rate}
              onChange={(event) => {
                const next = Number(event.target.value) as (typeof RATE_OPTIONS)[number];
                restartForSetting(() => setRate(next));
              }}
              className="rounded bg-slate-950 px-2 py-1 text-white"
            >
              {RATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}倍
                </option>
              ))}
            </select>
          </label>
          <ControlButton
            label="字幕"
            onClick={() => setCaptionsVisible((value) => !value)}
            pressed={captionsVisible}
            icon={Captions}
          />
          <ControlButton
            label="スライド一覧"
            onClick={() => setListVisible((value) => !value)}
            pressed={listVisible}
            icon={List}
          />
          <ControlButton label="全画面" onClick={() => void enterFullscreen()} icon={Expand} />
        </div>
        {speechStatus === "unavailable" ? (
          <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-950">
            このブラウザーでは読み上げを利用できません。字幕と全文原稿をご利用ください。
          </p>
        ) : null}
        {audioFailed && speechStatus !== "unavailable" ? (
          <p className="text-xs text-amber-200">
            音声ファイルを取得できないため、ブラウザー読み上げへ切り替えました。
          </p>
        ) : null}
        <button
          type="button"
          className="min-h-11 text-sm font-bold text-teal-200 underline underline-offset-4"
          onClick={() => setTranscriptVisible((value) => !value)}
          aria-expanded={transcriptVisible}
          aria-controls={transcriptId}
        >
          {transcriptVisible ? "音声原稿を閉じる" : "音声原稿を読む"}
        </button>
        {transcriptVisible ? (
          <div
            id={transcriptId}
            role="region"
            aria-label={`${slide.number}枚目の音声原稿と講師向け補足`}
            tabIndex={0}
            className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-7 text-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
          >
            <p>{slide.narration}</p>
            <h4 className="mt-4 font-black text-white">講師向け補足</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {slide.instructorNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {listVisible ? (
          <ol className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {slides.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-current={index === currentIndex ? "step" : undefined}
                  className={`min-h-11 w-full rounded-xl border px-3 py-2 text-left text-sm font-bold ${
                    index === currentIndex
                      ? "border-teal-300 bg-teal-950 text-teal-100"
                      : "border-slate-700 bg-slate-950 text-slate-200"
                  }`}
                >
                  {item.number}. {item.title}
                </button>
              </li>
            ))}
          </ol>
        ) : null}
        <p className="text-xs text-slate-400">
          キーボード: Space 再生/一時停止、←/→ 移動、M ミュート、C 字幕、F 全画面
        </p>
      </div>
    </section>
  );
}

function ControlButton({
  label,
  onClick,
  icon: Icon,
  disabled,
  pressed,
  primary,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Play;
  disabled?: boolean;
  pressed?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "border-teal-300 bg-teal-300 text-slate-950 hover:bg-teal-200 dark:text-slate-950"
          : pressed
            ? "border-teal-300 bg-teal-950 text-teal-100"
            : "border-slate-600 bg-slate-950 text-white hover:bg-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className={primary ? "inline" : "sr-only sm:not-sr-only"}>{label}</span>
    </button>
  );
}

function SlideVisual({ slide }: { slide: TrainingSlide }) {
  const visual = slide.visual;
  if (visual.type === "image") {
    return (
      <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-white/20 bg-white/5">
        <Image
          src={visual.src}
          alt={visual.alt}
          fill
          sizes="(max-width: 1024px) 90vw, 44vw"
          loading={slide.number === 1 ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>
    );
  }
  if (visual.type === "ky") {
    return (
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-orange-400">
          <Image src={visual.image} alt={visual.alt} fill sizes="40vw" className="object-cover" />
        </div>
        <ol className="space-y-2 text-xs leading-5 sm:text-sm">
          {visual.prompts.map((prompt, index) => (
            <li key={prompt} className="rounded-xl bg-white/10 p-3">
              <span className="mr-2 font-black text-orange-300">{index + 1}</span>
              {prompt}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (visual.type === "metrics") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {visual.metrics.map((metric) => (
          <div key={`${metric.label}-${metric.value}`} className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs font-bold text-slate-300">{metric.label}</p>
            <p className="mt-2 text-3xl font-black text-teal-300 sm:text-4xl lg:text-5xl">{metric.value}</p>
            {metric.note ? <p className="mt-2 text-xs text-slate-300">{metric.note}</p> : null}
          </div>
        ))}
      </div>
    );
  }
  if (visual.type === "bars") {
    return (
      <div className="space-y-2 rounded-2xl border border-white/15 bg-white/5 p-4">
        {visual.bars.map((bar) => (
          <div key={bar.label} className="grid grid-cols-[6rem_1fr_3.8rem] items-center gap-2 text-xs sm:grid-cols-[8rem_1fr_4.5rem] sm:text-sm">
            <span className="break-words font-bold leading-4" title={bar.label}>{bar.label}</span>
            <div className="h-5 overflow-hidden rounded bg-slate-800">
              <div className="h-full rounded bg-teal-400" style={{ width: `${Math.max(3, (bar.value / visual.max) * 100)}%` }} />
            </div>
            <span className="text-right font-mono font-black">{bar.display}</span>
          </div>
        ))}
        <p className="pt-1 text-right text-[10px] text-slate-400">単位: {visual.unit}</p>
      </div>
    );
  }
  if (visual.type === "trend") {
    const maxInjuries = Math.max(...visual.points.map((point) => point.injuries));
    const minInjuries = Math.min(...visual.points.map((point) => point.injuries));
    const range = Math.max(1, maxInjuries - minInjuries);
    const coords = visual.points.map((point, index) => ({
      x: 30 + (index / (visual.points.length - 1)) * 340,
      y: 160 - ((point.injuries - minInjuries) / range) * 110,
      ...point,
    }));
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
        <svg viewBox="0 0 400 200" role="img" aria-label={`2016年から2025年までの建設業における墜落・転落の休業4日以上死傷者数の推移。縦軸は${minInjuries.toLocaleString()}人から${maxInjuries.toLocaleString()}人の非ゼロ起点`} className="w-full">
          <line x1="30" y1="50" x2="370" y2="50" stroke="#475569" strokeDasharray="4 4" />
          <line x1="30" y1="160" x2="370" y2="160" stroke="#64748b" />
          <text x="26" y="54" textAnchor="end" fill="#cbd5e1" fontSize="10">{maxInjuries.toLocaleString()}</text>
          <text x="26" y="164" textAnchor="end" fill="#cbd5e1" fontSize="10">{minInjuries.toLocaleString()}</text>
          <polyline fill="none" stroke="#2dd4bf" strokeWidth="5" strokeLinejoin="round" points={coords.map((point) => `${point.x},${point.y}`).join(" ")} />
          {coords.map((point, index) => (
            <g key={point.year}>
              <circle cx={point.x} cy={point.y} r="5" fill="#fb923c" />
              {(index === 0 || index === coords.length - 1) ? <text x={point.x} y={point.y - 12} textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{point.injuries.toLocaleString()}</text> : null}
              <text x={point.x} y="181" textAnchor="middle" fill="#cbd5e1" fontSize="10">{String(point.year).slice(2)}</text>
            </g>
          ))}
        </svg>
        <p className="text-center text-xs text-slate-300">縦軸は非ゼロ起点（{minInjuries.toLocaleString()}〜{maxInjuries.toLocaleString()}人）・休業4日以上死傷・全国確定値・COVID-19罹患災害除外</p>
      </div>
    );
  }
  if (visual.type === "steps") {
    return (
      <ol className="space-y-2">
        {visual.steps.map((step, index) => (
          <li key={step.label} className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-2xl border border-white/15 bg-white/10 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-300 font-black text-slate-950">{index + 1}</span>
            <span><strong className="block text-base">{step.label}</strong><span className="text-xs leading-5 text-slate-300">{step.detail}</span></span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {visual.items.map((item) => (
        <li key={item} className="flex gap-2 rounded-xl border border-white/15 bg-white/10 p-3 text-sm leading-5">
          <span className="font-black text-teal-300" aria-hidden="true">✓</span>{item}
        </li>
      ))}
    </ul>
  );
}
