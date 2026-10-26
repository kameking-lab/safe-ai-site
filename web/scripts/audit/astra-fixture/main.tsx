import React from 'react';
import { createRoot } from 'react-dom/client';
import { SignageRotator } from '../../../src/components/signage/signage-rotator';
import './style.css';

const items = [
  '作業前に設備・足場・保護具を点検し、作業条件と危険箇所を確認してください。',
  '報道見出しは原因未確認の情報を含みます。出典本文と確認日を確かめてください。',
];
createRoot(document.getElementById('root')!).render(<main>
  <h1>サイネージ表示検証（実コンポーネント・テストデータ）</h1>
  <section>
    <h2>表示領域が狭い場合の停止操作と本文</h2>
    <div className="panel">
      <SignageRotator items={items} intervalMs={1000} ariaLabel="検証ニュース" compactAtWide getKey={(_, index) => String(index)} renderItem={(item) => <article className="h-full rounded-lg border border-slate-700 bg-slate-950/60 p-4"><p>2026-10-26 · 表示検証</p><h3 className="text-3xl leading-snug font-bold">{item}</h3><p className="mt-1 text-lg">一次資料と現場条件を確認</p></article>} />
    </div>
  </section>
</main>);
