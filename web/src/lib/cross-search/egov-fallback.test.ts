import { describe, it, expect } from 'vitest';
import { EGOV_LAW_SEARCH_URL, egovHandoffQuery, egovArticleAnchor } from './egov-fallback';
import { LAW_METADATA } from '@/data/law-metadata';

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

describe('egovArticleAnchor（0件クエリ→e-Gov 条アンカー直リンク＝T4後段）', () => {
  const ANCHOR_RE = /^https:\/\/laws\.e-gov\.go\.jp\/law\/[0-9A-Z]+#Mp-At_\d+$/;

  it('略称＋条番号を e-Gov 条アンカーへ解決する（安衛則 577条→労働安全衛生規則 第577条）', () => {
    const a = egovArticleAnchor('安衛則 577条');
    expect(a).not.toBeNull();
    expect(a!.lawShort).toBe('安衛則');
    expect(a!.fullName).toBe('労働安全衛生規則');
    expect(a!.articleLabel).toBe('第577条');
    // URL 形は O18 条文参照リンカーと同形（law トップ＋#Mp-At_N）。法令番号は LAW_METADATA 由来。
    expect(a!.url).toBe(`https://laws.e-gov.go.jp/law/${LAW_METADATA['安衛則'].egovLawId}#Mp-At_577`);
    expect(a!.url).toMatch(ANCHOR_RE);
  });

  it('正式名称＋条番号でも解決する（労働安全衛生規則 第563条）', () => {
    const a = egovArticleAnchor('労働安全衛生規則 第563条');
    expect(a?.lawShort).toBe('安衛則');
    expect(a?.url).toBe(`https://laws.e-gov.go.jp/law/${LAW_METADATA['安衛則'].egovLawId}#Mp-At_563`);
  });

  it('かな読み（あんえいそく）を正略称へ展開してから解決する', () => {
    const a = egovArticleAnchor('あんえいそく 577条');
    expect(a?.lawShort).toBe('安衛則');
    expect(a?.url).toContain('#Mp-At_577');
  });

  it('漢数字の条番号も算用数字へ正規化して解決する（第五百七十七条）', () => {
    const a = egovArticleAnchor('安衛則 第五百七十七条');
    expect(a?.articleLabel).toBe('第577条');
    expect(a?.url).toContain('#Mp-At_577');
  });

  it('最長一致：施行令は親法より優先（労働安全衛生法施行令 第6条→安衛令）', () => {
    const a = egovArticleAnchor('労働安全衛生法施行令 第6条');
    expect(a?.lawShort).toBe('安衛令');
    expect(a?.fullName).toBe('労働安全衛生法施行令');
    expect(a?.url).toBe(`https://laws.e-gov.go.jp/law/${LAW_METADATA['安衛令'].egovLawId}#Mp-At_6`);
  });

  it('枝番（第N条のM）は基条アンカーへ誤着地するため null（法令正確性）', () => {
    expect(egovArticleAnchor('安衛則 第577条の2')).toBeNull();
    expect(egovArticleAnchor('安衛則 577-2条')).toBeNull();
  });

  it('法令名を明示しない裸の条番号は推測せず null（誤誘導回避）', () => {
    expect(egovArticleAnchor('577条')).toBeNull();
    expect(egovArticleAnchor('第61条')).toBeNull();
  });

  it('未知の法令名・条番号なしのクエリは null（トップフォールバックに委ねる）', () => {
    expect(egovArticleAnchor('架空法 第3条')).toBeNull();
    expect(egovArticleAnchor('石綿 事前調査')).toBeNull();
    expect(egovArticleAnchor('')).toBeNull();
    expect(egovArticleAnchor('   ')).toBeNull();
  });

  it('生成される法令番号は必ず LAW_METADATA に実在する（捏造0）', () => {
    const known = new Set(
      Object.values(LAW_METADATA)
        .map((m) => m.egovLawId)
        .filter((id): id is string => Boolean(id)),
    );
    for (const q of ['安衛法 61条', '安衛則 563条', 'クレーン則 23条', '安衛令 6条']) {
      const a = egovArticleAnchor(q);
      expect(a, q).not.toBeNull();
      const id = a!.url.match(/\/law\/([0-9A-Z]+)#/)?.[1];
      expect(known.has(id!), `${q} → ${id}`).toBe(true);
    }
  });
});
