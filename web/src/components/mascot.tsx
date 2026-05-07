import Image from "next/image";

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 96,
  xl: 192,
} as const;

type MascotSize = keyof typeof SIZE_MAP;

// variant は将来の画像差し替え拡張用（現状 default のみ）
export type MascotVariant = "default" | "happy" | "thinking" | "pointing";

type MascotProps = {
  size?: MascotSize;
  variant?: MascotVariant;
  className?: string;
  alt?: string;
};

export function Mascot({
  size = "md",
  variant: _variant = "default",
  className = "",
  alt = "ANZEN AIマスコット",
}: MascotProps) {
  const px = SIZE_MAP[size];
  return (
    <Image
      src="/mascot/mascot-chihuahua-4.png"
      alt={alt}
      width={px}
      height={px}
      loading="lazy"
      className={className}
      style={{ objectFit: "contain", width: px, height: px }}
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
