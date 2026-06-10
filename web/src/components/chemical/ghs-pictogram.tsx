import type { LucideIcon } from "lucide-react";
import { Bomb, Fish, Flame, Skull } from "lucide-react";
import { GHS_SYMBOL_LABEL, type GhsSymbolId } from "@/lib/chemical/ghs-pictogram-map";

/**
 * GHS絵表示（赤ひし形ピクトグラム・柱0）。
 * ドラム缶ラベルと同じ視覚言語でハザードを伝える。インラインSVG自作
 * （簡略化した自作描画なのでライセンス問題なし。GHS絵表示自体は国連標準）。
 * 中の図記号は lucide（炎・どくろ・爆発・魚）＋自作パス（腐食・酸化性・
 * 高圧ガス・健康有害性）＋感嘆符はテキスト。
 */

const LUCIDE_GLYPH: Partial<Record<GhsSymbolId, LucideIcon>> = {
  flame: Flame,
  skull: Skull,
  explosive: Bomb,
  environment: Fish,
};

/** 自作グリフ（viewBox 0 0 24 24・currentColor）。 */
function CustomGlyph({ symbol }: { symbol: GhsSymbolId }) {
  if (symbol === "oxidizer") {
    // 円上の炎（GHS03）: 下に太い円、上に炎
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-full w-full">
        <circle cx="12" cy="18" r="3.5" />
        <path d="M12 1.5c2 2.6 3.7 3.7 3.7 6.3a3.7 3.7 0 0 1-7.4 0c0-2.6 1.7-3.7 3.7-6.3z" />
      </svg>
    );
  }
  if (symbol === "gas-cylinder") {
    // ガスボンベ（GHS04）
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <rect x="8.5" y="6.5" width="7" height="15" rx="3" />
        <rect x="10.5" y="3" width="3" height="3.5" />
        <rect x="9" y="1.5" width="6" height="1.8" rx="0.9" />
      </svg>
    );
  }
  if (symbol === "corrosion") {
    // 腐食性（GHS05）: 試験管から滴が落ちて表面を侵す
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M4 3l5 2-1.5 3L3.5 6z" />
        <path d="M8 10c0 1.4 1 2.4 2 2.4s2-1 2-2.4c0-1-2-3.4-2-3.4S8 9 8 10z" />
        <path d="M15 13c0 1.2.9 2 1.8 2s1.8-.8 1.8-2c0-.9-1.8-3-1.8-3s-1.8 2.1-1.8 3z" />
        <path d="M3 19h18v2.5H3z" />
        <path d="M7 19l2-2.5 2 2.5z" fill="#fff" />
      </svg>
    );
  }
  if (symbol === "health-hazard") {
    // 健康有害性（GHS08）: 人体シルエット＋胸の星形
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <circle cx="12" cy="4" r="2.6" />
        <path d="M5.5 22c0-6 2.4-10.5 6.5-10.5S18.5 16 18.5 22z" />
        <path
          d="M12 12.8l1.1 2.3 2.5.4-1.8 1.8.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.8 2.5-.4z"
          fill="#fff"
        />
      </svg>
    );
  }
  return null;
}

type GhsPictogramProps = {
  symbol: GhsSymbolId;
  /** sm=ハザードカード内 / md=結論カードの絵の列（既定） */
  size?: "sm" | "md";
  className?: string;
};

export function GhsPictogram({ symbol, size = "md", className = "" }: GhsPictogramProps) {
  const label = GHS_SYMBOL_LABEL[symbol];
  const outer = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const inner = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const Lucide = LUCIDE_GLYPH[symbol];
  return (
    <span
      role="img"
      aria-label={`GHS絵表示: ${label}`}
      title={label}
      data-testid={`ghs-picto-${symbol}`}
      className={`relative inline-flex shrink-0 items-center justify-center ${outer} ${className}`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M50 4 96 50 50 96 4 50Z" fill="#fff" stroke="#dc2626" strokeWidth="7" strokeLinejoin="round" />
      </svg>
      {symbol === "exclamation" ? (
        <span aria-hidden="true" className={`relative font-black leading-none text-slate-900 ${size === "sm" ? "text-base" : "text-xl"}`}>
          !
        </span>
      ) : Lucide ? (
        <Lucide aria-hidden="true" className={`relative text-slate-900 ${inner}`} strokeWidth={2.4} />
      ) : (
        <span aria-hidden="true" className={`relative text-slate-900 ${inner}`}>
          <CustomGlyph symbol={symbol} />
        </span>
      )}
    </span>
  );
}
