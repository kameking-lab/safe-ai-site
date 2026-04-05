import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
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
          background: "linear-gradient(135deg, #1a7a4c 0%, #166640 60%, #0f4d2e 100%)",
          padding: "60px",
        }}
      >
        {/* Helmet icon */}
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
            fontSize: "22px",
            fontWeight: "700",
            color: "#a7f3d0",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          ANZEN AI — 労働安全コンサルタント監修
        </div>

        <div
          style={{
            fontSize: "56px",
            fontWeight: "900",
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "24px",
          }}
        >
          現場の安全を、AIで変える。
        </div>

        <div
          style={{
            fontSize: "24px",
            color: "#d1fae5",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          法改正・現場リスク・事故DB・KY用紙・Eラーニングを一つのポータルに集約
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
          safe-ai-site.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
