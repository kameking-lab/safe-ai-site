import type { LucideIcon } from "lucide-react";
import {
  Bomb,
  Car,
  CircleHelp,
  Cog,
  Ellipsis,
  Flame,
  FlaskConical,
  Forklift,
  Radiation,
  Skull,
  Snowflake,
  Thermometer,
  ThermometerSun,
  Vibrate,
  Waves,
  Zap,
} from "lucide-react";
import type { AccidentType } from "@/lib/types/domain";
import { ACCIDENT_TYPE_GLYPH, type AccidentGlyphId } from "@/lib/accidents/accident-pictogram-map";

/**
 * 事故の型ピクトグラム（柱0・脱テキスト）。
 * JIS Z 9103 の黄＝注意の文法（黄地に黒グリフ）をインラインSVGで自作
 * （簡略化した自作描画なのでライセンス問題なし。GHS赤ひし形・保護具青丸と同じ作法）。
 * 警告標識の三角形は小サイズだとグリフの判読性が落ちるため、角丸の黄色地で簡略化している。
 * 中の図記号は lucide（炎・歯車・稲妻など）＋自作パス（墜落・転倒・激突され等の人体系）。
 */

const LUCIDE_GLYPH: Partial<Record<AccidentGlyphId, LucideIcon>> = {
  caught: Cog,
  electric: Zap,
  vehicle: Forklift,
  traffic: Car,
  fire: Flame,
  explosion: Bomb,
  "hot-cold": Thermometer,
  "chemical-contact": FlaskConical,
  drowning: Waves,
  "heat-stroke": ThermometerSun,
  hypothermia: Snowflake,
  "harmful-ray": Radiation,
  toxic: Skull,
  vibration: Vibrate,
  other: Ellipsis,
  unclassifiable: CircleHelp,
};

/** 自作グリフ（viewBox 0 0 24 24・黒塗り＝currentColor）。 */
function CustomGlyph({ glyph }: { glyph: AccidentGlyphId }) {
  if (glyph === "fall-person") {
    // 墜落: 端から頭を下にして落ちる人＋足場の縁
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M2 3h7v2.2H4.2V21H2z" />
        <circle cx="16.5" cy="16.5" r="2.3" />
        <path d="M13.5 4.5l3.6 1.8c.9.45 1.2 1.5.7 2.4l-2.2 3.9-2.1-1.2 1.6-2.9-4.3-2.1c-.9-.45-1.2-1.55-.7-2.4.4-.75 1.4-1.05 2.2-.65z" />
        <path d="M19 9.5l2.6 2.8-1.3 1.2-2.6-2.8z" />
      </svg>
    );
  }
  if (glyph === "slip") {
    // 転倒: 足を滑らせてのけぞる人＋床
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="8" cy="5" r="2.3" />
        <path d="M9.5 8.5c1.1.5 1.6 1.6 1.2 2.7l-1.5 4.4 5.6 2.7-.9 1.9-7.3-3.5c-.8-.4-1.2-1.3-.9-2.2l1.6-4.9c.3-1 1.3-1.5 2.2-1.1z" />
        <path d="M12 9.8l4.6-1.4.6 1.9-4.6 1.4z" />
        <path d="M2 20.4h20v1.8H2z" />
      </svg>
    );
  }
  if (glyph === "struck") {
    // 激突され: 飛来する塊（速度線つき）と人
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M2 5.5h5v1.6H2zM2 9h4v1.6H2zM2 12.5h3v1.6H2z" />
        <path d="M8.5 5.5l5.5 1 1 4.5-4.5 1.5-3-3z" />
        <circle cx="18.5" cy="7" r="2.2" />
        <path d="M17 10.5c1.2 0 2.2.9 2.3 2.1l.7 8.4h-2.2l-.6-7.2-2.7 7.2h-2.3l3-9.2c.3-.8 1-1.3 1.8-1.3z" />
      </svg>
    );
  }
  if (glyph === "cut") {
    // 切れ・こすれ: 丸のこ刃（外周の刃＋中心穴）
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-full w-full">
        <circle cx="12" cy="12" r="7.2" strokeWidth="3.4" strokeDasharray="3.1 2.1" />
        <circle cx="12" cy="12" r="3.6" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (glyph === "falling-object") {
    // 飛来・落下: 落ちてくる資材＋下向き矢印2本
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M7 3h10l1.5 6h-13z" />
        <path d="M8 12v4.5H5.8L9 21l3.2-4.5H10V12zM15.5 12v3h-1.7l2.7 3.8 2.7-3.8h-1.7v-3z" />
      </svg>
    );
  }
  if (glyph === "collapse") {
    // 崩壊・倒壊: 崩れて傾く積荷
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M3 14h5v5H3z" />
        <path d="M9.5 13.5h5v5.5h-5z" transform="rotate(12 12 16)" />
        <path d="M5 7.5h5v5H5z" transform="rotate(-8 7.5 10)" />
        <path d="M14.5 5l4.5 2.5-3.5 6-2.5-1.4z" />
        <path d="M2 20.2h20v1.6H2z" />
      </svg>
    );
  }
  if (glyph === "oxygen-deficiency") {
    // 酸素欠乏: O2 と下向き矢印
    return (
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <text
          x="11"
          y="13"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="bold"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="currentColor"
        >
          O₂
        </text>
        <path d="M16.6 13.5v3.4h-2l3 4.1 3-4.1h-2v-3.4z" fill="currentColor" />
        <path d="M4 18.5h9v1.8H4z" fill="currentColor" />
      </svg>
    );
  }
  if (glyph === "overexertion") {
    // 動作の反動・無理な動作: 腰を曲げて荷を持ち上げる人
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="13.5" cy="4.5" r="2.2" />
        <path d="M12.2 7.6c1-.4 2.1 0 2.6 1l2.7 5.4 3.7 1.4-.7 1.9-4.3-1.6c-.5-.2-.9-.6-1.1-1l-1.1-2.2-1.6 4.3 1.9 4.2h-2.4l-1.7-3.8c-.2-.5-.2-1 0-1.5l1.9-5.2-2.7 1.5-1 .4-.8-1.8 3.4-2.4z" />
        <path d="M4 13.5h4.5V18H4z" />
        <path d="M2.5 20.4h19v1.6h-19z" />
      </svg>
    );
  }
  if (glyph === "bump") {
    // 激突: 壁に向かって突き当たる人（衝撃線つき）
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M19 3h3v18h-3z" />
        <path d="M16.5 8.2l1.6-1.6 1 1-1.6 1.6zM16.5 12.5h2.2v1.4h-2.2z" />
        <circle cx="12.5" cy="6" r="2.2" />
        <path d="M11.5 9.2c1-.3 2 .2 2.4 1.1l1.6 3.7-1.9.8-1.3-2.9-1.9 4.4 2.6 4.4-2.1 1-2.6-4.5c-.3-.5-.3-1.1 0-1.6l2-4.9c.2-.7.6-1.2 1.2-1.5z" />
        <path d="M4 10.5l4.4-1.2.5 1.8-4.4 1.2z" />
        <path d="M2 20.4h16v1.6H2z" />
      </svg>
    );
  }
  if (glyph === "rupture") {
    // 破裂: 圧力容器と破裂の放射線
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M9 8h6v10a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" />
        <path d="M10.5 5h3v2h-3z" />
        <path d="M11.2 2h1.6v2h-1.6z" />
        <path d="M5.2 6.2l2.3 2.3-1.1 1.1-2.3-2.3zM18.8 6.2l1.1 1.1-2.3 2.3-1.1-1.1zM2.5 12.2h3v1.6h-3zM18.5 12.2h3v1.6h-3z" />
      </svg>
    );
  }
  if (glyph === "stepping-through") {
    // 踏み抜き: 釘の出た板を踏む足
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M8 3h6.5c1.4 0 2.5 1.1 2.5 2.5V10h-3.4l.9 4H8.8z" />
        <path d="M8.8 15h5.4l.5 2.4c.2 1-.5 1.9-1.5 1.9H10c-.7 0-1.3-.5-1.4-1.2z" />
        <path d="M11.2 21.5v-1h1.6v1z" />
        <path d="M4 19.2h16v1.6H4z" />
        <path d="M11.1 19.2l.9-4.6.9 4.6z" transform="translate(0 -6.5)" />
      </svg>
    );
  }
  return null;
}

type AccidentTypePictogramProps = {
  type: AccidentType;
  /** sm=チップ内 / md=リスト行（既定） / lg=型グリッド・詳細ヘッダー */
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function AccidentTypePictogram({ type, size = "md", className = "" }: AccidentTypePictogramProps) {
  return <HazardGlyphBadge glyph={ACCIDENT_TYPE_GLYPH[type]} label={type} size={size} className={className} />;
}

type HazardGlyphBadgeProps = {
  glyph: AccidentGlyphId;
  /** aria-label・title 用の型名 */
  label: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

/**
 * グリフID直指定版（災害の型 正規化層の21分類＝教育スライド用）。
 * AccidentTypePictogram と同じ JIS 黄地＋黒グリフの文法。xl はスライド表紙用。
 */
export function HazardGlyphBadge({ glyph, label, size = "md", className = "" }: HazardGlyphBadgeProps) {
  const outer =
    size === "sm"
      ? "h-6 w-6 rounded-md"
      : size === "lg"
        ? "h-14 w-14 rounded-xl"
        : size === "xl"
          ? "h-24 w-24 rounded-2xl"
          : "h-9 w-9 rounded-lg";
  const inner = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : size === "xl" ? "h-16 w-16" : "h-5 w-5";
  const Lucide = LUCIDE_GLYPH[glyph];
  return (
    <span
      role="img"
      aria-label={`事故の型: ${label}`}
      title={label}
      data-testid={`accident-picto-${glyph}`}
      className={`inline-flex shrink-0 items-center justify-center bg-amber-400 text-slate-900 ${outer} ${className}`}
    >
      {Lucide ? (
        <Lucide aria-hidden="true" className={inner} strokeWidth={2.2} />
      ) : (
        <span aria-hidden="true" className={inner}>
          <CustomGlyph glyph={glyph} />
        </span>
      )}
    </span>
  );
}
