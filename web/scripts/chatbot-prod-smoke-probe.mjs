#!/usr/bin/env node
/**
 * 安衛法チャットボット 週次スモークプローブ（T10・2026-07-03 / 診断04 §5.4）。
 *
 * 本番診断（docs/fable-diagnosis-2026-07-02/04-chatbot-accuracy.md）の23問プローブを
 * 縮小移植したもの。5問だけを本番 /api/chatbot に直叩きし、実際に修正済みの3つの
 * 事故（偽の範囲外警告・プレースホルダ漏出・関連条文ノイズ）＋2つの回帰（adjacent誤
 * ヘッダ・誤答）が再発していないかを機械検知する。ハルシネーション検知そのものは
 * 既存のRAG evalが担うため、ここでは「後処理・UI層の事故」の早期検知に限定する。
 *
 * Usage:
 *   node scripts/chatbot-prod-smoke-probe.mjs
 *   CHATBOT_SMOKE_BASE_URL=https://www.anzen-ai-portal.jp node scripts/chatbot-prod-smoke-probe.mjs
 *
 * 週次自動実行（GitHub Actions cron）化は、本番 Gemini API を毎週消費する運用変更の
 * ため、CLAUDE.md の「必ずオーナーに確認すること」に照らしオーナー承認後にワイヤリング
 * する（本スクリプトは単体で完成・手動実行可）。
 */
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.CHATBOT_SMOKE_BASE_URL || "http://127.0.0.1:3000";
const INTERVAL_MS = 4000;
const OUT_PATH = path.resolve("docs/third-party-reviews/scripts/chatbot-prod-smoke-latest.json");

/**
 * 診断04で実際に不具合が出た/出ていた5問を回帰カナリアとして固定。
 * トピックは全て自班route（/chatbot）が既に修正済みのバグに対応する。
 */
const QUESTIONS = [
  {
    id: "scope-warning",
    question: "化学物質管理者の選任要件は？",
    note: "診断04 Q8: 正答なのに『安衛法・安衛則は提供データ範囲外』と誤警告していた（T1で是正）",
  },
  {
    id: "placeholder-leak",
    question: "クレーン運転の資格区分は？",
    note: "診断04 Q10: 『施行：YYYY年MM月』のプレースホルダが素通ししていた（T3で是正）",
  },
  {
    id: "haken-education",
    question: "派遣労働者の雇入れ時教育は派遣元と派遣先どちらの義務？",
    note: "診断04 Q20: 誤って『派遣先の義務』と断定していた（T2で是正）",
  },
  {
    id: "adjacent-header",
    question: "職長教育の対象業種は？",
    note: "診断04 Q7: 完全正答なのに『直接的に答える条文は限定的です』と誤ヘッダが付いていた（T8で是正）",
  },
  {
    id: "out-of-scope-noise",
    question: "明日の東京の天気は？",
    note: "診断04 Q21: 無関係な港湾労働法第2条をrelated表示していた（T9で是正）",
  },
];

const PLACEHOLDER_RE = /YYYY年|YYYY\s*年|施行：\s*XX|第\s*XX\s*条|条：\s*XX/;
const HEDGE_RE = /特定できません|確認できません|分かりません|わかりません/;
const ADJACENT_HEADER_RE = /直接的に答える条文は限定的です/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeOne(q) {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: q.question }),
  });
  const status = res.status;
  let body = null;
  try {
    body = await res.json();
  } catch {
    // JSON以外のレスポンス（HTMLエラーページ等）はflagsに反映
  }

  const flags = [];
  if (status !== 200) {
    flags.push(`HTTPステータス異常: ${status}`);
  }
  const answer = body?.answer ?? "";
  const confidence = body?.confidence ?? "unknown";
  const scopeWarnings = body?.scopeWarnings ?? [];
  const sourceCount = Array.isArray(body?.sources) ? body.sources.length : 0;

  if (q.id === "scope-warning" && scopeWarnings.length > 0) {
    flags.push(`偽陽性の範囲外警告の疑い: ${scopeWarnings.join(" / ")}`);
  }
  if (PLACEHOLDER_RE.test(answer)) {
    flags.push("SYSTEM_PROMPTプレースホルダ（YYYY/XX等）の漏出を検知");
  }
  if (q.id === "adjacent-header" && ADJACENT_HEADER_RE.test(answer)) {
    flags.push("adjacent誤ヘッダ（『直接的に答える条文は限定的です』）を検知");
  }
  if (q.id === "out-of-scope-noise" && sourceCount > 0) {
    flags.push(
      `no-hit時に無関係な法令が${sourceCount}件提示された（ノイズ抑制の後退の疑い。診断04では港湾労働法第2条）`
    );
  }
  if (confidence === "high" && HEDGE_RE.test(answer)) {
    flags.push("確信度high なのに『特定/確認できません』系のヘッジ表現を検知（確信度と内容の乖離）");
  }

  return {
    id: q.id,
    question: q.question,
    note: q.note,
    httpStatus: status,
    confidence,
    sourceCount,
    scopeWarningCount: scopeWarnings.length,
    answerPreview: answer.length > 160 ? answer.slice(0, 160) + "…" : answer,
    flags,
  };
}

async function main() {
  const results = [];
  for (const q of QUESTIONS) {
    try {
      const r = await probeOne(q);
      results.push(r);
    } catch (err) {
      results.push({
        id: q.id,
        question: q.question,
        note: q.note,
        httpStatus: 0,
        flags: [`fetch失敗: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
    await sleep(INTERVAL_MS);
  }

  const totalFlags = results.reduce((n, r) => n + r.flags.length, 0);
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    total_questions: results.length,
    total_flags: totalFlags,
    passed: totalFlags === 0,
    results,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`[chatbot-prod-smoke] ${BASE_URL} に${results.length}問プローブ`);
  for (const r of results) {
    const mark = r.flags.length === 0 ? "OK" : "NG";
    console.log(`  [${mark}] ${r.id}: ${r.question}`);
    for (const f of r.flags) console.log(`        - ${f}`);
  }
  console.log(`合計フラグ: ${totalFlags}件 → ${OUT_PATH}`);

  if (totalFlags > 0) process.exitCode = 1;
}

main();
