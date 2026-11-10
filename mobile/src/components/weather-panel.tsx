'use client';
import { useEffect, useState } from 'react';
import type { Snapshot, Weather } from '../lib/contracts';
import { formatDate, weatherFresh } from '../lib/policy';
import { openSource } from '../lib/native';
import locations from '../data/locations.json';

const LABELS: Record<string, string> = { '02': '暴風雪警報', '03': '大雨警報', '04': '洪水警報', '05': '暴風警報', '06': '大雪警報', '07': '波浪警報', '08': '高潮警報', '10': '大雨注意報', '12': '大雪注意報', '13': '風雪注意報', '14': '雷注意報', '15': '強風注意報', '16': '波浪注意報', '18': '洪水注意報', '19': '高潮注意報', '32': '暴風雪特別警報', '33': '大雨特別警報', '35': '暴風特別警報', '36': '大雪特別警報', '37': '波浪特別警報', '38': '高潮特別警報' };
type LocationOption={id:string;label:string;cityCode?:string|null};
export function WeatherPanel({ location, value, onLocation, online,locationOptions=locations,memberSettings=false }: { location: string; value: Snapshot<Weather> | null; onLocation: (id: string) => Promise<void>; online: boolean;locationOptions?:LocationOption[];memberSettings?:boolean }) {
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const data = value?.data.locationId === location ? value.data : null;
  const isLive = online && data?.state === 'live' && weatherFresh(data.sourceFetchedAt, now);
  const selected = locationOptions.find(l => l.id === location);
  return <>
    <section className="card">
      <h3>登録地点の気象警報</h3><p>{memberSettings?'閲覧地点を切り替えて警報情報を確認できます。保存地点・通知は上の会員設定で変更します。':'無料版は1地点を端末に保存します。通知は送信しません。'}</p>
      <label>地点<select value={location} onChange={e => { void onLocation(e.target.value).catch(() => setMessage('地点の保存に失敗しました。')); }}>{locationOptions.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
      <p className="muted">{selected?.cityCode ? '市区町村の警報区域を確認します。現場の安全を保証する情報ではありません。' : '都道府県の代表地点です。市区町村単位の警報を確定できない場合があります。'}</p>
      <div className={isLive ? 'notice info' : 'notice'} role="status">{isLive ? '気象庁のデータを取得済み' : '現在の警報状況は未確認です。保存データを「警報なし」として扱いません。'}</div>
      {data ? <>
        <p>表示対象：{data.label}</p><p className="muted">気象庁データ取得：{formatDate(data.sourceFetchedAt)}<br />発表：{formatDate(data.reportAt)}</p>
        {data.headline ? <p className="preserve">{data.headline}</p> : null}
        {data.warnings.length ? <ul>{data.warnings.map((w, i) => <li key={`${w.code}-${i}`}><strong>{LABELS[w.code] ?? `気象情報（公式コード ${w.code}）`}</strong>：{w.status}</li>)}</ul> : <p>{isLive ? '取得時点で、この区域の警報・注意報の掲載はありません。' : '保存データには警報・注意報の掲載がありません。現在の状態は確認できません。'}</p>}
      </> : <p>この地点のデータは未取得です。</p>}
      <button onClick={() => { void openSource('https://www.jma.go.jp/bosai/warning/').catch(() => setMessage('気象庁のページを開けませんでした。')); }}>気象庁で最新情報を確認 ↗</button><p role="status">{message}</p>
    </section>
  </>;
}
