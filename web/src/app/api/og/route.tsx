import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SITE_DISPLAY_HOST } from "@/lib/seo-metadata";
import { clampOgText, ogTitleFontSize, OG_TITLE_MAX, OG_DESC_MAX } from "@/lib/og-url";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // マスコット頭部（円形切り抜き・14KB）。取得失敗時は絵文字にフォールバック
  let mascotSrc: string | null = null;
  try {
    const res = await fetch(new URL("/mascot/mascot-head-256.png", req.url));
    if (res.ok) {
      const buf = await res.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      mascotSrc = `data:image/png;base64,${btoa(bin)}`;
    }
  } catch {
    mascotSrc = null;
  }
  const lang = searchParams.get("lang") === "en" ? "en" : "ja";
  const defaults = lang === "en"
    ? {
        title: "Trace sources. Confirm conditions. Act safely.",
        tagline: "Anzen AI Portal — official-source navigation and field checks",
      }
    : {
        title: "出典をたどり、条件を確認し、安全行動へ。",
        tagline: "安全AIポータル — 一次資料への到達と現場確認を支援",
      };
  const safeDefaultDescription =
    lang === "en"
      ? "Trace official sources and handle today’s risk, KY, laws, incidents, chemicals, and weather with visible verification status."
      : "公式資料への到達と、今日のリスク・KY・法令・事故・化学物質・気象の確認を支援します。AIは補助であり、人による確認が必要です。";
  // data 由来（記事/事故/通達…）の title/desc は長さ不定。Satori は overflow を
  // クリップしないため、安全長へ畳んでから描画し 630px キャンバスの縦溢れを防ぐ。
  const title = clampOgText(searchParams.get("title") ?? defaults.title, OG_TITLE_MAX);
  const desc = clampOgText(
    searchParams.get("desc") ?? safeDefaultDescription,
    OG_DESC_MAX,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0b5d4b 0%, #142d4c 68%, #071c31 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            width: "104px",
            height: "104px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
            fontSize: "52px",
          }}
        >
          {mascotSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mascotSrc} width={88} height={88} alt="" />
          ) : (
            "⛑️"
          )}
        </div>

        <div
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#a7f3d0",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          {defaults.tagline}
        </div>

        <div
          style={{
            fontSize: `${ogTitleFontSize(title.length)}px`,
            fontWeight: "900",
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.25,
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "22px",
            color: "#d1fae5",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: "800px",
          }}
        >
          {desc}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "60px",
            fontSize: "18px",
            color: "rgba(255,255,255,0.5)",
            fontWeight: "600",
            letterSpacing: "0.05em",
          }}
        >
          {SITE_DISPLAY_HOST}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    }
  );
}
