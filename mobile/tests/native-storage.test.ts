import { beforeEach, describe, expect, it, vi } from 'vitest';
const memory = vi.hoisted(() => ({ files: new Map<string, string>(), prefs: new Map<string, string>(), failWrite: false, failPointer: false, failDelete: false, directories: [] as string[] }));
vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } };
});
vi.mock('@capacitor/filesystem', () => ({
  Directory: { LibraryNoCloud: 'LIBRARY_NO_CLOUD' }, Encoding: { UTF8: 'utf8' },
  Filesystem: {
    async readFile({ path }: { path: string }) { if (!memory.files.has(path)) throw { code: 'OS-PLUG-FILE-0008' }; return { data: memory.files.get(path) }; },
    async writeFile({ path, data, directory }: { path: string; data: string; directory: string }) {
      memory.directories.push(directory); memory.files.set(path, memory.failWrite ? '{partial' : data);
      if (memory.failWrite) throw new Error('disk full');
    },
    async deleteFile({ path }: { path: string }) { if (memory.failDelete) throw new Error('permission'); if (!memory.files.delete(path)) throw { code: 'OS-PLUG-FILE-0008' }; },
  },
}));
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  async get({ key }: { key: string }) { return { value: memory.prefs.get(key) ?? null }; },
  async set({ key, value }: { key: string; value: string }) { if (memory.failPointer) throw new Error('pointer failure'); memory.prefs.set(key, value); },
  async remove({ key }: { key: string }) { memory.prefs.delete(key); },
} }));
import { contentStore } from '../src/lib/native';
beforeEach(() => { memory.files.clear(); memory.prefs.clear(); memory.directories = []; memory.failWrite = false; memory.failPointer = false; memory.failDelete = false; });
describe('native offline durability', () => {
  it('stores content in a no-cloud Library and alternates inactive slots', async () => {
    await contentStore.set('news', 'first'); await contentStore.set('news', 'second');
    expect(memory.directories).toEqual(['LIBRARY_NO_CLOUD', 'LIBRARY_NO_CLOUD']);
    expect(memory.files.get('anzen/news-b.json')).toBe('first');
    expect(memory.files.get('anzen/news-a.json')).toBe('second');
    expect(await contentStore.get('news')).toBe('second');
  });
  it('a truncated failed write never replaces the active snapshot', async () => {
    await contentStore.set('news', 'previous'); memory.failWrite = true;
    await expect(contentStore.set('news', 'new')).rejects.toThrow('disk full');
    expect(await contentStore.get('news')).toBe('previous');
  });
  it('a failed pointer commit keeps the old file readable', async () => {
    await contentStore.set('news', 'previous'); memory.failPointer = true;
    await expect(contentStore.set('news', 'new')).rejects.toThrow('pointer failure');
    expect(await contentStore.get('news')).toBe('previous');
  });
  it('deletes both slots, is idempotent for missing files, and reports other errors', async () => {
    await contentStore.set('news', 'one'); await contentStore.set('news', 'two');
    await contentStore.remove('news'); await contentStore.remove('news');
    expect(memory.files.size).toBe(0); expect(await contentStore.get('news')).toBeNull();
    memory.failDelete = true; await expect(contentStore.remove('news')).rejects.toThrow('permission');
  });
});
