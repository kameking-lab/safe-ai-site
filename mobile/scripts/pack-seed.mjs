import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../../web/src/data/', import.meta.url);
const destination = new URL('../src/data/', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const revisions = await read('law-revisions/egov-revisions.json');
const monthly = await read('accidents/monthly-sokuhou.json');
const years = await read('aggregates-mhlw/accidents-by-year.json');
const meta = await read('aggregates-mhlw/meta.json');
const laws = revisions.revisions.filter(r => r.id.startsWith('lr-egov-') && r.revisionNumber && /^\d{4}-\d{2}-\d{2}$/.test(r.publishedAt) && /^https:\/\/laws\.e-gov\.go\.jp\/law\//.test(r.source_url)).map(r => ({
  id: r.id, title: r.title, summary: r.summary, date: r.publishedAt,
  effectiveOn: r.enforcement_date, source: 'e-Gov 法令検索', url: r.source_url,
  kind: 'revision', verification: '構造データの機械検証済み・内容の人手確認待ち。リンクは現行法令で、個別改正文ではありません。',
})).sort((a, b) => b.date.localeCompare(a.date));
const news = [{ id: 'bundle-official-monthly', title: '厚生労働省 労働災害発生状況（保存資料）',
  summary: `${monthly.sibou.period}。${monthly.note}`, date: monthly.fetchedAt,
  source: monthly.source, url: monthly.sibou.sourceUrl, kind: 'official',
  verification: '同梱した過去の速報です。今日の事故速報ではありません。',
}];
const statistics = { source: '厚生労働省 職場のあんぜんサイト 労働災害（死傷）月別DB',
  sourceUrl: 'https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DB.aspx', sourceUpdatedAt: meta.generatedAt,
  note: '2006〜2021年の収録事例を集計。全国の労働災害総数・発生率ではありません。未収録年を0件とせず、同梱版の範囲を表示します。',
  years: Object.entries(years).map(([year, types]) => ({ year: Number(year), count: Object.values(types).reduce((a, b) => a + b, 0), types })),
};
const seed = {
  news: { schema: 1, origin: 'bundle', receivedAt: monthly.fetchedAt, data: news },
  revisions: { schema: 1, origin: 'bundle', receivedAt: revisions.fetchedAt, data: laws },
  statistics: { schema: 1, origin: 'bundle', receivedAt: meta.generatedAt, data: statistics },
};
await mkdir(destination, { recursive: true });
const encoded = JSON.stringify(seed, null, 2) + '\n';
await writeFile(new URL('seed.json', destination), encoded);
const files = ['law-revisions/egov-revisions.json', 'accidents/monthly-sokuhou.json', 'aggregates-mhlw/accidents-by-year.json', 'aggregates-mhlw/meta.json'];
const sources = await Promise.all(files.map(async path => ({ path: `web/src/data/${path}`, sha256: createHash('sha256').update(await readFile(new URL(path, root))).digest('hex') })));
await writeFile(new URL('manifest.json', destination), JSON.stringify({ schema: 1, packedFrom: 'repository public data only', seedSha256: createHash('sha256').update(encoded).digest('hex'), sources, rights: '出典を明記した政府公開データの加工。報道本文・画像・個人データは同梱しない。再配布と最新版確認は公開前に所有者が確認。', sourceDates: { revisions: revisions.fetchedAt, statistics: meta.generatedAt, monthly: monthly.fetchedAt } }, null, 2) + '\n');
console.log(`Bundled ${laws.length} revisions and ${statistics.years.length} statistical years.`);
