import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {storageBoundary} from '../src/lib/bounded-storage';
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>vi.useRealTimers());
it('returns control for a stuck native read and permits a new read',async()=>{
 const store=storageBoundary();const failed=expect(store.read(()=>new Promise(()=>{}))).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(8001);await failed;
 expect(await store.read(async()=>42)).toBe(42);
});
it('fences a late clear before a new credential write',async()=>{
 const store=storageBoundary();let value='old';let finish!:()=>void;
 const failed=expect(store.write(()=>new Promise<void>(resolve=>{finish=()=>{value='';resolve();};}))).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(8001);await failed;
 const next=store.write(async()=>{value='new';});await vi.advanceTimersByTimeAsync(1);
 expect(value).toBe('old');finish();await next;expect(value).toBe('new');
});
it('never dispatches an expired queued write after the blocked native call resolves',async()=>{
 const store=storageBoundary();let finish!:()=>void;
 const failed=expect(store.write(()=>new Promise<void>(resolve=>{finish=resolve;}))).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(8001);await failed;
 const write=vi.fn(async()=>{});const queued=expect(store.write(write)).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(8001);await queued;
 finish();await vi.advanceTimersByTimeAsync(1);expect(write).not.toHaveBeenCalled();
 await store.write(write);expect(write).toHaveBeenCalledOnce();
});
