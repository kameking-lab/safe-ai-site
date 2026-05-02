"use client";

import Image from "next/image";

type Props = {
  src?: string;
  alt?: string;
};

/**
 * サイネージ初期表示用の図面サンプル。
 * 自社図面に差し替えられるよう、src を上書き可能にしている。
 */
export function SignageFloorPlan({
  src = "/images/signage-sample-floor-plan.svg",
  alt = "現場レイアウト図面",
}: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80">
      <Image
        src={src}
        alt={alt}
        width={1000}
        height={600}
        className="h-auto w-full"
        priority
        unoptimized
      />
      <p className="px-3 py-2 text-[10px] leading-snug text-slate-400 sm:text-xs">
        図面サンプル（自社図面 SVG/PNG に差し替え可能）。<code className="rounded bg-slate-800 px-1 text-slate-300">/images/signage-sample-floor-plan.svg</code>
      </p>
    </div>
  );
}
