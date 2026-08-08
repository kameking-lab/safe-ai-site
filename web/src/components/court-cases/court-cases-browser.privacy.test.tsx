import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CourtCasesBrowser } from './court-cases-browser';

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/data/court-cases', () => ({
  COURT_CASE_ISSUES: ['安全配慮義務'],
  COURT_CASE_FIELDS: ['建設・墜落'],
  COURT_CASES: [
    {
      id: 'fall-case',
      name: '墜落防止措置事件',
      court: '東京地裁',
      date: '2020-01-01',
      dateLabelJa: '令和2年1月1日',
      issues: ['安全配慮義務'],
      field: '建設・墜落',
      oneLine: '足場からの墜落を扱う。',
      summary: '墜落防止措置が争点となった。',
      holding: '安全配慮義務について判断した。',
      practicePoints: ['足場を確認する。'],
      sources: [],
    },
    {
      id: 'heat-case',
      name: '暑熱作業事件',
      court: '東京地裁',
      date: '2019-01-01',
      dateLabelJa: '平成31年1月1日',
      issues: ['安全配慮義務'],
      field: '建設・墜落',
      oneLine: '暑熱作業を扱う。',
      summary: '休憩措置が争点となった。',
      holding: '安全配慮義務について判断した。',
      practicePoints: ['休憩を確認する。'],
      sources: [],
    },
  ],
}));

describe('CourtCasesBrowser free-text privacy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    routerReplace.mockClear();
    window.history.replaceState({}, '', '/court-cases?source=internal');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('自由入力をURLへ載せず、表示結果だけを更新する', () => {
    render(<CourtCasesBrowser />);
    expect(screen.getByRole('link', { name: /墜落防止措置事件/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /暑熱作業事件/ })).toBeTruthy();

    const input = screen.getByRole('searchbox', { name: '判例をキーワードで絞り込む' });
    fireEvent.change(input, { target: { value: '墜落' } });
    vi.runAllTimers();

    expect(screen.getByRole('link', { name: /墜落防止措置事件/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /暑熱作業事件/ })).toBeNull();
    expect(window.location.search).toBe('?source=internal');
    expect(routerReplace.mock.calls.flat().join(' ')).not.toContain('墜落');
    expect(screen.getByRole('link', { name: /A4で印刷/ }).getAttribute('href')).toBe(
      '/court-cases/print',
    );
  });

  it('PIIマーカーをURL・印刷リンクへ複製しない', () => {
    const marker = '山田太郎-健康情報-現場A';
    render(<CourtCasesBrowser />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: marker } });
    vi.runAllTimers();

    expect(window.location.search).not.toContain(marker);
    expect(routerReplace.mock.calls.flat().join(' ')).not.toContain(marker);
    for (const link of screen.queryAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toContain(marker);
      expect(link.getAttribute('href') ?? '').not.toContain(encodeURIComponent(marker));
    }
  });
});
