/**
 * fidelity ゲート — 現場ことば版が原文を裏切ったら CI が落ちる機械照合。
 *
 * 原文（コーパス LawArticle.text）から次の「事実」を機械抽出し、
 * 言い換え版（PlainArticle.plainText ＋ omissions の明示的省略宣言）に
 * 保存されているかを条ごとに検査する:
 *
 *  1. 数値＋単位（18パーセント / 100万分の10 / 3年間 / 1.5m / 第2種 …）
 *     - 限度方向（以上/以下/未満/超）の改変も検出
 *     - 言い換え側だけに現れる数値＝捏造も検出（ppm⇔100万分のN 等の等価は許容）
 *  2. 義務主体×義務種別（事業者/労働者/請負人… × しなければならない/
 *     してはならない/努めなければならない/配慮しなければならない）
 *     - 原文の義務が言い換えに無い＝欠落
 *     - 言い換えが原文に無い(主体,種別)を主張＝すり替え/捏造
 *  3. 参照条番号・別表（令第21条第9号、令別表第6 …）
 *  4. 罰則の有無（処する/罰金/拘禁刑 …）
 *
 * 省略は omissions での明示宣言（当該トークンを含む文字列）だけが許される。
 * 黙った省略・改変・捏造は Violation として返り、plain-fidelity.test.ts が
 * CI で fail させる。
 */

import type { LawArticle } from "@/data/laws";
import type { PlainArticle } from "@/data/plain/types";

/* ============================== 型 ============================== */

export type Modality = "obligation" | "prohibition" | "effort" | "care";

export type DutyFact = {
  subject: string;
  modality: Modality;
};

export type Bound = "gte" | "lte" | "lt" | "gt";

export type NumericFact = {
  /** 原文上の表記（例: "18パーセント"） */
  token: string;
  /** 単位正規化後の同値キー（例: "pct:18" / "ppm:10" / "year:3"） */
  canonical: string;
  /** 直後の限度方向（無い場合 null） */
  bound: Bound | null;
};

export type Violation = {
  kind:
    | "number-missing" // 原文の数値が言い換えにも省略宣言にも無い
    | "number-fabricated" // 言い換えだけに現れる数値
    | "bound-changed" // 以上/以下/未満/超 の改変・欠落
    | "duty-missing" // 原文の(主体,義務種別)が言い換えに無い
    | "duty-fabricated" // 言い換えが原文に無い(主体,義務種別)を主張＝すり替え
    | "ref-missing" // 参照条番号・別表の黙った省略
    | "penalty-missing" // 罰則への言及欠落
    | "style"; // です・ます体/文数の文体規約違反
  /** 人が直せる具体メッセージ（欠落トークンをそのまま含める） */
  message: string;
};

/* ====================== 語彙（義務主体・単位） ====================== */

/** 義務主体の語彙。長いものから先に照合する。 */
const SUBJECTS = [
  "特定元方事業者",
  "元方事業者",
  "機械等貸与者",
  "建築物貸与者",
  "都道府県労働局長",
  "労働基準監督署長",
  "作業主任者",
  "産業医",
  "事業者",
  "労働者",
  "使用者",
  "注文者",
  "請負人",
  "発注者",
  "派遣先",
  "派遣元",
] as const;

const SUBJECT_ALT = SUBJECTS.join("|");

/** 単位 → 正規化キー。等価表（% ⇔ パーセント、年間 ⇔ 年 等）はキー側で吸収。 */
const UNIT_CANON: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(?:パーセント|％|%)$/, "pct"],
  [/^ppm$/, "ppm"],
  [/^人$/, "nin"],
  [/^(?:年間|年)$/, "year"],
  [/^(?:か月|ヶ月|箇月|月)$/, "month"],
  [/^日$/, "day"],
  [/^時間$/, "hour"],
  [/^分$/, "minute"],
  [/^回$/, "kai"],
  [/^(?:メートル|m)$/, "m"],
  [/^(?:センチメートル|cm)$/, "cm"],
  [/^(?:度|℃)$/, "deg"],
  [/^歳$/, "sai"],
  [/^倍$/, "bai"],
  [/^(?:キログラム|kg)$/, "kg"],
  [/^(?:トン|t)$/, "ton"],
  [/^(?:リットル|L)$/, "litre"],
  [/^(?:ルクス|lx)$/, "lux"],
  [/^(?:デシベル|dB)$/, "db"],
];

const UNIT_ALT =
  "パーセント|％|%|ppm|人|年間|年|か月|ヶ月|箇月|月|日|時間|分|回|メートル|m|センチメートル|cm|度|℃|歳|倍|キログラム|kg|トン|リットル|L|ルクス|lx|デシベル|dB";

function canonUnit(unit: string): string | null {
  for (const [re, key] of UNIT_CANON) {
    if (re.test(unit)) return key;
  }
  return null;
}

/* ====================== テキスト正規化・除外域 ====================== */

/** 全角数字・全角英字を半角へ。 */
function normalizeDigits(text: string): string {
  return text.replace(/[０-９ｍ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/**
 * 数値抽出の前に取り除く除外域:
 *  - 法令番号（昭和47年労働省令第32号 等）・元号年
 *  - 条・項・号の参照（第21条第9号 等）→ refs として別途抽出
 *  - 別表参照（令別表第6第3号の3 等）→ refs として別途抽出
 */
const ERA_RE = /(?:昭和|平成|令和)\d+年(?:(?:法律|政令|労働省令|厚生労働省令|省令|勅令)第\d+号)?/g;
const REF_RE =
  /(?:安衛法|安衛則|安衛令|労基法|法|令|規則)?第\d+条(?:の\d+)*(?:第\d+項)?(?:第\d+号)?(?:の\d+)*/g;
const BEPPYO_RE = /(?:令|法)?別表第\d+(?:第\d+号(?:の\d+)*)*/g;
/** 前条・前項・同条など相対参照（絶対参照でないため refs 対象外） */
const RELATIVE_PREFIX = /[前次同]$/;

type ExtractedRefs = { refs: string[]; blanked: string };

function extractRefsAndBlank(text: string): ExtractedRefs {
  const refs: string[] = [];
  let blanked = text.replace(ERA_RE, (m) => "＿".repeat(m.length));
  blanked = blanked.replace(BEPPYO_RE, (m, offset: number) => {
    const before = blanked.slice(Math.max(0, offset - 1), offset);
    if (!RELATIVE_PREFIX.test(before)) refs.push(m);
    return "＿".repeat(m.length);
  });
  blanked = blanked.replace(REF_RE, (m, ...args) => {
    const offset = args[args.length - 2] as number;
    const before = blanked.slice(Math.max(0, offset - 1), offset);
    if (!RELATIVE_PREFIX.test(before)) refs.push(m);
    return "＿".repeat(m.length);
  });
  return { refs, blanked };
}

/* ====================== 数値事実の抽出 ====================== */

const BOUND_RE = /^(以上|以下|以内|未満|を超え|超)/;

function boundOf(after: string): Bound | null {
  const m = after.match(BOUND_RE);
  if (!m) return null;
  switch (m[1]) {
    case "以上":
      return "gte";
    case "以下":
    case "以内": // 期間の「以内」は「以下」と同クラス扱い
      return "lte";
    case "未満":
      return "lt";
    default:
      return "gt";
  }
}

/** 「N万分のM」（例: 100万分の10 → ppm:10 ※Nが100のとき） */
const MANBUN_RE = /(\d+(?:\.\d+)?)万分の(\d+(?:\.\d+)?)/g;
/** 一般分数（例: 4分の1）。「4分」を4分間と誤読しないよう先に確定させる。 */
const FRACTION_RE = /(\d+(?:\.\d+)?)分の(\d+(?:\.\d+)?)/g;
/** 「第N種」（例: 第2種酸素欠乏危険作業） */
const SHU_RE = /第(\d+)種/g;
const NUM_UNIT_RE = new RegExp(`(\\d+(?:\\.\\d+)?)(${UNIT_ALT})`, "g");

export function extractNumericFacts(rawText: string): NumericFact[] {
  const facts: NumericFact[] = [];
  let text = normalizeDigits(rawText);
  text = extractRefsAndBlank(text).blanked;

  text = text.replace(MANBUN_RE, (m, base: string, val: string, offset: number) => {
    const after = text.slice(offset + m.length, offset + m.length + 4);
    const canonical = base === "100" ? `ppm:${val}` : `manbun:${base}/${val}`;
    facts.push({ token: m, canonical, bound: boundOf(after) });
    return "＿".repeat(m.length);
  });
  text = text.replace(FRACTION_RE, (m, den: string, num: string, offset: number) => {
    const after = text.slice(offset + m.length, offset + m.length + 4);
    facts.push({ token: m, canonical: `frac:${den}/${num}`, bound: boundOf(after) });
    return "＿".repeat(m.length);
  });
  text = text.replace(SHU_RE, (m, n: string) => {
    facts.push({ token: m, canonical: `shu:${n}`, bound: null });
    return "＿".repeat(m.length);
  });
  text.replace(NUM_UNIT_RE, (m, val: string, unit: string, offset: number) => {
    const key = canonUnit(unit);
    if (!key) return m;
    const after = text.slice(offset + m.length, offset + m.length + 4);
    facts.push({ token: m, canonical: `${key}:${val}`, bound: boundOf(after) });
    return m;
  });
  return facts;
}

/* ====================== 義務事実の抽出 ====================== */

/** 原文（法文）側の義務マーカー。 */
const LAW_DUTY_RE = /(努めなければならない|配慮しなければならない|なければならない|てはならない)/g;
/** 言い換え（です・ます）側の義務マーカー。 */
const PLAIN_DUTY_RE =
  /(努めましょう|努めます|努めてください|努力義務です|配慮しなければなりません|配慮が必要です|配慮してください|なければなりません|する義務があります|義務です|必須です|が必要です|てはいけません|禁止です|禁止されています)/g;

function modalityOfLawMarker(marker: string): Modality {
  if (marker.startsWith("努め")) return "effort";
  if (marker.startsWith("配慮")) return "care";
  if (marker === "てはならない") return "prohibition";
  return "obligation";
}

function modalityOfPlainMarker(marker: string): Modality {
  if (marker.startsWith("努")) return "effort";
  if (marker.startsWith("配慮")) return "care";
  if (marker === "てはいけません" || marker.startsWith("禁止")) return "prohibition";
  return "obligation";
}

/**
 * marker の位置から手前に最も近い「<主体>は」を探す。
 * scopeStart より手前（別文など）は見ない。見つからなければ null。
 */
function nearestSubjectBefore(text: string, markerIndex: number, scopeStart: number): string | null {
  const scope = text.slice(scopeStart, markerIndex);
  const re = new RegExp(`(${SUBJECT_ALT})(?:は|も)`, "g");
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope)) !== null) {
    last = m[1];
  }
  return last;
}

/**
 * 原文から (主体, 義務種別) の集合を抽出。
 * 主体は条文全体（当該マーカーより手前全部）から最も近い「Xは」。
 * 「読み替えるものとする」等の準用文はマーカーが無いため対象外。
 */
export function extractLawDuties(rawText: string): DutyFact[] {
  const text = normalizeDigits(rawText);
  const out: DutyFact[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(LAW_DUTY_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const subject = nearestSubjectBefore(text, m.index, 0);
    if (!subject) continue;
    const modality = modalityOfLawMarker(m[1]);
    const key = `${subject}|${modality}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ subject, modality });
    }
  }
  return out;
}

/**
 * 言い換え側の義務主張を抽出。すり替え検出用なので、
 * 主体は「同じ文の中」に明示されている場合だけ拾う（誤検出防止）。
 */
export function extractPlainDuties(plainText: string): DutyFact[] {
  const text = normalizeDigits(plainText);
  const out: DutyFact[] = [];
  const seen = new Set<string>();
  const re = new RegExp(PLAIN_DUTY_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sentenceStart = text.lastIndexOf("。", m.index) + 1;
    const subject = nearestSubjectBefore(text, m.index, sentenceStart);
    if (!subject) continue;
    const modality = modalityOfPlainMarker(m[1]);
    const key = `${subject}|${modality}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ subject, modality });
    }
  }
  return out;
}

/* ====================== 罰則・参照 ====================== */

const PENALTY_RE = /(拘禁刑|懲役|罰金|科料|過料|処する)/;

/** 参照の照合キー（先頭の 法/令/則 修飾を落とした条・別表コア） */
function refCore(ref: string): string {
  return ref.replace(/^(?:安衛法|安衛則|安衛令|労基法|法|令|規則)/, "");
}

/* ====================== 文体規約 ====================== */

const SENTENCE_END_RE = /(ます|です|ません|ましょう|ください)[)）」]?$/;

/**
 * 端的さの上限（品質パトロール 2026-07-11 でゲート強化・ラチェット方式）。
 * 「目安2〜4文」だけでは1文がだらだら長い言い換えを止められないため、
 * 文字数でも機械的に止める。
 * - 判定は括弧書き（条参照・注記＝読み飛ばせる）を除いた実読長で行う。
 *   参照保存要件（refs を本文に残す書き方）と長さ上限が衝突しないようにするため。
 * - LENGTH_CAP_SINCE 以降に生成されたエントリのみ強制（ラチェット）。
 *   それ以前の出荷分は適用外とし、分割改善は追い出しリスト（パトロール所見）で行う。
 *   見本（酸欠則）の実測は最長文93字・最長217字、部隊初出荷（有機則）は括弧除外で最長204字。
 */
const MAX_SENTENCE_CHARS = 120;
const MAX_TOTAL_CHARS = 400;
const LENGTH_CAP_SINCE = "2026-07-12";

/** 括弧書き（全角・半角）を除いた実読テキスト。 */
function stripParentheticals(text: string): string {
  return text.replace(/（[^（）]*）|\([^()]*\)/g, "");
}

export function checkStyle(plain: Pick<PlainArticle, "plainText" | "generatedAt">): Violation[] {
  const v: Violation[] = [];
  const plainText = plain.plainText;
  const sentences = plainText
    .split("。")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0 || sentences.length > 5) {
    v.push({
      kind: "style",
      message: `文数が規約外です（${sentences.length}文。目安2〜4文・最大5文）`,
    });
  }
  for (const s of sentences) {
    if (!SENTENCE_END_RE.test(s)) {
      v.push({
        kind: "style",
        message: `です・ます体で終わっていない文があります: 「${s.slice(-24)}。」`,
      });
    }
  }

  // 端的さ上限（ラチェット: LENGTH_CAP_SINCE 以降の生成分のみ強制）
  if (plain.generatedAt >= LENGTH_CAP_SINCE) {
    const stripped = stripParentheticals(plainText);
    if (stripped.length > MAX_TOTAL_CHARS) {
      v.push({
        kind: "style",
        message: `全体が長すぎます（括弧除き${stripped.length}字。上限${MAX_TOTAL_CHARS}字＝「端的」の機械上限。内容を絞るか omissions で省略宣言を）`,
      });
    }
    for (const s of stripped.split("。")) {
      const t = s.trim();
      if (t.length > MAX_SENTENCE_CHARS) {
        v.push({
          kind: "style",
          message: `1文が長すぎます（括弧除き${t.length}字。上限${MAX_SENTENCE_CHARS}字）: 「${t.slice(0, 24)}…」を分割してください`,
        });
      }
    }
  }
  return v;
}

/* ====================== 照合本体 ====================== */

const MODALITY_LABEL: Record<Modality, string> = {
  obligation: "義務（しなければならない）",
  prohibition: "禁止（してはならない）",
  effort: "努力義務（努めなければならない）",
  care: "配慮義務（配慮しなければならない）",
};

function omissionsCover(omissions: readonly string[], token: string): boolean {
  return omissions.some((o) => o.includes(token));
}

/**
 * 数値の同値照合: canonical が一致する fact が対象テキスト側にあるか。
 * bound がある場合は方向まで一致していること。
 */
function findNumeric(facts: NumericFact[], target: NumericFact): "ok" | "bound" | "none" {
  const same = facts.filter((f) => f.canonical === target.canonical);
  if (same.length === 0) return "none";
  if (target.bound === null) return "ok";
  return same.some((f) => f.bound === target.bound) ? "ok" : "bound";
}

/** 原文×言い換えの機械照合。空配列＝全緑。 */
export function checkFidelity(article: LawArticle, plain: PlainArticle): Violation[] {
  const violations: Violation[] = [];
  const omissions = plain.omissions ?? [];
  const normalizedOmissions = omissions.map(normalizeDigits);
  const plainNorm = normalizeDigits(plain.plainText);

  /* --- 1. 数値（原文→言い換え: 欠落・限度方向） --- */
  const lawFacts = extractNumericFacts(article.text);
  const plainFacts = extractNumericFacts(plain.plainText);
  const omissionFacts = extractNumericFacts(omissions.join("／"));
  const plainSideFacts = [...plainFacts, ...omissionFacts];

  for (const fact of lawFacts) {
    const r = findNumeric(plainSideFacts, fact);
    if (r === "none") {
      violations.push({
        kind: "number-missing",
        message: `原文の数値「${fact.token}」が言い換えにも omissions にもありません`,
      });
    } else if (r === "bound") {
      violations.push({
        kind: "bound-changed",
        message: `数値「${fact.token}」の限度方向（以上/以下/未満/超）が言い換えで変わっているか欠けています`,
      });
    }
  }

  /* --- 1'. 数値（言い換え→原文: 捏造） --- */
  for (const fact of plainFacts) {
    if (!lawFacts.some((f) => f.canonical === fact.canonical)) {
      violations.push({
        kind: "number-fabricated",
        message: `言い換えの数値「${fact.token}」は原文にありません（数値の追加は禁止）`,
      });
    }
  }

  /* --- 2. 義務主体×義務種別 --- */
  const lawDuties = extractLawDuties(article.text);
  const plainDuties = extractPlainDuties(plain.plainText);

  for (const duty of lawDuties) {
    const covered =
      plainNorm.includes(duty.subject) &&
      plainDuties.some((d) => d.modality === duty.modality);
    if (!covered && !omissionsCover(normalizedOmissions, duty.subject)) {
      violations.push({
        kind: "duty-missing",
        message: `原文の義務「${duty.subject} × ${MODALITY_LABEL[duty.modality]}」が言い換えに保存されていません`,
      });
    }
  }
  for (const duty of plainDuties) {
    if (!lawDuties.some((d) => d.subject === duty.subject && d.modality === duty.modality)) {
      violations.push({
        kind: "duty-fabricated",
        message: `言い換えの「${duty.subject} × ${MODALITY_LABEL[duty.modality]}」は原文にありません（主体すり替え/義務種別の改変/捏造）`,
      });
    }
  }

  /* --- 3. 参照条番号・別表 --- */
  const { refs } = extractRefsAndBlank(normalizeDigits(article.text));
  for (const ref of refs) {
    const core = refCore(ref);
    const inPlain = plainNorm.includes(core) || plainNorm.includes(ref);
    const inOmissions = normalizedOmissions.some((o) => o.includes(core) || o.includes(ref));
    if (!inPlain && !inOmissions) {
      violations.push({
        kind: "ref-missing",
        message: `原文の参照「${ref}」が言い換えにも omissions にもありません（省くなら omissions に「${ref}」を含めて宣言）`,
      });
    }
  }

  /* --- 4. 罰則 --- */
  if (PENALTY_RE.test(article.text)) {
    const mentioned = plain.plainText.includes("罰") || omissions.some((o) => o.includes("罰"));
    if (!mentioned) {
      violations.push({
        kind: "penalty-missing",
        message: "原文に罰則があるのに言い換えが罰則に触れていません（省くなら omissions で宣言）",
      });
    }
  }

  /* --- 5. 文体規約 --- */
  violations.push(...checkStyle(plain));

  return violations;
}
