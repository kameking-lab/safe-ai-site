import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SearchResults } from './SearchResults';
import { SEARCH_CATEGORIES } from '@/lib/search-index';

// 現場語彙で一部カテゴリだけヒットするクエリ（化学物質/保護具/教育/判例/用語/記事/機能は0件）。
const HIT_QUERY = 'アーク溶接';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'q' ? HIT_QUERY : null) }),
}));

afterEach(cleanup);

// buildSearchIndex は多数のデータモジュールを import するため初回構築が重い。
const WAIT = { timeout: 20000 };

// タブ末尾の件数バッジ（数字）を取り出す。ラベルは日本語のため末尾連続数字＝件数。
function tabCount(tab: Element): number {
  const m = tab.textContent?.match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
}

describe('/search カテゴリタブ（ヒット0のカテゴリは畳む）', () => {
  it('ヒットのあるクエリで空カテゴリのタブを省き、描画タブは全て件数>0', async () => {
    render(<SearchResults />);
    // 結果件数行の描画（＝索引構築完了）を待ってからタブ集合を評価する。
    await screen.findByText(new RegExp(`「${HIT_QUERY}」の検索結果`), {}, WAIT);

    const tabs = screen.getAllByRole('tab');
    // 「すべて」＋ヒットカテゴリのみ＝最低2つ。
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    // 全カテゴリ（13）＋「すべて」の14タブ全部は出さない＝空ファセットが畳まれている証明。
    expect(tabs.length).toBeLessThan(SEARCH_CATEGORIES.length + 1);
    // 「すべて」は常設。
    expect(tabs.some((t) => t.textContent?.includes('すべて'))).toBe(true);
    // 描画された全タブが件数>0＝0件タブは一つも残っていない（active でない限り畳む規約）。
    for (const t of tabs) {
      expect(tabCount(t)).toBeGreaterThan(0);
    }
  });
});
