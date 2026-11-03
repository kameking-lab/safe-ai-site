'use client';
import { useState } from 'react';
import type { Statistics } from '../lib/contracts';
import { formatDate } from '../lib/policy';
import { openSource } from '../lib/native';

export function StatisticsPanel({ data }: { data: Statistics }) {
  const [year, setYear] = useState('all');
  const [message, setMessage] = useState('');
  const rows = year === 'all' ? data.years : data.years.filter(y => String(y.year) === year);
  const total = rows.reduce((a, b) => a + b.count, 0);
  const types = new Map<string, number>();
  for (const row of rows) for (const [name, count] of Object.entries(row.types)) {
    const normalized = name.replace(/、/g, '・'); types.set(normalized, (types.get(normalized) ?? 0) + count);
  }
  const top = [...types].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...rows.map(r => r.count));
  return <>
    <div className="notice">{data.note}</div>
    <label className="year-picker">集計対象<select value={year} onChange={e => setYear(e.target.value)}><option value="all">収録年すべて</option>{data.years.map(y => <option key={y.year} value={y.year}>{y.year}年</option>)}</select></label>
    <div className="metric"><span>収録事例の件数</span><strong>{total.toLocaleString('ja-JP')}<small> 件</small></strong><span>全国の年間発生数ではありません</span></div>
    <div className="dashboard-grid">
      <section className="card"><h3>収録年別の推移</h3><p className="muted">年ごとに収録範囲が異なります。増減率の判断には使えません。</p>
        <div className="bars">{rows.map(r => <div className="bar-row" key={r.year}><span>{r.year}</span><div className="bar-track"><div style={{ width: `${r.count / max * 100}%` }} /></div><strong>{r.count.toLocaleString('ja-JP')}</strong></div>)}</div>
      </section>
      <section className="card"><h3>事故の型 · 上位8分類</h3><table><caption className="sr-only">対象年の収録事例の型別件数</caption><thead><tr><th scope="col">事故の型</th><th scope="col">収録件数</th></tr></thead><tbody>{top.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value.toLocaleString('ja-JP')}</td></tr>)}</tbody></table></section>
    </div>
    <p className="muted">{data.source} ／ 資料の生成日時：{formatDate(data.sourceUpdatedAt)}</p>
    <button onClick={() => { void openSource(data.sourceUrl).catch(() => setMessage('出典を開けませんでした。')); }}>統計の出典を開く ↗</button><p role="status">{message}</p>
  </>;
}
