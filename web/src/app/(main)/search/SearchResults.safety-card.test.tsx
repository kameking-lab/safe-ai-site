import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { SearchItem } from '@/lib/search-index';
import { SearchResults } from './SearchResults';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => key === 'q' ? '事故' : null }),
}));

vi.mock('@/lib/search-index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/search-index')>();
  const items: SearchItem[] = [
    {
      id: 'quarantined-case', title: '確認前の事故資料', subtitle: '出典確認中',
      url: '/accidents/quarantined-case', category: 'accident', verification: 'quarantine',
    },
    {
      id: 'preliminary-case', title: '事故の速報集計', subtitle: '集計の対象時点に注意',
      url: '/accidents/preliminary-case', category: 'accident', informationKind: 'preliminary',
    },
    {
      id: 'synthetic-case', title: '事故の教材用モデル', subtitle: '仮想の訓練例',
      url: '/accidents/synthetic-case', category: 'accident', informationKind: 'synthetic',
    },
  ];
  return {
    ...actual,
    buildSearchIndexWithStatus: vi.fn().mockResolvedValue({
      items, status: 'complete', failedSources: [], builtAt: '2026-10-13T00:00:00Z',
    }),
    searchItems: vi.fn((index: SearchItem[]) => index),
  };
});

afterEach(cleanup);

describe('/search safety card warnings', () => {
  it('隔離・速報・syntheticの判断上の制限を可視行に出し、欠損metadataを捏造しない', async () => {
    render(<SearchResults />);
    await screen.findByText(/「事故」の検索結果 3件/);

    for (const warning of [
      '出典または内容の確認が完了していないため、判断や帳票転記に利用できません。',
      '確定個票ではありません。確定資料と対象時点を確認してください。',
      '実在事故の記録ではない教材用モデルケースです。',
    ]) {
      const visibleWarnings = screen.getAllByText(warning).filter((element) =>
        !element.classList.contains('sr-only') && element.classList.contains('block'),
      );
      expect(visibleWarnings).toHaveLength(1);
    }
    expect(screen.queryByText(/更新日・対象時点: 未登録|施行日: 個別資料で確認|出典: 詳細画面で要確認/)).toBeNull();
  });
});
