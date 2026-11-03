'use client';
import { useEffect, useRef, useState } from 'react';
import { ApiError,executeAi, loadCapabilities } from '../lib/api';
import { canExecute, errorMessage, formatDate, PLAN_LIMITS, quotaLow } from '../lib/policy';
import type { AiResult, Capability, Feature } from '../lib/contracts';
import { openSource } from '../lib/native';
import { TextareaWithVoice } from '@/components/voice-input-field';
import { inspectAiOutbound } from '@/lib/ai-outbound-safety';

export function AiPanel({ online }: { online: boolean }) {
  const [feature, setFeature] = useState<Feature>('law_chat');
  const [input, setInput] = useState('');
  const [consent, setConsent] = useState(false);
  const [capability, setCapability] = useState<Capability | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [clock, setClock] = useState(Date.now());
  const inFlight = useRef(false);
  const pending = useRef<{ feature: Feature; input: string; requestId: string } | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setClock(Date.now());
      if (online) void loadCapabilities().then(c => { if (active) setCapability(c); }).catch(() => { if (active) setCapability(null); });
      else setCapability(null);
    };
    refresh(); const timer = setInterval(refresh, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [online]);
  const quota = capability?.features[feature].quota;
  const limit = PLAN_LIMITS[capability?.plan??'free'][feature];
  const allowed = canExecute(capability, feature, clock);
  const safety = input.trim() ? inspectAiOutbound({purpose:'mobile-home',texts:[input],consent,contextPolicy:'approved-server-corpus'}) : null;
  function changeFeature(next: Feature) {
    if (next === feature) return;
    setFeature(next); setInput(''); setConsent(false); setResult(null); setMessage(''); pending.current = null;
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (inFlight.current || !consent || !input.trim() || !online || !allowed) return;
    inFlight.current = true; setBusy(true); setMessage(''); setResult(null);
    const text = input.trim();
    if (!pending.current || pending.current.feature !== feature || pending.current.input !== text) pending.current = { feature, input: text, requestId: crypto.randomUUID() };
    try {
      const response = await executeAi(feature, text, pending.current.requestId);
      setResult(response); pending.current = null;
      if (response.status !== 'completed') setMessage(response.status === 'fallback' ? 'AI生成を使わない参考情報です。回数は消費しません。' : '安全な評価・回答を提供できませんでした。回数は消費しません。');
    } catch (error) { if(error instanceof ApiError && !['OPERATION_PENDING','UNAVAILABLE'].includes(error.code))pending.current=null;setMessage(error instanceof Error ? error.message : '送信できませんでした。'); }
    finally {
      setCapability(await loadCapabilities().catch(() => null));
      inFlight.current = false; setBusy(false);
    }
  }
  return <>
    <div className="segmented" aria-label="AI機能"><button aria-pressed={feature === 'law_chat'} disabled={busy} onClick={() => changeFeature('law_chat')}>安衛法チャット</button><button aria-pressed={feature === 'chemical_ra'} disabled={busy} onClick={() => changeFeature('chemical_ra')}>化学物質RA</button></div>
    <section className="card">
      <h3>{feature === 'law_chat' ? '根拠を確かめながら、法令を調べる' : '化学物質のリスクアセスメント'}</h3>
      <p>{capability?.plan==='pro'?'Pro':'無料'}：1日{limit}{feature === 'law_chat' ? '回' : '件'}（日本時間）。AIはオンライン専用です。作業の安全・法令適合の最終判断は責任者と専門家が行ってください。</p>
      <p className={quota && quotaLow(quota.remaining, quota.limit) ? 'notice' : 'muted'}>{quota ? `サーバー確認：残り${quota.remaining} / ${quota.limit}、処理中${quota.reserved}。次の更新：${formatDate(quota.resetAt)}` : '残数はサイトのサーバーで確認します。端末側では回数を付け替えません。'}</p>
      {!online ? <p className="notice">{errorMessage('OFFLINE')}</p> : !allowed ? <p className="notice">{quota?.remaining === 0 ? errorMessage(quota.reserved>0?'OPERATION_PENDING':'DAILY_LIMIT_REACHED', undefined, quota.resetAt) : capability && !capability.features[feature].available ? errorMessage('FEATURE_UNAVAILABLE') : errorMessage('SAFETY_UNVERIFIED')}</p> : null}
      <p className="muted">残数0・通信停止時も、AIを使わない<a href="/law-search/">法令の検索</a>・<a href="/laws/">同梱資料</a>を無料で閲覧できます。</p>
      <form onSubmit={submit}>
        <label>{feature === 'law_chat' ? '法令についての質問' : '評価対象と作業条件'}<TextareaWithVoice maxLength={2000} rows={6} disabled={busy} value={input} onChange={e => { setInput(e.target.value); setConsent(false); }} placeholder={feature === 'law_chat' ? '作業の種類と、確認したい条件を入力' : '物質名・CAS番号・SDS発行元と版・濃度・取扱量・作業時間・換気・保護具を入力'} /></label>
        <p className="muted">氏名、会社名、住所、連絡先、機密情報を入力しないでください。質問は端末には保存しません。</p>
        {safety && !safety.allowed && safety.reason!=='consent_required'?<p role="alert" className="notice">{safety.message}</p>:null}
        <label className="check"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />入力内容を確認し、サイトの安全確認APIおよびサイトに設定された外部AI事業者への送信に同意します。</label>
        <button className="primary" disabled={busy || !online || !allowed || !consent || !input.trim() || safety?.allowed===false}>{busy ? 'サイトで確認中…' : '確認して送信する'}</button>
      </form>
      <p role="status">{message}</p>
    </section>
    {result ? <section className="card" aria-label="AI回答"><p className="eyebrow">{result.status === 'completed' ? 'AIによる情報整理' : '参考情報・評価未完了'}</p><p className="preserve">{result.answer}</p>
      {result.conditions.length ? <><h3>条件・不足情報</h3><ul>{result.conditions.map((c, i) => <li key={i}>{c}</li>)}</ul></> : null}
      <h3>根拠原文</h3>{result.evidence.map((e, i) => <details key={i} open><summary>{e.title}</summary><blockquote className="preserve">{e.original}</blockquote><p>{e.verification} ／ 基準日：{formatDate(e.asOf)}</p><button onClick={() => { void openSource(e.url).catch(() => setMessage('出典を開けませんでした。')); }}>公式原文を開く ↗</button></details>)}
    </section> : null}
  </>;
}
