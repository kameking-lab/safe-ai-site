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
  /** KY記入中: KY用紙・KY一覧用 */
  "ky-writing": { src: "/mascot/mascot-ky-writing.webp", width: 270, height: 320 },
  /** 麦茶で一休み: 熱中症・暑熱ページ用 */
  "water-break": { src: "/mascot/mascot-water-break.webp", width: 316, height: 320 },
  /** 玉掛け合図（巻け）: 建設計算用 */
  "tamakake-signal": { src: "/mascot/mascot-tamakake-signal.webp", width: 272, height: 320 },
  /** 白衣+フラスコ: 化学物質RA・化学DB用 */
  "chemical-lab": { src: "/mascot/mascot-chemical-lab.webp", width: 249, height: 320 },
  /** 六法全書を読む: 法令ナビ・法改正用 */
  "law-reading": { src: "/mascot/mascot-law-reading.webp", width: 241, height: 300 },
  /** 吹き出しで会話: チャットボット用 */
  "chat-talk": { src: "/mascot/mascot-chat-talk.webp", width: 320, height: 310 },
  /** 虫眼鏡で調査: 事故DB用 */
  detective: { src: "/mascot/mascot-detective.webp", width: 271, height: 320 },
  /** 双眼鏡: 検索用 */
  binoculars: { src: "/mascot/mascot-binoculars.webp", width: 264, height: 320 },
  /** スコップで掘削: 建設計算（掘削）用 */
  "shovel-dig": { src: "/mascot/mascot-shovel-dig.webp", width: 320, height: 307 },
  /** バンザイ: クイズ正解・お祝い用 */
  banzai: { src: "/mascot/mascot-banzai.webp", width: 320, height: 295 },
  /** 拡声器: サイネージ朝礼用 */
  megaphone: { src: "/mascot/mascot-megaphone.webp", width: 283, height: 288 },
  /** 夏（タオル＋ひまわり）: トップ季節演出用 */
  "seasonal-summer": { src: "/mascot/mascot-seasonal-summer.webp", width: 291, height: 320 },
  /** 天秤: 労災判例用 */
  "court-scale": { src: "/mascot/mascot-court-scale.webp", width: 269, height: 320 },
  /** 新聞: 新着・速報用 */
  "news-read": { src: "/mascot/mascot-news-read.webp", width: 320, height: 315 },
  /** 聴診器: 健診スケジューラ用 */
  "health-check": { src: "/mascot/mascot-health-check.webp", width: 254, height: 320 },
  /** 計測器: 作業環境測定用 */
  "measure-meter": { src: "/mascot/mascot-measure-meter.webp", width: 282, height: 288 },
  /** 印鑑: 現場記録・打合せ書用 */
  "stamp-doc": { src: "/mascot/mascot-stamp-doc.webp", width: 281, height: 320 },
  /** 空を見上げる: 防災・気象用 */
  "weather-look": { src: "/mascot/mascot-weather-look.webp", width: 264, height: 320 },
  /** タブレット: AI・DX系用 */
  "tablet-dx": { src: "/mascot/mascot-tablet-dx.webp", width: 274, height: 320 },
  /** 電卓: 建設計算（結果）用 */
  calculator: { src: "/mascot/mascot-calculator.webp", width: 274, height: 320 },
  /** トロフィー: 達成・実績用 */
  trophy: { src: "/mascot/mascot-trophy.webp", width: 263, height: 320 },
} as const;

export type MascotVariant = keyof typeof VARIANT_MAP;

type MascotProps = {
  size?: MascotSize;
  variant?: MascotVariant;
  className?: string;
  alt?: string;
  /** ファーストビュー配置でLCP要素になり得る場合はtrue（lazyだとLCPを遅らせる） */
  eager?: boolean;
};

export function Mascot({
  size = "md",
  variant = "default",
  className = "",
  alt = "安全AIポータル マスコット",
  eager = false,
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
      loading={eager ? "eager" : "lazy"}
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
