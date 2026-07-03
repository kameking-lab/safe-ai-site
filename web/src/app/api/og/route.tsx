import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SITE_DISPLAY_HOST } from "@/lib/seo-metadata";

export const runtime = "edge";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") === "en" ? "en" : "ja";
  const defaults = lang === "en"
    ? {
        title: "Reshape workplace safety with AI.",
        desc: "Law updates, accident DB, KY forms, chemical RA, and e-learning — one portal for site safety.",
        tagline: "Anzen AI Portal — Supervised by an OSH Consultant",
      }
    : {
        title: "現場の安全を、AIで変える。",
        desc: "法改正・現場リスク・事故DB・KY用紙・Eラーニングを一つのポータルに集約",
        tagline: "安全AIポータル — 労働安全衛生コンサルタント監修",
      };
  const title = searchParams.get("title") ?? defaults.title;
  const desc = searchParams.get("desc") ?? defaults.desc;

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
            "linear-gradient(135deg, #1a7a4c 0%, #166640 60%, #0f4d2e 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
            fontSize: "52px",
          }}
        >
          ⛑️
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
            fontSize: title.length > 20 ? "40px" : "52px",
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
