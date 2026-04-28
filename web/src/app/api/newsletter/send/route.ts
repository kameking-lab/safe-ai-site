import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  listSubscribers,
  generateUnsubscribeToken,
  buildDigestEmail,
  memSendHistory,
} from "@/lib/newsletter";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";

function isAuthorized(req: Request): boolean {
  const adminToken = process.env.NEWSLETTER_ADMIN_TOKEN;
  if (!adminToken) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${adminToken}`;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://safe-ai-site.vercel.app";
}

function weekLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;
  return `${y}年 ${fmt(start)}〜${fmt(end)}`;
}

function buildContent() {
  const accidents = getAccidentCasesDataset();
  const recentAccident = accidents[0] ?? null;

  // Sample notices (would come from laws/mock data in full implementation)
  const notices = [
    {
      title: "化学物質の自律的な管理に係る安全データシートの提供義務の対象物質の追加",
      date: "2024-04-01",
      url: `${siteUrl()}/laws`,
    },
    {
      title: "建設業における一人親方等の安全衛生対策の推進について",
      date: "2024-03-15",
      url: `${siteUrl()}/laws`,
    },
    {
      title: "高齢労働者の安全と健康確保のためのガイドライン改訂",
      date: "2024-03-01",
      url: `${siteUrl()}/laws`,
    },
  ];

  const lawChanges = [
    {
      title: "労働安全衛生規則 第13条（産業医の権限強化）",
      effectiveDate: "2024年4月1日",
    },
    {
      title: "化学物質管理促進法 改正（GHS分類義務化）",
      effectiveDate: "2024年7月1日",
    },
  ];

  const ugcItems = [
    { title: "製造ラインの安全パトロールチェックリスト共有", author: "某製造業安全担当" },
    { title: "建設現場の熱中症予防グッズレビュー", author: "現場監督A" },
    { title: "ヒヤリハット報告書の書き方テンプレート", author: "安全委員会" },
  ];

  return {
    notices,
    accident: recentAccident
      ? { title: recentAccident.title, summary: recentAccident.summary ?? "" }
      : null,
    lawChanges,
    ugcItems,
  };
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY が設定されていません。" },
      { status: 503 }
    );
  }

  const subscribers = await listSubscribers();
  const activeSubscribers = subscribers.filter((s) => s.active);

  if (activeSubscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "送信対象者がいません。" });
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.NOTIFY_FROM ?? "ANZEN AI <noreply@anzen-ai.com>";
  const subject = `【ANZEN AI】週間安全情報 ${weekLabel()}`;
  const content = buildContent();

  const BATCH_SIZE = 50;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < activeSubscribers.length; i += BATCH_SIZE) {
    const batch = activeSubscribers.slice(i, i + BATCH_SIZE);
    const emails = batch.map((sub) => {
      const unsubToken = generateUnsubscribeToken(sub.email);
      const unsubUrl = `${siteUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${unsubToken}`;
      return {
        from: fromAddress,
        to: sub.email,
        subject,
        html: buildDigestEmail({ ...content, weekLabel: weekLabel(), unsubUrl }),
      };
    });

    try {
      await resend.batch.send(emails);
      sent += batch.length;
    } catch (err) {
      console.error("[newsletter:send:batch_error]", err);
      failed += batch.length;
    }
  }

  const record = {
    sentAt: new Date().toISOString(),
    subject,
    recipientCount: sent,
  };
  memSendHistory.push(record);
  console.log("[newsletter:send]", JSON.stringify(record));

  return NextResponse.json({ ok: true, sent, failed, subject });
}
