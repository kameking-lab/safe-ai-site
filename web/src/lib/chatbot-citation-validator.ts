/**
 * Phase 2 Layer 2: Post-generation 照合（応答テキストから条文参照を抽出して検証）
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/04-hallucination-prevention-design.md §3
 *
 * 目的:
 * - Gemini 応答テキストに含まれる条文参照を全件抽出し、
 *   article-registry（実在条文 DB）と機械照合する。
 * - 検出パターン:
 *   A. 完全ハルシネーション: DB に該当条文が存在しない（高リスク → retry 候補）
 *   B. スコープ外参照: DB には存在するが Layer 1 ホワイトリスト外（低リスク → 警告）
 *   C. 号番号誤り: 条は Layer 1 内だが号が itemNumberMap と整合しない（低リスク → 修正提案）
 *
 * D6 段階的対応:
 *   - 高リスク（Pattern A、または Pattern A が複数件）→ retryRecommended = true
 *   - 低リスク（Pattern B/C のみ）→ 警告追記＋信頼度降格、応答は維持
 */

import {
  normalizeFullwidthAlnum,
  normalizeKanjiNumbers,
  parseArticleNum,
  refToKey,
  type ArticleRef,
} from "@/lib/article-number-normalize";
import { getAllowedReferenceKeys } from "@/lib/article-registry";
import type { AllowedCitation } from "@/lib/chatbot-prompt-builder";

/**
 * 応答テキストから抽出した1件の条文参照（生の出現箇所つき）。
 */
export type ExtractedCitation = {
  /** 法令短縮名（マッチした文字列の法令名部分） */
  lawShort: string;
  /** 元のマッチ文字列（例: 「安衛法第61条第1項」） */
  raw: string;
  /** 構造化参照（article + branch + paragraph + item） */
  ref: ArticleRef;
  /** 正規化キー（lawShort|article-branch-paragraph-item） */
  key: string;
  /** 条のみキー（lawShort|article-branch--）— 号レベル比較で fall-back 検索に使う */
  articleOnlyKey: string;
  /** 応答テキスト内の位置（開始 index） */
  index: number;
};

/**
 * Layer 2 検証結果1件分。
 */
export type CitationFinding = {
  /** 検出パターン: A=完全ハルシネーション, B=スコープ外, C=号番号誤り */
  pattern: "A" | "B" | "C";
  /** 抽出された生の参照 */
  citation: ExtractedCitation;
  /** ユーザー向け説明 */
  message: string;
  /** Pattern C のみ: itemNumberMap から逆引きした正しい号番号候補（最大2件） */
  suggestedItems?: string[];
};

/**
 * Layer 2 全体の判定結果。
 */
export type CitationValidationResult = {
  /** 抽出された全参照 */
  extracted: ExtractedCitation[];
  /** 不一致パターンの一覧 */
  findings: CitationFinding[];
  /** retry を推奨するか（D6: Pattern A 検出時に true） */
  retryRecommended: boolean;
  /** 信頼度を降格すべきか（任意の不一致があれば true） */
  shouldDegradeConfidence: boolean;
  /** 警告メッセージのフォーマット済テキスト（応答末尾追記用、空なら追記不要） */
  warningNote: string;
};

// ── 法令短縮名の許容パターン ─────────────────────────────────
// 既存 chatbot-enrichment.ts:KNOWN_LAW_SHORTS と整合。
// この集合を抽出時のマッチ補助に使い、応答テキスト中の表記ゆれを吸収する。
const LAW_SHORT_ALIASES: Record<string, string[]> = {
  安衛法: ["安衛法", "労働安全衛生法"],
  安衛則: ["安衛則", "労働安全衛生規則", "労安衛則"],
  安衛令: ["安衛令", "労働安全衛生法施行令", "労安衛令"],
  クレーン則: ["クレーン則", "クレーン等安全規則"],
  ボイラー則: ["ボイラー則", "ボイラー及び圧力容器安全規則"],
  ゴンドラ則: ["ゴンドラ則", "ゴンドラ安全規則"],
  有機則: ["有機則", "有機溶剤中毒予防規則"],
  特化則: ["特化則", "特定化学物質障害予防規則"],
  酸欠則: ["酸欠則", "酸素欠乏症等防止規則"],
  石綿則: ["石綿則", "石綿障害予防規則"],
  粉じん則: ["粉じん則", "粉じん障害防止規則"],
  電離則: ["電離則", "電離放射線障害防止規則"],
  鉛則: ["鉛則", "鉛中毒予防規則"],
  四アルキル鉛則: ["四アルキル鉛則"],
  高圧則: ["高圧則", "高気圧作業安全衛生規則"],
  事務所則: ["事務所則", "事務所衛生基準規則"],
  足場則: ["足場則"],
  じん肺法: ["じん肺法"],
  作環測法: ["作環測法", "作業環境測定法"],
  労基法: ["労基法", "労働基準法"],
  労基則: ["労基則", "労働基準法施行規則"],
  労契法: ["労契法", "労働契約法"],
  労災保険法: ["労災保険法", "労働者災害補償保険法"],
  最賃法: ["最賃法", "最低賃金法"],
  育介法: ["育介法", "育児介護休業法"],
  均等法: ["均等法", "雇用機会均等法"],
  パート有期法: ["パート有期法"],
  職安法: ["職安法", "職業安定法"],
  職能法: ["職能法", "職業能力開発促進法"],
  派遣法: ["派遣法", "労働者派遣法"],
  建設業法: ["建設業法"],
  女性則: ["女性則", "女性労働基準規則"],
  年少者則: ["年少者則", "年少者労働基準規則"],
};

/**
 * 応答テキスト中の「(法令短縮名)第N条…」を抽出する。
 *
 * 正規表現は意図的に保守的。法令名候補は LAW_SHORT_ALIASES から構築し、
 * 既知の法令だけを対象にする（雑多な漢字列マッチを避ける）。
 *
 * パターン:
 *   <lawAlias> 第<条>条 (の<枝>)? (第<項>項)? (第<号>号)?
 *
 * 漢数字（六、十一 等）も拾えるよう、まず normalizeKanjiNumbers で
 * 応答テキスト全体を算用数字に統一してから抽出する。
 *
 * メモ: kanjiToArabic / normalizeKanjiNumbers は単独の漢数字片を変換するため、
 * 「第六十一条」→「第61条」のような変換は問題なく動く。
 */
export function extractCitations(answer: string): ExtractedCitation[] {
  if (!answer) return [];
  // 全角英数字 → 半角、漢数字 → 算用数字に統一
  const normalized = normalizeKanjiNumbers(normalizeFullwidthAlnum(answer));

  // 法令短縮名候補をすべてエスケープ済の OR で連結
  const aliasesByLength = Object.values(LAW_SHORT_ALIASES)
    .flat()
    .sort((a, b) => b.length - a.length) // 長い順（"労働安全衛生法施行令" を "労働安全衛生法" より先に）
    .map(escapeRegex);
  const lawPattern = aliasesByLength.join("|");

  // (法令名) 第N条 [の枝] [第M項] [第K号]
  const cite = new RegExp(
    `(${lawPattern})\\s*第([0-9]+)条(?:の([0-9]+))?(?:\\s*第?([0-9]+)項)?(?:\\s*第?([0-9]+)号)?`,
    "g"
  );

  const out: ExtractedCitation[] = [];
  let m: RegExpExecArray | null;
  while ((m = cite.exec(normalized))) {
    const aliasMatched = m[1];
    const lawShort = canonicalizeLawShort(aliasMatched);
    if (!lawShort) continue;

    const articleNum = m[2];
    const branch = m[3];
    const paragraph = m[4];
    const item = m[5];

    // 復元: ref を構築（algorithmic equivalence to parseArticleNum）
    const rawArticleStr =
      `第${articleNum}条` +
      (branch ? `の${branch}` : "") +
      (paragraph ? `第${paragraph}項` : "") +
      (item ? `第${item}号` : "");
    const ref = parseArticleNum(rawArticleStr);
    if (!ref) continue;

    const key = `${lawShort}|${refToKey(ref)}`;
    // 条のみキー（号と項を空にして条＋枝までで照合する用）
    const articleOnlyKey = `${lawShort}|${refToKey({
      article: ref.article,
      branch: ref.branch,
    })}`;

    out.push({
      lawShort,
      raw: m[0],
      ref,
      key,
      articleOnlyKey,
      index: m.index,
    });
  }
  return out;
}

/**
 * Layer 2 照合本体。
 *
 * 引数:
 *   - answer: Gemini 応答テキスト
 *   - allowed: Layer 1 で同梱したホワイトリスト（RAG ヒット由来）
 *
 * 戻り値: CitationValidationResult
 */
export function validateCitations(
  answer: string,
  allowed: readonly AllowedCitation[]
): CitationValidationResult {
  const extracted = extractCitations(answer);
  const findings: CitationFinding[] = [];

  if (extracted.length === 0) {
    return {
      extracted,
      findings,
      retryRecommended: false,
      shouldDegradeConfidence: false,
      warningNote: "",
    };
  }

  const registryKeys = getAllowedReferenceKeys();
  // Layer 1 ホワイトリストの条レベルキー集合（号や項は揃わなくても良いマッチ）
  const allowedArticleKeys = new Set(
    allowed.map((c) => {
      // c.key は registryEntry.key と同形式（lawShort|article-branch-paragraph-item）
      // 条のみキーへ落とす: 最後の "項-号" を空に
      return collapseToArticleOnlyKey(c.key);
    })
  );
  const allowedFullKeys = new Set(allowed.map((c) => c.key));
  // itemNumberMap の逆引き用（条のみキー → number set + label set）
  const allowedItemMap = new Map<string, AllowedCitation>();
  for (const c of allowed) {
    if (c.itemNumberMap) {
      allowedItemMap.set(collapseToArticleOnlyKey(c.key), c);
    }
  }

  // 同一参照の重複検出は単純に findings に複数入れる（応答での複数引用を表すため）
  for (const ex of extracted) {
    const articleOnlyKey = ex.articleOnlyKey;
    // 1) DB に条文番号自体（条レベル）が存在しない → 完全ハルシネーション
    // registryKeys は「条までで一意」ではなく、登録された全エントリの key 集合なので
    // 条レベルでヒットがあるかを別途確認する必要がある。
    const inRegistryArticle = anyRegistryKeyMatchesArticle(
      registryKeys,
      articleOnlyKey
    );
    if (!inRegistryArticle) {
      findings.push({
        pattern: "A",
        citation: ex,
        message: `「${ex.raw}」は構造化条文DBに存在しない条文番号です。提供データ範囲外の引用と判定しました。`,
      });
      continue;
    }

    // 2) Layer 1 ホワイトリストの条レベルに無い → スコープ外
    if (!allowedArticleKeys.has(articleOnlyKey)) {
      findings.push({
        pattern: "B",
        citation: ex,
        message: `「${ex.raw}」は実在しますが、本クエリの参照条文（ホワイトリスト）外です。回答精度の確認をおすすめします。`,
      });
      continue;
    }

    // 3) 条は Layer 1 内。号が指定されているか確認
    if (ex.ref.item !== undefined) {
      // 完全キーで Layer 1 ホワイトリスト内に存在するか
      if (allowedFullKeys.has(ex.key)) continue; // 完全一致

      // 完全一致しないとき、itemNumberMap で正しい号を逆引き
      const owner = allowedItemMap.get(articleOnlyKey);
      // itemNumberMap に該当号番号が存在するなら正しい引用扱い（findings に積まない）
      if (owner?.itemNumberMap && hasItemInMap(owner.itemNumberMap, ex.ref.item)) {
        continue;
      }
      const suggestedItems = owner
        ? lookupItemSuggestions(owner.itemNumberMap ?? {}, ex.ref.item)
        : [];
      if (suggestedItems.length > 0) {
        findings.push({
          pattern: "C",
          citation: ex,
          message: `「${ex.raw}」の号番号が条文 itemNumberMap と整合しない可能性があります。`,
          suggestedItems,
        });
      } else if (owner) {
        // owner があるが候補が無い（itemNumberMap が空 or 致命的逆引き不能）→ 警告
        findings.push({
          pattern: "B",
          citation: ex,
          message: `「${ex.raw}」の号番号は確認できませんでした。条文原文での確認をおすすめします。`,
        });
      }
      // owner が無い（itemNumberMap 未登録条文）→ 号レベルは検証スキップ
    }
    // 号が無い → 条レベルマッチで OK。findings に追加しない。
  }

  // D6: 段階的対応
  // Pattern A が1件以上 → 高リスク（retry 推奨）
  const patternACount = findings.filter((f) => f.pattern === "A").length;
  const retryRecommended = patternACount >= 1;
  const shouldDegradeConfidence = findings.length > 0;

  const warningNote = formatWarningNote(findings);

  return {
    extracted,
    findings,
    retryRecommended,
    shouldDegradeConfidence,
    warningNote,
  };
}

/**
 * Layer 2 の検出結果から、応答末尾に付ける警告テキストを組み立てる。
 * 空文字なら警告追記不要。
 */
export function formatWarningNote(findings: readonly CitationFinding[]): string {
  if (findings.length === 0) return "";
  const a = findings.filter((f) => f.pattern === "A");
  const b = findings.filter((f) => f.pattern === "B");
  const c = findings.filter((f) => f.pattern === "C");
  const lines: string[] = ["\n\n⚠️ 引用条文の検証結果："];
  if (a.length > 0) {
    const samples = a.slice(0, 3).map((f) => f.citation.raw).join("、");
    lines.push(
      `- 構造化条文DBに存在しない引用（${a.length}件）: ${samples}。本ツールの提供データ範囲外のため e-Gov 等で確認してください。`
    );
  }
  if (b.length > 0) {
    const samples = b.slice(0, 3).map((f) => f.citation.raw).join("、");
    lines.push(
      `- 検索ヒット外の条文引用（${b.length}件）: ${samples}。回答精度が低下している可能性があります。`
    );
  }
  if (c.length > 0) {
    for (const f of c.slice(0, 3)) {
      const sug = (f.suggestedItems ?? []).join("、");
      lines.push(
        `- 号番号誤りの可能性: ${f.citation.raw}。正しい号は ${sug} の可能性があります（条文 itemNumberMap 由来）。`
      );
    }
  }
  return lines.join("\n");
}

// ── 補助関数 ──────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalizeLawShort(matched: string): string | undefined {
  for (const [canonical, aliases] of Object.entries(LAW_SHORT_ALIASES)) {
    if (aliases.includes(matched)) return canonical;
  }
  return undefined;
}

/**
 * "lawShort|article-branch-paragraph-item" を "lawShort|article-branch--" に
 * 落として、項・号を無視した条レベルキーを得る。
 * refToKey の出力フォーマット（article-branch-paragraph-item）に依存。
 */
function collapseToArticleOnlyKey(fullKey: string): string {
  const sepIdx = fullKey.indexOf("|");
  if (sepIdx < 0) return fullKey;
  const law = fullKey.slice(0, sepIdx);
  const rest = fullKey.slice(sepIdx + 1);
  // rest = "article-branch-paragraph-item"
  const parts = rest.split("-");
  if (parts.length < 4) return fullKey;
  const article = parts[0];
  const branch = parts[1];
  return `${law}|${article}-${branch}--`;
}

/**
 * 構造化 DB の key 集合に、ある条レベルキーが少なくとも1件含まれるかを判定。
 * 完全一致では条が項・号を持っている key とぶつからないため、
 * 各 key を条レベルに落として比較する。
 */
function anyRegistryKeyMatchesArticle(
  registryKeys: ReadonlySet<string>,
  articleOnlyKey: string
): boolean {
  // Fast path: 既にキーが条レベル形式（項・号空）と一致する場合
  if (registryKeys.has(articleOnlyKey)) return true;
  // Slow path: 全 key を走査して条レベルに落として比較
  for (const k of registryKeys) {
    if (collapseToArticleOnlyKey(k) === articleOnlyKey) return true;
  }
  return false;
}

/**
 * itemNumberMap に該当する号番号が含まれているか判定する。
 */
function hasItemInMap(
  itemNumberMap: Record<string, string>,
  inputItem: number
): boolean {
  for (const kanji of Object.keys(itemNumberMap)) {
    const arabic = normalizeKanjiNumbers(kanji);
    const n = Number(arabic);
    if (Number.isFinite(n) && n === inputItem) return true;
  }
  return false;
}

/**
 * itemNumberMap から、抽出された号番号（数値）に対応する漢数字キーを逆引きする。
 *
 * 例: itemNumberMap = { 一: "発破", 十一: "フォークリフト", 十六: "クレーン" }
 *   ex.ref.item = 10 → 一致なし。代わりに「十一」を候補として返す（最も近い+1）。
 *
 * 簡易ヒューリスティック:
 *   - 完全一致があれば返さない（呼出元で別判定）
 *   - ±1の近傍候補を最大2件返す
 *   - 候補ラベルは「第N号（対象業務）」形式
 */
function lookupItemSuggestions(
  itemNumberMap: Record<string, string>,
  inputItem: number
): string[] {
  // 漢数字キーを算用数字へ変換した array を作る
  const entries: { num: number; label: string; topic: string }[] = [];
  for (const [kanji, topic] of Object.entries(itemNumberMap)) {
    const arabic = normalizeKanjiNumbers(kanji);
    const n = Number(arabic);
    if (Number.isFinite(n)) {
      entries.push({ num: n, label: `第${n}号`, topic });
    }
  }
  // input と完全一致なら呼出元の判定通り → ここでは候補不要
  if (entries.some((e) => e.num === inputItem)) return [];

  // 近傍候補（差分の絶対値で昇順、最大2件）
  entries.sort((a, b) => Math.abs(a.num - inputItem) - Math.abs(b.num - inputItem));
  return entries.slice(0, 2).map((e) => `${e.label}（${e.topic}）`);
}
