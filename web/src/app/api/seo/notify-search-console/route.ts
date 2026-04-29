import { NextResponse } from 'next/server';

const SITEMAP_URL = 'https://safe-ai-site.vercel.app/sitemap-index.xml';

export async function GET() {
  const pingTargets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  ];

  const results = await Promise.allSettled(
    pingTargets.map((url) => fetch(url, { method: 'GET' }))
  );

  const summary = results.map((r, i) => ({
    target: pingTargets[i],
    ok: r.status === 'fulfilled' && r.value.ok,
    httpStatus: r.status === 'fulfilled' ? r.value.status : null,
    error: r.status === 'rejected' ? String(r.reason) : null,
  }));

  return NextResponse.json({
    success: summary.every((s) => s.ok),
    sitemap: SITEMAP_URL,
    pinged: summary,
    timestamp: new Date().toISOString(),
  });
}
