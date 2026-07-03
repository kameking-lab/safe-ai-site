import { describe, it, expect } from 'vitest';
import casKeys from './chemical-detail-cas.json';
import { chemicalDetailUrl, hasChemicalDetailPage } from './chemical-detail-url';
import concentrationLimits from '@/data/concentration-limits.json';

// generator（scripts/gen-chemical-detail-cas.mjs）および詳細ページと厳密に同一。
function normalizeCas(v: string): string {
  return v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]/g, '')
    .trim();
}

const keys = casKeys as string[];

describe('chemical-detail-cas.json — 濃度基準DBとのドリフト検出（幽霊URL 0 の担保）', () => {
  // 正本＝濃度基準DBのキー集合。詳細ページ /chemical-database/[cas] は
  // CONCENTRATION_LIMITS.substances に無い CAS を notFound() で弾くため、この集合こそ
  // 「実在の詳細ページに解決する CAS の全体」。スナップショットが正本と乖離していると
  // (a) 未収載CASへ深リンク＝幽霊URL、または (b) 収載CASを取り逃す。ここで一致を固定する。
  const expected = Array.from(
    new Set(
      Object.keys(
        (concentrationLimits as { substances: Record<string, unknown> }).substances,
      )
        .map(normalizeCas)
        .filter(Boolean),
    ),
  ).sort();

  it('スナップショットは濃度基準DBの正規化キー集合と完全一致する（不一致なら要再生成）', () => {
    expect(keys).toEqual(expected);
  });

  it('全キーが正規化済み・URL安全（数字とハイフンのみ）で重複が無い', () => {
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(k).toBe(normalizeCas(k));
      expect(k).toMatch(/^[0-9-]+$/);
    }
  });

  it('スナップショットは空でない（濃度基準DB 3,000物質超を反映）', () => {
    expect(keys.length).toBeGreaterThan(3000);
  });
});

describe('chemicalDetailUrl — canonical 詳細への深リンクとフォールバック', () => {
  const resolving = keys[0]; // 実在する CAS（詳細ページに解決する）

  it('詳細ページを持つ CAS は canonical 詳細 URL を返す（sitemap収載 URL と 1:1）', () => {
    expect(hasChemicalDetailPage(resolving)).toBe(true);
    expect(chemicalDetailUrl(resolving, 'なんらかの名称')).toBe(
      `/chemical-database/${resolving}`,
    );
  });

  it('全角数字・空白を含む CAS も正規化して解決する', () => {
    const messy = `　${resolving.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0))} `;
    expect(hasChemicalDetailPage(messy)).toBe(true);
    expect(chemicalDetailUrl(messy, 'x')).toBe(`/chemical-database/${resolving}`);
  });

  it('詳細ページを持たない CAS は一覧クエリページへフォールバック（幽霊URL 0）', () => {
    const bogus = '0000-00-0';
    expect(keys).not.toContain(bogus);
    expect(hasChemicalDetailPage(bogus)).toBe(false);
    expect(chemicalDetailUrl(bogus, 'トルエン')).toBe(
      `/chemical-database?q=${encodeURIComponent('トルエン')}`,
    );
  });

  it('フォールバックの物質名はURLエンコードされる', () => {
    expect(chemicalDetailUrl('0000-00-0', 'テスト & 名/前')).toBe(
      `/chemical-database?q=${encodeURIComponent('テスト & 名/前')}`,
    );
  });
});
