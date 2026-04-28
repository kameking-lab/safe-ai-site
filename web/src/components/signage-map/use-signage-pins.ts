"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { SignagePin } from "./signage-map-leaflet";

const PIN_STORAGE_KEY = "signage-map-pins";
const TOKEN_STORAGE_KEY = "signage-map-browser-token";
const PIN_LIMIT = 10;

function loadToken(): string {
  if (typeof window === "undefined") return "";
  let t = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!t) {
    t = `bt_${crypto.randomUUID().replace(/-/g, "")}`;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, t);
  }
  return t;
}

function loadPins(): SignagePin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is SignagePin =>
        typeof p?.id === "string" &&
        typeof p?.label === "string" &&
        typeof p?.lat === "number" &&
        typeof p?.lng === "number",
    );
  } catch {
    return [];
  }
}

function persistPins(pins: SignagePin[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
}

// localStorage を購読する外部ストア（useSyncExternalStore 用）
const subscribers = new Set<() => void>();
function subscribe(cb: () => void) {
  subscribers.add(cb);
  if (typeof window !== "undefined") {
    const handler = () => cb();
    window.addEventListener("storage", handler);
    return () => {
      subscribers.delete(cb);
      window.removeEventListener("storage", handler);
    };
  }
  return () => {
    subscribers.delete(cb);
  };
}
function notify() {
  subscribers.forEach((cb) => cb());
}

let cachedPinsJson = "";
let cachedPins: SignagePin[] = [];
const EMPTY_PINS: SignagePin[] = [];
function getPinsSnapshot(): SignagePin[] {
  if (typeof window === "undefined") return EMPTY_PINS;
  const raw = window.localStorage.getItem(PIN_STORAGE_KEY) ?? "";
  if (raw === cachedPinsJson) return cachedPins;
  cachedPinsJson = raw;
  cachedPins = loadPins();
  return cachedPins;
}
function getServerPinsSnapshot(): SignagePin[] {
  return EMPTY_PINS;
}

export function useSignagePins() {
  const pins = useSyncExternalStore(subscribe, getPinsSnapshot, getServerPinsSnapshot);
  const [token] = useState<string>(() => loadToken());

  const addPin = useCallback(
    async (input: { label: string; lat: number; lng: number; email: string | null }) => {
      if (!token) throw new Error("token not ready");
      const limited = (prev: SignagePin[]) => {
        if (prev.length >= PIN_LIMIT) {
          throw new Error(`ピンは${PIN_LIMIT}件までです。`);
        }
        return prev;
      };
      // 上限チェック（同期）
      limited(pins);

      // サーバ側にも送る（失敗してもローカルは保存）
      let serverPin: SignagePin | null = null;
      try {
        const res = await fetch("/api/signage/pins", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-browser-token": token },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const json = (await res.json()) as { pin: SignagePin };
          serverPin = json.pin;
        }
      } catch {
        // ネットワーク失敗時はローカルのみ保存
      }

      const next: SignagePin = serverPin ?? {
        id: crypto.randomUUID(),
        label: input.label,
        lat: input.lat,
        lng: input.lng,
        email: input.email,
        createdAt: new Date().toISOString(),
      };
      const merged = [...pins, next];
      persistPins(merged);
      notify();
    },
    [pins, token],
  );

  const deletePin = useCallback(
    (id: string) => {
      const next = pins.filter((p) => p.id !== id);
      persistPins(next);
      notify();
      if (token) {
        void fetch(`/api/signage/pins?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "x-browser-token": token },
        }).catch(() => {});
      }
    },
    [pins, token],
  );

  return { pins, token, addPin, deletePin, limit: PIN_LIMIT };
}
