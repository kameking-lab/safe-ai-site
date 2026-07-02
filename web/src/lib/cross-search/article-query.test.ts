import { describe, it, expect } from 'vitest';
import { normalizeArticleQuery } from './article-query';

// O8-b（診断書 05-search-egov.md T2）: 条番号クエリパーサの単体規約。
// 「法令名＋条番号」の地続きクエリを、AND エンジンが条文タイトル/keywords へ
// 合流できる正規形（法令名 + 第N条(のM)）へ書き換える。
describe('normalizeArticleQuery', () => {
  it('法令名＋条番号（地続き）を空白で分解し「第N条」へ正規化', () => {
    expect(normalizeArticleQuery('安衛法61条')).toBe('安衛法 第61条');
    expect(normalizeArticleQuery('安衛則563条')).toBe('安衛則 第563条');
  });

  it('既に空白がある「法令名 88条」も「第88条」へ揃える', () => {
    expect(normalizeArticleQuery('安衛法 88条')).toBe('安衛法 第88条');
  });

  it('漢数字条番号を算用数字へ（第六十一条→第61条・五百六十三→563）', () => {
    expect(normalizeArticleQuery('第六十一条')).toBe('第61条');
    expect(normalizeArticleQuery('安衛則 第五百六十三条')).toBe('安衛則 第563条');
  });

  it('全角数字を半角へ吸収', () => {
    expect(normalizeArticleQuery('安衛法　６１条')).toBe('安衛法 第61条');
  });

  it('枝番（の／ハイフン）を「第N条のM」へ正規化', () => {
    expect(normalizeArticleQuery('第61条の2')).toBe('第61条の2');
    expect(normalizeArticleQuery('61条の2')).toBe('第61条の2');
    expect(normalizeArticleQuery('61-2条')).toBe('第61条の2');
    expect(normalizeArticleQuery('第10条-3')).toBe('第10条の3');
    expect(normalizeArticleQuery('第十条の三')).toBe('第10条の3');
  });

  it('既に正規形なら冪等（第61条→第61条）', () => {
    expect(normalizeArticleQuery('安衛法 第61条')).toBe('安衛法 第61条');
    expect(normalizeArticleQuery('第563条')).toBe('第563条');
  });

  it('条番号を含まない通常クエリは素通し（2語AND検索を壊さない）', () => {
    expect(normalizeArticleQuery('石綿 事前調査')).toBe('石綿 事前調査');
    expect(normalizeArticleQuery('クレーン 過負荷')).toBe('クレーン 過負荷');
    expect(normalizeArticleQuery('足場 作業床')).toBe('足場 作業床');
    expect(normalizeArticleQuery('就業制限')).toBe('就業制限');
  });

  it('「条」マーカーの無い数字・日付範囲は変換しない（誤変換防止）', () => {
    // 裸の数字（条なし）
    expect(normalizeArticleQuery('61')).toBe('61');
    // 日付範囲 2024-2026（ハイフンだが末尾に条が無い）
    expect(normalizeArticleQuery('事故 2024-2026')).toBe('事故 2024-2026');
    // 第N種・N大災害など条以外の漢数字語
    expect(normalizeArticleQuery('第一種')).toBe('第一種');
    expect(normalizeArticleQuery('三大災害')).toBe('三大災害');
  });

  it('法令名に漢数字を含んでも条番号だけ変換（四アルキル鉛則 第5条）', () => {
    expect(normalizeArticleQuery('四アルキル鉛則 第5条')).toBe('四アルキル鉛則 第5条');
  });

  it('空文字・空白は素通し', () => {
    expect(normalizeArticleQuery('')).toBe('');
    expect(normalizeArticleQuery('   ')).toBe('');
  });
});
