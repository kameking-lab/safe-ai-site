/**
 * セクション区切りの波形デバイダ（視覚刷新 第4波・2026-07-13）。
 * フラット白の「テンプレ感」を消すための軽量インラインSVG（画像リクエストなし）。
 * tone でセクションの地色に合わせ、flip で上下反転する。装飾のため aria-hidden。
 */
type SectionWaveProps = {
  /** 波の塗り色（下側セクションの地色に合わせる） */
  tone?: "emerald" | "slate" | "white";
  /** 上下反転（下のセクション→上のセクションへ繋ぐとき） */
  flip?: boolean;
  className?: string;
};

const TONE_FILL: Record<NonNullable<SectionWaveProps["tone"]>, string> = {
  emerald: "fill-emerald-50/80 dark:fill-emerald-950/30",
  slate: "fill-slate-50 dark:fill-slate-900",
  white: "fill-white dark:fill-slate-950",
};

export function SectionWave({ tone = "emerald", flip = false, className = "" }: SectionWaveProps) {
  return (
    <div aria-hidden="true" className={`overflow-hidden leading-none ${flip ? "rotate-180" : ""} ${className}`}>
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        className={`block h-6 w-full sm:h-8 ${TONE_FILL[tone]}`}
      >
        <path d="M0,32 C240,8 480,0 720,16 C960,32 1200,44 1440,24 L1440,48 L0,48 Z" />
      </svg>
    </div>
  );
}
