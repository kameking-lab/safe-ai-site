/**
 * 法令名エイリアス展開（診断書 docs/fable-diagnosis-2026-07-02/05-search-egov.md の T3 / BACKLOG O8-c）。
 *
 * 横断検索(/search・⌘K)の生クエリに含まれる法令名の「かな読み・別表記」を、curated 条文
 * インデックスの keywords（略称 lawShort・正式名称 law）へ合流できる正規略称へ書き換える。
 * cross-search の AND エンジン({@link ../cross-search})は各語を keywords と照合するが、
 * 「あんえいほう」のような**かな読みはインデックスにもコンテンツにも一切現れず 0 件**になる
 * （診断書 比較 b＝現場のうろ覚え・音声入力で頻発する取り逃し）。読みトークンを正略称
 * 「安衛法」へ差し替えることで該当条文へ直撃させる。
 *
 * **正式名称・別略称は対象外**＝それらは既に O8-a のインデックス化で解決している
 * （実測: 「労働安全衛生規則 第563条」→1位 安衛則563条・「労安衛法 61条」→1位 安衛法61条。
 * 後者は keyword「安衛法」への部分一致で拾える）。本モジュールは既存ヒットを一切奪わないため、
 * 「かな読み」と「コンテンツに現れない稀な漢字表記（塵肺法）」だけを展開対象に絞っている
 * ＝差し替えても失うヒットが無い形にのみ限定している。
 *
 * エイリアス表のキー（正略称）は data/law-metadata.ts の {@link LAW_METADATA} に実在する
 * lawShort であることを law-alias.test.ts の同期ガードで担保する（法令メタデータ連携）。
 */
import { LAW_METADATA } from '@/data/law-metadata';
import { normalizeSearchText } from '../fuzzy-search';

/**
 * 正略称（lawShort）→ その法令の「かな読み・別表記」群。
 * 値はいずれもインデックス／コンテンツに literal では現れない語のみ（差し替えても既存ヒットを
 * 奪わない）。正式名称・部分一致で既に引ける略称は載せない（O8-a で解決済み）。
 */
const LAW_NAME_ALIASES: Record<string, readonly string[]> = {
  安衛法: ['あんえいほう'],
  安衛則: ['あんえいそく'],
  安衛令: ['あんえいれい'],
  クレーン則: ['くれーんそく'],
  有機則: ['ゆうきそく'],
  特化則: ['とっかそく'],
  酸欠則: ['さんけつそく'],
  石綿則: ['せきめんそく', 'いしわたそく'],
  粉じん則: ['ふんじんそく'],
  電離則: ['でんりそく'],
  鉛則: ['なまりそく'],
  ボイラー則: ['ぼいらーそく'],
  ゴンドラ則: ['ごんどらそく'],
  高圧則: ['こうあつそく'],
  事務所則: ['じむしょそく'],
  じん肺法: ['じんぱいほう', '塵肺法'],
  労基法: ['ろうきほう'],
  労基則: ['ろうきそく'],
  労契法: ['ろうけいほう'],
  派遣法: ['はけんほう'],
  // 現場・一人親方・人事の頻用法令のかな読み（音声/うろ覚え入力の取り逃し是正）。
  // いずれも curated 条文インデックスに実在（検索可能な条文を持つ lawShort）で、
  // 読みは略称の機械的な音読み＝コンテンツに literal では現れず既存ヒットを奪わない。
  建設業法: ['けんせつぎょうほう'],
  労災保険法: ['ろうさいほけんほう'],
  職安法: ['しょくあんほう'],
  職能法: ['しょくのうほう'],
  均等法: ['きんとうほう'],
  育介法: ['いくかいほう'],
  最賃法: ['さいちんほう'],
  女性則: ['じょせいそく'],
  年少者則: ['ねんしょうしゃそく'],
  作環測法: ['さくかんそくほう'],
  四アルキル鉛則: ['よんあるきるなまりそく'],
  機械等検定規則: ['きかいとうけんていきそく'],
};

/** 正規化した読み → 正略称。normalizeSearchText で照合し、出力は raw な略称（keyword と完全一致）。 */
const ALIAS_TO_SHORT: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [short, aliases] of Object.entries(LAW_NAME_ALIASES)) {
    for (const alias of aliases) {
      const key = normalizeSearchText(alias);
      if (key) map.set(key, short);
    }
  }
  return map;
})();

/**
 * 生クエリ中の法令名かな読み・別表記トークンを正略称へ差し替える。
 * トークンは空白区切りで完全一致判定（部分一致は誤爆源のため採らない）。
 * {@link normalizeArticleQuery} の後段で呼ぶ前提＝「あんえいほう88条」は先に
 * 「あんえいほう 第88条」へ分解済みのため、読みが独立トークンになっている。
 *
 * 例: 「あんえいほう 第88条」→「安衛法 第88条」／「じんぱいほう」→「じん肺法」
 */
export function expandLawAliases(query: string): string {
  if (!query) return query;
  let changed = false;
  const out = query.split(/\s+/).map((tok) => {
    if (!tok) return tok;
    const canon = ALIAS_TO_SHORT.get(normalizeSearchText(tok));
    if (canon && canon !== tok) {
      changed = true;
      return canon;
    }
    return tok;
  });
  return changed ? out.join(' ') : query;
}

/** 同期ガード用: エイリアス表が対象とする正略称の一覧（law-alias.test.ts）。 */
export const LAW_ALIAS_SHORTS: readonly string[] = Object.keys(LAW_NAME_ALIASES);

/** 同期ガード用: LAW_METADATA に実在する lawShort 集合（正略称の実在確認）。 */
export const KNOWN_LAW_SHORTS: ReadonlySet<string> = new Set(Object.keys(LAW_METADATA));
