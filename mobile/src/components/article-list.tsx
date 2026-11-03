'use client';
import { useDeferredValue, useState } from 'react';
import type { Article } from '../lib/contracts';
import { formatDate } from '../lib/policy';
import { openSource, shareArticle } from '../lib/native';

export function ArticleList({ articles, saved, onSave }: { articles: Article[]; saved: Article[]; onSave: (a: Article) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [notice, setNotice] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const ids = new Set(saved.map(a => a.id));
  const base = onlySaved ? saved.filter(a => articles.some(item => item.kind === a.kind)) : articles;
  const filtered = base.filter(a => (!year || a.date.startsWith(year)) && `${a.title} ${a.summary}`.includes(deferredQuery));
  const years = [...new Set([...articles, ...saved].map(a => a.date.slice(0, 4)))].sort().reverse();
  const action = (work: () => Promise<unknown>, success: string) => { void work().then(() => setNotice(success)).catch(() => setNotice('操作を完了できませんでした。もう一度お試しください。')); };
  return <>
    <div className="filters">
      <label className="grow">キーワード<input type="search" placeholder="タイトル・本文から探す" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>年<select value={year} onChange={e => setYear(e.target.value)}><option value="">すべて</option>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={onlySaved} onChange={e => setOnlySaved(e.target.checked)} />保存した記事</label>
    </div>
    <p role="status" className="muted">{notice || `${filtered.length}件を表示`}</p>
    {filtered.length === 0 ? <div className="card">該当する情報はありません。条件を変えてお試しください。</div> : null}
    <div className="article-grid">{filtered.map(a => <article className="card" key={a.id}>
      <p className="eyebrow">{a.kind === 'revision' ? '法改正履歴' : a.kind === 'official' ? '公的資料' : '報道'} · {formatDate(a.date)}</p>
      <h3>{a.title}</h3><p className="preserve">{a.summary}</p>
      {a.effectiveOn ? <p>施行日：{a.effectiveOn}（適用条件は原文で確認）</p> : null}
      <details><summary>出典と確認状態</summary><p>{a.source}</p><p>{a.verification}</p></details>
      <div className="actions">
        <button onClick={() => action(() => onSave(a), ids.has(a.id) ? '保存を解除しました' : '端末に保存しました')} aria-pressed={ids.has(a.id)}>{ids.has(a.id) ? '保存済み' : '保存する'}</button>
        <button onClick={() => action(() => shareArticle(a), '共有操作を完了しました')}>共有</button>
        <button className="text-button" onClick={() => action(() => openSource(a.url), '出典を開きました')}>出典を開く ↗</button>
      </div>
    </article>)}</div>
  </>;
}
