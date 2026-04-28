#!/usr/bin/env node
/**
 * 登録ピンの近隣で警報の発令/解除があったユーザーへメール通知。
 *
 * - 通知ハブは Resend（RESEND_API_KEY）
 * - 未設定時は console.log フォールバック（ドライラン）
 * - 配信解除リンク必須（NEXT_PUBLIC_SITE_URL/notify/unsubscribe?token=...）
 *
 * 入力:
 *   web/src/data/jma/warnings.json   現在の警報状態（fetch-jma-data.mjs の出力）
 *   data/signage-pins.json           対象ピン一覧（DB 接続前のフォールバック）
 *   data/signage-notify-state.json   前回送信済み状態（差分検出）
 *
 * 通常運用:
 *   1. fetch-jma-data.mjs を先に実行
 *   2. その後この notify-pin-users.mjs を実行
 *   3. notify-state.json を commit すれば差分通知が成立
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const WARNINGS_FILE = join(REPO_ROOT, "web", "src", "data", "jma", "warnings.json");
const PINS_FILE = join(REPO_ROOT, "data", "signage-pins.json");
const STATE_FILE = join(REPO_ROOT, "data", "signage-notify-state.json");

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? null;
const FROM_EMAIL = process.env.NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.example.jp>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.jp";

/** 緯度経度から都道府県を簡易判定（最寄り重心） */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

const FALLBACK_CENTROIDS = [
  { iso: "JP-01", lat: 43.0642, lng: 141.347 },
  { iso: "JP-04", lat: 38.2688, lng: 140.8721 },
  { iso: "JP-13", lat: 35.6895, lng: 139.6917 },
  { iso: "JP-14", lat: 35.4478, lng: 139.6425 },
  { iso: "JP-23", lat: 35.1815, lng: 136.9066 },
  { iso: "JP-27", lat: 34.6937, lng: 135.5023 },
  { iso: "JP-34", lat: 34.3853, lng: 132.4553 },
  { iso: "JP-40", lat: 33.6064, lng: 130.4181 },
  { iso: "JP-47", lat: 26.2124, lng: 127.6809 },
];

function nearestIso(lat, lng) {
  let best = FALLBACK_CENTROIDS[0];
  let bestD = Infinity;
  for (const c of FALLBACK_CENTROIDS) {
    const d = haversineKm({ lat, lng }, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.iso;
}

async function readJsonOrDefault(path, def) {
  try {
    const buf = await readFile(path, "utf8");
    return JSON.parse(buf);
  } catch {
    return def;
  }
}

const RANK = { none: 0, advisory: 1, warning: 2, special: 3 };

function levelLabel(level) {
  if (level === "special") return "特別警報";
  if (level === "warning") return "警報";
  if (level === "advisory") return "注意報";
  return "発表なし";
}

function renderTemplate(kind, args) {
  const unsubUrl = `${SITE_URL}/notify/unsubscribe?token=${encodeURIComponent(args.unsubToken)}`;
  if (kind === "issued") {
    return {
      subject: `【${levelLabel(args.newLevel)}】${args.iso} のピン地点（${args.label}）`,
      text: `登録地点「${args.label}」の周辺で${levelLabel(args.newLevel)}が発表されました。\n\n${args.headline ?? ""}\n\n出典: 気象庁 https://www.jma.go.jp/bosai/\n\n配信停止: ${unsubUrl}`,
      html: `<p><strong>登録地点「${args.label}」</strong>の周辺で<strong>${levelLabel(args.newLevel)}</strong>が発表されました。</p><p>${args.headline ?? ""}</p><p style="font-size:12px;color:#555">出典: <a href="https://www.jma.go.jp/bosai/">気象庁</a></p><p style="font-size:11px;color:#888">この通知の配信を停止する: <a href="${unsubUrl}">${unsubUrl}</a></p>`,
    };
  }
  return {
    subject: `【解除】${args.iso} のピン地点（${args.label}）の警報が解除されました`,
    text: `登録地点「${args.label}」周辺の警報・注意報が解除されました。\n\n出典: 気象庁\n\n配信停止: ${unsubUrl}`,
    html: `<p>登録地点「<strong>${args.label}</strong>」周辺の警報・注意報が解除されました。</p><p style="font-size:12px;color:#555">出典: <a href="https://www.jma.go.jp/bosai/">気象庁</a></p><p style="font-size:11px;color:#888">配信停止: <a href="${unsubUrl}">${unsubUrl}</a></p>`,
  };
}

async function sendViaResend({ to, subject, text, html }) {
  if (!RESEND_API_KEY) {
    console.log("[notify-pin-users][DRY-RUN] -> ", to, subject);
    console.log(text);
    return { ok: true, dryRun: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, text, html }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    return { ok: false, error: `${res.status}: ${errBody}` };
  }
  return { ok: true };
}

async function main() {
  const warnings = await readJsonOrDefault(WARNINGS_FILE, { byIso: {} });
  const pins = await readJsonOrDefault(PINS_FILE, { pins: [] });
  const prevState = await readJsonOrDefault(STATE_FILE, { byPin: {} });

  const newState = { byPin: {}, updatedAt: new Date().toISOString() };
  const events = [];

  for (const pin of pins.pins ?? []) {
    if (!pin.email) {
      newState.byPin[pin.id] = { iso: pin.iso ?? null, level: "none" };
      continue;
    }
    const iso = pin.iso ?? nearestIso(pin.lat, pin.lng);
    const cur = warnings.byIso?.[iso]?.level ?? "none";
    const prev = prevState.byPin?.[pin.id]?.level ?? "none";
    newState.byPin[pin.id] = { iso, level: cur };

    if (RANK[cur] > RANK[prev]) {
      // 発令
      const headline =
        warnings.byIso?.[iso]?.entries?.find((e) => e.headline)?.headline ?? null;
      events.push({ kind: "issued", pin, iso, newLevel: cur, headline });
    } else if (RANK[cur] < RANK[prev] && cur === "none") {
      // 解除（警報・注意報すべて消えたとき）
      events.push({ kind: "cleared", pin, iso });
    }
  }

  console.log(`[notify-pin-users] events=${events.length} pins=${(pins.pins ?? []).length}`);

  for (const ev of events) {
    const tpl = renderTemplate(ev.kind, {
      label: ev.pin.label ?? "（無題）",
      iso: ev.iso,
      newLevel: ev.newLevel,
      headline: ev.headline,
      unsubToken: ev.pin.unsubToken ?? ev.pin.id,
    });
    const result = await sendViaResend({ to: ev.pin.email, ...tpl });
    if (!result.ok) {
      console.error(`[notify-pin-users] send failed for ${ev.pin.email}: ${result.error}`);
    }
  }

  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(newState, null, 2), "utf8");
  console.log(`[notify-pin-users] state saved: ${STATE_FILE}`);
}

main().catch((err) => {
  console.error("[notify-pin-users] fatal:", err);
  process.exit(1);
});
