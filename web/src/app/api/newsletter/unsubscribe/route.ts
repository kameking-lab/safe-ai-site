import { NextResponse } from "next/server";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function unavailable() {
  return new NextResponse(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>配信停止機能は再設計中です</title>
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1rem;line-height:1.8;color:#172033">
    <main>
      <h1>配信停止機能は現在利用できません</h1>
      <p>メールアドレスをURLへ含めない、期限付きの不透明トークン方式へ移行するまで自動処理を停止しています。新規配信も停止中です。</p>
      <p><a href="https://www.anzen-ai-portal.jp/contact">運営へ連絡する</a></p>
    </main>
  </body>
</html>`,
    { status: 410, headers },
  );
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
