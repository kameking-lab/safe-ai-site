import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SearchResults } from './SearchResults';
import { EGOV_LAW_SEARCH_URL } from '@/lib/cross-search';

// 絶対に 0 件になるクエリで NoResults を描画する（S6 / 診断書 05-search-egov.md T4）。
const NO_HIT_QUERY = 'zzxq存在しない語句qxzz';

// next/navigation はクライアントフックなのでモック。q に no-hit クエリを固定する。
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'q' ? NO_HIT_QUERY : null) }),
}));

afterEach(cleanup);

// buildSearchIndex は多数のデータモジュールを import するため初回構築が重い。
// 0 件フォールバックはローディング完了後に描画されるので待機を長めに取る。
const WAIT = { timeout: 20000 };

describe('/search 0件フォールバック（S6 T4）', () => {
  it('自由入力をURL・履歴・リンクへ載せず、同じ画面で結果を更新する', async () => {
    window.history.replaceState({}, '', '/search?cat=law');
    const marker = '山田太郎-現場A-健康情報';
    render(<SearchResults />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: marker } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText(new RegExp(marker), {}, WAIT)).toBeTruthy();
    expect(window.location.search).toBe('?cat=law');
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toContain(marker);
      expect(link.getAttribute('href') ?? '').not.toContain(encodeURIComponent(marker));
    }
  });

  it('320pxでも検索語入力が縮み、クリア・送信ボタンを画面外へ押し出さない', () => {
    render(<SearchResults />);
    expect(screen.getByRole('searchbox').className).toContain('min-w-0');
    expect(screen.getByRole('button', { name: '検索' }).className).toContain(
      'shrink-0',
    );
  });

  it('0件時に e-Gov 法令検索へのリンク（到達可能なポータルトップ）を表示する', async () => {
    render(<SearchResults />);
    const egov = await screen.findByRole('link', { name: /e-Gov法令検索で調べる/ }, WAIT);
    // 幽霊リンク回避＝クエリ付きディープリンクではなく到達可能なポータルトップへ固定
    expect(egov.getAttribute('href')).toBe(EGOV_LAW_SEARCH_URL);
    expect(egov.getAttribute('target')).toBe('_blank');
    expect(egov.getAttribute('rel')).toContain('noopener');
  });

  it('収録範囲を明示し「見つからない＝規定がない」の誤読を防ぐ', async () => {
    render(<SearchResults />);
    // 安全上の誤読防止コピー（未収載≠規定なし）
    expect(await screen.findByText(/見つからない＝「規定がない」ではありません/, {}, WAIT)).toBeTruthy();
  });

  it('内部の全文検索（/law-search）と検索語コピーの導線も併存する', async () => {
    render(<SearchResults />);
    const lawSearch = await screen.findByRole('link', { name: /法令条文を全文検索/ }, WAIT);
    expect(lawSearch.getAttribute('href')).toBe('/law-search');
    // クエリをクリップボードで e-Gov へ引き継ぐボタン
    expect(screen.getByRole('button', { name: /検索語をコピー/ })).toBeTruthy();
  });
});
