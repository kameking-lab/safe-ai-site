import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import { EGOV_LAW_SEARCH_URL } from '@/lib/cross-search';
import { LAW_METADATA } from '@/data/law-metadata';

// ⌘K 横断検索は /search と同一インデックス（search-index.ts）を使う。0件時のフォールバックも
// /search の NoResults と揃える＝どちらの入口でも「未収載を規定なしと誤読させない」安全ガードと
// 一次情報(e-Gov)への逃がしを保証する（診断書 05-search-egov.md G7 / T4 のパリティ）。
const NO_HIT_QUERY = 'zzxq存在しない語句qxzz';

// 「法令名＋抄録未収載の条番号」で 0 件になるクエリ（/search egov-anchor テストと同型）。
// 安衛則は curated 収載があるが第9999条は存在せず 0 件 → egovArticleAnchor が当該法令の
// e-Gov 条アンカーへ解決する。⌘K でも /search 同様に原文へ 1 タップ着地させる（T4 後段パリティ）。
const LAW_ARTICLE_NO_HIT = '安衛則 第9999条';

// next/navigation はクライアントフックなのでモック。
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// jsdom は scrollIntoView 未実装（選択ハイライトの追従で呼ばれる）。no-op で差す。
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

afterEach(cleanup);

// buildSearchIndex は多数のデータモジュールを import するため初回構築が重い。
// 0件フォールバックはインデックス読込＋デバウンス(200ms)後に描画されるので待機を長めに取る。
const WAIT = { timeout: 20000 };

async function renderPaletteWithQuery(query: string) {
  render(<CommandPalette onClose={vi.fn()} />);
  const input = await screen.findByPlaceholderText(/横断検索/, {}, WAIT);
  fireEvent.change(input, { target: { value: query } });
  return input;
}

const renderPaletteWithNoHitQuery = () => renderPaletteWithQuery(NO_HIT_QUERY);

describe('CommandPalette (⌘K) 0件フォールバック（/search T4 とのパリティ）', () => {
  it('0件時に e-Gov 法令検索へのリンク（到達可能なポータルトップ）を表示する', async () => {
    await renderPaletteWithNoHitQuery();
    const egov = await screen.findByRole('link', { name: /e-Gov法令検索で調べる/ }, WAIT);
    // 幽霊リンク回避＝クエリ付きディープリンクではなく到達可能なポータルトップへ固定
    expect(egov.getAttribute('href')).toBe(EGOV_LAW_SEARCH_URL);
    expect(egov.getAttribute('target')).toBe('_blank');
    expect(egov.getAttribute('rel')).toContain('noopener');
  });

  it('収録範囲を明示し「見つからない＝規定がない」の誤読を防ぐ（安全ガード）', async () => {
    await renderPaletteWithNoHitQuery();
    expect(
      await screen.findByText(/見つからない＝「規定がない」ではありません/, {}, WAIT),
    ).toBeTruthy();
  });

  it('法令名＋抄録未収載の条番号は当該法令の e-Gov 条アンカー（#Mp-At_N）へ直リンクする', async () => {
    await renderPaletteWithQuery(LAW_ARTICLE_NO_HIT);
    const anchor = await screen.findByRole(
      'link',
      { name: /e-Gov で「労働安全衛生規則 第9999条」を開く/ },
      WAIT,
    );
    // /search NoResults と同一の条アンカー URL・target/rel（幽霊リンク 0＝法令トップは必ず実在）。
    expect(anchor.getAttribute('href')).toBe(
      `https://laws.e-gov.go.jp/law/${LAW_METADATA['安衛則'].egovLawId}#Mp-At_9999`,
    );
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toContain('noopener');
  });
});
