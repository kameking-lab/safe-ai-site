import { act,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { VisualKyDailyHero } from './daily-hero';
import { selectDailyVisualKy } from '@/lib/visual-ky/daily';
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
describe('native daily KYT uses the device JST date',()=>{
  it('updates the same canonical hero after an old build and across midnight on resume',()=>{
    vi.stubEnv('NEXT_PUBLIC_ANZEN_NATIVE','true');vi.useFakeTimers();const before=new Date('2026-11-03T14:59:59Z');vi.setSystemTime(before);
    const {container}=render(<VisualKyDailyHero initialTimestamp="2026-01-01T00:00:00Z"/>);
    const expected=selectDailyVisualKy({date:before});expect(container.querySelector('[data-visual-ky-daily-meta]')?.getAttribute('data-scenario-id')).toBe(expected.scenario.id);expect(screen.getByRole('link',{name:'回答する'}).getAttribute('href')).toBe('/training/visual-ky/'+expected.scenario.slug);
    const after=new Date('2026-11-03T15:00:01Z');act(()=>{vi.setSystemTime(after);window.dispatchEvent(new Event('anzen-app-active'));});
    expect(container.querySelector('[data-visual-ky-daily-meta]')?.getAttribute('data-scenario-id')).toBe(selectDailyVisualKy({date:after}).scenario.id);expect(container.querySelector('[data-visual-ky-daily-meta]')?.textContent).toContain('2026年11月4日');
  });
});
