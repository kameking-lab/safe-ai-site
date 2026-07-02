import { describe, it, expect } from 'vitest';
import {
  expandLawAliases,
  LAW_ALIAS_SHORTS,
  KNOWN_LAW_SHORTS,
} from './law-alias';

// O8-c（診断書 05-search-egov.md T3）: 法令名かな読み・別表記の正略称展開。
// 「あんえいほう」等のかな読みはインデックス／コンテンツに literal で現れず 0 件になる
// 取り逃しを、正略称へ差し替えて拾う（正式名称・別略称は O8-a で解決済みのため対象外）。
describe('expandLawAliases', () => {
  it('法令名のかな読みを正略称へ差し替える', () => {
    expect(expandLawAliases('あんえいほう')).toBe('安衛法');
    expect(expandLawAliases('あんえいそく')).toBe('安衛則');
    expect(expandLawAliases('くれーんそく')).toBe('クレーン則');
    expect(expandLawAliases('じんぱいほう')).toBe('じん肺法');
  });

  it('条番号分解の後段前提＝読みが独立トークンなら他語を保って展開', () => {
    // normalizeArticleQuery 通過後（「あんえいほう88条」→「あんえいほう 第88条」）を想定
    expect(expandLawAliases('あんえいほう 第88条')).toBe('安衛法 第88条');
    expect(expandLawAliases('じんぱいほう 第1条')).toBe('じん肺法 第1条');
  });

  it('別表記の漢字（塵肺法→じん肺法）も正略称へ寄せる', () => {
    expect(expandLawAliases('塵肺法')).toBe('じん肺法');
  });

  it('複数の読みが同一略称を指してもよい（石綿則）', () => {
    expect(expandLawAliases('せきめんそく')).toBe('石綿則');
    expect(expandLawAliases('いしわたそく')).toBe('石綿則');
  });

  it('表記ゆれ（全角・長音・小書き）を正規化して照合', () => {
    // normalizeSearchText 経由なので長音符種別・全角が違っても当たる
    expect(expandLawAliases('くれ−んそく')).toBe('クレーン則'); // U+2212 の長音
  });

  it('エイリアスでないトークンは素通し（既存 AND 検索を壊さない）', () => {
    expect(expandLawAliases('石綿 事前調査')).toBe('石綿 事前調査');
    expect(expandLawAliases('安衛則 第563条')).toBe('安衛則 第563条');
    expect(expandLawAliases('労働安全衛生規則 第563条')).toBe('労働安全衛生規則 第563条');
    expect(expandLawAliases('就業制限')).toBe('就業制限');
  });

  it('部分一致では展開しない（トークン完全一致のみ＝誤爆防止）', () => {
    // 「あんえいほう」を含む長い語は別語として扱い、差し替えない
    expect(expandLawAliases('あんえいほうき')).toBe('あんえいほうき');
  });

  it('空文字・空白は素通し', () => {
    expect(expandLawAliases('')).toBe('');
    expect(expandLawAliases('   ')).toBe('   ');
  });

  it('同期ガード: エイリアス表の正略称は全て LAW_METADATA に実在する（法令メタデータ連携）', () => {
    for (const short of LAW_ALIAS_SHORTS) {
      expect(KNOWN_LAW_SHORTS.has(short)).toBe(true);
    }
  });
});
