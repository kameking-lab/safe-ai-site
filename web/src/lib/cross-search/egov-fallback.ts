/**
 * 横断検索が 0 件になったときの e-Gov 法令検索フォールバック（診断書 05-search-egov.md T4）。
 *
 * 当サイトの収載は主要法令の条文（抄録）＋通達・判例などで、条文は curated 中核に限る
 * （安衛則は実際には第677条まであるが未収載の条番号がある）。0 件を「規定が存在しない」と
 * 誤読させると安全上のリスクになるため、原文の一次情報（e-Gov）へ必ず逃がす。
 *
 * リンク先は e-Gov 法令検索ポータルのトップに固定する。e-Gov の新 UI（2024年リニューアル）は
 * SPA で、キーワードを載せた検索結果への安定したディープリンク URL が公開されていない。
 * 誤ったクエリ付き URL を組むと幽霊リンク（到達不能）になり得るため、**常に到達可能な**
 * ポータルトップ（検索ボックスを備える）へ送り、クエリ本文はクリップボードで引き継ぐ。
 * これで「幽霊リンク 0」を保証しつつ、ユーザーは貼り付け 1 操作で e-Gov 検索に着地できる。
 *
 * さらに、クエリが「法令名＋条番号」を明示している場合は当該法令の e-Gov 条アンカーへ
 * 直リンクできる（{@link egovArticleAnchor}）。こちらは法令番号を持つ法令に限り、基条参照のみ
 * を対象とする（枝番・番号なし法令・裸の条番号は誤誘導を避けて null＝トップフォールバックに委ねる）。
 */
import { LAW_METADATA } from '@/data/law-metadata';
import { normalizeArticleQuery } from './article-query';
import { expandLawAliases } from './law-alias';

/** e-Gov 法令検索ポータルのトップ URL（検索ボックスを備える／到達可能を実測確認）。 */
export const EGOV_LAW_SEARCH_URL = 'https://laws.e-gov.go.jp/';

/**
 * e-Gov へ引き継ぐクエリ文字列を整える（前後空白の除去のみ）。
 * クリップボードにコピーして e-Gov の検索ボックスへ貼り付けてもらうための本文。
 */
export function egovHandoffQuery(query: string): string {
  return query.trim();
}

/**
 * 0 件クエリが「法令名＋条番号」を明示しているとき、e-Gov の**条アンカー**
 * （法令トップ ＋ `#Mp-At_N`）への直リンクを返す（診断書 05-search-egov.md T4 後段
 * ＝「収録外条番号指定時は当該法の e-Gov 条アンカーへ誘導」）。
 *
 * ポータルトップ（キーワード引き継ぎ）だけでは、抄録未収載の条番号を打った現場ユーザーが
 * 貼り付け＋検索＋目次スクロールの複数ステップを踏まされる。法令が一意に定まるクエリなら、
 * 当該法令の e-Gov 該当条へ 1 タップで着地させる方が速く確実。アンカー URL の形は
 * O18 の条文参照リンカー（{@link ../law-links/article-ref-linkify}）と同一で、e-Gov 新 UI で
 * 実測有効。**法令トップ URL 自体は必ず実在＝到達可能**（幽霊リンク 0。仮に当該条番号が
 * その法令に存在しなくても 404 ではなくアンカーが不発になるだけ＝NoResults の amber 注記
 * 「条文の有無・原文は e-Gov でご確認ください」と整合）。
 *
 * 法令正確性は不可侵のため、条件を満たさないクエリでは null を返し従来のポータルトップ
 * フォールバックに委ねる：
 *   - 法令名（略称/正式名称）がクエリに明示され、かつ **e-Gov 法令番号を持つ**法令であること
 *     （番号なしの法令へは条アンカーを組めない）。裸の条番号から法令を推測しない（誤誘導回避）。
 *   - 基条番号（第N条）であること。枝番「第N条のM」は e-Gov Mp-At_N が基条しか指せず誤着地
 *     するため対象外（リンカーと同方針）。
 *
 * クエリは条番号パーサ（{@link normalizeArticleQuery}）＋かな読み展開（{@link expandLawAliases}）を
 * 通してから解決する＝「安衛則577条」「あんえいそく 577条」「第五百七十七条」等の表記ゆらぎも
 * 同じ正規形に収束させる。
 */
export type EgovArticleAnchor = {
  /** e-Gov 条アンカー URL（`https://laws.e-gov.go.jp/law/{id}#Mp-At_{N}`）。 */
  readonly url: string;
  /** 表示用の法令略称（例: 安衛則）。 */
  readonly lawShort: string;
  /** 表示用の正式名称（例: 労働安全衛生規則）。 */
  readonly fullName: string;
  /** 表示用の条番号ラベル（例: 第577条）。 */
  readonly articleLabel: string;
};

/**
 * 法令名（略称・正式名称）→ e-Gov 法令番号。番号を持つ法令のみ収載し、最長一致を優先する
 * （「労働安全衛生法施行令」が「労働安全衛生法」に先行してマッチするよう長い順）。
 */
const EGOV_LAW_NAME_INDEX: ReadonlyArray<{
  readonly name: string;
  readonly lawShort: string;
  readonly fullName: string;
  readonly egovLawId: string;
}> = (() => {
  const out: { name: string; lawShort: string; fullName: string; egovLawId: string }[] = [];
  for (const meta of Object.values(LAW_METADATA)) {
    if (!meta.egovLawId) continue;
    if (meta.lawShort) {
      out.push({ name: meta.lawShort, lawShort: meta.lawShort, fullName: meta.fullName, egovLawId: meta.egovLawId });
    }
    if (meta.fullName && meta.fullName !== meta.lawShort) {
      out.push({ name: meta.fullName, lawShort: meta.lawShort, fullName: meta.fullName, egovLawId: meta.egovLawId });
    }
  }
  return out.sort((a, b) => b.name.length - a.name.length);
})();

/** 基条番号のみ（枝番「第N条のM」は否定先読みで除外）。正規化後は算用数字なので単純化できる。 */
const BASE_ARTICLE_RE = /第(\d+)条(?!\s*の)/;

export function egovArticleAnchor(query: string): EgovArticleAnchor | null {
  if (!query || !query.trim()) return null;
  // 条番号パーサ＋かな読み展開で表記ゆらぎを正規形へ寄せてから解決する。
  const normalized = expandLawAliases(normalizeArticleQuery(query));

  const articleMatch = normalized.match(BASE_ARTICLE_RE);
  if (!articleMatch) return null;
  const n = articleMatch[1];
  if (!/^[1-9][0-9]*$/.test(n)) return null; // 第0条など非現実な番号は組まない

  const law = EGOV_LAW_NAME_INDEX.find((l) => normalized.includes(l.name));
  if (!law) return null;

  return {
    url: `https://laws.e-gov.go.jp/law/${law.egovLawId}#Mp-At_${n}`,
    lawShort: law.lawShort,
    fullName: law.fullName,
    articleLabel: `第${n}条`,
  };
}
