'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { openSource } from '../lib/native';

/** Same destination the website's layout redirect sends visitors to. */
export function RouteRedirect({ to }: { to: string }) {
  const router = useRouter();
  const external = /^https?:\/\//.test(to);
  useEffect(() => { if (!external) router.replace(to); }, [router, to, external]);
  if (!external) return <p className="mx-auto max-w-3xl p-6"><a href={to} className="underline">移動しています…</a></p>;
  return <p className="mx-auto max-w-3xl p-6"><button type="button" className="min-h-11 underline" onClick={() => { void openSource(to).catch(() => {}); }}>公式サイトで開く ↗</button></p>;
}
