"use client";

import { QrCode } from "lucide-react";
import { useRef, useState } from "react";

export function SafeQrButton({
  canonicalUrl,
}: {
  canonicalUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  async function createQr() {
    if (!canvasRef.current) return;
    try {
      const { toCanvas } = await import("qrcode");
      await toCanvas(canvasRef.current, canonicalUrl, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setOpen(true);
      setStatus(
        "個人情報・query・tokenを含まない問題のcanonical URLをQRコードにしました。",
      );
    } catch {
      setStatus(
        "QRコードを作成できませんでした。画面のURLを直接共有してください。",
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={createQr}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-white/60 bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white print:hidden"
      >
        <QrCode className="h-5 w-5" aria-hidden="true" />
        参加者用QR
      </button>
      <div
        className={open ? "mt-3 rounded-xl bg-white p-3 text-slate-950" : "sr-only"}
        aria-hidden={!open}
      >
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          aria-label="この問題のcanonical URLを表すQRコード"
          className="mx-auto h-60 w-60 max-w-full"
        />
        <p className="mt-2 break-all text-center text-xs">{canonicalUrl}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-200" role="status">
        {status}
      </p>
    </div>
  );
}
