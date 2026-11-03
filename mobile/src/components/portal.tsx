'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import seedJson from '../data/seed.json';
import locations from '../data/locations.json';
import { articleSchema, envelope, statisticsSchema, type Article, type Snapshot, type Statistics, type Weather } from '../lib/contracts';
import { contentStore, settingsStore, openSource } from '../lib/native';
import { Repository, schemas } from '../lib/repository';
import { loadNews, loadRevisions, loadStatistics, loadWeather } from '../lib/api';
import { formatDate } from '../lib/policy';
import { ArticleList } from './article-list';
import { StatisticsPanel } from './statistics-panel';
import { AiPanel } from './ai-panel';
import { WeatherPanel } from './weather-panel';

const seed = {
  news: envelope(z.array(articleSchema)).parse(seedJson.news),
  revisions: envelope(z.array(articleSchema)).parse(seedJson.revisions),
  statistics: envelope(statisticsSchema).parse(seedJson.statistics),
};
const repository = new Repository(contentStore);
const tabs = [ ['news', '事故速報', '◉'], ['statistics', '事故統計', '▥'], ['revisions', '法改正', '▤'], ['ai', 'AI確認', '✧'], ['weather', '気象警報', '☁'] ] as const;
type Tab = typeof tabs[number][0] | 'settings';
export function Portal() {
  const [tab, setTab] = useState<Tab>('news');
  const [news, setNews] = useState<Snapshot<Article[]>>(seed.news);
  const [revisions, setRevisions] = useState<Snapshot<Article[]>>(seed.revisions);
  const [statistics, setStatistics] = useState<Snapshot<Statistics>>(seed.statistics);
  const [weather, setWeather] = useState<Snapshot<Weather> | null>(null);
  const [saved, setSaved] = useState<Article[]>([]);
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('tokyo-shinjuku');
  const [large, setLarge] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fetching = useRef(false);
  const saving = useRef(false);
  const locationRef = useRef(location);
  const activeTab = useRef<Tab>(tab);
  activeTab.current = tab;
  const refresh = useCallback(async (target: Tab, currentLocation = locationRef.current) => {
    if (fetching.current || target === 'settings' || target === 'ai') return;
    fetching.current = true; setBusy(true); setMessage('');
    try {
      if (target === 'news') setNews(await repository.refresh('news', schemas.news, loadNews));
      if (target === 'revisions') setRevisions(await repository.refresh('revisions', schemas.revisions, loadRevisions));
      if (target === 'statistics') setStatistics(await repository.refresh('statistics', schemas.statistics, loadStatistics));
      if (target === 'weather') {
        const result = await repository.refresh('weather', schemas.weather, () => loadWeather(currentLocation));
        if (locationRef.current === currentLocation) setWeather(result);
      }
      setMessage('取得した情報を端末に保存しました。');
    } catch { setMessage('更新できませんでした。最後に保存した情報を表示しています。'); }
    finally {
      fetching.current = false; setBusy(false);
      if (activeTab.current !== target || (target === 'weather' && locationRef.current !== currentLocation)) void refresh(activeTab.current);
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    const removers: Array<() => void> = [];
    const onOnline = () => { if (mounted) { setOnline(true); void refresh(activeTab.current); } };
    const onOffline = () => { if (mounted) setOnline(false); };
    async function initialize() {
      const [cachedNews, cachedRevisions, cachedStatistics, cachedWeather, bookmarked, preference, textSize] = await Promise.all([
        repository.read('news', schemas.news, seed.news), repository.read('revisions', schemas.revisions, seed.revisions),
        repository.read('statistics', schemas.statistics, seed.statistics),
        contentStore.get('weather').then(raw => raw ? envelope(schemas.weather).parse(JSON.parse(raw)) : null).catch(() => null),
        repository.saved(), settingsStore.get('location').catch(() => null), settingsStore.get('large').catch(() => null),
      ]);
      if (!mounted) return;
      setNews(cachedNews); setRevisions(cachedRevisions); setStatistics(cachedStatistics); setWeather(cachedWeather); setSaved(bookmarked); setLarge(textSize === 'true');
      if (preference && locations.some(l => l.id === preference)) { setLocation(preference); locationRef.current = preference; }
      const status = await Network.getStatus().catch(() => ({ connected: navigator.onLine }));
      if (!mounted) return;
      setOnline(status.connected); setReady(true);
      if (status.connected) void refresh('news');
      window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
      removers.push(() => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); });
      if (Capacitor.isNativePlatform()) {
        const listener = await Network.addListener('networkStatusChange', s => s.connected ? onOnline() : onOffline());
        if (!mounted) { void listener.remove(); return; }
        removers.push(() => { void listener.remove(); });
        const app = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void Network.getStatus().then(s => s.connected ? onOnline() : onOffline()); });
        if (!mounted) { void app.remove(); return; }
        removers.push(() => { void app.remove(); });
      }
    }
    void initialize().catch(() => { if (mounted) { setReady(true); setMessage('端末保存を読み込めませんでした。同梱資料を表示します。'); } });
    return () => { mounted = false; removers.forEach(remove => remove()); };
  }, [refresh]);
  async function saveArticle(article: Article) {
    if (saving.current) return;
    saving.current = true;
    try { const next = saved.some(a => a.id === article.id) ? saved.filter(a => a.id !== article.id) : [...saved, article]; await repository.save(next); setSaved(next); }
    finally { saving.current = false; }
  }
  async function changeLocation(id: string) {
    await settingsStore.set('location', id); locationRef.current = id; setLocation(id); setWeather(null);
    if (online) await refresh('weather', id);
  }
  function changeTab(next: Tab) { setTab(next); setMessage(''); if (online) void refresh(next); window.scrollTo({ top: 0 }); }
  const title = tabs.find(([id]) => id === tab)?.[1] ?? '設定・このアプリについて';
  const snapshot = tab === 'news' ? news : tab === 'revisions' ? revisions : tab === 'statistics' ? statistics : tab === 'weather' ? weather : null;
  return <div className={large ? 'portal large-text' : 'portal'}>
    <a className="skip" href="#main">本文へ移動</a>
    <aside className="sidebar"><div className="brand-mark">安</div><strong>安全AIポータル</strong><p>毎日の安全確認を、手元に。</p><nav aria-label="メインナビゲーション">{tabs.map(([id, label, icon]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => changeTab(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav><p className="sidebar-foot">無料版 v1.0<br />ログイン不要</p></aside>
    <div className="workspace">
      <header className="app-header"><div><p className="eyebrow">ANZEN AI / FIELD READER</p><strong>安全AIポータル</strong></div><button aria-label="設定を開く" aria-pressed={tab === 'settings'} onClick={() => changeTab('settings')}>設定</button></header>
      <main id="main" className="main" tabIndex={-1}>
        <div className="page-heading"><div><p className="eyebrow">{tab === 'news' ? 'DAILY BRIEFING' : 'FIELD KNOWLEDGE'}</p><h1>{title}</h1></div>{tab !== 'ai' && tab !== 'settings' ? <button className="primary compact" disabled={busy || !online || !ready} onClick={() => { void refresh(tab); }}>{busy ? '更新中…' : '更新する'}</button> : null}</div>
        <p className="connection"><span className={online ? 'dot' : 'dot offline'} />{online ? 'オンライン' : 'オフライン · 保存した情報を表示'}{!ready ? ' · 端末データを読み込み中' : ''}</p>
        {snapshot ? <p className="data-stamp">{snapshot.origin === 'bundle' ? '同梱資料（最新ではありません）' : '最後に取得した情報'} ／ {formatDate(snapshot.receivedAt)}{tab === 'weather' ? '（受信日時）' : ''}</p> : null}
        <p className="status" role="status">{message}</p>
        {tab === 'news' ? <><p className="lead">現場に出る前に、事故の報道と公的情報を確認。</p><div className="notice info">報道の見出しと公的な統計速報を表示します。原因を断定せず、出典で内容を確認してください。最後に取得した記事は圏外でも読めます。</div><ArticleList key="news" articles={news.data} saved={saved} onSave={saveArticle} /></> : null}
        {tab === 'revisions' ? <><p className="lead">過去の改正と施行日を、原文への入口とともに。</p><div className="notice info">取得できた履歴全件を無料表示します。収録範囲はサイトの公開APIに依存します。保存日時以降の改正は未反映です。</div><ArticleList key="revisions" articles={revisions.data} saved={saved} onSave={saveArticle} /></> : null}
        {tab === 'statistics' ? <StatisticsPanel data={statistics.data} /> : null}
        {tab === 'ai' ? <AiPanel online={online} /> : null}
        {tab === 'weather' ? <WeatherPanel location={location} value={weather} onLocation={changeLocation} online={online} /> : null}
        {tab === 'settings' ? <>
          <section className="card"><h3>読みやすさ</h3><label className="check"><input type="checkbox" checked={large} onChange={e => { const next = e.target.checked; void settingsStore.set('large', String(next)).then(() => setLarge(next)).catch(() => setMessage('文字サイズを保存できませんでした。')); }} />文字を大きく表示する</label><p>OSの文字サイズ・画面拡大も利用できます。</p></section>
          <section className="card"><h3>保存とプライバシー</h3><p>事故速報・統計・法改正と保存記事、地点1件、文字サイズ設定を端末内に保存します。記事の保存：{saved.length}件。アンインストールすると削除されます。</p><p>AIの質問・回答は端末へ永続保存しません。入力した情報は送信前に同意を確認します。外部AIの保持・利用条件はサイトのポリシーで確認してください。</p><p>ログイン、広告追跡、購入、通知の許可要求はありません。気象警報は表示のみです。</p>
          <button onClick={() => { void openSource('https://www.anzen-ai-portal.jp/privacy').catch(() => setMessage('ポリシーを開けませんでした。')); }}>プライバシーポリシー ↗</button>
          {!confirmDelete ? <button className="danger" onClick={() => setConfirmDelete(true)}>端末内データを削除</button> : <div className="notice"><p>保存記事・取得データ・表示設定を削除します。同梱資料は引き続き利用できます。サーバーの利用回数は変わりません。</p><button className="danger" disabled={busy} onClick={() => { void (async () => {
            if (fetching.current || saving.current) { setMessage('更新・保存の完了後に削除してください。'); return; }
            setBusy(true);
            try { await Promise.all(['news', 'revisions', 'statistics', 'weather', 'saved'].map(k => contentStore.remove(k))); await Promise.all(['location', 'large'].map(k => settingsStore.remove(k))); setNews(seed.news); setRevisions(seed.revisions); setStatistics(seed.statistics); setWeather(null); setSaved([]); setLocation('tokyo-shinjuku'); locationRef.current = 'tokyo-shinjuku'; setLarge(false); setConfirmDelete(false); setMessage('端末内データを削除しました。'); }
            catch { setMessage('一部のデータを削除できませんでした。再度お試しください。'); } finally { setBusy(false); }
          })(); }}>削除を実行</button><button onClick={() => setConfirmDelete(false)}>キャンセル</button></div>}
          </section>
          <section className="card"><h3>無料版 v1.0</h3><p>安衛法チャット1日3回、化学物質RA1日1件、気象警報1地点の画面表示。AIの安全条件を確認できないときは実行を停止します。</p><p>情報は安全・法令適合・作業可否を保証しません。気象の保存資料を避難や作業続行の唯一の判断材料にしないでください。</p><button onClick={() => { void openSource('https://www.anzen-ai-portal.jp/contact').catch(() => setMessage('問い合わせ先を開けませんでした。')); }}>問い合わせ・内容の訂正 ↗</button></section>
        </> : null}
        <footer>安全AIポータル · 出典と更新日時を確かめて利用してください。</footer>
      </main>
    </div>
    <nav className="bottom-nav" aria-label="タブ">{tabs.map(([id, label, icon]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => changeTab(id)}><span aria-hidden="true">{icon}</span><span>{label}</span></button>)}</nav>
  </div>;
}
