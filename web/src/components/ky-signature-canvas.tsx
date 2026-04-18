"use client";

import { useRef, useState } from "react";

type Props = {
  label: string;
  savedData?: string;
  onSave: (data: string) => void;
};

export function KySignatureCanvas({ label, savedData, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [method, setMethod] = useState<"canvas" | "text">("canvas");
  const [textVal, setTextVal] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      if (!t) return null;
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    lastPoint.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current?.x ?? pos.x, lastPoint.current?.y ?? pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  };

  const endDraw = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    if (method === "text") {
      if (!textVal.trim()) return;
      onSave(`text:${textVal.trim()}`);
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      onSave(canvas.toDataURL("image/png"));
    }
    setIsOpen(false);
  };

  const hasSignature =
    savedData?.startsWith("data:image") ||
    (savedData?.startsWith("text:") && savedData.length > 5);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-700">{label}</span>
        {hasSignature ? (
          <div className="flex items-center gap-2">
            {savedData?.startsWith("data:image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={savedData}
                alt={`${label}の署名`}
                className="h-7 max-w-[100px] rounded border border-slate-200 bg-white object-contain"
              />
            ) : (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {savedData?.replace("text:", "")}
              </span>
            )}
            <button
              type="button"
              onClick={() => onSave("")}
              className="rounded px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50"
            >
              クリア
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
          >
            署名する
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-2">
          <div className="flex gap-1">
            {(["canvas", "text"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                  method === m
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600"
                }`}
              >
                {m === "canvas" ? "手書きサイン" : "氏名テキスト"}
              </button>
            ))}
          </div>
          {method === "canvas" ? (
            <div>
              <canvas
                ref={canvasRef}
                width={560}
                height={120}
                className="w-full cursor-crosshair touch-none rounded border border-slate-300 bg-white"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              <p className="mt-1 text-[10px] text-slate-500">
                スマホを<strong>横向き</strong>にして、指でサインしてください
              </p>
            </div>
          ) : (
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="氏名を入力（簡易署名）"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              確定
            </button>
            {method === "canvas" && (
              <button
                type="button"
                onClick={clearCanvas}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600"
              >
                やり直し
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
