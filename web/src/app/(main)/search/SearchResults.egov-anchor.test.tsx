import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SearchResults } from './SearchResults';
import { LAW_METADATA } from '@/data/law-metadata';

// 「法令名＋抄録未収載の条番号」で 0 件になるクエリ。安衛則は curated 収載があるが
// 第9999条は存在せず（AND で第9999条トークンが全件に不一致）0 件 → NoResults を描画し、
// かつ egovArticleAnchor が当該法令の e-Gov 条アンカーへ解決するケース（診断書 T4 後段）。
const LAW_ARTICLE_NO_HIT = '安衛則 第9999条';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'q' ? LAW_ARTICLE_NO_HIT : null) }),
}));

afterEach(cleanup);

const WAIT = { timeout: 20000 };

describe('/search 0件フォールバック：法令名＋条番号→e-Gov 条アンカー直リンク（T4後段）', () => {
  it('当該法令の e-Gov 条アンカー（#Mp-At_N）へ直リンクする', async () => {
    render(<SearchResults />);
    const anchor = await screen.findByRole(
      'link',
      { name: /e-Gov で「労働安全衛生規則 第9999条」を開く/ },
      WAIT,
    );
    expect(anchor.getAttribute('href')).toBe(
      `https://laws.e-gov.go.jp/law/${LAW_METADATA['安衛則'].egovLawId}#Mp-At_9999`,
    );
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toContain('noopener');
  });
});
