"use client";

import { useState } from "react";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;

const FEATURE_OPTIONS = [
  "KY用紙・音声入力",
  "法令チャットボット",
  "事故データベース",
  "Eラーニング編集",
  "PDF出力",
  "クマ出没マップ",
  "安全グッズ情報",
  "その他",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    message: "",
    features: [] as string[],
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleFeature(feat: string) {
    setForm((f) => ({
      ...f,
      features: f.features.includes(feat)
        ? f.features.filter((x) => x !== feat)
        : [...f.features, feat],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!FORMSPREE_ID) return;
    setStatus("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...form, features: form.features.join("、") }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 lg:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">お問い合わせ</h1>
        <p className="mt-2 text-sm text-slate-600">
          導入相談・デモのご依頼・機能要望など、お気軽にご連絡ください。
          通常2〜3営業日以内にご返信いたします。
        </p>
      </div>

      {/* プロフィールセクション */}
      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1a7a4c] text-3xl font-bold text-white">
          金
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            ANZEN AI 監修
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            労働安全コンサルタント　金田 義太
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            中小企業から大手建設業まで、現場の安全管理体制の構築・改善を支援してきた労働安全コンサルタント。
            厚生労働省登録労働安全コンサルタント（機械・建設工事）。
            安全衛生教育、リスクアセスメント導入、化学物質管理の指針策定を専門とする。
            本サービスのコンテンツ監修を担当。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["労働安全コンサルタント（機械）", "労働安全コンサルタント（建設工事）", "リスクアセスメント専門"].map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* フォーム */}
      {!FORMSPREE_ID ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <p className="text-sm font-medium text-amber-800">送信機能は準備中です。</p>
          <p className="mt-1 text-xs text-amber-600">
            環境変数 NEXT_PUBLIC_FORMSPREE_ID を設定すると送信が有効になります。
          </p>
        </div>
      ) : status === "success" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
          <p className="text-xl font-bold text-emerald-800">送信完了しました！</p>
          <p className="mt-2 text-sm text-emerald-700">
            2〜3営業日以内にご入力のメールアドレスへご返信いたします。
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                name="company"
                required
                value={form.company}
                onChange={handleChange}
                placeholder="株式会社〇〇建設"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                担当者名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="山田 太郎"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="yamada@example.co.jp"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                電話番号 <span className="text-xs text-slate-400">（任意）</span>
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="03-0000-0000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              相談内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              rows={5}
              placeholder="現在の課題や相談内容をご記入ください"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              希望する機能 <span className="text-xs text-slate-400">（複数選択可）</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((feat) => (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    form.features.includes(feat)
                      ? "border-[#1a7a4c] bg-[#1a7a4c] text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-[#1a7a4c]"
                  }`}
                >
                  {feat}
                </button>
              ))}
            </div>
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">送信に失敗しました。時間をおいて再度お試しください。</p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-[#1a7a4c] py-3 text-sm font-bold text-white transition hover:bg-[#15633e] disabled:opacity-60"
          >
            {status === "sending" ? "送信中..." : "送信する"}
          </button>
        </form>
      )}
    </div>
  );
}
