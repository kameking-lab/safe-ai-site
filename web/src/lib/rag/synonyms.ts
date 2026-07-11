import { LAW_ALIAS_GROUPS, isLawNameEquivalent } from "@/lib/law-name-registry";
import { TERM_EXPANSIONS } from "@/lib/rag/field-terms";

/**
 * 安全衛生分野の語彙ゆれを正式表現へ展開する辞書。
 *
 * 設計方針:
 * - **片方向の辞書** (口語 → 正式名)。同じ意味のクエリを正式語に揃え、
 *   コーパス側のキーワード/本文/タイトルにヒットしやすくする。
 * - **法令略称ゆれ** は law-name-registry.ts の LAW_ALIAS_GROUPS（data/laws を
 *   単一ソースに自動生成）を利用し、`労災法` と書かれても `労災保険法` でマッチできるようにする。
 * - **トークン保護**。展開後はスペース区切りで元クエリの末尾に追加するだけで、
 *   既存トークナイザの挙動は変えない（後方互換）。
 * - **現場語彙の単一ソース**は rag/field-terms.ts（2026-07-11 切り出し）。横断検索
 *   （cross-search/score.ts）と共有するため、コーパス非依存の別モジュールに置く。
 */

/** 同じ法令を指す略称・正式名の同義語群（双方向に展開）。単一ソースは law-name-registry.ts。 */
const LAW_ALIASES: string[][] = LAW_ALIAS_GROUPS;

/**
 * 2語の「共起」でのみ展開する辞書（Fable差分監査F5・O5残欠陥）。
 *
 * TERM_EXPANSIONS の固定フレーズ一致（例:「酸欠 資格」）は字面が完全一致した
 * クエリにしか効かず、「酸欠作業に必要な資格は何ですか？」のような自然文の
 * 言い回しゆれに弱い。groupA・groupB それぞれから最低1語ずつ（順不同・
 * 隣接不問）が query に含まれた場合にのみ additions を展開することで、
 * 語順・助詞・敬体の違いに影響されない共起判定にする。
 *
 * 注: expandQueryRich が受け取る query は rag-search.ts で expandQuery
 * （query-expansion.ts の正規表現ルール）を通した後の文字列。したがって
 * groupA/groupB は「口語が一段正規化された後の語」で書けばよい
 * （例: マンホール→酸素欠乏 は query-expansion 側が展開済み）。
 */
const COOCCURRENCE_EXPANSIONS: { groupA: string[]; groupB: string[]; additions: string[] }[] = [
  {
    // 酸欠系語 × 資格系語 → 酸素欠乏危険作業主任者（酸欠則第11条）
    // マンホール/下水管/ピット等の現場語は query-expansion.ts が「酸素欠乏」へ
    // 正規化するため、この共起はそれらの言い回しにも効く（GQ49・2026-07-11）。
    groupA: ["酸欠", "酸素欠乏", "第1種酸欠", "第2種酸欠"],
    groupB: ["資格", "免許", "講習", "技能講習", "作業主任者", "受講"],
    additions: ["酸素欠乏危険作業主任者", "技能講習", "酸欠則第11条"],
  },
  {
    // 玉掛け × ワイヤ/ロープ系 → 玉掛用具（クレーン則第213〜215条）
    groupA: ["玉掛け", "玉掛", "玉かけ"],
    groupB: ["ワイヤ", "ロープ", "フック", "シャックル", "つり具", "用具"],
    additions: ["玉掛用具", "ワイヤロープ", "クレーン則第213条", "クレーン則第214条", "クレーン則第215条"],
  },
  {
    // 移動式クレーン（ユニック等の俗称含む） × 資格系 → 就業制限（クレーン則第68条）
    groupA: ["移動式クレーン", "ユニック", "レッカー", "ラフター"],
    groupB: ["資格", "免許", "講習", "運転", "操作"],
    additions: ["移動式クレーン運転士", "小型移動式クレーン", "クレーン則第68条", "安衛法第61条", "安衛令第20条"],
  },
  {
    // 高所作業車 × 資格系 → 就業制限（安衛法第61条・安衛令第20条第15号）
    groupA: ["高所作業車"],
    groupB: ["資格", "免許", "講習", "運転"],
    additions: ["高所作業車運転", "技能講習", "安衛法第61条", "安衛令第20条"],
  },
  {
    // フルハーネス × 講習/教育 → 特別教育（安衛則第36条第41号）
    groupA: ["フルハーネス", "ハーネス", "墜落制止用器具"],
    groupB: ["講習", "教育", "受講", "受けない"],
    additions: ["特別教育", "特別の教育", "安衛則第36条"],
  },
  {
    // ケガ/負傷 × 報告系 → 労働者死傷病報告（安衛則第97条）
    groupA: ["ケガ", "けが", "怪我", "負傷", "死亡"],
    groupB: ["報告", "届出", "届け", "労基署", "労働基準監督署"],
    additions: ["労働者死傷病報告", "死傷病報告", "安衛則第97条"],
  },
  {
    // クレーン × 年次/自主検査系 → 定期自主検査（クレーン則第34/35条）
    // 「点検」単体は作業開始前点検と競合するため groupB に入れない。
    groupA: ["クレーン"],
    groupB: ["自主検査", "年に1回", "年1回", "1年ごと", "年次"],
    additions: ["定期自主検査", "クレーン則第34条", "クレーン則第35条"],
  },
];

/** 配列を一意化したスペース区切りクエリを返す */
function dedup(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/**
 * クエリに同義語・関連語・法令略称を追加して返す。
 * 元クエリは保持し、追加語は末尾にスペース区切りで連結する。
 */
export function expandQueryRich(query: string): string {
  const lower = query.toLowerCase();
  const additions: string[] = [];

  for (const [key, vals] of Object.entries(TERM_EXPANSIONS)) {
    if (query.includes(key) || lower.includes(key.toLowerCase())) {
      additions.push(...vals);
    }
  }

  for (const group of LAW_ALIASES) {
    if (group.some((g) => query.includes(g))) {
      additions.push(...group);
    }
  }

  for (const { groupA, groupB, additions: coAdditions } of COOCCURRENCE_EXPANSIONS) {
    if (groupA.some((a) => query.includes(a)) && groupB.some((b) => query.includes(b))) {
      additions.push(...coAdditions);
    }
  }

  const unique = dedup(additions);
  if (unique.length === 0) return query;
  return `${query} ${unique.join(" ")}`;
}

/**
 * 法令略称が同義かどうかを判定する。
 *
 * 例: `労災法` と `労災保険法` は同じ法律を指し、`安衛則` と `安衛則` も同じ。
 * RAG ベンチマークでは gold ラベルと corpus ラベルが別の略称を使う場合があるため、
 * テスト側の isMatch がこの関数を使うことで「同じ法令の別表記」を許容する。
 */
export function isLawShortEquivalent(a: string, b: string): boolean {
  return isLawNameEquivalent(a, b);
}

/** デバッグ用に辞書統計を返す。テスト/ドキュメントから参照する。 */
export function getSynonymStats(): { laws: number; terms: number; lawTokens: number; termTokens: number } {
  const lawTokens = LAW_ALIASES.reduce((s, g) => s + g.length, 0);
  const termTokens = Object.values(TERM_EXPANSIONS).reduce((s, v) => s + v.length, 0);
  return {
    laws: LAW_ALIASES.length,
    terms: Object.keys(TERM_EXPANSIONS).length,
    lawTokens,
    termTokens,
  };
}
