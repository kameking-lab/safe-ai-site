"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  FileImage,
  FileText,
  PencilLine,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  SAFETY_IMAGE_LANGUAGE_LABELS,
  type SafetyImageLanguage,
  type SafetyImageOrientation,
  type SafetyImageTheme,
} from "@/data/safety-image-library";

type DownloadMode = "clean" | "default" | "edited";
type FontSize = "small" | "standard" | "large";
type TextPosition = "top" | "center" | "bottom";
type TextAlign = "left" | "center" | "right";
type Padding = "small" | "standard" | "large";
type WritingMode = "horizontal" | "vertical";
type Paper = "A4" | "A3";
type Format = "jpeg" | "pdf" | "png";

const LANGUAGE_OPTIONS = Object.entries(SAFETY_IMAGE_LANGUAGE_LABELS) as [SafetyImageLanguage, string][];

export function SafetyImageEditor({ theme }: { theme: SafetyImageTheme }) {
  const defaultPosition: TextPosition = theme.orientation === "portrait" ? "top" : "bottom";
  const [language, setLanguage] = useState<SafetyImageLanguage>("ja");
  const [text, setText] = useState(theme.texts.ja);
  const [fontSize, setFontSize] = useState<FontSize>("standard");
  const [position, setPosition] = useState<TextPosition>(defaultPosition);
  const [textColor, setTextColor] = useState("#082f49");
  const [band, setBand] = useState(true);
  const [bandColor, setBandColor] = useState("#ffffff");
  const [brand, setBrand] = useState(true);
  const [lineHeight, setLineHeight] = useState(1.18);
  const [align, setAlign] = useState<TextAlign>("center");
  const [border, setBorder] = useState(true);
  const [padding, setPadding] = useState<Padding>("standard");
  const [writingMode, setWritingMode] = useState<WritingMode>("horizontal");
  const [subMessage, setSubMessage] = useState("");
  const [numericValue, setNumericValue] = useState("");
  const [numericUnit, setNumericUnit] = useState(theme.numericTemplate?.unit ?? "");
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("default");
  const [paper, setPaper] = useState<Paper>("A4");
  const [orientation, setOrientation] = useState<SafetyImageOrientation>(theme.orientation);
  const [format, setFormat] = useState<Format>("jpeg");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const displayText = [text, numericValue ? `${numericValue}${numericUnit ? ` ${numericUnit}` : ""}` : "", subMessage]
    .filter(Boolean)
    .join("\n");
  const downloadEndpoint = `/api/safety-images/${theme.slug}/download`;
  const normalDownloadHref = useMemo(() => {
    const params = new URLSearchParams({
      mode: downloadMode === "clean" ? "clean" : "default",
      lang: language,
      brand: brand ? "branded" : "none",
      paper,
      orientation,
      format,
    });
    return `${downloadEndpoint}?${params.toString()}`;
  }, [brand, downloadEndpoint, downloadMode, format, language, orientation, paper]);
  const recommendedHref = `${downloadEndpoint}?mode=default&lang=ja&brand=branded&paper=A4&orientation=${theme.orientation}&format=jpeg`;

  const reset = () => {
    setLanguage("ja");
    setText(theme.texts.ja);
    setFontSize("standard");
    setPosition(defaultPosition);
    setTextColor("#082f49");
    setBand(true);
    setBandColor("#ffffff");
    setBrand(true);
    setLineHeight(1.18);
    setAlign("center");
    setBorder(true);
    setPadding("standard");
    setWritingMode("horizontal");
    setSubMessage("");
    setNumericValue("");
    setNumericUnit(theme.numericTemplate?.unit ?? "");
    setError("");
  };

  async function downloadEdited() {
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(downloadEndpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper,
          orientation,
          format,
          settings: {
            mode: "edited",
            language,
            text,
            fontSize,
            position,
            textColor,
            band,
            bandColor,
            brand,
            lineHeight,
            align,
            border,
            padding,
            writingMode,
            subMessage,
            numericValue,
            numericUnit,
          },
        }),
      });
      if (!response.ok) throw new Error("編集画像を生成できませんでした。入力内容を確認してください。");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      const extension = format === "jpeg" ? "jpg" : format;
      anchor.download = `${theme.slug}-edited-${language}-${paper.toLowerCase()}-${orientation}.${extension}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "ダウンロードに失敗しました。");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2" aria-label="主な操作">
        <a href={recommendedHref} className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 text-lg font-black text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300">
          <Download className="h-6 w-6" aria-hidden="true" />そのままダウンロード
        </a>
        <a href="#edit-controls" className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-800 bg-white px-5 text-lg font-black text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-slate-950 dark:text-emerald-100">
          <PencilLine className="h-6 w-6" aria-hidden="true" />文字を編集
        </a>
      </div>

      <section id="edit" className="mt-7 scroll-mt-24" aria-labelledby="edit-heading">
        <div className="grid gap-6 xl:grid-cols-[minmax(20rem,1.05fr)_minmax(22rem,.95fr)]">
          <div className="xl:sticky xl:top-24 xl:self-start">
            <h2 id="edit-heading" className="text-2xl font-black text-slate-950 dark:text-white">プレビュー</h2>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">入力するとすぐ反映されます。</p>
            <div className={`relative mt-4 mx-auto max-w-2xl overflow-hidden rounded-2xl border-2 border-slate-200 bg-[#eef7f7] shadow-lg ${orientation === "portrait" ? "aspect-[1/1.414]" : "aspect-[1.414/1]"}`}>
              <Image
                src={theme.originalPath}
                alt={`${theme.title}の文字なしクリーンマスター。文字編集プレビュー`}
                fill
                priority
                sizes="(max-width: 1280px) 92vw, 48vw"
                className="object-contain"
              />
              {displayText ? (
                <div
                  className="absolute left-[5%] z-10 w-[90%] whitespace-pre-wrap break-words"
                  style={{
                    top: position === "top" ? "5%" : position === "center" ? "50%" : undefined,
                    bottom: position === "bottom" ? (brand ? "16%" : "5%") : undefined,
                    transform: position === "center" ? "translateY(-50%)" : undefined,
                    color: textColor,
                    backgroundColor: band ? `${bandColor}ed` : "transparent",
                    border: border && band ? "2px solid #0f172a" : "none",
                    borderRadius: band ? "0.65rem" : undefined,
                    padding: padding === "small" ? "2.2%" : padding === "large" ? "5%" : "3.5%",
                    fontSize: fontSize === "small" ? "clamp(1rem,3.4vw,2.1rem)" : fontSize === "large" ? "clamp(1.35rem,5.3vw,3.6rem)" : "clamp(1.15rem,4.4vw,3rem)",
                    fontWeight: 900,
                    lineHeight,
                    textAlign: align,
                    writingMode: writingMode === "vertical" && language === "ja" ? "vertical-rl" : "horizontal-tb",
                    maxHeight: "78%",
                    overflow: "hidden",
                    textShadow: band ? "none" : "0 1px 0 white, 1px 0 0 white, 0 -1px 0 white, -1px 0 0 white",
                  }}
                >
                  {displayText}
                </div>
              ) : null}
              {brand ? (
                <div className="absolute bottom-[2%] right-[2%] z-20 flex items-center gap-1 rounded-lg border border-emerald-700 bg-white/95 px-2 py-1 text-[clamp(.45rem,1.25vw,.85rem)] font-black text-slate-900 shadow-sm">
                  <Image src="/mascot/mascot-head-256.png" alt="安全AIポータルのチワワ" width={34} height={34} className="h-7 w-7 object-contain sm:h-9 sm:w-9" />
                  <span>© 安全AIポータル</span>
                </div>
              ) : null}
            </div>
          </div>

          <div id="edit-controls" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">かんたん編集</h2>
            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">言語プリセット</span>
                <select
                  value={language}
                  onChange={(event) => {
                    const next = event.target.value as SafetyImageLanguage;
                    setLanguage(next);
                    setText(theme.texts[next]);
                    if (next !== "ja") setWritingMode("horizontal");
                  }}
                  className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-950 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {LANGUAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">表示する文字</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value.slice(0, 180))}
                  rows={3}
                  maxLength={180}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-base font-bold text-slate-950 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <span className="mt-1 block text-right text-xs font-bold text-slate-500">{text.length}/180</span>
              </label>

              {theme.numericTemplate ? (
                <fieldset className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <legend className="px-1 text-sm font-black text-amber-950 dark:text-amber-100">数値テンプレート</legend>
                  <div className="grid grid-cols-[1fr_minmax(5rem,.55fr)] gap-3">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                      数値・連絡先
                      <input value={numericValue} onChange={(event) => setNumericValue(event.target.value.slice(0, 24))} placeholder={theme.numericTemplate.placeholder || "空欄"} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                      単位
                      <input value={numericUnit} onChange={(event) => setNumericUnit(event.target.value.slice(0, 16))} placeholder="単位" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>
                  </div>
                </fieldset>
              ) : null}

              <RadioGroup label="文字サイズ" value={fontSize} values={[["small", "小"], ["standard", "標準"], ["large", "大"]]} onChange={(value) => setFontSize(value as FontSize)} />
              <RadioGroup label="文字位置" value={position} values={[["top", "上"], ["center", "中央"], ["bottom", "下"]]} onChange={(value) => setPosition(value as TextPosition)} />

              <div className="grid grid-cols-2 gap-3">
                <ColorControl label="文字色" value={textColor} onChange={setTextColor} />
                <ToggleControl label="背景帯" checked={band} onChange={setBand} />
              </div>
              <ToggleControl label="チワワ・©" checked={brand} onChange={setBrand} />

              <details className="group rounded-2xl border border-slate-200 dark:border-slate-700">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-black text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:text-white">
                  詳細設定 <ChevronDown className="h-5 w-5 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100">
                    サブメッセージ
                    <input value={subMessage} onChange={(event) => setSubMessage(event.target.value.slice(0, 72))} maxLength={72} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </label>
                  <label className="block text-sm font-black text-slate-800 dark:text-slate-100">
                    行間 {lineHeight.toFixed(2)}
                    <input type="range" min="0.9" max="1.8" step="0.05" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} className="mt-2 w-full accent-emerald-800" />
                  </label>
                  <RadioGroup label="文字揃え" value={align} values={[["left", "左"], ["center", "中央"], ["right", "右"]]} onChange={(value) => setAlign(value as TextAlign)} />
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="背景帯の色" value={bandColor} onChange={setBandColor} />
                    <ToggleControl label="枠線" checked={border} onChange={setBorder} />
                  </div>
                  <RadioGroup label="余白" value={padding} values={[["small", "小"], ["standard", "標準"], ["large", "大"]]} onChange={(value) => setPadding(value as Padding)} />
                  {language === "ja" ? <RadioGroup label="文字方向" value={writingMode} values={[["horizontal", "横書き"], ["vertical", "縦書き"]]} onChange={(value) => setWritingMode(value as WritingMode)} /> : null}
                </div>
              </details>

              <button type="button" onClick={reset} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white font-black text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-slate-900 dark:text-slate-100">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />元に戻す
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6 dark:border-emerald-900 dark:bg-emerald-950" aria-labelledby="download-heading">
        <h2 id="download-heading" className="text-2xl font-black text-emerald-950 dark:text-emerald-100">ダウンロード</h2>
        <p className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-200">300dpi相当・A判の安全余白で、その場で生成します。</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            ["clean", "1. 文字なし", "クリーンマスターのみ"],
            ["default", "2. 推奨文字入り", "選択言語の既定文言"],
            ["edited", "3. 編集した文字入り", "現在の編集内容"],
          ].map(([value, label, description]) => (
            <label key={value} className={`cursor-pointer rounded-2xl border-2 p-4 ${downloadMode === value ? "border-emerald-800 bg-white shadow-sm dark:bg-slate-900" : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950"}`}>
              <input type="radio" name="download-mode" value={value} checked={downloadMode === value} onChange={() => setDownloadMode(value as DownloadMode)} className="mr-2 accent-emerald-800" />
              <span className="font-black text-slate-950 dark:text-white">{label}</span>
              <span className="mt-1 block pl-6 text-xs font-bold text-slate-600 dark:text-slate-300">{description}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-black text-slate-800 dark:text-slate-100">用紙サイズ</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["A4", "A3"] as const).flatMap((size) => (["portrait", "landscape"] as const).map((direction) => (
                <button key={`${size}-${direction}`} type="button" aria-pressed={paper === size && orientation === direction} onClick={() => { setPaper(size); setOrientation(direction); }} className={`min-h-11 rounded-lg border px-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${paper === size && orientation === direction ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
                  {size}{direction === "portrait" ? "縦" : "横"}{theme.orientation === direction ? "・推奨" : ""}
                </button>
              )))}
            </div>
          </fieldset>
          <label className="text-sm font-black text-slate-800 dark:text-slate-100">
            形式
            <select value={format} onChange={(event) => setFormat(event.target.value as Format)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <option value="jpeg">JPEG</option>
              <option value="pdf">PDF</option>
              {theme.pngAvailable ? <option value="png">PNG</option> : null}
            </select>
          </label>
        </div>

        {downloadMode === "edited" ? (
          <button type="button" disabled={downloading} onClick={downloadEdited} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 text-lg font-black text-white shadow-sm hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 sm:w-auto">
            {format === "pdf" ? <FileText className="h-5 w-5" aria-hidden="true" /> : <FileImage className="h-5 w-5" aria-hidden="true" />}
            {downloading ? "生成中…" : `${paper}${orientation === "portrait" ? "縦" : "横"} ${format.toUpperCase()}をダウンロード`}
          </button>
        ) : (
          <a href={normalDownloadHref} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 text-lg font-black text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 sm:w-auto">
            {format === "pdf" ? <FileText className="h-5 w-5" aria-hidden="true" /> : <FileImage className="h-5 w-5" aria-hidden="true" />}
            {paper}{orientation === "portrait" ? "縦" : "横"} {format.toUpperCase()}をダウンロード
          </a>
        )}
        <p role="status" aria-live="polite" className="mt-3 text-sm font-black text-red-700 dark:text-red-300">{error}</p>
        <div className="mt-4 flex items-start gap-2 text-xs font-bold leading-6 text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />入力した文字はURL、ファイル名、アクセス解析へ含めません。
        </div>
      </section>

    </div>
  );
}

function RadioGroup({ label, value, values, onChange }: { label: string; value: string; values: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-black text-slate-800 dark:text-slate-100">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {values.map(([option, optionLabel]) => (
          <label key={option} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-black ${value === option ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
            <input type="radio" className="sr-only" checked={value === option} onChange={() => onChange(option)} />{optionLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ToggleControl({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-800" />
    </label>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {label}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent" />
    </label>
  );
}
