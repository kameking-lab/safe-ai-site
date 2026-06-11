import type { ReactNode } from "react";
import type { MaterialIndustry, MaterialTopic } from "@/types/foreign-worker";

/**
 * 外国人労働者教育のトピック/業種ピクトグラム（柱0・脱テキスト）。
 * ピクトグラムは言語の壁も越える — 教材選択ボタンと教材ヘッダー（印刷物含む）で
 * 文字が読めなくても「何の教材か」が分かることが役目。
 *
 * すべて自作のインラインSVG（簡略表現のオリジナル描画）。外部素材・規格図版の
 * 複製ではないためライセンス問題なし。色は currentColor を継承する。
 */

type PictogramProps = {
  className?: string;
  /** 単独で意味を持たせる場合のみ指定（ボタン内などラベル併記時は省略=装飾扱い） */
  title?: string;
};

function PictogramSvg({
  children,
  className,
  title,
}: PictogramProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ---------- トピック（5種） ---------- */

function FallFromHeightPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 足場の縁 */}
      <path d="M5 11h14v33" />
      {/* 落下する人（頭を下げて宙に傾く） */}
      <circle cx="33" cy="15" r="3.5" fill="currentColor" stroke="none" />
      <path d="M31 19l-6 8" />
      <path d="M29 22l-6-4M30 23l7 2" />
      <path d="M25 27l6 5M25 27l-5 6" />
      {/* 下向き矢印 */}
      <path d="M41 31v10m0 0-3.5-3.5M41 41l3.5-3.5" />
    </PictogramSvg>
  );
}

function ChemicalHandlingPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 三角フラスコ */}
      <path d="M19 7h10" />
      <path d="M21 7v10L11.5 35.5A3.5 3.5 0 0 0 14.7 41h18.6a3.5 3.5 0 0 0 3.2-5.5L27 17V7" />
      {/* 液面と泡 */}
      <path d="M16 31h16" />
      <circle cx="21" cy="35.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="27" cy="36.5" r="1.2" fill="currentColor" stroke="none" />
    </PictogramSvg>
  );
}

function HeatstrokePictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 太陽 */}
      <circle cx="17" cy="16" r="6.5" />
      <path d="M17 4.5v3M17 24.5v3M5.5 16h3M25.5 16h3M9 8l2.1 2.1M25 8l-2.1 2.1M9 24l2.1-2.1M25 24l-2.1-2.1" />
      {/* 温度計（高温） */}
      <path d="M34 9a3.5 3.5 0 0 1 7 0v19.5a6 6 0 1 1-7 0z" />
      <circle cx="37.5" cy="37" r="3" fill="currentColor" stroke="none" />
      <path d="M37.5 34V15" strokeWidth={3} />
    </PictogramSvg>
  );
}

function LowerBackInjuryPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 前かがみで荷を持つ人 */}
      <circle cx="17" cy="13" r="3.5" fill="currentColor" stroke="none" />
      <path d="M19 16l9 8" />
      <path d="M24 20l-3 8M28 24l-1 8M28 24l4 8" />
      {/* 荷物 */}
      <rect x="12" y="28" width="10" height="9" rx="1" />
      {/* 腰の痛み（稲妻） */}
      <path d="M36 8l-3.5 5.5h5L34 19" />
    </PictogramSvg>
  );
}

function InfectionPreventionPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 顔 */}
      <circle cx="24" cy="23" r="15" />
      <circle cx="18.5" cy="18" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="29.5" cy="18" r="1.6" fill="currentColor" stroke="none" />
      {/* マスク */}
      <path d="M14.5 25h19v6.5a6 6 0 0 1-6 6h-7a6 6 0 0 1-6-6z" fill="currentColor" stroke="none" opacity={0.25} />
      <path d="M14.5 25h19v6.5a6 6 0 0 1-6 6h-7a6 6 0 0 1-6-6z" />
      <path d="M14.5 27l-5-2M33.5 27l5-2" />
    </PictogramSvg>
  );
}

/* ---------- 業種（6種） ---------- */

function ConstructionPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 保護帽 */}
      <path d="M11 29a13 13 0 0 1 26 0" />
      <path d="M24 10v6" />
      <rect x="6" y="29" width="36" height="5" rx="2.5" />
    </PictogramSvg>
  );
}

function ManufacturingPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 歯車 */}
      <circle cx="24" cy="24" r="9" />
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
      <path d="M24 9v6M24 33v6M9 24h6M33 24h6M13.4 13.4l4.2 4.2M30.4 30.4l4.2 4.2M13.4 34.6l4.2-4.2M30.4 17.6l4.2-4.2" />
    </PictogramSvg>
  );
}

function CarePictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 手の上のハート */}
      <path d="M24 25c-5-4.5-8.5-7.6-8.5-11.3 0-2.9 2.2-4.7 4.6-4.7 1.6 0 3.1.9 3.9 2.3.8-1.4 2.3-2.3 3.9-2.3 2.4 0 4.6 1.8 4.6 4.7 0 3.7-3.5 6.8-8.5 11.3z" fill="currentColor" stroke="none" opacity={0.9} />
      <path d="M8 34h6l7 4h10c3 0 7-2 9-4" />
      <path d="M14 34v-3h8" />
    </PictogramSvg>
  );
}

function AgriculturePictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 双葉 */}
      <path d="M24 40V22" />
      <path d="M24 26c0-7-5-12-12-12 0 7 5 12 12 12z" />
      <path d="M24 22c0-7 5-12 12-12 0 7-5 12-12 12z" />
      <path d="M10 40h28" />
    </PictogramSvg>
  );
}

function FoodServicePictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* 皿とフォーク */}
      <circle cx="28" cy="26" r="12" />
      <circle cx="28" cy="26" r="5.5" />
      <path d="M9 8v10M13 8v10M11 8v32M11 18c2 0 3-1.5 3-3.5" />
    </PictogramSvg>
  );
}

function AccommodationPictogram(props: PictogramProps) {
  return (
    <PictogramSvg {...props}>
      {/* ベッド（側面） */}
      <path d="M6 14v22M6 28h36v8M42 28v-5a4 4 0 0 0-4-4H20v9" />
      <circle cx="13" cy="23" r="3.5" fill="currentColor" stroke="none" />
    </PictogramSvg>
  );
}

/* ---------- マップとラベル ---------- */

const TOPIC_PICTOGRAMS: Record<MaterialTopic, (p: PictogramProps) => ReactNode> = {
  "fall-from-height": FallFromHeightPictogram,
  "chemical-handling": ChemicalHandlingPictogram,
  heatstroke: HeatstrokePictogram,
  "lower-back-injury": LowerBackInjuryPictogram,
  "infection-prevention": InfectionPreventionPictogram,
};

const INDUSTRY_PICTOGRAMS: Record<MaterialIndustry, (p: PictogramProps) => ReactNode> = {
  construction: ConstructionPictogram,
  manufacturing: ManufacturingPictogram,
  care: CarePictogram,
  agriculture: AgriculturePictogram,
  "food-service": FoodServicePictogram,
  accommodation: AccommodationPictogram,
};

/** 漢字2〜4文字の短ラベル（柱0・文字ダイエット。正式名称は教材ヘッダー側に常時表示） */
export const TOPIC_SHORT_LABELS_JA: Record<MaterialTopic, string> = {
  "fall-from-height": "墜落防止",
  "chemical-handling": "化学物質",
  heatstroke: "熱中症",
  "lower-back-injury": "腰痛",
  "infection-prevention": "感染症",
};

export const INDUSTRY_SHORT_LABELS_JA: Record<MaterialIndustry, string> = {
  construction: "建設",
  manufacturing: "製造",
  care: "介護",
  agriculture: "農業",
  "food-service": "外食",
  accommodation: "宿泊",
};

export function TopicPictogram({
  topic,
  ...props
}: PictogramProps & { topic: MaterialTopic }) {
  const Pictogram = TOPIC_PICTOGRAMS[topic];
  return <Pictogram {...props} />;
}

export function IndustryPictogram({
  industry,
  ...props
}: PictogramProps & { industry: MaterialIndustry }) {
  const Pictogram = INDUSTRY_PICTOGRAMS[industry];
  return <Pictogram {...props} />;
}
