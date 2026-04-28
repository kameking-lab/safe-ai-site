import { NextResponse } from "next/server";
import { verifyUnsubscribeToken, removeSubscriber } from "@/lib/newsletter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const token = searchParams.get("token") ?? "";

  if (!email || !token) {
    return new NextResponse(errorHtml("パラメータが不正です。"), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return new NextResponse(errorHtml("リンクが無効または期限切れです。"), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  await removeSubscriber(email);
  console.log("[newsletter:unsubscribe]", email);

  return new NextResponse(successHtml(email), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function successHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><title>配信停止完了｜ANZEN AI</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#1e293b;text-align:center;}</style>
</head>
<body>
  <p style="font-size:40px;margin:0 0 16px;">✅</p>
  <h1 style="font-size:20px;margin:0 0 8px;">配信停止が完了しました</h1>
  <p style="font-size:14px;color:#64748b;margin:0 0 24px;">${email} への週間安全情報の配信を停止しました。</p>
  <a href="https://safe-ai-site.vercel.app/newsletter" style="font-size:13px;color:#2563eb;">再度登録する</a>
  <p style="font-size:12px;color:#94a3b8;margin-top:32px;">ANZEN AI ─ 現場の安全を、AIで変える。</p>
</body>
</html>`;
}

function errorHtml(msg: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><title>エラー｜ANZEN AI</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#1e293b;text-align:center;}</style>
</head>
<body>
  <p style="font-size:40px;margin:0 0 16px;">⚠️</p>
  <h1 style="font-size:20px;margin:0 0 8px;">配信停止に失敗しました</h1>
  <p style="font-size:14px;color:#64748b;margin:0 0 24px;">${msg}</p>
  <a href="https://safe-ai-site.vercel.app" style="font-size:13px;color:#2563eb;">トップへ戻る</a>
</body>
</html>`;
}
