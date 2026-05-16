#!/usr/bin/env node
/**
 * AI judge gate for the autonomous news-feed pipeline (B.2 stage 2).
 *
 * Input  : scripts/etl/data/news-feed-candidates.json
 *          (produced by scripts/etl/fetch-news-feed.mjs)
 *
 * Output : web/src/data/news-feed/approved/index.json
 *          web/src/data/news-feed/rejected/index.json
 *
 * Behaviour
 * ---------
 *  - Calls Gemini 2.5 Flash once per candidate with a structured-output prompt
 *    asking for four scores:
 *      relevance          0-100  (≥70 to pass)
 *      copyrightRisk      0-100  (≤30 to pass; lower is safer)
 *      misinformationRisk 0-100  (≤30 to pass; lower is safer)
 *      duplication        0-100  (≤50 to pass; higher means duplicate)
 *    plus an independent ≤50-char Japanese summary and best-guess accident
 *    type / industry. Headline is NOT echoed back into the summary; that is
 *    explicitly enforced in the prompt to preserve Article 32 主従関係.
 *
 *  - All four thresholds must be satisfied for the entry to land in
 *    `approved/index.json`. Otherwise it lands in `rejected/index.json`
 *    with `rejectionReasons` populated.
 *
 *  - Caps: approved retains the most recent 200 entries, rejected retains
 *    the most recent 500. Older entries are dropped on rotation.
 *
 *  - When GEMINI_API_KEY is unset (e.g. local development), the script
 *    short-circuits with a clear message and exits 0 without mutating any
 *    output files. The fetch stage still runs and a candidates file is
 *    written so the operator can inspect what would have been judged.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  prefilter,
  classifyOutcome,
  normalizeNewsType,
} from "./news-feed-filters.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const CANDIDATES_PATH = path.join(
  __dirname,
  "data",
  "news-feed-candidates.json",
);
const APPROVED_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "approved",
  "index.json",
);
const REJECTED_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "rejected",
  "index.json",
);
const PENDING_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "pending",
  "index.json",
);

const MODEL_ID = "gemini-2.5-flash";
const APPROVED_CAP = 200;
const REJECTED_CAP = 500;
const PENDING_CAP = 200;

/* ---------------------------------------------------------------------- */
/* I/O helpers                                                            */
/* ---------------------------------------------------------------------- */

async function readJsonOrDefault(p, fallback) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(p, value) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function sortByPublishedDesc(a, b) {
  const at = a?.source?.publishedAt ?? a?.score?.judgedAt ?? "";
  const bt = b?.source?.publishedAt ?? b?.score?.judgedAt ?? "";
  return bt.localeCompare(at);
}

function dedupeById(entries) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (!e || typeof e.id !== "string") continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

/* ---------------------------------------------------------------------- */
/* Gemini prompt + call                                                   */
/* ---------------------------------------------------------------------- */

const JUDGE_INSTRUCTION = `あなたは労働安全衛生の専門家かつ著作権法の素養がある編集者です。
日本語のニュース見出し1件を評価し、以下のスコアと付随情報を JSON で返してください。

まず newsType を以下から選定してください:
- "accident_report": 実際の労働災害・事故・健康被害の発生報道。
  例: 「作業員が墜落し死亡」「工場で爆発、3人が負傷」「クレーン横転で重傷」
- "administrative_notice": 行政機関による会議・委員会・審査会・制度改正の
  開催・発表案内。事故そのものの報道ではない。
  例: 「労働政策審議会安全衛生分科会を開催」「特定石綿被害認定審査会開催案内」
- "statistics_release": 統計・調査・白書・実態調査の発表。
  例: 「令和7年労働災害発生状況を公表」「化学物質取扱実態調査結果」
- "general_news": 上記以外。労働者の業務との明確な関連が見出しから読み取れない
  一般ニュース(学校熱中症・家庭内事故・観光客・刑事事件等)。

評価軸:
1. relevance (0-100): 労働災害・労働安全衛生に関する報道としての関連性。
   - accident_report: 業務起因明示なら 85-95、業務起因が見出しから明示されない
     一般事故は 30-50。
   - administrative_notice: 労働安全衛生関連の機関・委員会・制度なら 80-95。
   - statistics_release: 労働災害統計なら 80-95。
   - general_news: 30 以下。
2. copyrightRisk (0-100, 低いほど安全): 見出しのみの引用 + サイト独自の
   要約 + 出典URL明示で、著作権法32条の引用要件(主従関係・必要最小限・
   出典明示)を満たすかの逆指標。本文逐語転載が必要そうな事案や、
   見出し自体が長文・創作性が高い場合は高リスク(40+)。
3. misinformationRisk (0-100, 低いほど安全): 一次ソースが特定可能で、
   公的機関の発表または信頼できる報道であれば低リスク(0-20)。SNS転載や
   未確認情報、見出しのみで内容判別不能な場合は高リスク(40+)。
4. duplication (0-100, 高いほど重複): **accident_report のみで意味を持つ**。
   同じ事故事案が既に労働災害事例DB(累計5,000件超)に多数収録される類型
   (典型的な墜落・転倒・はさまれ等)なら 60+。新規パターンは 0-30。
   - administrative_notice / statistics_release / general_news の場合は
     一律 0-20 を返してください(行政発表は事故DBの重複対象ではない)。

加えて以下も返してください:
- aiSummary: 50字以内の独自要約。原文見出しの言い回しを保持してはならない。
  主旨を編集者の言葉で言い換える。労働災害の要点(誰が/何で/どうなった)を中心に。
- estimatedAccidentType: 以下のいずれか、推定不能なら null:
  "墜落" / "転倒" / "はさまれ・巻き込まれ" / "切れ・こすれ" / "飛来・落下" /
  "感電" / "車両" / "交通事故" / "崩壊・倒壊" / "火災" / "爆発" /
  "高温・低温の物との接触" / "有害物等との接触" / "酸素欠乏" / "溺水" /
  "熱中症" / "低体温症" / "有害光線" / "有害物質" / "激突され" /
  "振動障害" / "動作の反動・無理な動作"
- estimatedWorkCategory: 以下のいずれか、推定不能なら null:
  "建設業" / "製造業" / "運輸交通業" / "商業" / "保健衛生業" / "林業" /
  "電気業" / "化学" / "その他の事業"

返答は必ず以下の JSON のみとし、コードフェンス・解説文を付けないこと:
{
  "newsType": "<accident_report|administrative_notice|statistics_release|general_news>",
  "relevance": <number>,
  "copyrightRisk": <number>,
  "misinformationRisk": <number>,
  "duplication": <number>,
  "aiSummary": "<string>",
  "estimatedAccidentType": "<string|null>",
  "estimatedWorkCategory": "<string|null>"
}`;

function buildUserPrompt(candidate) {
  return `見出し: ${candidate.headline}
出典: ${candidate.source.name}（${candidate.source.publisher}）
URL: ${candidate.source.url}
配信日時: ${candidate.source.publishedAt ?? "不明"}`;
}

function parseJudgeResponse(raw) {
  if (typeof raw !== "string") throw new Error("empty model response");
  // Gemini occasionally returns a code-fence even when instructed not to.
  const cleaned = raw
    .replace(/^[\s　]*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found");
  const obj = JSON.parse(cleaned.slice(start, end + 1));
  const num = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`non-numeric score: ${v}`);
    return Math.max(0, Math.min(100, Math.round(n)));
  };
  return {
    newsType: normalizeNewsType(obj.newsType),
    relevance: num(obj.relevance),
    copyrightRisk: num(obj.copyrightRisk),
    misinformationRisk: num(obj.misinformationRisk),
    duplication: num(obj.duplication),
    aiSummary: String(obj.aiSummary ?? "").slice(0, 60),
    estimatedAccidentType:
      typeof obj.estimatedAccidentType === "string" && obj.estimatedAccidentType
        ? obj.estimatedAccidentType
        : undefined,
    estimatedWorkCategory:
      typeof obj.estimatedWorkCategory === "string" && obj.estimatedWorkCategory
        ? obj.estimatedWorkCategory
        : undefined,
  };
}

async function callGemini(apiKey, candidate) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: { role: "system", parts: [{ text: JUDGE_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(candidate) }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gemini HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") ??
    "";
  return parseJudgeResponse(text);
}

/* ---------------------------------------------------------------------- */
/* main                                                                   */
/* ---------------------------------------------------------------------- */

async function main() {
  const candidatesFile = await readJsonOrDefault(CANDIDATES_PATH, null);
  if (!candidatesFile || !Array.isArray(candidatesFile.candidates)) {
    console.log(
      `[news-ai-judge] no candidates file at ${path.relative(REPO_ROOT, CANDIDATES_PATH)}; nothing to do.`,
    );
    return;
  }
  const candidates = candidatesFile.candidates;
  if (candidates.length === 0) {
    console.log("[news-ai-judge] 0 new candidates; nothing to judge.");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[news-ai-judge] GEMINI_API_KEY is unset. " +
        "Stage 2 skipped — candidates were collected but not judged. " +
        "Approved/rejected JSON files are left untouched.",
    );
    return;
  }

  const approved = await readJsonOrDefault(APPROVED_PATH, {
    updatedAt: "1970-01-01T00:00:00.000Z",
    entries: [],
  });
  const rejected = await readJsonOrDefault(REJECTED_PATH, {
    updatedAt: "1970-01-01T00:00:00.000Z",
    entries: [],
  });
  const pending = await readJsonOrDefault(PENDING_PATH, {
    updatedAt: "1970-01-01T00:00:00.000Z",
    entries: [],
  });

  let approvedAdded = 0;
  let rejectedAdded = 0;
  let pendingAdded = 0;
  let prefilterDropped = 0;
  const judgeErrors = [];

  for (const cand of candidates) {
    // Stage 2a — hybrid negative-keyword pre-filter. Avoids burning a Gemini
    // call on headlines that are clearly non-workplace (school heatstroke,
    // home incidents, tourist accidents, etc.).
    const pf = prefilter(cand.headline);
    if (pf.blocked) {
      rejected.entries.unshift({
        id: cand.id,
        headline: cand.headline,
        aiSummary: "",
        source: cand.source,
        score: {
          relevance: 0,
          copyrightRisk: 0,
          misinformationRisk: 0,
          duplication: 0,
          judgedAt: nowIso(),
          model: "prefilter",
          rejectionReasons: [`prefilter:${pf.tag}`],
        },
        approved: false,
        provenance: "news_auto",
      });
      rejectedAdded += 1;
      prefilterDropped += 1;
      continue;
    }

    let scores;
    try {
      scores = await callGemini(apiKey, cand);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      judgeErrors.push({ id: cand.id, error: msg });
      // Treat judge errors as automatic rejection with a clear reason so the
      // operator can audit them in rejected/index.json.
      const entry = {
        id: cand.id,
        headline: cand.headline,
        aiSummary: "",
        source: cand.source,
        score: {
          relevance: 0,
          copyrightRisk: 100,
          misinformationRisk: 100,
          duplication: 0,
          judgedAt: nowIso(),
          model: MODEL_ID,
          rejectionReasons: [`judge call failed: ${msg.slice(0, 160)}`],
        },
        approved: false,
        provenance: "news_auto",
      };
      rejected.entries.unshift(entry);
      rejectedAdded += 1;
      continue;
    }

    const { outcome, reasons } = classifyOutcome(scores, scores.newsType);
    const entry = {
      id: cand.id,
      headline: cand.headline,
      aiSummary: scores.aiSummary,
      source: cand.source,
      estimatedAccidentType: scores.estimatedAccidentType,
      estimatedWorkCategory: scores.estimatedWorkCategory,
      newsType: scores.newsType,
      score: {
        relevance: scores.relevance,
        copyrightRisk: scores.copyrightRisk,
        misinformationRisk: scores.misinformationRisk,
        duplication: scores.duplication,
        judgedAt: nowIso(),
        model: MODEL_ID,
        ...(outcome === "approved" ? {} : { rejectionReasons: reasons }),
      },
      approved: outcome === "approved",
      provenance: "news_auto",
    };

    if (outcome === "approved") {
      approved.entries.unshift(entry);
      approvedAdded += 1;
    } else if (outcome === "pending") {
      pending.entries.unshift(entry);
      pendingAdded += 1;
    } else {
      rejected.entries.unshift(entry);
      rejectedAdded += 1;
    }
  }

  approved.entries = dedupeById(approved.entries).sort(sortByPublishedDesc).slice(0, APPROVED_CAP);
  rejected.entries = dedupeById(rejected.entries).sort(sortByPublishedDesc).slice(0, REJECTED_CAP);
  pending.entries = dedupeById(pending.entries).sort(sortByPublishedDesc).slice(0, PENDING_CAP);

  const now = nowIso();
  approved.updatedAt = now;
  rejected.updatedAt = now;
  pending.updatedAt = now;

  await writeJson(APPROVED_PATH, approved);
  await writeJson(REJECTED_PATH, rejected);
  await writeJson(PENDING_PATH, pending);

  console.log(
    `[news-ai-judge] approved+${approvedAdded} pending+${pendingAdded} rejected+${rejectedAdded} ` +
      `(prefilterDropped=${prefilterDropped}, total approved=${approved.entries.length}, ` +
      `pending=${pending.entries.length}, rejected=${rejected.entries.length}, errors=${judgeErrors.length})`,
  );
  if (judgeErrors.length > 0) {
    console.log("[news-ai-judge] judge errors:");
    for (const e of judgeErrors) console.log(`  ${e.id}: ${e.error}`);
  }
}

main().catch((err) => {
  console.error("[news-ai-judge] fatal:", err);
  process.exit(1);
});
