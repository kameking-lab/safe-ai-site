import { z } from 'zod';
import { envelope, articleSchema, statisticsSchema, weatherSchema, type Article, type Snapshot } from './contracts';
import type { Store } from './native';
export const schemas = { news: z.array(articleSchema).max(300), revisions: z.array(articleSchema).max(5000), statistics: statisticsSchema, weather: weatherSchema };
export class Repository {
  constructor(private store: Store) {}
  async read<T>(key: string, schema: z.ZodType<T>, fallback: Snapshot<T>): Promise<Snapshot<T>> {
    try { const raw = await this.store.get(key); return raw ? envelope(schema).parse(JSON.parse(raw)) as Snapshot<T> : fallback; }
    catch { return fallback; }
  }
  async refresh<T>(key: string, schema: z.ZodType<T>, fetcher: () => Promise<T>): Promise<Snapshot<T>> {
    const data = schema.parse(await fetcher());
    const result: Snapshot<T> = { schema: 1, data, origin: 'site', receivedAt: new Date().toISOString() };
    // A failed fetch/validation/write never destroys the last valid snapshot.
    await this.store.set(key, JSON.stringify(result));
    return result;
  }
  async saved(): Promise<Article[]> {
    try { return z.array(articleSchema).max(300).parse(JSON.parse(await this.store.get('saved') ?? '[]')); } catch { return []; }
  }
  async save(articles: Article[]) { await this.store.set('saved', JSON.stringify(z.array(articleSchema).max(300).parse(articles))); }
}
