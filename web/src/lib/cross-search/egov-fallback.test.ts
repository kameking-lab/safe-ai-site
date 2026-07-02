import { describe, it, expect } from 'vitest';
import { EGOV_LAW_SEARCH_URL, egovHandoffQuery } from './egov-fallback';

describe('egov-fallback', () => {
  it('リンク先は https の e-Gov 法令検索ポータル（幽霊リンク回避＝常に到達可能なトップ）', () => {
    // 誤ったクエリ付きディープリンクを組まず、到達可能なポータルトップに固定する。
    expect(EGOV_LAW_SEARCH_URL).toBe('https://laws.e-gov.go.jp/');
    expect(EGOV_LAW_SEARCH_URL).toMatch(/^https:\/\//);
    expect(EGOV_LAW_SEARCH_URL).toContain('laws.e-gov.go.jp');
  });

  it('引き継ぎクエリは前後空白を除去する', () => {
    expect(egovHandoffQuery('  安衛則 第677条  ')).toBe('安衛則 第677条');
    expect(egovHandoffQuery('石綿')).toBe('石綿');
    expect(egovHandoffQuery('')).toBe('');
  });
});
