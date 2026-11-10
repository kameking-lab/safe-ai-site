import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useNativeQuery } from './use-native-query';

afterEach(()=>{vi.unstubAllEnvs();window.history.replaceState(null,'','/');});

it('hydrates validated controls from the native URL and follows navigation with the latest callback',()=>{
  vi.stubEnv('NEXT_PUBLIC_ANZEN_NATIVE','true');
  window.history.replaceState(null,'','/laws?law=industrial&art=10');
  const first=vi.fn();const second=vi.fn();
  const hook=renderHook(({callback})=>useNativeQuery(callback),{initialProps:{callback:first}});
  expect(hook.result.current?.get('art')).toBe('10');
  expect(first.mock.calls[0][0].get('law')).toBe('industrial');
  hook.rerender({callback:second});
  act(()=>{window.history.replaceState(null,'','/laws?art=20');window.dispatchEvent(new Event('anzen-navigation'));});
  expect(second.mock.calls[0][0].get('art')).toBe('20');
  expect(first).toHaveBeenCalledTimes(1);
  act(()=>{window.history.replaceState(null,'','/laws?art=30');window.dispatchEvent(new PopStateEvent('popstate'));});
  expect(hook.result.current?.get('art')).toBe('30');
  hook.unmount();
  window.dispatchEvent(new Event('anzen-navigation'));
  expect(second).toHaveBeenCalledTimes(2);
});

it('retains server-provided controls on the web',()=>{
  vi.stubEnv('NEXT_PUBLIC_ANZEN_NATIVE','false');
  window.history.replaceState(null,'','/laws?art=10');
  const callback=vi.fn();const hook=renderHook(()=>useNativeQuery(callback));
  expect(hook.result.current).toBeNull();
  act(()=>window.dispatchEvent(new PopStateEvent('popstate')));
  expect(callback).not.toHaveBeenCalled();
  hook.unmount();
});
