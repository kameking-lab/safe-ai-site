"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { SignagePin } from "./signage-map-leaflet";

const PIN_STORAGE_KEY = "signage-map-pins";
const PIN_LIMIT = 10;

function loadPins(): SignagePin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // 旧形式にメールが残っていても読み戻さず、次回保存時に削除する。
    return parsed.flatMap((value): SignagePin[] => {
      if (!value || typeof value !== "object") return [];
      const pin = value as Record<string, unknown>;
      if (
        typeof pin.id !== "string" ||
        typeof pin.label !== "string" ||
        typeof pin.lat !== "number" ||
        typeof pin.lng !== "number"
      ) {
        return [];
      }
      return [
        {
          id: pin.id,
          label: pin.label.slice(0, 60),
          lat: pin.lat,
          lng: pin.lng,
          createdAt:
            typeof pin.createdAt === "string" &&
            Number.isFinite(Date.parse(pin.createdAt))
              ? pin.createdAt
              : "1970-01-01T00:00:00.000Z",
        },
      ];
    });
  } catch {
    return [];
  }
}

function persistPins(pins: SignagePin[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
}

const subscribers = new Set<() => void>();
function subscribe(callback: () => void) {
  subscribers.add(callback);
  if (typeof window !== "undefined") {
    const handler = () => callback();
    window.addEventListener("storage", handler);
    return () => {
      subscribers.delete(callback);
      window.removeEventListener("storage", handler);
    };
  }
  return () => subscribers.delete(callback);
}

function notify() {
  subscribers.forEach((callback) => callback());
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
  const pins = useSyncExternalStore(
    subscribe,
    getPinsSnapshot,
    getServerPinsSnapshot,
  );

  const addPin = useCallback(
    async (input: { label: string; lat: number; lng: number }) => {
      if (pins.length >= PIN_LIMIT) {
        throw new Error(`ピンは${PIN_LIMIT}件までです。`);
      }
      const nextPin: SignagePin = {
        id: crypto.randomUUID(),
        label: input.label.trim().slice(0, 60),
        lat: input.lat,
        lng: input.lng,
        createdAt: new Date().toISOString(),
      };
      persistPins([...pins, nextPin]);
      notify();
    },
    [pins],
  );

  const deletePin = useCallback(
    (id: string) => {
      persistPins(pins.filter((pin) => pin.id !== id));
      notify();
    },
    [pins],
  );

  return { pins, addPin, deletePin, limit: PIN_LIMIT };
}
