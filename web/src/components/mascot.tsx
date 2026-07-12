import Image from "next/image";

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 96,
  xl: 192,
} as const;

type MascotSize = keyof typeof SIZE_MAP;

/**
 * バリアント別マスコット画像（正: docs/mascot-style-guide-2026-07-12.md）。
 * width/height は最適化済みwebpの実寸。表示は size(px) を長辺として比率維持で縮小し、
 * 明示 width/height で CLS 0 を維持する。
 */
const VARIANT_MAP = {
  /** 頭部バッジ（緑円＋角丸四角）: フッター・チャットアバター等の既定 */
  default: { src: "/mascot/mascot-chihuahua-4.webp", width: 1024, height: 1024 },
  /** お辞儀: 404・エラー画面用 */
  bow: { src: "/mascot/mascot-bow.webp", width: 297, height: 320 },
  /** 考え中: 空状態・ローディング用 */
  thinking: { src: "/mascot/mascot-thinking.webp", width: 314, height: 320 },
  /** 指差呼称: トップヒーロー用 */
  pointing: { src: "/mascot/mascot-pointing.webp", width: 400, height: 388 },
  /** 講師姿: 教育スライド用 */
  teacher: { src: "/mascot/mascot-teacher.webp", width: 320, height: 320 },
  /** 敬礼: 完了画面用 */
  salute: { src: "/mascot/mascot-salute.webp", width: 309, height: 320 },
} as const;

export type MascotVariant = keyof typeof VARIANT_MAP;

type MascotProps = {
  size?: MascotSize;
  variant?: MascotVariant;
  className?: string;
  alt?: string;
};

export function Mascot({
  size = "md",
  variant = "default",
  className = "",
  alt = "安全AIポータル マスコット",
}: MascotProps) {
  const px = SIZE_MAP[size];
  const v = VARIANT_MAP[variant];
  const scale = px / Math.max(v.width, v.height);
  const w = Math.round(v.width * scale);
  const h = Math.round(v.height * scale);
  return (
    <Image
      src={v.src}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      className={className}
      style={{ objectFit: "contain", width: w, height: h }}
    />
  );
}

type MascotWithBubbleProps = MascotProps & {
  message: string;
};

export function MascotWithBubble({ message, size = "md", ...rest }: MascotWithBubbleProps) {
  return (
    <div className="flex items-end gap-2">
      <Mascot size={size} {...rest} />
      <div className="rounded-2xl rounded-bl-none border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
        {message}
      </div>
    </div>
  );
}
