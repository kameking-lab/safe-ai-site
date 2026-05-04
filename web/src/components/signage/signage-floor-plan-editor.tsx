"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Upload, MapPin, Trash2, Save, X } from "lucide-react";

const IMAGE_KEY = "signage-floor-plan-image-v1";
const PINS_KEY = "signage-floor-plan-pins-v1";

type Pin = {
  id: string;
  xPct: number; // 0..100
  yPct: number;
  label: string;
  type: "danger" | "info" | "ppe";
};

const PIN_COLORS: Record<Pin["type"], string> = {
  danger: "#dc2626",
  info: "#0284c7",
  ppe: "#059669",
};

function newId() {
  return `pin-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function loadPins(): Pin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Pin[];
  } catch {
    return [];
  }
}

function savePins(pins: Pin[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PINS_KEY, JSON.stringify(pins));
}

export function SignageFloorPlanEditor() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<Pin["type"]>("danger");
  const [draftLabel, setDraftLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const img = window.localStorage.getItem(IMAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (img) setImageDataUrl(img);
    } catch {}
     
    setPins(loadPins());
  }, []);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setImageDataUrl(result);
        try {
          window.localStorage.setItem(IMAGE_KEY, result);
        } catch {
          alert("画像が大きすぎてローカル保存できませんでした。");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClickPlot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editing) return;
    if (!draftLabel.trim()) {
      alert("ピンのラベルを入力してください");
      return;
    }
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const next = [
      ...pins,
      { id: newId(), xPct, yPct, label: draftLabel.trim(), type: draftType },
    ];
    setPins(next);
    savePins(next);
    setDraftLabel("");
  };

  const removePin = (id: string) => {
    const next = pins.filter((p) => p.id !== id);
    setPins(next);
    savePins(next);
  };

  const clearAll = () => {
    if (!confirm("ピンを全削除します。よろしいですか？")) return;
    setPins([]);
    savePins([]);
  };

  const removeImage = () => {
    if (!confirm("アップロードした図面を削除し、サンプルに戻します。")) return;
    setImageDataUrl(null);
    try {
      window.localStorage.removeItem(IMAGE_KEY);
    } catch {}
  };

  return (
    <div className="space-y-2">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2 text-xs">
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-emerald-700 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600">
          <Upload className="h-3 w-3" />
          自社図面アップロード
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold ${
            editing
              ? "border border-amber-400 bg-amber-700 text-white"
              : "border border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
          }`}
        >
          <MapPin className="h-3 w-3" />
          {editing ? "ピン配置中（クリック）" : "ピン配置モード"}
        </button>
        {editing && (
          <>
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value as Pin["type"])}
              className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
            >
              <option value="danger">危険箇所（赤）</option>
              <option value="info">情報（青）</option>
              <option value="ppe">保護具置場（緑）</option>
            </select>
            <input
              type="text"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              placeholder="ラベル（例: 開口部）"
              className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
            />
          </>
        )}
        {pins.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-md border border-rose-600/60 bg-rose-950/50 px-2 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-900/50"
          >
            <Trash2 className="h-3 w-3" />
            全削除
          </button>
        )}
        {imageDataUrl && (
          <button
            type="button"
            onClick={removeImage}
            className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            <X className="h-3 w-3" />
            アップロード解除
          </button>
        )}
        <span className="ml-auto text-[10px] text-slate-400">
          ピン: {pins.length}件 / 端末内に保存
        </span>
      </div>

      <div
        ref={containerRef}
        onClick={handleClickPlot}
        className={`relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 ${
          editing ? "cursor-crosshair" : ""
        }`}
      >
        {imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt="自社図面"
            className="h-auto w-full"
            draggable={false}
          />
        ) : (
          <Image
            src="/images/signage-sample-floor-plan.svg"
            alt="現場レイアウト図面（サンプル）"
            width={1000}
            height={600}
            className="h-auto w-full"
            priority
            unoptimized
          />
        )}

        {/* ピン */}
        {pins.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
          >
            <div className="flex items-end gap-1">
              <div
                className="rounded-full p-1 shadow-lg"
                style={{ backgroundColor: PIN_COLORS[p.type] }}
                aria-label={`${p.type}: ${p.label}`}
              >
                <MapPin className="h-3.5 w-3.5 text-white" />
              </div>
              <span
                className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ marginBottom: 2 }}
              >
                {p.label}
              </span>
              {editing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePin(p.id);
                  }}
                  className="rounded-full bg-rose-600 p-0.5 text-white hover:bg-rose-500"
                  aria-label={`${p.label}を削除`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="px-1 text-[10px] leading-snug text-slate-400">
        ※ 図面とピンはこの端末（localStorage）に保存され、外部送信はされません。
      </p>
    </div>
  );
}
