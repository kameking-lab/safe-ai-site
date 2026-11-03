import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import seed from '../src/data/seed.json';
import manifest from '../src/data/manifest.json';
import { Repository, schemas } from '../src/lib/repository';
import { envelope, type Snapshot, type Article } from '../src/lib/contracts';
import type { Store } from '../src/lib/native';
const fallback = envelope(schemas.news).parse(seed.news) as Snapshot<Article[]>;
function memory() {
  const values = new Map<string, string>();
  const store: Store = { async get(k) { return values.get(k) ?? null; }, async set(k, v) { values.set(k, v); }, async remove(k) { values.delete(k); } };
  return { store, values, repository: new Repository(store) };
}
describe('offline content and provenance', () => {
  it('validates all bundled content and source hashes', async () => {
    envelope(schemas.news).parse(seed.news); envelope(schemas.revisions).parse(seed.revisions); envelope(schemas.statistics).parse(seed.statistics);
    expect(seed.revisions.data.length).toBeGreaterThan(0); expect(seed.news.origin).toBe('bundle');
    for (const entry of manifest.sources) {
      const bytes = await readFile(new URL(`../../${entry.path}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
    }
  });
  it('persists a successful refresh across repository restart and failed network', async () => {
    const { store, repository } = memory();
    const refreshed = await repository.refresh('news', schemas.news, async () => fallback.data);
    await expect(repository.refresh('news', schemas.news, async () => { throw new Error('offline'); })).rejects.toThrow();
    expect(await new Repository(store).read('news', schemas.news, fallback)).toEqual(refreshed);
  });
  it('does not overwrite a valid snapshot with invalid remote data', async () => {
    const { repository, values } = memory();
    await repository.refresh('news', schemas.news, async () => fallback.data); const before = values.get('news');
    await expect(repository.refresh('news', schemas.news, async () => [{ ...fallback.data[0], url: 'javascript:alert(1)' }])).rejects.toThrow();
    expect(values.get('news')).toBe(before);
  });
  it('recovers corrupt or incompatible cache with the bundled seed', async () => {
    const { values, repository } = memory(); values.set('news', '{broken');
    expect(await repository.read('news', schemas.news, fallback)).toEqual(fallback);
    values.set('news', JSON.stringify({ ...fallback, schema: 2 })); expect(await repository.read('news', schemas.news, fallback)).toEqual(fallback);
  });
  it('saved full articles survive refresh and disappear only on explicit deletion', async () => {
    const { store, repository } = memory(); await repository.save(fallback.data);
    await repository.refresh('news', schemas.news, async () => []); expect(await new Repository(store).saved()).toEqual(fallback.data);
    await store.remove('saved'); expect(await repository.saved()).toEqual([]);
  });
  it('storage-full failure is visible to callers', async () => {
    const { store } = memory(); store.set = async () => { throw new Error('full'); };
    await expect(new Repository(store).refresh('news', schemas.news, async () => fallback.data)).rejects.toThrow('full');
  });
});
