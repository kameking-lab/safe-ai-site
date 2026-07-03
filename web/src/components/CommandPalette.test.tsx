import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import { EGOV_LAW_SEARCH_URL } from '@/lib/cross-search';

// ⌘K 横断検索は /search と同一インデックス（search-index.ts）を使う。0件時のフォールバックも
// /search の NoResults と揃える＝どちらの入口でも「未収載を規定なしと誤読させない」安全ガードと
// 一次情報(e-Gov)への逃がしを保証する（診断書 05-search-egov.md G7 / T4 のパリティ）。
const NO_HIT_QUERY = 'zzxq存在しない語句qxzz';

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

async function renderPaletteWithNoHitQuery() {
  render(<CommandPalette onClose={vi.fn()} />);
  const input = await screen.findByPlaceholderText(/横断検索/, {}, WAIT);
  fireEvent.change(input, { target: { value: NO_HIT_QUERY } });
  return input;
}

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
});
