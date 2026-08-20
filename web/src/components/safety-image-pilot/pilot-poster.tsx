import Image from "next/image";
import {
  PILOT_LAYOUTS,
  PILOT_TEXTS,
  type PilotLanguage,
  type PilotVariant,
} from "@/data/safety-image-pilot";

function BrandLayer() {
  return (
    <div
      className="absolute bottom-[1.8%] left-[2.4%] flex w-[34%] items-center gap-[2%] rounded-[0.7rem] border-2 border-emerald-700 bg-white/95 px-[1.5%] py-[1%] text-slate-950 shadow-sm"
      aria-label="ブランド表示：安全AIポータル"
    >
      <Image
        src="/mascot/mascot-head-256.png"
        alt=""
        width={256}
        height={256}
        className="h-auto w-[28%] shrink-0"
      />
      <span className="whitespace-nowrap text-[2.65cqw] font-black leading-none">
        © 安全AIポータル
      </span>
    </div>
  );
}

function AfterTextLayer({ language }: { language: PilotLanguage }) {
  const { width, height } = PILOT_LAYOUTS.canvas;
  if (language === "all") {
    const panel = PILOT_LAYOUTS.all.panel;
    return (
      <div
        className="absolute rounded-[0.8rem] border border-sky-950 bg-white/90 shadow-sm"
        style={{
          left: `${(panel.x / width) * 100}%`,
          top: `${(panel.y / height) * 100}%`,
          width: `${(panel.width / width) * 100}%`,
          height: `${(panel.height / height) * 100}%`,
        }}
        aria-hidden="true"
      >
        {PILOT_LAYOUTS.all.lines.map((line, index) => (
          <span
            key={line.language}
            className="absolute whitespace-nowrap font-black leading-none tracking-tight text-sky-950"
            style={{
              left: `${((line.x - panel.x) / panel.width) * 100}%`,
              top: `${((line.y - panel.y - line.fontSize * 0.82) / panel.height) * 100}%`,
              fontSize: `${(line.fontSize / width) * 100}cqw`,
            }}
          >
            {PILOT_TEXTS.all[index]}
          </span>
        ))}
      </div>
    );
  }

  const panel = PILOT_LAYOUTS.single.panel;
  const definition = PILOT_LAYOUTS.single[language];
  return (
    <div
      className="absolute rounded-[0.8rem] border border-sky-950 bg-white/90 shadow-sm"
      style={{
        left: `${(panel.x / width) * 100}%`,
        top: `${(panel.y / height) * 100}%`,
        width: `${(panel.width / width) * 100}%`,
        height: `${(panel.height / height) * 100}%`,
      }}
      aria-hidden="true"
    >
      {definition.lines.map((line, index) => (
        <span
          key={`${language}-${line}`}
          className="absolute whitespace-nowrap font-black leading-none tracking-tight text-sky-950"
          style={{
            left: "4%",
            top: `${((definition.top + index * definition.lineHeight - panel.y - definition.fontSize * 0.82) / panel.height) * 100}%`,
            fontSize: `${(definition.fontSize / width) * 100}cqw`,
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}

export function PilotPoster({
  variant,
  language,
  branded,
  priority = false,
}: {
  variant: PilotVariant;
  language: PilotLanguage;
  branded: boolean;
  priority?: boolean;
}) {
  const alt =
    variant === "a"
      ? `保護帽を正しく着用した建設作業員の安全イラスト。${language === "all" ? "5言語" : PILOT_TEXTS[language]}を後付け表示`
      : "保護帽を正しく着用した建設作業員と、画像生成時に直接描かれた5言語の安全メッセージ";
  return (
    <div
      className="relative isolate aspect-[1122/1402] w-full overflow-hidden rounded-2xl bg-sky-50 shadow-inner"
      style={{ containerType: "inline-size" }}
      role="img"
      aria-label={alt}
    >
      <Image
        src={
          variant === "a"
            ? "/safety-images/pilot/helmet-required-clean.webp"
            : "/safety-images/pilot/helmet-required-direct-text.webp"
        }
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 1024px) 94vw, 45vw"
        className="object-cover"
      />
      {variant === "a" ? <AfterTextLayer language={language} /> : null}
      {branded ? <BrandLayer /> : null}
    </div>
  );
}
