import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LawNaviSearch } from './LawNaviSearch';

afterEach(cleanup);

describe('LawNaviSearch privacy', () => {
  it('検索語をURLへ載せず、同じ画面で法令分野を絞り込む', () => {
    window.history.replaceState({}, '', '/law-navi?view=topics');
    render(<LawNaviSearch />);
    const input = screen.getByRole('searchbox', { name: '法令ナビの検索語' });
    expect(input.getAttribute('name')).toBeNull();

    fireEvent.change(input, { target: { value: 'フォークリフト' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByRole('link', { name: /フォークリフト/ })).toBeTruthy();
    expect(window.location.search).toBe('?view=topics');
  });

  it('JavaScript無効時の送信先にも検索本文を含めない', () => {
    const { container } = render(<LawNaviSearch />);
    const form = container.querySelector('form');
    expect(form?.getAttribute('action')).toBe('/law-search');
    expect(form?.getAttribute('method')).toBe('get');
    expect(form?.querySelector('input[name]')).toBeNull();
  });
});
