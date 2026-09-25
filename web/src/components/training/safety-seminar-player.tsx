"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  List,
  Pause,
  Play,
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
type VoiceMode = "recorded" | "device-primary" | "device-secondary";


function deviceVoice(voices: SpeechSynthesisVoice[], mode: VoiceMode) {
  const japanese = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
  return mode === "device-secondary" ? japanese[1] ?? japanese[0] : japanese[0];
}

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

function sourceLabel(source: TrainingSource) {
  if (source.sourceId === "GUIDE-MHLW-OSHMS") return "厚労省 OSHMS指針";
  if (source.sourceId === "GUIDE-MHLW-RA") return "厚労省 RA指針";
  if (source.sourceId === "LAW-R7-33-AMENDMENT") return "厚労省 令和7年改正法";
  if (source.sourceId === "LAW-MHLW-OSH") return "e-Gov 労働安全衛生法";
  return source.publisher;
}

export function SafetySeminarPlayer({
  slides,
  claims,
  sources,
  audioBasePath = "/training/safety-seminars/fall-prevention/audio",
  playerLabel,
  transcriptId = "safety-seminar-transcript",
  sourcesAnchorId = "sources-title",
  audioEnabled = true,
}: {
  slides: TrainingSlide[];
  claims: TrainingClaim[];
  sources: TrainingSource[];
  audioBasePath?: string;
  playerLabel?: string;
  transcriptId?: string;
  sourcesAnchorId?: string;
  audioEnabled?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [audioFailed, setAudioFailed] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [caption, setCaption] = useState(slides[0]?.message ?? "");
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [muted] = useState(false);
  const [volume] = useState(1);
  const [rate] = useState(1);
  const [voiceMode] = useState<VoiceMode>("recorded");
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingSpeechRestartRef = useRef(false);
  const currentIndexRef = useRef(0);
  const statusRef = useRef<SpeechStatus>("idle");
  const slide = slides[currentIndex];
  const useRecordedAudio = voiceMode === "recorded" && !audioFailed;

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
  const slideEvidenceLinks = useMemo(() => {
    const articleLinks = (slide.articleRefs ?? []).slice(0, 2).map((ref) => ({
      href: ref.article.includes("の") && ref.naviPath ? ref.naviPath : ref.egovUrl,
      label: `${ref.lawShort} ${ref.article}`,
      external: !(ref.article.includes("の") && ref.naviPath),
    }));
    if (articleLinks.length > 0) return articleLinks;
    return slideSources.slice(0, 2).map((source) => ({
      href: source.url,
      label: sourceLabel(source),
      external: true,
    }));
  }, [slide.articleRefs, slideSources]);

  useEffect(() => {
    statusRef.current = speechStatus;
  }, [speechStatus]);

  useEffect(() => {
    if (!audioEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (typeof window.speechSynthesis.getVoices !== "function") return;
    const updateVoices = () => setDeviceVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", updateVoices);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", updateVoices);
  }, [audioEnabled]);

  const cancelSpeech = useCallback(() => {
    if (!audioEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, [audioEnabled]);

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
    if (!audioEnabled) return;
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
    if (voiceMode !== "recorded") {
      const selectedVoice = deviceVoice(deviceVoices, voiceMode);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    utterance.rate = rate;
    utterance.volume = muted ? 0 : volume;
    utterance.onboundary = (event) => {
      if (utteranceRef.current !== utterance) return;
      const index = Math.max(0, event.charIndex ?? 0);
      setSpeechProgress(Math.min(99, (index / activeSlide.narration.length) * 100));
      setCaption(sentenceAt(activeSlide.narration, index));
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeechProgress(100);
      if (statusRef.current !== "playing") return;
      if (currentIndexRef.current < slides.length - 1) {
        if (voiceMode !== "recorded") pendingSpeechRestartRef.current = true;
        resetSlideState(currentIndexRef.current + 1);
      } else {
        setSpeechStatus("idle");
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeechStatus("idle");
    };
    utteranceRef.current = utterance;
    setCaption(sentenceAt(activeSlide.narration, 0));
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled, cancelSpeech, deviceVoices, muted, rate, resetSlideState, slides, voiceMode, volume]);

  useEffect(() => {
    if (!audioEnabled) return;
    return () => cancelSpeech();
  }, [audioEnabled, cancelSpeech]);

  useEffect(() => {
    if (!audioEnabled) return;
    const audio = audioRef.current;
    if (!audio || !useRecordedAudio) return;
    audio.playbackRate = rate;
    audio.volume = volume;
    audio.muted = muted;
    if (speechStatus === "playing") {
      void audio.play().catch(() => {
        setAudioFailed(true);
        speakCurrent();
      });
    }
  }, [audioEnabled, currentIndex, muted, rate, speakCurrent, speechStatus, useRecordedAudio, volume]);

  const play = useCallback(() => {
    if (!audioEnabled) return;
    if (useRecordedAudio && audioRef.current) {
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
  }, [audioEnabled, speakCurrent, speechStatus, useRecordedAudio]);

  const pause = useCallback(() => {
    if (!audioEnabled) return;
    if (useRecordedAudio && audioRef.current) {
      audioRef.current.pause();
      setSpeechStatus("paused");
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setSpeechStatus("paused");
    }
  }, [audioEnabled, useRecordedAudio]);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(slides.length - 1, Math.max(0, index));
      if (audioEnabled) {
        const wasPlaying = statusRef.current === "playing";
        const wasPaused = statusRef.current === "paused";
        audioRef.current?.pause();
        cancelSpeech();
        pendingSpeechRestartRef.current = voiceMode !== "recorded" && wasPlaying;
        if (voiceMode !== "recorded" && wasPaused) setSpeechStatus("idle");
      }
      resetSlideState(next);
    },
    [audioEnabled, cancelSpeech, resetSlideState, slides.length, voiceMode],
  );

  useEffect(() => {
    if (!audioEnabled) return;
    if (
      !pendingSpeechRestartRef.current ||
      useRecordedAudio ||
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
  }, [audioEnabled, currentIndex, muted, rate, speakCurrent, speechStatus, useRecordedAudio, voiceMode, volume]);

  const enterFullscreen = useCallback(async () => {
    if (playerRef.current?.requestFullscreen) await playerRef.current.requestFullscreen();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (!audioEnabled) {
        const insidePlayer = target instanceof Node && Boolean(playerRef.current?.contains(target));
        if (!insidePlayer && document.fullscreenElement !== playerRef.current) return;
        if (target instanceof Node && document.getElementById(transcriptId)?.contains(target)) return;
      }
      const silentMainControl = !audioEnabled && target instanceof Element && Boolean(target.closest('[data-testid="seminar-controls"] button'));
      if (
        target instanceof Element &&
        target.closest("button, a, input, select, summary, textarea, [contenteditable='true']") &&
        !silentMainControl
      )
        return;
      if (event.key === "ArrowRight") goTo(currentIndexRef.current + 1);
      if (event.key === "ArrowLeft") goTo(currentIndexRef.current - 1);
      if (audioEnabled && event.key === " ") {
        event.preventDefault();
        if (statusRef.current === "playing") pause();
        else play();
      }
      if (!audioEnabled && event.key === " " && target === playerRef.current) event.preventDefault();
      if (event.key.toLowerCase() === "f") void enterFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioEnabled, enterFullscreen, goTo, pause, play, transcriptId]);

  return (
    <section
      ref={playerRef}
      tabIndex={audioEnabled ? undefined : 0}
      aria-keyshortcuts={audioEnabled ? undefined : "ArrowLeft ArrowRight F"}
      aria-labelledby="seminar-player-title"
      className="overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-950 text-white shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 print:border-0 print:shadow-none"
    >
      <h2 id="seminar-player-title" className="sr-only">
        {playerLabel ?? (audioEnabled ? "音声付き安全研修スライド" : "安全研修スライド")}
      </h2>
      {!audioEnabled ? <p className="sr-only" aria-live="polite" aria-atomic="true">
        {currentIndex + 1}枚目／全{slides.length}枚：{slide.title}
      </p> : null}
      <div
        data-testid="seminar-stage"
        className={`relative overflow-hidden bg-slate-950 p-5 sm:p-8 lg:aspect-video lg:min-h-0 lg:p-10 ${
          slide.stage ? "" : "min-h-[680px] sm:min-h-[620px]"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 10% 15%, #0f766e 0, transparent 30%), radial-gradient(circle at 88% 80%, #f97316 0, transparent 24%)",
          }}
        />
        {slide.stage ? (
          <div className="relative flex h-full flex-col" style={{ minHeight: 440 }}>
            <header className="flex items-start justify-between gap-3 text-sm lg:text-xl">
              <div>
                <p className="font-black text-teal-200" style={{ letterSpacing: "0.08em" }}>
                  {slide.kicker}
                </p>
                <p className="mt-1 font-bold text-slate-200">{slide.label}</p>
              </div>
              <p className="shrink-0 font-mono text-slate-200">
                {String(slide.number).padStart(2, "0")} / {slides.length}
              </p>
            </header>
            <div
              className="grid min-h-0 flex-1 items-center gap-3 sm:gap-6 lg:gap-8"
              style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(92px, 34%)" }}
            >
              <div className="min-w-0">
                <h3
                  data-testid="stage-title"
                  style={{ fontSize: "clamp(24px, 4vw, 40px)" }}
                  className="font-black leading-tight tracking-tight"
                >
                  {slide.title}
                </h3>
                <p
                  data-testid="stage-headline"
                  style={{ fontSize: "clamp(18px, 2.5vw, 24px)" }}
                  className="mt-4 text-lg font-black leading-7 text-white sm:text-xl lg:text-2xl"
                >
                  {slide.stage.headline}
                </p>
                <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-slate-100 lg:text-xl lg:leading-8">
                  {slide.stage.keyPoints.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-300" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {slide.stage.mascot ? (
                <Image
                  src={slide.stage.mascot.src}
                  alt={slide.stage.mascot.alt}
                  width={slide.stage.mascot.width}
                  height={slide.stage.mascot.height}
                  sizes="(max-width: 639px) 34vw, (max-width: 1023px) 32vw, 280px"
                  loading={slide.number === 1 ? "eager" : "lazy"}
                  style={{
                    maxHeight: 250,
                    maxWidth: Math.min(280, slide.stage.mascot.width),
                  }}
                  className="mx-auto h-auto w-full object-contain"
                />
              ) : null}
            </div>
            <div className="space-y-2 text-sm lg:text-xl">
              {slide.stage.caveat ? (
                <p data-testid="stage-caveat" className="rounded-lg border border-amber-300/60 bg-amber-950/70 px-3 py-2 font-bold text-amber-100">
                  条件: {slide.stage.caveat}
                </p>
              ) : null}
              {slideEvidenceLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label="このスライドの根拠">
                  {slideEvidenceLinks.map((link) => (
                    <a
                      key={`${link.href}-${link.label}`}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="inline-flex min-h-11 items-center rounded-full border border-teal-300 bg-teal-950 px-3 font-black text-teal-100 underline underline-offset-4"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
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
          <div className="mt-3 grid min-h-0 flex-1 items-center gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
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
          <a href={`#${sourcesAnchorId}`} className="mt-2 block truncate text-[10px] text-slate-300 underline underline-offset-2">
            根拠: {slideSources.map((source) => source.title).join(" / ") || "教材内の確認事項"}
          </a>
        </div>
        )}
      </div>

      {(audioEnabled && (!slide.stage || speechStatus === "playing")) ? (
        <div
          role="status"
          aria-live="polite"
          className="border-y border-slate-700 bg-black/80 px-4 py-3 text-center text-sm font-bold leading-6 text-white"
        >
          {caption}
        </div>
      ) : null}

      <div className="space-y-4 bg-slate-900 p-4 sm:p-5">
        {audioEnabled ? <audio
          ref={audioRef}
          preload="metadata"
          src={`${audioBasePath}/slide-${String(slide.number).padStart(2, "0")}.mp3`}
          onError={() => {
            if (voiceMode !== "recorded") return;
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
        /> : null}
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
              ((currentIndex + (audioEnabled ? speechProgress / 100 : 1)) / slides.length) * 100,
            )}
            aria-valuetext={audioEnabled
              ? `${currentIndex + 1}枚目、スライド内${Math.round(speechProgress)}%`
              : `${currentIndex + 1}枚目、全${slides.length}枚`}
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700"
          >
            <div
              className="h-full bg-teal-400 transition-[width] motion-reduce:transition-none"
              style={{
                width: `${((currentIndex + (audioEnabled ? speechProgress / 100 : 1)) / slides.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div data-testid="seminar-controls" className="flex flex-wrap items-center gap-2">
          <ControlButton
            label="前のスライド"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            icon={ChevronLeft}
          />
          {!audioEnabled ? null : speechStatus === "playing" ? (
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
          <ControlButton
            label="次のスライド"
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === slides.length - 1}
            icon={ChevronRight}
          />
          {audioEnabled ? <ControlButton
            label={slide.stage ? `${slides.length}枚` : "スライド一覧"}
            onClick={() => setListVisible((value) => !value)}
            pressed={listVisible}
            icon={List}
          /> : null}
          <ControlButton label="全画面" onClick={() => void enterFullscreen()} icon={Expand} />
        </div>
        {!audioEnabled ? <div className="flex flex-wrap items-center gap-4 border-t border-slate-700 pt-3">
          <ControlButton
            label="スライド一覧"
            onClick={() => setListVisible((value) => !value)}
            pressed={listVisible}
            icon={List}
          />
          <button
            type="button"
            className="min-h-11 text-sm font-bold text-teal-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
            onClick={() => setTranscriptVisible((value) => !value)}
            aria-expanded={transcriptVisible}
            aria-controls={transcriptId}
          >
            {transcriptVisible ? "詳しく閉じる" : "詳しく"}
          </button>
        </div> : null}
        {audioEnabled && speechStatus === "unavailable" ? (
          <p className="rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-950">
            このブラウザーでは読み上げを利用できません。字幕と全文原稿をご利用ください。
          </p>
        ) : null}
        {audioEnabled && audioFailed && voiceMode === "recorded" && speechStatus !== "unavailable" ? (
          <p className="text-xs text-amber-200">
            音声ファイルを取得できないため、ブラウザー読み上げへ切り替えました。
          </p>
        ) : null}
        {audioEnabled ? <button
          type="button"
          className="min-h-11 text-sm font-bold text-teal-200 underline underline-offset-4"
          onClick={() => setTranscriptVisible((value) => !value)}
          aria-expanded={transcriptVisible}
          aria-controls={transcriptId}
        >
          {slide.stage
            ? transcriptVisible ? "詳しく閉じる" : "詳しく"
            : transcriptVisible ? "音声原稿を閉じる" : "音声原稿を読む"}
        </button> : null}
        {transcriptVisible ? (
          <div
            id={transcriptId}
            role="region"
            aria-label={audioEnabled
              ? slide.stage
                ? `${slide.number}枚目の詳しい内容、音声原稿、講師向け補足、根拠`
                : `${slide.number}枚目の音声原稿と講師向け補足`
              : `${slide.number}枚目の講師用の詳説と根拠`}
            tabIndex={0}
            className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-7 text-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
          >
            {slide.stage ? (
              <>
                <h4 className="font-black text-white">詳しい内容</h4>
                <p className="mt-2 font-bold">{slide.message}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {slide.body.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <h4 className="mt-4 font-black text-white">{audioEnabled ? "音声原稿" : "講師用の詳説"}</h4>
              </>
            ) : null}
            {!slide.stage && !audioEnabled ? <h4 className="font-black text-white">講師用の詳説</h4> : null}
            <p className={slide.stage ? "mt-2" : undefined}>{slide.narration}</p>
            <h4 className="mt-4 font-black text-white">講師向け補足</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {slide.instructorNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <h4 className="mt-4 font-black text-white">根拠</h4>
            <ul className="mt-2 space-y-2">
              {slideEvidenceLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="inline-flex min-h-11 items-center font-bold text-teal-200 underline underline-offset-4"
                  >
                    {link.label}
                  </a>
                </li>
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
        <p className={`${slide.stage && audioEnabled ? "hidden lg:block lg:text-sm" : "text-xs"} text-slate-400`}>
          {audioEnabled
            ? "キーボード: Space 再生/一時停止、←/→ 移動、F 全画面"
            : "キーボード: プレイヤーにフォーカスして ←/→ 移動、F 全画面"}
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
      <span className={primary ? "inline" : "hidden sm:inline"}>{label}</span>
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
      <div className="grid gap-3 sm:grid-cols-2">
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
          <div
            key={bar.label}
            className="grid items-center gap-2 text-xs sm:text-sm"
            style={{ gridTemplateColumns: "minmax(6rem, 8rem) minmax(0, 1fr) 4.5rem" }}
          >
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
          <li
            key={step.label}
            className="grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-3"
            style={{ gridTemplateColumns: "2.5rem minmax(0, 1fr)" }}
          >
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
