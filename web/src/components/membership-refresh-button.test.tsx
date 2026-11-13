import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const refresh=vi.hoisted(()=>vi.fn());
vi.mock('next/navigation',()=>({useRouter:()=>({refresh})}));
import { MembershipRefreshButton } from './membership-refresh-button';
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it('shows loading, prevents duplicate presses and announces a completed refresh',async()=>{
 let release!:(value:Response)=>void;
 const fetch=vi.fn(()=>new Promise<Response>(resolve=>{release=resolve;}));vi.stubGlobal('fetch',fetch);
 render(<MembershipRefreshButton/>);fireEvent.click(screen.getByRole('button'));
 expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
 fireEvent.click(screen.getByRole('button'));expect(fetch).toHaveBeenCalledTimes(1);
 await act(async()=>release(Response.json({plan:'pro',syncState:'verified'})));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('最新の状態です。'));
 expect(refresh).toHaveBeenCalledTimes(1);
});
it('reports a failed entitlement check without claiming completion',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:{code:'UNAVAILABLE'}},{status:503})));
 render(<MembershipRefreshButton/>);fireEvent.click(screen.getByRole('button'));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('確認できませんでした'));
 expect(refresh).not.toHaveBeenCalled();
});
