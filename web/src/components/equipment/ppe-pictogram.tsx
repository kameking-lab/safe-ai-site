import type { LucideIcon } from "lucide-react";
import { Glasses, Hand, HardHat, Headphones, LifeBuoy, Shield, Shirt } from "lucide-react";
import { PPE_ICON_LABEL, type PpeIconId } from "@/lib/equipment/ppe-pictogram-map";

/**
 * 保護具ピクトグラム（青い丸の着用義務標識スタイル・柱0）。
 * JIS Z 9103 安全色の青=指示 / ISO 7010 M系標識と同じ文法をインラインSVGで自作
 * （簡略化した自作描画なのでライセンス問題なし）。
 * 中の図記号は lucide（ヘルメット・メガネ・耳・手・服・浮輪・盾）＋自作パス
 * （防毒/防じんマスク・ブーツ・ハーネス・高視認ベスト）。
 */

const LUCIDE_GLYPH: Partial<Record<PpeIconId, LucideIcon>> = {
  helmet: HardHat,
  goggles: Glasses,
  ear: Headphones,
  gloves: Hand,
  clothing: Shirt,
  "life-jacket": LifeBuoy,
  shield: Shield,
};

/** 自作グリフ（viewBox 0 0 24 24・白塗り）。 */
function CustomGlyph({ icon }: { icon: PpeIconId }) {
  if (icon === "gas-mask") {
    // 防毒マスク: 面体＋左右の吸収缶
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M12 3c3.6 0 6 2.4 6 5.5 0 2.8-1.6 5-3.4 6.1-.8.5-1.6.7-2.6.7s-1.8-.2-2.6-.7C7.6 13.5 6 11.3 6 8.5 6 5.4 8.4 3 12 3z" />
        <circle cx="4.5" cy="15.5" r="2.8" />
        <circle cx="19.5" cy="15.5" r="2.8" />
        <path d="M7 13l-1.5 1.5M17 13l1.5 1.5" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="19.5" rx="2.4" ry="1.8" />
      </svg>
    );
  }
  if (icon === "dust-mask") {
    // 防じんマスク: カップ型＋ゴムひも
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-full w-full">
        <path d="M6.5 9c1.5-2.5 9.5-2.5 11 0 1.2 2 1.2 5-.5 7-1.4 1.6-8.6 1.6-10 0-1.7-2-1.7-5-.5-7z" fill="currentColor" />
        <path d="M6.8 10.5C4.5 10 3 11 2 12.5M17.2 10.5c2.3-.5 3.8.5 4.8 2M6.8 13.5c-2.3.5-3.6 1.7-4.3 3M17.2 13.5c2.3.5 3.6 1.7 4.3 3" />
      </svg>
    );
  }
  if (icon === "boots") {
    // 安全靴（ブーツ）
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M7 3h6v8l5.5 3.5c1 .6 1.5 1.4 1.5 2.5v2H4v-13a3 3 0 0 1 3-3z" />
        <path d="M13 11h-3" stroke="#1d4ed8" strokeWidth="1.2" />
      </svg>
    );
  }
  if (icon === "harness") {
    // フルハーネス: 人体＋胸のX字ベルト
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="4" r="2.4" />
        <path d="M7 22c0-6 1.8-13.5 5-13.5S17 16 17 22z" />
        <path d="M8.5 11l7 9M15.5 11l-7 9" stroke="#1d4ed8" strokeWidth="1.4" />
      </svg>
    );
  }
  if (icon === "visibility") {
    // 高視認性ベスト: ベスト形＋反射帯2本
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M8 3l4 2 4-2 2 4-1 14H7L6 7z" />
        <path d="M6.6 12h10.8M6.4 16h11.2" stroke="#1d4ed8" strokeWidth="1.6" />
      </svg>
    );
  }
  return null;
}

type PpePictogramProps = {
  icon: PpeIconId;
  /** sm=チップ内 / md=リスト行（既定） / lg=カテゴリカード */
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function PpePictogram({ icon, size = "md", className = "" }: PpePictogramProps) {
  const label = PPE_ICON_LABEL[icon];
  const outer = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-14 w-14" : "h-9 w-9";
  const inner = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  const Lucide = LUCIDE_GLYPH[icon];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid={`ppe-picto-${icon}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-blue-700 text-white ${outer} ${className}`}
    >
      {Lucide ? (
        <Lucide aria-hidden="true" className={inner} strokeWidth={2.2} />
      ) : (
        <span aria-hidden="true" className={inner}>
          <CustomGlyph icon={icon} />
        </span>
      )}
    </span>
  );
}
