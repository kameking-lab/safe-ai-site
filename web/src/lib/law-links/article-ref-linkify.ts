/**
 * 条文本文の参照自動リンク（診断書 docs/fable-diagnosis-2026-07-02/05-search-egov.md の T5 /
 * BACKLOG O18）。
 *
 * 条文カード本文に素テキストで現れる条番号参照（「第30条」「第30条第1項」「安衛則第36条」
 * 「クレーン等安全規則第23条」等）を、
 *   (1) 収録済みなら当サイトの条文深リンク `/law-search?law=<正式名称>&art=<条番号>`（内部）、
 *   (2) 収録外でも法令メタデータに e-Gov 法令番号があれば e-Gov 条アンカーへの外部リンク、
 * へ変換する（診断書 比較 h＝参照ジャンプの完敗の返上）。**解決できない参照は一切リンク化せず
 * 素テキストのまま残す**＝生成リンクの解決率 100%・幽霊リンク 0 を構造的に保証する
 * （article-ref-linkify.test.ts がコーパス全文で恒久固定）。
 *
 * この関数は表示非依存のセグメント配列を返す純粋関数（lib 層＝発見性/内部リンク）。条文カードへの
 * 差し込みは law-search-panel.tsx（ux-tools 所有）側の 1 行結線に委ねる（当班はリンカーとその
 * 解決保証テストまでを担当＝loop-prompt「跨りは自領域分だけ実施」）。
 *
 * 法令正確性は不可侵のため、曖昧な参照は意図的に非リンク化する：
 *   - 「令第6条」「法第43条」「同法第20条」等、直前が法令を示す助詞（令/法/則/例/同…）で
 *     参照先法令が一意に定まらないものは、素テキストのまま残す（誤リンクを作らない）。
 *   - 枝番（第○条の△）が収録外の場合、e-Gov 条アンカーは基条（Mp-At_N）しか指せず枝番へ
 *     着地できないため、e-Gov フォールバックは基条参照のみに限定する。
 *
 * 参照先解決の唯一のソースは read-only import のみ（捏造ゼロ）：
 *   - `@/data/laws` の `allLawArticles`（curated 中核。mhlwLawArticles 補完は law 値が
 *     文書バンドル名で深リンク不可のため除外＝search-index.ts と同方針）＝内部リンクの収録集合。
 *   - `@/data/law-metadata` の `LAW_METADATA`（lawShort→正式名称・e-Gov 法令番号）。
 */
import { LAW_METADATA } from '@/data/law-metadata';
import { allLawArticles, mhlwLawArticles } from '@/data/laws';
import { NUM_CLASS, toArabic } from './kanji-numerals';

/** 解決済みの参照リンクセグメント（external=true は e-Gov 等への外部リンク）。 */
export type ArticleRefLink = {
  readonly text: string;
  readonly href: string;
  readonly external: boolean;
};

/** 条文参照リンカーが返す表示非依存セグメント。href を持つものだけがリンク。 */
export type ArticleRefSegment = { readonly text: string } | ArticleRefLink;

/**
 * 直前に来ると「別法令／別構造の参照」を示すため、素の「第N条」を当該法令の参照とみなさない
 * 文字集合（誤リンク防止）。例:「令第6条」(施行令)、「法第43条」(親法)、「同法第20条」、
 * 「別表第3」、「附則第2条」。
 */
const AMBIGUOUS_PRECEDING = new Set(['法', '令', '則', '例', '同', '附', '別', '表', '章', '節', '款']);

/** curated 条文（内部深リンクが着地する集合＝search-index.ts と同一の除外方針）。 */
const _mhlwSet = new Set<unknown>(mhlwLawArticles);
const _curated = allLawArticles.filter((a) => !_mhlwSet.has(a));

/** `${正式名称}|${条番号}` の収録集合。内部リンクの解決可能性判定に使う。 */
const CORPUS_KEYS: ReadonlySet<string> = new Set(_curated.map((a) => `${a.law}|${a.articleNum}`));

/** 略称→正式名称。LAW_METADATA を権威とし、コーパス実データで補完（上書きしない）。 */
const SHORT_TO_FULL: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const meta of Object.values(LAW_METADATA)) {
    if (meta.lawShort && meta.fullName) map.set(meta.lawShort, meta.fullName);
  }
  for (const a of _curated) {
    if (a.lawShort && a.law && !map.has(a.lawShort)) map.set(a.lawShort, a.law);
  }
  return map;
})();

/** 正式名称→e-Gov 法令番号（e-Gov 条アンカーの外部リンク用。番号が無い法令は e-Gov 化しない）。 */
const FULL_TO_EGOV_ID: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const meta of Object.values(LAW_METADATA)) {
    if (meta.fullName && meta.egovLawId) map.set(meta.fullName, meta.egovLawId);
  }
  return map;
})();

/** 参照の接頭に現れうる法令名（正式名称＋略称）。長い順に並べ最長一致を優先。 */
const _lawNames = (() => {
  const names = new Set<string>();
  for (const a of _curated) {
    if (a.law) names.add(a.law);
    if (a.lawShort) names.add(a.lawShort);
  }
  for (const meta of Object.values(LAW_METADATA)) {
    if (meta.fullName) names.add(meta.fullName);
    if (meta.lawShort) names.add(meta.lawShort);
  }
  return Array.from(names).sort((a, b) => b.length - a.length);
})();

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NUM = `[${NUM_CLASS}]`;

/**
 * 条番号参照の抽出。任意の法令名接頭＋「第N条」＋任意の「の△」（枝番）＋任意の「第M項」。
 * いずれの数字も半角/全角/漢数字を許容し、必ず「条」で終端する（裸の数字・号番号を拾わない）。
 */
const REF_RE = new RegExp(
  `(${_lawNames.map(escapeRegExp).join('|')})?` +
    `第\\s*(${NUM}+)\\s*条` +
    `(?:\\s*の\\s*(${NUM}+))?` +
    `(?:\\s*第\\s*(${NUM}+)\\s*項)?`,
  'g',
);

/** 数字トークンを算用数字へ。1 以上の整数でなければ null（変換不能・0 は非リンク）。 */
function arabicOrNull(raw: string | undefined): string | null {
  if (raw == null) return null;
  const n = toArabic(raw);
  if (!/^[0-9]+$/.test(n) || n === '0') return null;
  return n;
}

type Resolved = { readonly href: string; readonly external: boolean };

/** 1 件の参照マッチを解決可能ならリンクへ、不能なら null（＝素テキストで残す）。 */
function resolveRef(
  prefix: string | undefined,
  nRaw: string,
  branchRaw: string | undefined,
  kouRaw: string | undefined,
  contextLawFullName: string,
  text: string,
  start: number,
): Resolved | null {
  const n = arabicOrNull(nRaw);
  if (!n) return null;

  // 枝番・項は「あれば数値化に成功したものだけ」採用。数値化不能なら参照自体を諦める（誤リンク回避）。
  let branch: string | null = null;
  if (branchRaw != null) {
    branch = arabicOrNull(branchRaw);
    if (!branch) return null;
  }
  let kou: string | null = null;
  if (kouRaw != null) {
    kou = arabicOrNull(kouRaw);
    if (!kou) return null;
  }

  // 参照先法令（正式名称）を決める。
  let targetFull: string | null;
  if (prefix) {
    // prefix が正式名称でも略称でもない（＝当社の法令集合外）ならリンクしない。
    if (!isKnownLawName(prefix)) return null;
    targetFull = SHORT_TO_FULL.get(prefix) ?? prefix; // 略称→正式名称、正式名称ならそのまま
  } else {
    // 裸の「第N条」＝同一法令参照。ただし直前が別法令を示す文字なら諦める。
    const before = start > 0 ? text[start - 1] : '';
    if (AMBIGUOUS_PRECEDING.has(before)) return null;
    targetFull = contextLawFullName;
  }
  if (!targetFull) return null;

  // 内部深リンク：最も具体的な条番号表記から順に収録集合へ照合。
  const candidates: string[] = [];
  if (branch && kou) candidates.push(`第${n}条の${branch}第${kou}項`);
  if (kou) candidates.push(`第${n}条第${kou}項`);
  if (branch) candidates.push(`第${n}条の${branch}`);
  candidates.push(`第${n}条`);
  for (const art of candidates) {
    if (CORPUS_KEYS.has(`${targetFull}|${art}`)) {
      return {
        href: `/law-search?law=${encodeURIComponent(targetFull)}&art=${encodeURIComponent(art)}`,
        external: false,
      };
    }
  }

  // e-Gov フォールバック：収録外でも法令番号があれば条アンカーへ。ただし枝番は基条アンカー
  // （Mp-At_N）しか指せず誤着地するため、基条参照のみ許可（法令正確性）。
  if (branch) return null;
  const egovId = FULL_TO_EGOV_ID.get(targetFull);
  if (!egovId) return null;
  return { href: `https://laws.e-gov.go.jp/law/${egovId}#Mp-At_${n}`, external: true };
}

const _knownLawNameSet = new Set(_lawNames);
function isKnownLawName(name: string): boolean {
  return _knownLawNameSet.has(name);
}

/**
 * 条文本文中の条番号参照を、解決可能なものだけリンク化した表示非依存セグメント配列へ変換する。
 * 解決できない参照・法令名の付かない曖昧参照は素テキストとして残す（幽霊リンク 0）。
 *
 * @param text 条文本文（LawArticle.text）
 * @param contextLawFullName 表示中の条文が属する法令の正式名称（LawArticle.law）＝裸参照の解決先
 */
export function linkifyArticleReferences(
  text: string,
  contextLawFullName: string,
): ArticleRefSegment[] {
  if (!text) return [];
  const segments: ArticleRefSegment[] = [];
  let last = 0;
  REF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REF_RE.exec(text)) !== null) {
    const [full, prefix, nRaw, branchRaw, kouRaw] = m;
    const start = m.index;
    const resolved = resolveRef(prefix, nRaw, branchRaw, kouRaw, contextLawFullName, text, start);
    if (!resolved) continue; // 素テキストのまま（次のテキストスライスに含まれる）
    if (start > last) segments.push({ text: text.slice(last, start) });
    segments.push({ text: full, href: resolved.href, external: resolved.external });
    last = start + full.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
