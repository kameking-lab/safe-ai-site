"use client";

import { useState, type ReactNode } from "react";
import { Mail, MailCheck } from "lucide-react";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { NewsletterForm } from "./newsletter-form";

interface Props {
  /** メリット一覧など、状態カードと登録フォームの間に挟む静的コンテンツ */
  children?: ReactNode;
}

/**
 * メルマガ登録の「いまの状態」を最上部に結論ファーストで提示する client パネル（柱0）。
 * 登録前＝未登録（青・案内）／登録後＝登録完了（緑・済）にデカ色帯で切り替え、
 * 本文を読まなくても「登録済みか」「次にやること」が3秒で分かるようにする。
 */
export function NewsletterPanel({ children }: Props) {
  const [registered, setRegistered] = useState(false);

  return (
    <>
      {registered ? (
        <ConclusionCard
          tone="safe"
          icon={MailCheck}
          title="登録完了"
          description="毎週月曜 9:00 に最新の安全情報をお届けします。配信停止はメール内のリンク1クリック。"
        />
      ) : (
        <ConclusionCard
          tone="info"
          icon={Mail}
          title="未登録"
          description="週1回・無料。毎週月曜 9:00 に通達・事故事例・法改正・安全活動をまとめてお届け。"
          action={{ href: "#newsletter-form", label: "登録する" }}
        />
      )}

      {children}

      {/* 登録フォーム */}
      <div
        id="newsletter-form"
        className="scroll-mt-20 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">無料で登録する</h2>
          <p className="mt-1 text-xs text-slate-500">
            毎週月曜日 9:00 配信。スパムなし。いつでも配信停止できます。
          </p>
        </div>
        <NewsletterForm onSuccess={() => setRegistered(true)} />
      </div>
    </>
  );
}
